// client/gameStore.js
// 遊戲狀態管理 + API client。
// 負責：
//   1. 呼叫 server 遊戲 API（create / select / facing / play / reset / state）
//   2. 保存目前對戰狀態
//   3. 管理本回合選牌（selectedCards）與 pending facing
//   4. 訂閱機制（state 更新時通知 UI）

const API_BASE = "";

class GameStore {
  constructor() {
    this.state = null;
    this.activePlayerId = "P1";
    this.pendingSelections = {}; // playerId -> [{card, extra}]
    this.pendingFacing = {}; // playerId -> facing
    this.pendingDiscards = {}; // playerId -> [{instanceId}]
    this.boardSelection = null; // { type: 'move'|'attack', card, playerId }
    this.listeners = [];
    this.busy = false;
    this.lastEvents = [];

  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.state);
      } catch (error) {
        console.error("[gameStore] listener error:", error);
      }
    }
  }

  async request(method, path, body) {
    const options = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, options);
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `API error ${res.status}`);
    }
    return data;
  }

  async createMatch(config = {}) {
    this.busy = true;
    try {
      // 支援兩種呼叫方式：
      //   1. 舊式：createMatch(p1CharacterId, p2CharacterId)
      //   2. 新式：createMatch({ players: [...], humanCount, aiCount })
      let players;
      if (Array.isArray(config)) {
        players = config;
      } else if (config && Array.isArray(config.players)) {
        players = config.players;
      } else if (typeof config === "string") {
        players = [
          { id: "P1", position: { x: 1, y: 1 }, characterId: config },
          { id: "P2", position: { x: 3, y: 3 }, characterId: arguments[1] || "char_defense" },
        ];
      } else {
        players = [
          { id: "P1", position: { x: 1, y: 1 }, characterId: "char_attack" },
          { id: "P2", position: { x: 3, y: 3 }, characterId: "char_defense" },
        ];
      }

      const data = await this.request("POST", "/api/match", { players });
      this.state = data.state;
      this.pendingSelections = {};
      this.pendingFacing = {};
      this.pendingDiscards = {};
      this.lastEvents = [];
      this.notify();
      return this.state;
    } finally {
      this.busy = false;
    }
  }


  // 由 server 廣播（Socket.IO）直接設定狀態
  setState(state) {
    this.state = state;
    this.pendingSelections = {};
    this.pendingFacing = {};
    this.pendingDiscards = {};
    this.notify();
    return this.state;
  }

  async refreshState() {
    const data = await this.request("GET", "/api/state");
    this.state = data.state;
    this.notify();
    return this.state;
  }


  async submitSelection(playerId, selections) {
    const data = await this.request("POST", "/api/select", {
      playerId,
      selections,
    });
    this.state = data.state;
    this.notify();
    return this.state;
  }

  async setFacing(playerId, facing) {
    const data = await this.request("POST", "/api/facing", {
      playerId,
      facing,
    });
    this.state = data.state;
    this.notify();
    return data;
  }

  async playTurn() {
    const data = await this.request("POST", "/api/play");
    this.state = data.state;
    this.lastEvents = data.events || [];
    this.pendingSelections = {};
    this.pendingFacing = {};
    this.pendingDiscards = {};
    this.notify();
    return this.state;
  }

  async reset() {
    await this.request("POST", "/api/reset");
    this.state = null;
    this.pendingSelections = {};
    this.pendingFacing = {};
    this.pendingDiscards = {};
    this.notify();
  }

  // ---- 本回合選牌管理（client 端暫存，結算時一次送出）----

  getPlayer(playerId) {
    if (!this.state) return null;
    return this.state.players.find((p) => p.id === playerId) || null;
  }

  getActivePlayer() {
    return this.getPlayer(this.activePlayerId);
  }

  setActivePlayer(playerId) {
    this.activePlayerId = playerId;
    this.notify();
  }


  getPendingSelections(playerId) {
    return this.pendingSelections[playerId] || [];
  }

  addSelection(playerId, card, extra = {}) {
    const list = this.getPendingSelections(playerId);
    list.push({ card, extra });
    this.pendingSelections[playerId] = list;
    this.notify();
  }

  removeSelection(playerId, index) {
    const list = this.getPendingSelections(playerId);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      this.pendingSelections[playerId] = list;
      this.notify();
    }
  }

  clearSelections(playerId) {
    this.pendingSelections[playerId] = [];
    this.boardSelection = null;
    this.notify();
  }


  // ---- 棋盤選擇模式（I-02-H2 / I-02-H3）----
  // 使用移動/攻擊卡時，喺棋盤高亮可選格並點擊選擇，取代 facingPicker / targetPicker

  setBoardSelection(selection) {
    this.boardSelection = selection;
    this.notify();
  }

  getBoardSelection() {
    return this.boardSelection;
  }

  clearBoardSelection() {
    this.boardSelection = null;
    this.notify();
  }

  setPendingFacing(playerId, facing) {

    this.pendingFacing[playerId] = facing;
    this.notify();
  }

  getPendingFacing(playerId) {
    return this.pendingFacing[playerId] || null;
  }

  // 結算前把暫存選牌與朝向送出
  async commitAllSelections() {
    const playerIds = this.state ? this.state.players.map((p) => p.id) : [];
    for (const playerId of playerIds) {
      const selections = this.getPendingSelections(playerId);
      await this.submitSelection(playerId, selections);
      const facing = this.getPendingFacing(playerId);
      if (facing) {
        await this.setFacing(playerId, facing);
      }
    }
  }

  // ---- 手牌上限棄牌管理（Phase I-02）----

  getPendingDiscards(playerId) {
    return this.pendingDiscards[playerId] || [];
  }

  // 設定要棄的牌（手牌超過上限時），並送出到 server
  async setPendingDiscards(playerId, discards) {
    const normalized = discards.map((d) => {
      if (d && d.card) return d.card;
      return d;
    });
    this.pendingDiscards[playerId] = normalized;
    const data = await this.request("POST", "/api/discard", {
      playerId,
      discards: normalized,
    });
    this.state = data.state;
    this.notify();
    return data;
  }

  // 計算某玩家需要棄牌的張數（手牌超過上限的部分）
  getDiscardExcess(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.hand) return 0;
    const limit = player.handLimit || 8;
    return Math.max(0, player.hand.length - limit);
  }

  clearPendingDiscards(playerId) {
    this.pendingDiscards[playerId] = [];
    this.notify();
  }
}

export const gameStore = new GameStore();
