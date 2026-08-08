// client/views/lobbyView.js
// Phase H-01：遊戲大廳 UI。
// 提供：
//   1. 玩家名稱設定
//   2. 建立房間（選人數 / 模式）
//   3. 加入房間（輸入房間代碼）
//   4. 房間列表（等待中的房間）
//   5. 房間內：選角色 / 準備 / 開始對戰
// 使用 socketClient 與 server 互動。

import { el, clear, qs, button } from "../layout.js";
import { socketClient } from "../socketClient.js";

const CHARACTER_OPTIONS = [
  { value: "char_attack", label: "破軍（攻擊）" },
  { value: "char_defense", label: "玄武（防禦）" },
  { value: "char_move", label: "飛翎（移動）" },
  { value: "char_balanced", label: "無鋒（均衡）" },
];

// 開啟大廳（顯示在 modalRoot）
export function openLobby() {
  const modalRoot = qs("#modalRoot");
  clear(modalRoot);
  modalRoot.hidden = false;

  const overlay = el("div", { class: "modal-overlay" });
  const dialog = el("div", { class: "modal-dialog lobby-dialog" });

  dialog.appendChild(renderLobbyContent());

  overlay.appendChild(dialog);
  modalRoot.appendChild(overlay);

  // 點擊遮罩關閉
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeLobby();
  });
}

export function closeLobby() {
  const modalRoot = qs("#modalRoot");
  clear(modalRoot);
  modalRoot.hidden = true;
}

// 渲染大廳主內容
function renderLobbyContent() {
  const container = el("div", { class: "lobby" });

  const title = el("h2", { class: "lobby-title", text: "多人對戰大廳" });
  container.appendChild(title);

  // 連線狀態
  const statusRow = el("div", { class: "lobby-status" });
  const statusText = el("span", {
    class: "muted-text",
    text: socketClient.isConnected() ? "已連線" : "連線中…",
  });
  statusRow.appendChild(statusText);
  container.appendChild(statusRow);

  // 玩家名稱
  const nameRow = el("div", { class: "field-row" }, [
    el("label", { class: "field-label", for: "lobbyName", text: "玩家名稱" }),
  ]);
  const nameInput = el("input", {
    id: "lobbyName",
    class: "field-control",
    value: socketClient.getPlayerName(),
    placeholder: "輸入名稱",
  });
  nameRow.appendChild(nameInput);
  container.appendChild(nameRow);

  // 建立房間區
  const createSection = el("section", { class: "lobby-section" });
  createSection.appendChild(el("h3", { text: "建立房間" }));

  const maxRow = el("div", { class: "field-row" }, [
    el("label", { class: "field-label", for: "lobbyMaxPlayers", text: "人數" }),
  ]);
  const maxSelect = el("select", { id: "lobbyMaxPlayers", class: "field-control" });
  for (const n of [2, 3, 4]) {
    const opt = el("option", { value: String(n), text: `${n} 人` });
    if (n === 2) opt.selected = true;
    maxSelect.appendChild(opt);
  }
  maxRow.appendChild(maxSelect);
  createSection.appendChild(maxRow);

  const createBtn = button("建立房間", "primary-button", async () => {
    const name = nameInput.value.trim() || "Player";
    socketClient.setPlayerName(name);
    const maxPlayers = Number(maxSelect.value || 2);
    const result = await socketClient.createRoom({
      name,
      maxPlayers,
      mode: `${maxPlayers}p`,
    });
    if (result.ok) {
      renderRoomView();
    } else {
      alert(`建立房間失敗：${result.reason || "未知錯誤"}`);
    }
  });
  createSection.appendChild(createBtn);
  container.appendChild(createSection);

  // 加入房間區
  const joinSection = el("section", { class: "lobby-section" });
  joinSection.appendChild(el("h3", { text: "加入房間" }));

  const joinRow = el("div", { class: "field-row" }, [
    el("label", { class: "field-label", for: "lobbyRoomCode", text: "房間代碼" }),
  ]);
  const roomCodeInput = el("input", {
    id: "lobbyRoomCode",
    class: "field-control",
    placeholder: "輸入 6 位代碼",
  });
  joinRow.appendChild(roomCodeInput);
  joinSection.appendChild(joinRow);

  const joinBtn = button("加入房間", "secondary-button", async () => {
    const name = nameInput.value.trim() || "Player";
    socketClient.setPlayerName(name);
    const roomId = roomCodeInput.value.trim().toUpperCase();
    if (!roomId) {
      alert("請輸入房間代碼");
      return;
    }
    const result = await socketClient.joinRoom(roomId, { name });
    if (result.ok) {
      renderRoomView();
    } else {
      alert(`加入房間失敗：${result.reason || "未知錯誤"}`);
    }
  });
  joinSection.appendChild(joinBtn);
  container.appendChild(joinSection);

  // 房間列表
  const listSection = el("section", { class: "lobby-section" });
  listSection.appendChild(el("h3", { text: "等待中的房間" }));
  const listContainer = el("div", { id: "lobbyRoomList", class: "lobby-room-list" });
  listSection.appendChild(listContainer);
  container.appendChild(listSection);

  // 關閉按鈕
  const closeBtn = button("關閉", "secondary-button", closeLobby);
  container.appendChild(closeBtn);

  // 載入房間列表
  refreshRoomList(listContainer);

  return container;
}

