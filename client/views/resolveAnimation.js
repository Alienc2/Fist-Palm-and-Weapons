// client/views/resolveAnimation.js
// 回合結算動畫。在結算前後顯示過場動畫與摘要。

import { el, qs, show, hide } from "../layout.js";

let animationRoot = null;

function ensureRoot() {
  if (animationRoot) return animationRoot;
  animationRoot = el("div", { class: "resolve-animation", hidden: true });
  document.body.appendChild(animationRoot);
  return animationRoot;
}

// 顯示結算過場動畫（Promise，resolve 後自動隱藏）
export function playResolveAnimation({ round, players }) {
  const root = ensureRoot();
  show(root);
  clear(root);

  const title = el("div", { class: "resolve-title", text: `第 ${round} 回合結算` });
  const summary = el("div", { class: "resolve-summary" });

  for (const p of players) {
    summary.appendChild(
      el("div", { class: "resolve-player", text: `${p.id}：HP ${p.hp}/${p.maxHp}  MP ${p.mp}/${p.maxMp}` })
    );
  }

  root.append(title, summary);

  return new Promise((resolve) => {
    setTimeout(() => {
      hide(root);
      clear(root);
      resolve();
    }, 1200);
  });
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}
