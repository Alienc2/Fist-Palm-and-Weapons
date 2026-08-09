// tests/rules/comboResolver.test.js

const {
  parseRequiredCards,
  detectSequenceCombo,
  detectBoardPattern,
  applyComboEffect,
  resolveCombos,
  clearRoundEffects,
} = require("../../server/game/rules/comboResolver");

function makePlayer(id, position, hp = 10) {
  return {
    id,
    position,
    hp,
    isEliminated: false,
    selectedCards: [],
  };
}

function makeState(players) {
  return { players, log: [] };
}

function cardEntry(type, subtype) {
  return { card: { type, subtype } };
}

describe("parseRequiredCards", () => {
  test("解析 type:attack;count:3", () => {
    const req = parseRequiredCards("type:attack;count:3");
    expect(req.type).toBe("attack");
    expect(req.count).toBe(3);
    expect(req.subtypeSequence).toBeNull();
  });

  test("解析 subtype:punch>palm>weapon", () => {
    const req = parseRequiredCards("subtype:punch>palm>weapon");
    expect(req.subtypeSequence).toEqual(["punch", "palm", "weapon"]);
    expect(req.type).toBeNull();
  });
});

describe("detectSequenceCombo", () => {
  test("type:attack;count:3 命中連續 3 張攻擊", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.selectedCards = [
      cardEntry("attack", "punch"),
      cardEntry("attack", "palm"),
      cardEntry("attack", "weapon"),
    ];
    const combo = { requiredCards: "type:attack;count:3" };
    expect(detectSequenceCombo(makeState([player]), player, combo)).toBe(true);
  });

  test("type:attack;count:3 未命中（只有 2 張）", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.selectedCards = [cardEntry("attack", "punch"), cardEntry("attack", "palm")];
    const combo = { requiredCards: "type:attack;count:3" };
    expect(detectSequenceCombo(makeState([player]), player, combo)).toBe(false);
  });

  test("subtype:punch>palm>weapon 命中順序", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.selectedCards = [
      cardEntry("attack", "punch"),
      cardEntry("attack", "palm"),
      cardEntry("attack", "weapon"),
    ];
    const combo = { requiredCards: "subtype:punch>palm>weapon" };
    expect(detectSequenceCombo(makeState([player]), player, combo)).toBe(true);
  });

  test("subtype 順序不符時未命中", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.selectedCards = [
      cardEntry("attack", "weapon"),
      cardEntry("attack", "palm"),
      cardEntry("attack", "punch"),
    ];
    const combo = { requiredCards: "subtype:punch>palm>weapon" };
    expect(detectSequenceCombo(makeState([player]), player, combo)).toBe(false);
  });
});

describe("detectBoardPattern", () => {
  test("none 永遠命中", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 3, y: 3 });
    expect(detectBoardPattern(makeState([source, target]), source, target, "none")).toBe(true);
  });

  test("line 直線命中", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 1, y: 3 });
    expect(detectBoardPattern(makeState([source, target]), source, target, "line")).toBe(true);
  });

  test("line 非直線未命中", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 2, y: 3 });
    expect(detectBoardPattern(makeState([source, target]), source, target, "line")).toBe(false);
  });

  test("diagonal 斜線命中", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 3, y: 3 });
    expect(detectBoardPattern(makeState([source, target]), source, target, "diagonal")).toBe(true);
  });

  test("surround 包圍命中（目標被 2 個敵方相鄰）", () => {
    const source = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 2, y: 2 });
    const ally1 = makePlayer("P3", { x: 2, y: 1 });
    const ally2 = makePlayer("P4", { x: 1, y: 2 });
    const state = makeState([source, target, ally1, ally2]);
    expect(detectBoardPattern(state, source, target, "surround")).toBe(true);
  });
});

describe("applyComboEffect", () => {
  test("damage_bonus 增加 comboDamageBonus", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    const state = makeState([player]);
    const combo = { id: "c1", effectType: "damage_bonus", effectParams: { last_attack_bonus: 1 } };
    const result = applyComboEffect(state, player, combo, null);
    expect(result.applied).toBe(true);
    expect(player.comboDamageBonus).toBe(1);
  });

  test("defense_down 降低目標防禦", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    const target = makePlayer("P2", { x: 1, y: 2 });
    const state = makeState([player, target]);
    const combo = { id: "c2", effectType: "defense_down", effectParams: { value: 1 } };
    applyComboEffect(state, player, combo, target);
    expect(target.defenseDown).toBe(1);
  });

  test("guard_up 增加防禦力", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    const state = makeState([player]);
    const combo = { id: "c3", effectType: "guard_up", effectParams: { value: 1 } };
    applyComboEffect(state, player, combo, null);
    expect(player.guardUp).toBe(1);
  });

  test("move_bonus 增加移動距離", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    const state = makeState([player]);
    const combo = { id: "c5", effectType: "move_bonus", effectParams: { value: 1 } };
    applyComboEffect(state, player, combo, null);
    expect(player.comboMoveBonus).toBe(1);
  });


  test("range_damage_bonus 增加距離與傷害", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    const state = makeState([player]);
    const combo = {
      id: "c4",
      effectType: "range_damage_bonus",
      effectParams: { range_bonus: 1, damage_bonus: 1 },
    };
    applyComboEffect(state, player, combo, null);
    expect(player.comboRangeBonus).toBe(1);
    expect(player.comboDamageBonus).toBe(1);
  });
});

describe("resolveCombos", () => {
  test("命中 sequence combo 並套用效果", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.selectedCards = [
      cardEntry("attack", "punch"),
      cardEntry("attack", "palm"),
      cardEntry("attack", "weapon"),
    ];
    const state = makeState([player]);

    const triggered = resolveCombos(state, player, null);
    // combo_same_attack_3 與 combo_punch_palm_weapon 都會命中
    expect(triggered.length).toBeGreaterThan(0);
    expect(player.comboDamageBonus).toBeGreaterThan(0);
  });

  test("clearRoundEffects 清除 round 效果", () => {
    const player = makePlayer("P1", { x: 1, y: 1 });
    player.comboDamageBonus = 2;
    player.comboRangeBonus = 1;
    player.guardUp = 1;
    player.defenseDown = 1;
    player.comboMoveBonus = 1;

    clearRoundEffects(player);
    expect(player.comboDamageBonus).toBe(0);
    expect(player.comboRangeBonus).toBe(0);
    expect(player.guardUp).toBe(0);
    expect(player.defenseDown).toBe(0);
    expect(player.comboMoveBonus).toBe(0);
  });

});
