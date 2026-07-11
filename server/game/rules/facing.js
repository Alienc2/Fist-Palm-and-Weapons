// server/game/rules/facing.js
// 計算攻擊者朝向與目標相對位置，返回正面／側面／背面同修正值

const FACING_MODIFIERS = {
  front: { hit: 0, damage: 1, defense: 1, counter: 0 },
  side: { hit: 0, damage: 0, defense: 0, counter: 0 },
  back: { hit: 1, damage: 1, defense: -1, counter: -1 },
};

function relativeFacing(attacker, target) {
  const dx = target.position.x - attacker.position.x;
  const dy = target.position.y - attacker.position.y;

  // 粗略判：主要沿攻擊者 facing 方向的向量決定正面／背面／側面
  if (attacker.facing === "up") {
    if (dy < 0) return "front";
    if (dy > 0) return "back";
    return "side";
  }
  if (attacker.facing === "down") {
    if (dy > 0) return "front";
    if (dy < 0) return "back";
    return "side";
  }
  if (attacker.facing === "left") {
    if (dx < 0) return "front";
    if (dx > 0) return "back";
    return "side";
  }
  if (attacker.facing === "right") {
    if (dx > 0) return "front";
    if (dx < 0) return "back";
    return "side";
  }
  return "side";
}

function getFacingModifiers(attacker, target) {
  const rel = relativeFacing(attacker, target);
  return {
    relation: rel,
    ...FACING_MODIFIERS[rel],
  };
}

module.exports = {
  relativeFacing,
  getFacingModifiers,
  FACING_MODIFIERS,
};