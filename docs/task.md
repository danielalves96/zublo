# Zublo — Task Tracker

## Etapa 0 — Análise do Projeto Original (Wallos)
- [x] Varredura completa de 90+ endpoints PHP, 15+ scripts JS, 16 páginas raiz
- [x] Plano de implementação definitivo escrito

## Etapa 1 — Backend: PocketBase Schema ✅
- [x] `pb_migrations/0001_create_schema.js` — 15 collections com campos, regras de acesso e relações
- [x] `pb_migrations/0002_seed_data.js` — Ciclos (4), frequências (29), admin_settings singleton
- [x] `pb_hooks/onboarding.pb.js` — Seed per-user: 17 categorias, 34 moedas, 31 payments, 1 household

## Etapa 2 — Backend: Cronjobs ✅
- [x] `pb_hooks/crons.pb.js` — 6 cronjobs implementados:
  - [x] updateNextPayment (diário à meia-noite)
  - [x] updateExchange (diário às 2h — Fixer/APILayer)
  - [x] storeYearlyCost (mensal dia 1 às 3h)
  - [x] sendNotifications (diário às 8h — 10 providers)
  - [x] sendCancellationNotifications (diário às 9h)
  - [x] checkForUpdates (semanal domingo à meia-noite)

## Etapa 3 — Backend: API Routes Custom ✅
- [x] Logo search (Google/Brave scraping)
- [x] AI generate/models endpoints
- [x] Subscriptions export/clone/renew
- [x] Calendar iCal feed + monthly data
- [x] Backup/restore
- [x] Admin delete unused logos
- [x] Payment methods icon search

## Etapa 4 — Frontend: React/Vite/shadcn ✅
- [x] Scaffolding (Vite, tsconfig, tailwind, postcss, vite.config.ts, index.html)
- [x] Core libs: pb.ts, utils.ts, toast.ts, i18n.ts + 16 locales
- [x] types.ts — todas as interfaces TypeScript
- [x] AuthContext.tsx — login/logout/refreshUser/isAdmin
- [x] shadcn/ui primitives: button, input, label, card, dialog, select, switch, progress, tabs, textarea, alert-dialog, separator
- [x] Layout.tsx + Toaster.tsx + App.tsx (router, temas, ProtectedRoute, AdminRoute)
- [x] Auth (login, register, 2FA, password reset)
- [x] Dashboard (cards resumo, budget, mini chart, AI recommendations)
- [x] Subscriptions (CRUD com 20+ campos, filtros, sort, search, clone, renew, export)
- [x] SubscriptionFormModal (add/edit com logo search e upload)
- [x] Calendar (nav mês/ano, grid, eventos por dia, iCal export/feed)
- [x] Statistics (pie + line charts, agrupamento por categoria/pagamento/membro)
- [x] Settings (profile, 2FA QR, household, categories, currencies/fixer, payments/drag-reorder, display, theme/custom-css, notifications 7 providers, AI, API key, delete account)
- [x] Admin (users CRUD, registration settings, SMTP, OIDC/SSO, security/webhook allowlist, backup/restore, cronjob runner, maintenance)
- [x] i18n: 16 idiomas implementados
- [ ] PWA (service worker) — em aberto

## Etapa 5 — Docker
- [ ] Dockerfile multi-stage
- [ ] docker-compose.yml
- [ ] Volumes e persistência

## Etapa 6 — Verificação
- [ ] Testes E2E (Playwright)
- [ ] Testes unitários (cronjobs)
- [ ] Verificação manual
