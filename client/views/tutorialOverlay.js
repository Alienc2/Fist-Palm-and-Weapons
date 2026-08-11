// client/views/tutorialOverlay.js
// 教學提示浮層（Task H）。首次開始對戰成功後顯示一次，引導核心操作流程。

import { el, qs, clear, show, hide, button } from "../layout.js";

const STORAGE_KEY = "fpw_tutorial_seen";

// 是否已睇過（本 session 或 localStorage 記住）
export function hasSeenTutorial() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

// 首次開始對戰時顯示教學浮層（只顯示一次）
export function maybeShowTutorial() {
  if (hasSeenTutorial()) return;
  showTutorial(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage 不可用（如隱私模式）時忽略，session 內仍只顯示一次
    }
  });
}

function showTutorial(onClose) {
  const root = qs("#tutorialRoot");
  if (!root) return;
  clear(root);
  show(root);

  const steps = [
    "① 點擊下方手牌，加入本回合選牌。",
    "② 移動卡：點擊綠色格選擇移動目標。",
    "③ 攻擊卡：點擊紅色敵人選擇目標。",
    "④ 所有玩家選完牌後按「結算回合」。",
  ];

  const list = el("ul", { class: "tutorial-steps" });
  for (const step of steps) {
    list.appendChild(el("li", { text: step }));
  }

  const content = el("div", { class: "tutorial-body" }, [
    el("p", { class: "muted-text", text: "歡迎！以下是基本操作：", style: "" }),
    list,
  ]);

  const overlay = el("div", { class: "modal-overlay" });
  const dialog = el("div", { class: "modal-dialog tutorial-dialog" }, [
    el("div", { class: "modal-header" }, [el("h3", { text: "教學" })]),
    el("div", { class: "modal-body" }, [content]),
    el("div", { class: "modal-footer" }, [
      button("開始", "primary-button", () => {
        closeTutorial(root);
        if (onClose) onClose();
      }),
    ]),
  ]);
  overlay.appendChild(dialog);
  root.appendChild(overlay);
}

function closeTutorial(root) {
  clear(root);
  hide(root);
}
