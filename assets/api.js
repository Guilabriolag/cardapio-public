/**
 * api.js — Camada de comunicação com o backend
 * Cardápio Digital SaaS — Repo Público
 *
 * REGRA: Todo fetch() do sistema público passa por aqui.
 * Nunca use fetch() diretamente em outros arquivos JS.
 */

const API_BASE = window.APP_CONFIG?.apiBase || 'https://api.seudominio.com/v1';
const LOJA_ID  = window.APP_CONFIG?.lojaId  || 'demo';

// ══════════════════════════════════════
//  CONFIGURAÇÃO INTERNA
// ══════════════════════════════════════

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept':        'application/json',
};

/**
 * Request base com tratamento de erros centralizado
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<{data: any, ok: boolean, error: string|null}>}
 */
async function request(endpoint, options = {}) {
  try {
    const url = `${API_BASE}/${LOJA_ID}${endpoint}`;
    const res  = await fetch(url, {
      ...options,
      headers: { ...defaultHeaders, ...options.headers },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
      return { data: null, ok: false, error: err.message || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { data, ok: true, error: null };

  } catch (err) {
    console.error('[api.js] Erro de rede:', err);
    return { data: null, ok: false, error: 'Erro de conexão. Verifique sua internet.' };
  }
}

// ══════════════════════════════════════
//  CARDÁPIO
// ══════════════════════════════════════

/**
 * Busca todos os produtos do cardápio
 * GET /v1/{loja_id}/menu
 */
export async function getMenu() {
  return request('/menu');
}

/**
 * Busca um produto específico
 * GET /v1/{loja_id}/menu/{id}
 */
export async function getProduct(id) {
  return request(`/menu/${id}`);
}

// ══════════════════════════════════════
//  PEDIDOS
// ══════════════════════════════════════

/**
 * Envia um novo pedido
 * POST /v1/{loja_id}/pedidos
 *
 * IMPORTANTE: Não enviar preços — backend calcula.
 * Apenas: { itens: [{id, qty}], cliente, tipo, bairro, pagamento }
 *
 * @param {{
 *   itens: Array<{id: number|string, qty: number}>,
 *   tipo: 'retirada'|'entrega',
 *   cliente: { nome: string, telefone?: string },
 *   endereco?: { logradouro: string, bairroId: string },
 *   pagamento: 'dinheiro'|'pix'|'credito'|'debito',
 *   troco?: number,
 *   observacoes?: string,
 *   cupom?: string
 * }} payload
 */
export async function postPedido(payload) {
  // Garante que preços NÃO sejam enviados (segurança)
  const itensLimpos = (payload.itens || []).map(({ id, qty }) => ({ id, qty }));

  return request('/pedidos', {
    method: 'POST',
    body: JSON.stringify({ ...payload, itens: itensLimpos }),
  });
}

/**
 * Consulta status de um pedido
 * GET /v1/{loja_id}/pedidos/{pedidoId}/status
 */
export async function getPedidoStatus(pedidoId) {
  return request(`/pedidos/${pedidoId}/status`);
}

// ══════════════════════════════════════
//  CUPONS
// ══════════════════════════════════════

/**
 * Valida um cupom de desconto
 * POST /v1/{loja_id}/cupons/validar
 */
export async function validarCupom(codigo, subtotal) {
  return request('/cupons/validar', {
    method: 'POST',
    body: JSON.stringify({ codigo, subtotal }),
  });
}

// ══════════════════════════════════════
//  CONFIGURAÇÕES PÚBLICAS
// ══════════════════════════════════════

/**
 * Busca configurações públicas da loja (nome, horário, bairros)
 * GET /v1/{loja_id}/config/public
 */
export async function getConfigPublica() {
  return request('/config/public');
}