// 刷新房間列表
async function refreshRoomList(container) {
  clear(container);
  container.appendChild(el("p", { class: "muted-text", text: "載入中…" }));

  const rooms = await socketClient.listRooms();
  clear(container);

  if (!rooms || rooms.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "目前沒有等待中的房間。" }));
    return;
  }

  for (const room of rooms) {
    const row = el("div", { class: "lobby-room-row" }, [
      el("span", { class: "room-code", text: room.id }),
      el("span", { class: "room-info", text: `${room.playerCount}/${room.maxPlayers} 人 · ${room.mode}` }),
    ]);
    const joinBtn = button("加入", "mini-button", async () => {
      const name = socketClient.getPlayerName() || "Player";
      const result = await socketClient.joinRoom(room.id, { name });
      if (result.ok) {
        renderRoomView();
      } else {
        alert(`加入失敗：${result.reason || "未知錯誤"}`);
      }
    });
    row.appendChild(joinBtn);
    container.appendChild(row);
  }
}

// 渲染房間內視圖（選角色 / 準備 / 開始）
function renderRoomView() {
  const modalRoot = qs("#modalRoot");
  clear(modalRoot);
  modalRoot.hidden = false;

  const overlay = el("div", { class: "modal-overlay" });
  const dialog = el("div", { class: "modal-dialog lobby-dialog" });
  const container = el("div", { class: "lobby" });

  const room = socketClient.getCurrentRoom();
  const title = el("h2", { class: "lobby-title", text: `房間 ${room ? room.id : ""}` });
  container.appendChild(title);

  // 玩家列表
  const playersSection = el("section", { class: "lobby-section" });
  playersSection.appendChild(el("h3", { text: "玩家" }));
  const playersList = el("div", { id: "roomPlayersList", class: "lobby-room-list" });
  playersSection.appendChild(playersList);
  container.appendChild(playersSection);

  // 角色選擇
  const charSection = el("section", { class: "lobby-section" });
  charSection.appendChild(el("h3", { text: "選擇角色" }));
  const charRow = el("div", { class: "field-row" });
  const charSelect = el("select", { id: "roomCharacterSelect", class: "field-control" });
  for (const opt of CHARACTER_OPTIONS) {
    charSelect.appendChild(el("option", { value: opt.value, text: opt.label }));
  }
  charRow.appendChild(charSelect);
  charSection.appendChild(charRow);
  container.appendChild(charSection);

  // 準備 / 開始按鈕
  const actionRow = el("div", { class: "button-row" });
  const readyBtn = button("準備", "primary-button", async () => {
    const characterId = charSelect.value;
    await socketClient.setCharacter(characterId);
    await socketClient.setReady(true);
  });
  actionRow.appendChild(readyBtn);

  const startBtn = button("開始對戰", "primary-button", async () => {
    const result = await socketClient.startMatch();
    if (!result.ok) {
      alert(`開始失敗：${result.reason || "未知錯誤"}`);
    }
  });
  actionRow.appendChild(startBtn);

  const leaveBtn = button("離開房間", "secondary-button", async () => {
    await socketClient.leaveRoom();
    openLobby();
  });
  actionRow.appendChild(leaveBtn);
  container.appendChild(actionRow);

  // 監聽房間更新
  const unsubscribe = socketClient.on("room:update", (updatedRoom) => {
    renderPlayersList(playersList, updatedRoom);
    // 房主顯示開始按鈕
    const isHost = updatedRoom.hostId === socketClient.getSocketId();
    startBtn.style.display = isHost ? "" : "none";
  });


  // 監聽對戰開始
  const unsubscribeStart = socketClient.on("match:start", () => {
    unsubscribe();
    unsubscribeStart();
    closeLobby();
  });

  overlay.appendChild(dialog);
  dialog.appendChild(container);
  modalRoot.appendChild(overlay);

  // 初始渲染
  renderPlayersList(playersList, room);
  const isHost = room && room.hostId === socketClient.getSocketId();
  startBtn.style.display = isHost ? "" : "none";


  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      unsubscribe();
      unsubscribeStart();
      closeLobby();
    }
  });
}

// 渲染房間內玩家列表
function renderPlayersList(container, room) {
  clear(container);
  if (!room || !room.players || room.players.length === 0) {
    container.appendChild(el("p", { class: "muted-text", text: "尚無玩家。" }));
    return;
  }

  for (const p of room.players) {
    const row = el("div", { class: "lobby-room-row" }, [
      el("span", { class: "room-player-name", text: p.name }),
      el("span", { class: "room-player-char", text: p.characterId || "未選角色" }),
      el("span", { class: "room-player-ready", text: p.ready ? "✓ 已準備" : "未準備" }),
    ]);
    container.appendChild(row);
  }
}
