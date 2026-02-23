/**
 * checkout.js — Formulário e lógica de finalização de pedido
 * Cardápio Digital SaaS — Repo Público
 *
 * Responsabilidades:
 *  - Gerenciar modal de checkout
 *  - Controlar abas Retirada / Entrega
 *  - Renderizar seleção de bairro (retornando taxa do backend)
 *  - Enviar pedido via api.js (SEM preços no payload)
 *  - Redirecionar para pedido.html com o ID
 */

import { postPedido, validarCupom, getConfigPublica } from './api.js';
import { getSummary, buildOrderPayload, setOrderType, selectBairro, applyCoupon, removeCoupon, clearCart } from './cart.js';
import { fmtPrice, esc, maskPhone } from './utils.js';
import { clientStorage } from './storage.js';

// ══════════════════════════════════════
//  ESTADO LOCAL
// ══════════════════════════════════════

let _bairros      = [];  // carregado da API
let _currentType  = 'retirada';
let _isSubmitting = false;

// ══════════════════════════════════════
//  INICIALIZAÇÃO
// ══════════════════════════════════════

export async function initCheckout() {
  // Carrega configurações (bairros) da API
  const { data } = await getConfigPublica();
  _bairros = data?.bairros || [];

  bindCheckoutEvents();
  bindCouponEvents();
  prefillClientData();
}

// ══════════════════════════════════════
//  MODAL
// ══════════════════════════════════════

export function openCheckoutModal() {
  const summary = getSummary();
  if (summary.count === 0) return;

  renderOrderSummary(summary);
  renderBairroOptions();
  updateTotals(summary);

  document.getElementById('modal-checkout')?.classList.add('open');
}

export function closeCheckoutModal() {
  document.getElementById('modal-checkout')?.classList.remove('open');
}

// ══════════════════════════════════════
//  ABAS RETIRADA / ENTREGA
// ══════════════════════════════════════

export function switchOrderType(type) {
  _currentType = type;
  setOrderType(type);

  document.getElementById('tab-retirada')?.classList.toggle('active', type === 'retirada');
  document.getElementById('tab-entrega')?.classList.toggle('active', type === 'entrega');
  document.getElementById('section-retirada')?.classList.toggle('active', type === 'retirada');
  document.getElementById('section-entrega')?.classList.toggle('active', type === 'entrega');

  updateTotals(getSummary());
}

// ══════════════════════════════════════
//  BAIRROS
// ══════════════════════════════════════

function renderBairroOptions() {
  const container = document.getElementById('bairro-grid');
  if (!container) return;

  const summary = getSummary();

  container.innerHTML = _bairros.map(b => `
    <div
      class="bairro-option ${summary.bairro?.name === b.nome ? 'selected' : ''}"
      data-bairro-id="${esc(String(b.id))}"
      data-bairro-name="${esc(b.nome)}"
      data-bairro-taxa="${b.taxa}"
      role="button"
      tabindex="0"
    >
      <div class="bairro-name">${esc(b.nome)}</div>
      <div class="bairro-taxa">${b.taxa === 0 ? 'Grátis' : fmtPrice(b.taxa)}</div>
    </div>
  `).join('');
}

// ══════════════════════════════════════
//  RESUMO DO PEDIDO
// ══════════════════════════════════════

function renderOrderSummary(summary) {
  const container = document.getElementById('checkout-summary');
  if (!container) return;

  container.innerHTML = summary.items.map(item => `
    <div class="order-summary-item">
      <span>${item.emoji} ${esc(item.name)} × ${item.qty}</span>
      <span>${fmtPrice(item.price * item.qty)}</span>
    </div>
  `).join('');
}

function updateTotals(summary) {
  setText('co-subtotal', fmtPrice(summary.subtotal));
  setText('co-total',    fmtPrice(summary.total));

  const rowFrete   = document.getElementById('co-row-frete');
  const rowDesc    = document.getElementById('co-row-desconto');

  if (rowFrete) {
    const showFrete = _currentType === 'entrega' && summary.bairro;
    rowFrete.style.display = showFrete ? 'flex' : 'none';
    if (showFrete) {
      setText('co-frete', summary.frete === 0 ? 'Grátis' : fmtPrice(summary.frete));
    }
  }

  if (rowDesc) {
    rowDesc.style.display = summary.discount > 0 ? 'flex' : 'none';
    if (summary.discount > 0) {
      setText('co-desconto', `-${fmtPrice(summary.discount)}`);
    }
  }
}

// ══════════════════════════════════════
//  CUPOM
// ══════════════════════════════════════

async function handleApplyCoupon() {
  const input  = document.getElementById('coupon-input');
  const code   = input?.value?.trim()?.toUpperCase();
  if (!code) return;

  const summary     = getSummary();
  const { data, ok, error } = await validarCupom(code, summary.subtotal);

  if (!ok || !data?.valido) {
    showToast(data?.mensagem || error || 'Cupom inválido', 'error');
    return;
  }

  applyCoupon({ code, type: data.tipo, value: data.valor });
  updateTotals(getSummary());
  showToast(`Cupom ${code} aplicado! ✓`, 'success');
}

// ══════════════════════════════════════
//  SUBMISSÃO DO PEDIDO
// ══════════════════════════════════════

