// client/layout.js
// DOM 建立 / 更新 helper，供各 view 共用。

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") {
      node.className = value;
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "html") {
      node.innerHTML = value;
    } else if (key === "dataset") {
      Object.assign(node.dataset, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== undefined && value !== null) {
      node.setAttribute(key, value);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      node.appendChild(document.createTextNode(String(child)));
    } else {
      node.appendChild(child);
    }
  }
  return node;
}

export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  return node;
}

export function setText(node, text) {
  node.textContent = text;
  return node;
}

export function show(node) {
  node.hidden = false;
  return node;
}

export function hide(node) {
  node.hidden = true;
  return node;
}

export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// 建立 modal 容器
export function openModal(title, contentNode, actions = []) {
  const root = qs("#modalRoot");
  clear(root);
  show(root);

  const overlay = el("div", { class: "modal-overlay" });
  const dialog = el("div", { class: "modal-dialog" });
  const header = el("div", { class: "modal-header" }, [
    el("h3", { text: title }),
    el("button", {
      class: "modal-close",
      text: "×",
      "aria-label": "關閉",
      onclick: () => closeModal(),
    }),
  ]);
  const body = el("div", { class: "modal-body" }, [contentNode]);
  const footer = el("div", { class: "modal-footer" }, actions);

  dialog.append(header, body, footer);
  overlay.appendChild(dialog);
  root.appendChild(overlay);

  return { overlay, dialog, body, footer, close: closeModal };
}

export function closeModal() {
  const root = qs("#modalRoot");
  clear(root);
  hide(root);
}

// 建立按鈕
export function button(label, className, onClick, disabled = false) {
  return el("button", {
    class: className,
    text: label,
    type: "button",
    disabled: disabled ? "disabled" : null,
    onclick: onClick,
  });
}

// 建立卡片 DOM（供 handView / selectedCardsView / shopModal 共用）
// I-02-H：擴充卡牌內容排法，列出所有資料（camelCase 欄位）
export function cardNode(card, options = {}) {
  const {
    onClick = null,
    selected = false,
    disabled = false,
    showCost = true,
    showStock = false,
  } = options;

  const typeLabel = {
    attack: "攻擊",
    defense: "防禦",
    move: "移動",
    buy: "購買",
    recover: "回復",
    counter: "反擊",
  }[card.type] || card.type;

  const attrs = {
    class: `card card-${card.type}${selected ? " is-selected" : ""}${
      disabled ? " is-disabled" : ""
    }`,
    dataset: { cardId: card.id, instanceId: card.instanceId || "" },
  };
  if (onClick) attrs.onclick = onClick;

  const children = [
    el("div", { class: "card-header" }, [
      el("span", { class: "card-type", text: typeLabel }),
      el("span", { class: "card-cost", text: showCost ? `MP ${card.mpCost}` : "" }),
    ]),
    el("div", { class: "card-name", text: card.name || card.id }),
    el("div", { class: "card-subtype", text: card.subtype || "" }),
  ];

  // 依卡牌類型列出對應數值資料
  const stats = [];
  if (card.type === "attack") {
    stats.push(`傷害 ${card.damage}`);
    stats.push(`射程 ${card.rangeMin}~${card.rangeMax}`);
  } else if (card.type === "move") {
    stats.push(`移動 ${card.moveMin}~${card.moveMax}`);
  } else if (card.type === "defense") {
    stats.push(`格擋 ${card.blockValue}`);
  } else if (card.type === "recover") {
    stats.push(`回復 ${card.hpGain} HP`);
  }
  if (card.mpGain) stats.push(`+${card.mpGain} MP`);
  if (card.drawCount) stats.push(`抽 ${card.drawCount} 張`);
  if (card.buyCost) stats.push(`解封 ${card.buyCost} MP`);
  if (stats.length > 0) {
    children.push(el("div", { class: "card-stats", text: stats.join(" · ") }));
  }

  if (card.keywords && card.keywords.length > 0) {
    children.push(
      el("div", { class: "card-keywords", text: card.keywords.join("、") })
    );
  }

  if (showStock && card.stock !== undefined && card.stock !== "") {
    children.push(el("div", { class: "card-stock", text: `庫存 ${card.stock}` }));
  }

  return el("div", attrs, children);
}


