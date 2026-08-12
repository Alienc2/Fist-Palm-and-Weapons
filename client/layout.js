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

// 將 server 傳嚟嘅 snake_case 卡牌欄位統一轉為 camelCase，
// 令前端（boardView / cardNode）可以一致讀取 rangeMin / moveMax / mpCost 等欄位。
// 保留原始 snake_case 欄位作向後兼容。
// 將可能係字串嘅數值欄位轉為 number（cards.json 中 mp_cost / range_min 等係字串）
function toNum(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeClientCard(card) {
  if (!card) return card;
  if (card.__normalized) return card;
  const normalized = {
    ...card,
    __normalized: true,
    name: card.name || card.name_zh || card.id,
    aliasGroup: card.aliasGroup || card.alias_group || "",
    mpCost: toNum(card.mpCost ?? card.mp_cost),
    buyCost: toNum(card.buyCost ?? card.buy_cost),
    rangeMin: toNum(card.rangeMin ?? card.range_min),
    rangeMax: toNum(card.rangeMax ?? card.range_max),
    moveMin: toNum(card.moveMin ?? card.move_min),
    moveMax: toNum(card.moveMax ?? card.move_max),
    damage: toNum(card.damage),
    blockValue: toNum(card.blockValue ?? card.block_value),
    hpGain: toNum(card.hpGain ?? card.hp_gain),
    mpGain: toNum(card.mpGain ?? card.mp_gain),
    drawCount: toNum(card.drawCount ?? card.draw_count),
    description: card.description || card.description_template || "",
  };
  return normalized;
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
// 卡面內容精簡：只顯示 name_zh、alias_group、mp_cost、buy_cost、description_template
export function cardNode(card, options = {}) {
  const {
    onClick = null,
    selected = false,
    disabled = false,
    showCost = true,
    showStock = false,
    showBack = false,
    compact = false,
  } = options;

  // 統一 snake_case → camelCase，確保讀到正確欄位
  const c = normalizeClientCard(card);

  const typeLabel = {
    attack: "攻擊",
    defense: "防禦",
    move: "移動",
    buy: "解封",
    recover: "回復",
    counter: "反擊",
  }[c.type] || c.type;

  const typeIcon = {
    attack: "⚔️",
    defense: "🛡️",
    move: "➤",
    buy: "🛒",
    recover: "❤️",
    counter: "🔄",
  }[c.type] || "";

  const attrs = {
    class: `card card-${c.type}${selected ? " is-selected" : ""}${
      disabled ? " is-disabled" : ""
    }`,
    dataset: { cardId: c.id, instanceId: c.instanceId || "" },
  };
  // T3：原生 tooltip，顯示完整名稱 + 描述（避免文字溢出睇唔到全文）
  const titleText = [c.name || c.id, c.description].filter(Boolean).join(" — ");
  if (titleText) attrs.title = titleText;
  if (onClick) attrs.onclick = onClick;

  // P0：卡面圖片層。載入成功時隱藏文字層，失敗時保留現有銀黑咭面 + 文字。
  // 卡背（showBack）為預留契約，現時冇 view 使用。
  const faceChildren = [
    el("div", { class: "card-header" }, [
      el("span", { class: "card-type", text: typeIcon ? `${typeIcon} ${typeLabel}` : typeLabel }),
      el("span", { class: "card-cost", text: showCost ? `MP ${c.mpCost}` : "" }),
    ]),
    // name_zh
    el("div", { class: "card-name", text: c.name || c.id }),
    // alias_group
    el("div", { class: "card-subtype", text: c.aliasGroup || "" }),
  ];

  // P5：compact（本回合選牌）只顯示 4 行核心數值，唔顯示長段描述，避免爆版
  if (compact) {
    const stats = [
      { key: "damage", label: "⚔️" },
      { key: "blockValue", label: "🛡️" },
      { key: "rangeMax", label: "📏" },
      { key: "moveMax", label: "➤" },
    ].filter(({ key }) => c[key] > 0);
    if (stats.length > 0) {
      faceChildren.push(
        el("div", { class: "card-stats" }, stats.map(({ key, label }) =>
          el("span", { class: "card-stat", text: `${label} ${c[key]}` })
        ))
      );
    }
  } else {
    // buy_cost（解封費用）
    if (showCost && c.buyCost > 0) {
      faceChildren.push(el("div", { class: "card-buy", text: `解封 ${c.buyCost} MP` }));
    }

    // description_template
    if (c.description) {
      faceChildren.push(el("div", { class: "card-desc", text: c.description }));
    }
  }

  if (showStock && c.stock !== undefined && c.stock !== "") {
    faceChildren.push(el("div", { class: "card-stock", text: `庫存 ${c.stock}` }));
  }

  const faceLayer = el("div", { class: "card-face-layer" }, faceChildren);

  const cardNodeRoot = el("div", attrs, [
    el("img", {
      class: "card-img",
      src: showBack ? "assets/cards/card_back_default.png" : `assets/cards/${c.id}.png`,
      alt: c.name || c.id,
      onerror: (e) => {
        e.target.remove();
      },
      onload: () => {
        faceLayer.hidden = true;
      },
    }),
    faceLayer,
  ]);
  return cardNodeRoot;
}



