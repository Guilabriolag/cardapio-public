/**
 * cart.js — Estado e lógica do carrinho
 * Cardápio Digital SaaS — Repo Público
 *
 * Responsabilidades:
 *  - Gerenciar estado do carrinho (memória + localStorage)
 *  - Calcular subtotal, descontos, frete
 *  - Disparar eventos para a UI atualizar
 *  - NÃO manipular DOM diretamente (apenas emite eventos)
 */

import { cartStorage } from './storage.js';

// ══════════════════════════════════════
//  ESTADO
// ══════════════════════════════════════

let _items       = cartStorage.get();  // [{ id, name, price, emoji, qty }]
let _coupon      = null;               // { code, type, value }
let _bairro      = null;               // { name, taxa }
let _orderType   = 'retirada';

// ══════════════════════════════════════
//  EVENTOS CUSTOMIZADOS
// ══════════════════════════════════════

function emit(event, detail = {}) {
  document.dispatchEvent(new CustomEvent(`cart:${event}`, { detail }));
}

// ══════════════════════════════════════
//  LEITURA
// ══════════════════════════════════════

export function getItems()     { return [..._items]; }
export function getCount()     { return _items.reduce((s, i) => s + i.qty, 0); }
export function getOrderType() { return _orderType; }
export function getCoupon()    { return _coupon; }
export function getBairro()    { return _bairro; }
export function isEmpty()      { return _items.length === 0; }

export function getSubtotal() {
  return _items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function getDiscount() {
  if (!_coupon) return 0;
  const sub = getSubtotal();
  if (_coupon.type === 'percent') return sub * (_coupon.value / 100);
  if (_coupon.type === 'fixed')   return Math.min(_coupon.value, sub);
  return 0;
}

export function getFrete() {
  if (_orderType !== 'entrega') return 0;
  if (_coupon?.type === 'shipping') return 0;
  return _bairro?.taxa ?? 0;
}

export function getTotal() {
  return getSubtotal() - getDiscount() + getFrete();
}

export function getSummary() {
  return {
    items:    getItems(),
    count:    getCount(),
    subtotal: getSubtotal(),
    discount: getDiscount(),
    frete:    getFrete(),
    total:    getTotal(),
    coupon:   getCoupon(),
    bairro:   getBairro(),
    orderType: getOrderType(),
  };
}

// ══════════════════════════════════════
//  MUTAÇÕES
// ══════════════════════════════════════

function persist() {
  cartStorage.save(_items);
}

/**
 * Adiciona produto. Se já existir, incrementa qty.
 * @param {{ id, name, price, emoji }} product
 */
export function addItem(product) {
  const existing = _items.find(i => i.id === product.id);
  if (existing) {
    existing.qty++;
  } else {
    _items.push({ id: product.id, name: product.name, price: product.price, emoji: product.emoji || '🍴', qty: 1 });
  }
  persist();
  emit('updated', getSummary());
  emit('item-added', { product });
}

/**
 * Altera quantidade. Se qty <= 0, remove o item.
 * @param {number|string} id
 * @param {number} delta — ex: +1 ou -1
 */
export function changeQty(id, delta) {
  const idx = _items.findIndex(i => i.id === id);
  if (idx === -1) return;
  _items[idx].qty += delta;
  if (_items[idx].qty <= 0) {
    _items.splice(idx, 1);
  }
  persist();
  emit('updated', getSummary());
}

/**
 * Remove item pelo id
 */
export function removeItem(id) {
  _items = _items.filter(i => i.id !== id);
  persist();
  emit('updated', getSummary());
}

/**
 * Limpa o carrinho completamente
 */
export function clearCart() {
  _items   = [];
  _coupon  = null;
  _bairro  = null;
  cartStorage.clear();
  emit('updated', getSummary());
  emit('cleared');
}

/**
 * Define o tipo de pedido
 * @param {'retirada'|'entrega'} type
 */
export function setOrderType(type) {
  _orderType = type;
  emit('updated', getSummary());
}

/**
 * Aplica cupom (já validado pelo backend)
 * @param {{ code: string, type: 'percent'|'fixed'|'shipping', value: number }} coupon
 */
export function applyCoupon(coupon) {
  _coupon = coupon;
  emit('updated', getSummary());
  emit('coupon-applied', { coupon });
}

export function removeCoupon() {
  _coupon = null;
  emit('updated', getSummary());
}

/**
 * Seleciona bairro de entrega
 * @param {{ name: string, taxa: number }} bairro
 */
export function selectBairro(bairro) {
  _bairro = bairro;
  emit('updated', getSummary());
}

// ══════════════════════════════════════
//  PAYLOAD PARA API (sem preços!)
// ══════════════════════════════════════

/**
 * Retorna payload limpo para enviar ao backend.
 * Preços são omitidos — backend calcula com base no banco.
 */
export function buildOrderPayload(cliente, pagamento, observacoes = '') {
  return {
    itens: _items.map(({ id, qty }) => ({ id, qty })), // sem preço
    tipo: _orderType,
    cliente,
    endereco: _orderType === 'entrega' && _bairro ? { bairroId: _bairro.id } : undefined,
    pagamento,
    observacoes,
    cupom: _coupon?.code || undefined,
  };
}
