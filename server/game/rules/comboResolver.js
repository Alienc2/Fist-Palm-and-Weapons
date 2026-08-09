// server/game/rules/comboResolver.js
// 連續技偵測與效果應用

const cardLoader = require("../../../shared/cardLoader");
const { manhattanDistance } = require("./distance");

// 解析 required_cards 字串，例如：
//   "type:attack;count:3"
//   "subtype:punch>palm>weapon"
//   "subtype:same;count:3"（同一 subtype 連續 count 張）
// 回傳 { type, count, subtypeSequence, sameSubtype }
function parseRequiredCards(requiredCards) {
  const result = { type: null, count: null, subtypeSequence: null, sameSubtype: false };

  if (!requiredCards) return result;

  const parts = String(requiredCards).split(";");
  for (const part of parts) {
    const [key, value] = part.split(":");
    if (!key || value === undefined) continue;

    if (key === "type") {
      result.type = value;
    } else if (key === "count") {
      result.count = Number(value);
    } else if (key === "subtype") {
      if (value === "same") {
        result.sameSubtype = true;
      } else {
        result.subtypeSequence = value.split(">").map((s) => s.trim());
      }
    }
  }

  return result;
}


// 檢查玩家 selectedCards 是否命中 sequence combo
// selectedCards 為 [{ card, extra }, ...]
function detectSequenceCombo(state, player, combo) {
  const req = parseRequiredCards(combo.requiredCards);
  const selected = player.selectedCards || [];

  if (req.subtypeSequence) {
    // 依 subtype 順序比對（連續子序列）
    const subtypes = selected.map((entry) => entry.card?.subtype || null);
    return matchesSubtypeSequence(subtypes, req.subtypeSequence);
  }

  if (req.sameSubtype && req.count) {
    // 同一 subtype 連續 count 張比對
    const subtypes = selected.map((entry) => entry.card?.subtype || null);
    return matchesSameSubtypeCount(subtypes, req.count);
  }

  if (req.type && req.count) {
    // 依 type 連續 count 張比對
    const types = selected.map((entry) => entry.card?.type || null);
    return matchesTypeCount(types, req.type, req.count);
  }

  return false;
}

function matchesSameSubtypeCount(subtypes, count) {
  if (!count || count <= 0) return false;
  if (subtypes.length < count) return false;

  let run = 0;
  let prev = null;
  for (const s of subtypes) {
    if (s && s === prev) {
      run += 1;
    } else {
      prev = s;
      run = 1;
    }
    if (run >= count) return true;
  }
  return false;
}


