# 🍔 cardapio-public

**Repositório Público** — Frontend do cliente final

## Visão Geral

Interface pública do sistema de Cardápio Digital SaaS.
Contém **apenas** o que o cliente final vê: cardápio, carrinho e checkout.

```
cardapio-public/
├── pages/
│   ├── menu.html        ← Cardápio + carrinho
│   ├── checkout.html    ← Resumo do pedido (opcional, alternativo ao modal)
│   └── pedido.html      ← Confirmação de pedido
│
└── assets/
    ├── css/
    │   ├── reset.css    ← Normalize
    │   ├── theme.css    ← Variáveis CSS (cores, fontes, espaçamento)
    │   ├── layout.css   ← Grid, topbar, containers
    │   ├── menu.css     ← Cards, categorias, badges
    │   └── cart.css     ← Carrinho lateral, checkout modal
    │
    └── js/
        ├── api.js       ← Todo fetch() passa por aqui
        ├── menu.js      ← Renderiza produtos e filtros
        ├── cart.js      ← Estado do carrinho (sem DOM)
        ├── checkout.js  ← Formulário e envio do pedido
        ├── storage.js   ← Abstração do localStorage
        └── utils.js     ← Helpers compartilhados
```

## Regras de Ouro

- ❌ **Nunca** conter CSS inline ou `<style>` nos HTMLs
- ❌ **Nunca** conter JS inline (`onclick=`) nos HTMLs
- ❌ **Nunca** conter chaves de API, tokens ou secrets
- ❌ **Nunca** calcular preços — apenas exibir o que a API retorna
- ✅ Todo `fetch()` passa por `api.js`
- ✅ Todo localStorage passa por `storage.js`

## Configuração

Edite o objeto `APP_CONFIG` no `<head>` de cada HTML:

```html
<script>
  window.APP_CONFIG = {
    apiBase: 'https://api.seudominio.com/v1',
    lojaId:  'minha-loja',
  };
</script>
```

## Deploy

Compatível com:
- **Cloudflare Pages** (recomendado)
- GitHub Pages
- Netlify
- Vercel

```bash
# Cloudflare Pages
npx wrangler pages deploy ./
```

## Variáveis de Ambiente (.env.example)

```
# Apenas URL da API — nunca secrets aqui
VITE_API_BASE=https://api.seudominio.com/v1
VITE_LOJA_ID=minha-loja
```
