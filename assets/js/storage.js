/**
 * storage.js — Abstração do localStorage
 * Cardápio Digital SaaS — Repo Público
 *
 * REGRA: Nunca use localStorage diretamente em outros arquivos.
 * Toda persistência local passa por aqui.
 */

const PREFIX = 'cdp_'; // cardapio-digital prefix

// ══════════════════════════════════════
//  STORAGE BASE
// ══════════════════════════════════════

function getKey(key) { return `${PREFIX}${key}`; }

export function save(key, value) {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('[storage] Falha ao salvar:', e);
    return false;
  }
}

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(getKey(key));
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('[storage] Falha ao carregar:', e);
    return fallback;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(getKey(key));
    return true;
  } catch (e) {
    return false;
  }
}

export function clear() {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    return true;
  } catch (e) {
    return false;
  }
}

// ══════════════════════════════════════
//  CARRINHO
// ══════════════════════════════════════

const CART_KEY = 'cart';

export const cartStorage = {
  get:    ()      => load(CART_KEY, []),
  save:   (items) => save(CART_KEY, items),
  clear:  ()      => remove(CART_KEY),
};

// ══════════════════════════════════════
//  CONFIGURAÇÃO LOCAL
// ══════════════════════════════════════

const CONFIG_KEY = 'config';

export const configStorage = {
  get:  ()        => load(CONFIG_KEY, {}),
  save: (config)  => save(CONFIG_KEY, config),
  merge:(partial) => {
    const current = load(CONFIG_KEY, {});
    return save(CONFIG_KEY, { ...current, ...partial });
  },
};

// ══════════════════════════════════════
//  ÚLTIMOS DADOS DO CLIENTE
// ══════════════════════════════════════

const CLIENT_KEY = 'last_client';

export const clientStorage = {
  get:  ()       => load(CLIENT_KEY, {}),
  save: (client) => save(CLIENT_KEY, client),
  clear: ()      => remove(CLIENT_KEY),
};