function matchesSubtypeSequence(subtypes, sequence) {
  if (sequence.length === 0) return false;
  if (subtypes.length < sequence.length) return false;

  for (let i = 0; i <= subtypes.length - sequence.length; i++) {
    let match = true;
    for (let j = 0; j < sequence.length; j++) {
      if (subtypes[i + j] !== sequence[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

function matchesTypeCount(types, type, count) {
  if (!count || count <= 0) return false;
  if (types.length < count) return false;

  let run = 0;
  for (const t of types) {
    if (t === type) {
      run += 1;
      if (run >= count) return true;
    } else {
      run = 0;
    }
  }
  return false;
}

// 檢查 board_pattern（直線 / 斜線 / 包圍）
// pattern 值：none / line / diagonal / surround
function detectBoardPattern(state, sourcePlayer, target, pattern) {
  if (!pattern || pattern === "none") return true;

  if (!target) return false;

  const dx = Math.abs(target.position.x - sourcePlayer.position.x);
  const dy = Math.abs(target.position.y - sourcePlayer.position.y);

  if (pattern === "line") {
    return dx === 0 || dy === 0;
  }
  if (pattern === "diagonal") {
    return dx === dy && dx > 0;
  }
  if (pattern === "surround") {
    // 包圍：目標被至少 2 個敵方相鄰
    const adjacentCount = state.players.filter(
      (p) =>
        p.id !== target.id &&
        !p.isEliminated &&
        manhattanDistance(p.position, target.position) === 1
    ).length;
    return adjacentCount >= 2;
  }

  return true;
}

// 套用 combo effect 到玩家 / 目標
// 回傳 { applied: boolean, effectType, params }
function applyComboEffect(state, player, combo, target) {
  const params = combo.effectParams || {};
  const effectType = combo.effectType;

  if (effectType === "damage_bonus") {
    const bonus = params.last_attack_bonus || params.damage_bonus || 0;
    player.comboDamageBonus = (player.comboDamageBonus || 0) + Number(bonus);
    state.log.push(`${player.id} 觸發 combo ${combo.id}：傷害 +${bonus}`);
    return { applied: true, effectType, params };
  }

  if (effectType === "range_damage_bonus") {
    const rangeBonus = Number(params.range_bonus || 0);
    const damageBonus = Number(params.damage_bonus || 0);
    player.comboRangeBonus = (player.comboRangeBonus || 0) + rangeBonus;
    player.comboDamageBonus = (player.comboDamageBonus || 0) + damageBonus;
    state.log.push(`${player.id} 觸發 combo ${combo.id}：距離 +${rangeBonus}、傷害 +${damageBonus}`);
    return { applied: true, effectType, params };
  }

  if (effectType === "defense_down") {
    const value = Number(params.value || 0);
    if (target) {
      target.defenseDown = (target.defenseDown || 0) + value;
      state.log.push(`${player.id} 觸發 combo ${combo.id}：${target.id} 防禦成功率 -${value}`);
    }
    return { applied: true, effectType, params };
  }

  if (effectType === "dodge_up") {
    const value = Number(params.value || 0);
    player.dodgeUp = (player.dodgeUp || 0) + value;
    state.log.push(`${player.id} 觸發 combo ${combo.id}：閃避率 +${value}`);
    return { applied: true, effectType, params };
  }

  if (effectType === "guard_up") {
    const value = Number(params.value || 0);
    player.guardUp = (player.guardUp || 0) + value;
    state.log.push(`${player.id} 觸發 combo ${combo.id}：防禦力 +${value}`);
    return { applied: true, effectType, params };
  }

  if (effectType === "move_bonus") {
    const value = Number(params.value || 0);
    player.comboMoveBonus = (player.comboMoveBonus || 0) + value;
    state.log.push(`${player.id} 觸發 combo ${combo.id}：移動距離 +${value}`);
    return { applied: true, effectType, params };
  }

  if (effectType === "line_attack") {
    // 範圍攻擊：多於一名敵人，且兩名或以上同時位於一直線時，同時攻擊全部直線上敵人
    player.lineAttackActive = true;
    state.log.push(`${player.id} 觸發 combo ${combo.id}：直線範圍攻擊`);
    return { applied: true, effectType, params };
  }

  return { applied: false, effectType, params };
}


// 主入口：偵測並套用所有命中 combo
// 回傳命中 combo 列表
function resolveCombos(state, player, target) {
  const combos = cardLoader.loadCombos();
  const triggered = [];

  for (const combo of combos) {
    if (combo.comboType === "sequence") {
      if (!detectSequenceCombo(state, player, combo)) continue;
    } else if (combo.comboType === "board_pattern") {
      if (!detectBoardPattern(state, player, target, combo.requiredBoardPattern)) continue;
    } else {
      continue;
    }

    const result = applyComboEffect(state, player, combo, target);
    if (result.applied) {
      triggered.push({ id: combo.id, ...result });
    }
  }

  return triggered;
}

// 回合結束時清除 round 效果
function clearRoundEffects(player) {
  player.comboDamageBonus = 0;
  player.comboRangeBonus = 0;
  player.dodgeUp = 0;
  player.guardUp = 0;
  player.comboMoveBonus = 0;
  player.lineAttackActive = false;
  if (player.defenseDown) player.defenseDown = 0;
}


module.exports = {
  parseRequiredCards,
  detectSequenceCombo,
  detectBoardPattern,
  applyComboEffect,
  resolveCombos,
  clearRoundEffects,
};
