/**
 * menu.js — Renderização e filtros do cardápio
 * Cardápio Digital SaaS — Repo Público
 *
 * Responsabilidades:
 *  - Buscar produtos via api.js
 *  - Renderizar cards e categorias
 *  - Gerenciar filtro de categoria
 *  - Escutar eventos do cart.js (feedback visual)
 */

import { getMenu }         from './api.js';
import { addItem }         from './cart.js';
import { fmtPrice, esc }   from './utils.js';

// ══════════════════════════════════════
//  ESTADO
// ══════════════════════════════════════

let _allProducts    = [];
let _selectedCat    = 'all';

// ══════════════════════════════════════
//  INICIALIZAÇÃO
// ══════════════════════════════════════

export async function initMenu() {
  const { data, ok, error } = await getMenu();

  if (!ok) {
    showError(error);
    return;
  }

  _allProducts = data.produtos || data || [];
  renderCategoryPills();
  renderProducts();
  bindEvents();
}

// ══════════════════════════════════════
//  RENDER — CATEGORIAS
// ══════════════════════════════════════

function getCategories() {
  return [...new Set(_allProducts.map(p => p.categoria))].filter(Boolean).sort();
}

function renderCategoryPills() {
  const container = document.getElementById('cat-pills');
  if (!container) return;

  const cats = getCategories();
  const pills = [{ value: 'all', label: 'Todos' }, ...cats.map(c => ({ value: c, label: c }))];

  container.innerHTML = pills
    .map(({ value, label }) => `
      <button
        class="cat-pill ${_selectedCat === value ? 'active' : ''}"
        data-cat="${esc(value)}"
        type="button"
      >${esc(label)}</button>
    `)
    .join('');
}

// ══════════════════════════════════════
//  RENDER — PRODUTOS
// ══════════════════════════════════════

function getFiltered() {
  if (_selectedCat === 'all') return _allProducts;
  return _allProducts.filter(p => p.categoria === _selectedCat);
}

function groupByCategory(products) {
  return products.reduce((acc, p) => {
    const cat = p.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
}

function renderProducts() {
  const container = document.getElementById('menu-products');
  const empty     = document.getElementById('menu-empty');
  if (!container) return;

  const filtered = getFiltered();

  if (filtered.length === 0) {
    container.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }

  empty?.classList.add('hidden');

  const grouped = _selectedCat === 'all' ? groupByCategory(filtered) : { [_selectedCat]: filtered };
  let html = '';

  Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([cat, products]) => {
      if (_selectedCat === 'all') {
        html += `<div class="section-sep">${esc(cat)}</div>`;
      }

      html += '<div class="product-grid">';
      products.forEach((p, i) => {
        html += buildProductCard(p, i);
      });
      html += '</div>';
    });

  container.innerHTML = html;
}

function buildProductCard(p, index) {
  const unavailable = p.disponivel === false;
  const lowStock    = p.estoque !== -1 && p.estoque !== null && p.estoque <= 3;

  const badges = [
    unavailable ? `<span class="card-badge unavailable-badge">Indisponível</span>` : '',
    p.isCombo    ? `<span class="card-badge combo-badge">COMBO</span>`             : '',
    lowStock     ? `<span class="card-badge low-stock-badge">⚠️ ${p.estoque} rest.</span>` : '',
  ].join('');

  return `
    <div
      class="product-card ${unavailable ? 'unavailable' : ''}"
      data-id="${esc(String(p.id))}"
      style="animation-delay: ${index * 30}ms"
      role="button"
      tabindex="0"
      aria-label="Adicionar ${esc(p.nome)} ao carrinho"
    >
      ${badges}
      <span class="product-emoji" aria-hidden="true">${p.emoji || '🍴'}</span>
      <div class="product-name">${esc(p.nome)}</div>
      ${p.descricao ? `<div class="product-desc">${esc(p.descricao)}</div>` : ''}
      <div class="product-footer">
        <span class="product-price">${fmtPrice(p.preco)}</span>
        <div style="display:flex;align-items:center;gap:6px">
          <button
            class="btn-add-cart"
            data-id="${esc(String(p.id))}"
            aria-label="Adicionar ao carrinho"
            type="button"
          >+</button>
        </div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════════
//  EVENTOS
// ══════════════════════════════════════

function bindEvents() {
  // Filtro de categoria (delegação)
  document.getElementById('cat-pills')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-pill');
    if (!btn) return;
    _selectedCat = btn.dataset.cat;
    renderCategoryPills();
    renderProducts();
  });

  // Adicionar ao carrinho (delegação no grid)
  document.getElementById('menu-products')?.addEventListener('click', (e) => {
    // Botão "+" direto
    const addBtn = e.target.closest('.btn-add-cart');
    if (addBtn) {
      e.stopPropagation();
      handleAddToCart(addBtn.dataset.id);
      return;
    }
    // Click no card inteiro
    const card = e.target.closest('.product-card:not(.unavailable)');
    if (card) {
      handleAddToCart(card.dataset.id);
    }
  });

  // Acessibilidade — teclado nos cards
  document.getElementById('menu-products')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.product-card:not(.unavailable)');
      if (card) {
        e.preventDefault();
        handleAddToCart(card.dataset.id);
      }
    }
  });
}

function handleAddToCart(productId) {
  const product = _allProducts.find(p => String(p.id) === String(productId));
  if (!product || product.disponivel === false) return;

  addItem({
    id:    product.id,
    name:  product.nome,
    price: product.preco,
    emoji: product.emoji,
  });
}

// ══════════════════════════════════════
//  ESTADOS DE UI
// ══════════════════════════════════════

function showError(message) {
  const container = document.getElementById('menu-products');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <p>${esc(message || 'Erro ao carregar o cardápio.')}</p>
    </div>
  `;
}
