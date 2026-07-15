import { getScenarioByName } from "./scenarios.js";

let cachedEngineApi = null;
let cachedLoadError = null;

async function tryLoadRealEngineApi() {
  if (cachedEngineApi) {
    return cachedEngineApi;
  }

  if (cachedLoadError) {
    throw cachedLoadError;
  }

  try {
    const engineUrl = new URL("../gameEngine.js", import.meta.url);
    console.log("[browser-engine-adapter] engineUrl =", engineUrl.href);
    const engineModule = await import(engineUrl.href);

    const api =
      engineModule?.createMatch && engineModule?.submitSelection && engineModule?.playOneTurn
        ? engineModule
        : engineModule?.default &&
            engineModule.default.createMatch &&
            engineModule.default.submitSelection &&
            engineModule.default.playOneTurn
          ? engineModule.default
          : null;

    if (!api) {
      throw new Error(
        "gameEngine module loaded but did not expose createMatch / submitSelection / playOneTurn"
      );
    }

    cachedEngineApi = api;
    return api;
  } catch (error) {
    cachedLoadError = error instanceof Error ? error : new Error(String(error));
    throw cachedLoadError;
  }
}

function summarizePlayer(player) {
  return {
    id: player.id,
    hp: player.hp,
    mp: player.mp,
    position: player.position,
    handCount: Array.isArray(player.hand) ? player.hand.length : 0,
    deckCount: Array.isArray(player.deck) ? player.deck.length : 0,
    discardCount: Array.isArray(player.discard) ? player.discard.length : 0,
    lastRevealedSubtype: player.lastRevealedSubtype || null,
  };
}

function summarizeShop(state) {
  if (!Array.isArray(state.shop)) {
    return [];
  }

  return state.shop.map((item) => ({
    id: item.id,
    stock: item.stock,
    cost: item.cost,
  }));
}

function summarizeState(state) {
  return {
    round: state.round ?? null,
    startingPlayerIndex: state.startingPlayerIndex ?? null,
    stackCount: Array.isArray(state.stack) ? state.stack.length : 0,
    players: Array.isArray(state.players) ? state.players.map(summarizePlayer) : [],
    shop: summarizeShop(state),
    log: Array.isArray(state.log) ? [...state.log] : [],
  };
}

function summarizeSelection(selection) {
  return selection.map((item) => ({
    cardId: item.card?.id ?? item.cardId ?? null,
    type: item.card?.type ?? item.type ?? null,
    subtype: item.card?.subtype ?? item.subtype ?? null,
    extra: item.extra ?? {},
  }));
}

function buildCardLookupFromState(state) {
  const lookup = new Map();

  for (const player of state.players ?? []) {
    for (const card of player.hand ?? []) {
      if (card?.id) {
        lookup.set(card.id, card);
      }
    }

    for (const card of player.deck ?? []) {
      if (card?.id && !lookup.has(card.id)) {
        lookup.set(card.id, card);
      }
    }

    for (const card of player.discard ?? []) {
      if (card?.id && !lookup.has(card.id)) {
        lookup.set(card.id, card);
      }
    }
  }

  for (const shopItem of state.shop ?? []) {
    if (shopItem?.id && !lookup.has(shopItem.id)) {
      lookup.set(shopItem.id, shopItem);
    }
  }

  return lookup;
}

function hydrateSelection(state, scenarioSelection) {
  const lookup = buildCardLookupFromState(state);

  return scenarioSelection.map((item) => {
    const card = lookup.get(item.cardId);

    if (!card) {
      throw new Error(`Card not found in current match state: ${item.cardId}`);
    }

    return {
      card,
      extra: item.extra ?? {},
    };
  });
}

export async function getAdapterStatus() {
  try {
    await tryLoadRealEngineApi();
    return {
      mode: "real-engine",
      ok: true,
      message: "Real engine adapter loaded.",
    };
  } catch (error) {
    return {
      mode: "adapter-error",
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runScenarioWithRealEngine(scenarioName) {
  const scenario = getScenarioByName(scenarioName);

  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  const engineApi = await tryLoadRealEngineApi();
  const state = engineApi.createMatch();

  const initialState = summarizeState(state);

  const p1Selection = hydrateSelection(state, scenario.p1Selection);
  const p2Selection = hydrateSelection(state, scenario.p2Selection);

  engineApi.submitSelection(state, "P1", p1Selection);
  engineApi.submitSelection(state, "P2", p2Selection);
  engineApi.playOneTurn(state);

  return {
    scenario: {
      name: scenario.name,
      description: scenario.description,
    },
    initialState,
    p1Selection: summarizeSelection(p1Selection),
    p2Selection: summarizeSelection(p2Selection),
    finalState: summarizeState(state),
    log: Array.isArray(state.log) ? [...state.log] : [],
    error: null,
    adapterMode: "real-engine",
  };
}