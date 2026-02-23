/**
 * utils.js — Utilitários compartilhados
 * Cardápio Digital SaaS — Repo Público
 */

/** Formata valor em R$ */
export function fmtPrice(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;
}

/** Escapa HTML para evitar XSS ao inserir no DOM */
export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Máscara de telefone: (00) 00000-0000 */
export function maskPhone(value) {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
    .slice(0, 15);
}

/** Debounce */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Toast global (dispara evento) */
export function showToast(msg, type = '') {
  document.dispatchEvent(new CustomEvent('toast:show', { detail: { msg, type } }));
}