async function handleSubmitOrder() {
  if (_isSubmitting) return;

  // Coletar dados do formulário
  const cliente     = collectClientData();
  const pagamento   = collectPaymentData();
  const observacoes = document.getElementById('cart-notes')?.value?.trim() || '';

  // Validação
  const validationError = validateForm(cliente);
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  // Salvar dados do cliente para próxima vez
  clientStorage.save(cliente);

  _isSubmitting = true;
  setBtnLoading(true);

  const payload = buildOrderPayload(cliente, pagamento, observacoes);
  const { data, ok, error } = await postPedido(payload);

  setBtnLoading(false);
  _isSubmitting = false;

  if (!ok) {
    showToast(error || 'Erro ao enviar pedido. Tente novamente.', 'error');
    return;
  }

  // Sucesso — limpa carrinho e redireciona
  clearCart();
  closeCheckoutModal();
  window.location.href = `pedido.html?id=${data.pedidoId}`;
}

// ══════════════════════════════════════
//  COLETA DE DADOS
// ══════════════════════════════════════

function collectClientData() {
  if (_currentType === 'retirada') {
    return {
      nome:     document.getElementById('r-nome')?.value?.trim(),
      telefone: document.getElementById('r-telefone')?.value?.trim(),
    };
  }
  return {
    nome:     document.getElementById('e-nome')?.value?.trim(),
    telefone: document.getElementById('e-telefone')?.value?.trim(),
    logradouro: document.getElementById('e-endereco')?.value?.trim(),
    bairroId: document.querySelector('.bairro-option.selected')?.dataset?.bairroId,
  };
}

function collectPaymentData() {
  const prefix = _currentType === 'retirada' ? 'r' : 'e';
  const metodo = document.getElementById(`${prefix}-pagamento`)?.value;
  const troco  = parseFloat(document.getElementById(`${prefix}-troco`)?.value) || null;
  return { metodo, troco };
}

function validateForm(cliente) {
  if (!cliente.nome) return 'Informe seu nome.';
  if (_currentType === 'entrega') {
    if (!cliente.telefone) return 'Informe seu telefone.';
    if (!cliente.logradouro) return 'Informe seu endereço.';
    if (!cliente.bairroId)   return 'Selecione seu bairro.';
  }
  return null;
}

function prefillClientData() {
  const saved = clientStorage.get();
  if (!saved?.nome) return;

  const fields = ['r-nome', 'r-telefone', 'e-nome', 'e-telefone'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) {
      if (id.endsWith('nome'))     el.value = saved.nome      || '';
      if (id.endsWith('telefone')) el.value = saved.telefone  || '';
    }
  });
}

// ══════════════════════════════════════
//  BIND DE EVENTOS
// ══════════════════════════════════════

function bindCheckoutEvents() {
  // Abrir modal
  document.getElementById('btn-checkout')?.addEventListener('click', openCheckoutModal);

  // Fechar modal
  document.getElementById('modal-checkout')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-checkout') closeCheckoutModal();
  });

  document.querySelector('[data-close-checkout]')?.addEventListener('click', closeCheckoutModal);

  // Abas
  document.getElementById('tab-retirada')?.addEventListener('click', () => switchOrderType('retirada'));
  document.getElementById('tab-entrega')?.addEventListener('click',  () => switchOrderType('entrega'));

  // Seleção de bairro (delegação)
  document.getElementById('bairro-grid')?.addEventListener('click', (e) => {
    const opt = e.target.closest('.bairro-option');
    if (!opt) return;
    document.querySelectorAll('.bairro-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');

    selectBairro({
      id:   opt.dataset.bairroId,
      name: opt.dataset.bairroName,
      taxa: parseFloat(opt.dataset.bairroTaxa),
    });

    updateTotals(getSummary());
  });

  // Toggle troco
  document.getElementById('r-pagamento')?.addEventListener('change', (e) => toggleTroco('r', e.target.value));
  document.getElementById('e-pagamento')?.addEventListener('change', (e) => toggleTroco('e', e.target.value));

  // Submissão
  document.getElementById('btn-confirmar-pedido')?.addEventListener('click', handleSubmitOrder);

  // Atualizar totais ao abrir (escuta eventos do cart)
  document.addEventListener('cart:updated', (e) => {
    updateTotals(e.detail);
    renderBairroOptions();
  });

  // Máscara de telefone
  ['r-telefone', 'e-telefone'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', function() {
      this.value = maskPhone(this.value);
    });
  });
}

function bindCouponEvents() {
  document.getElementById('btn-aplicar-cupom')?.addEventListener('click', handleApplyCoupon);
  document.getElementById('coupon-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleApplyCoupon();
  });
}

// ══════════════════════════════════════
//  HELPERS DE UI
// ══════════════════════════════════════

function toggleTroco(prefix, paymentMethod) {
  const group = document.getElementById(`troco-group-${prefix}`);
  if (group) group.style.display = paymentMethod === 'dinheiro' ? 'block' : 'none';
}

function setBtnLoading(loading) {
  const btn = document.getElementById('btn-confirmar-pedido');
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? 'Enviando...' : '✅ Confirmar Pedido';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showToast(msg, type = '') {
  document.dispatchEvent(new CustomEvent('toast:show', { detail: { msg, type } }));
}
