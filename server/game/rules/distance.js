// server/game/rules/distance.js

function manhattanDistance(posA, posB) {
  return Math.abs(posA.x - posB.x) + Math.abs(posA.y - posB.y);
}

function isWithinRange(posA, posB, min, max) {
  const d = manhattanDistance(posA, posB);
  return d >= min && d <= max;
}

function isEdgePosition(pos) {
  return pos.x === 0 || pos.x === 4 || pos.y === 0 || pos.y === 4;
}

module.exports = {
  manhattanDistance,
  isWithinRange,
  isEdgePosition,
};