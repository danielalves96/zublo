# Zublo — Plano de Implementação Definitivo

> Baseado em varredura **arquivo-a-arquivo** de 90+ endpoints PHP, 15+ scripts JS, e 16 páginas raiz do Wallos original.

---

## Stack Alvo
| Camada | Tecnologia |
|--------|-----------|
| Backend + DB | **PocketBase** (auth nativa, SQLite embutido, `pb_hooks` JS, cron, file storage) |
| Frontend | **Vite + React + TypeScript** |
| UI Kit | **shadcn/ui** (Radix primitives) |
| Gráficos | **Recharts** |
| i18n | **i18next** (31 idiomas migrados de `.js` para `.json`) |
| Container | **Docker** single-binary (~50 MB) |

---

## ETAPA 1 — Backend: PocketBase Schema & Collections

### 1.1 Collections Auth
| Collection | Campos adicionais | Origem |
|---|---|---|
| `users` (auth) | `main_currency` (relation→currencies), `avatar` (file), `language`, `totp_secret` (text/private), `totp_enabled` (bool), `backup_code`, `color_theme`, `custom_theme_colors` (json), `custom_css` (text), `dark_theme` (int: 0=light,1=dark,2=auto), `monthly_price` (bool), `show_original_price` (bool), `hide_disabled` (bool), `disabled_to_bottom` (bool), `subscription_progress` (bool), `mobile_navigation` (bool), `remove_background` (bool), `api_key` (text), `budget` (number) | `user` table + `endpoints/settings/*` |

### 1.2 Collections Base
| Collection | Campos | Seed | Origem |
|---|---|---|---|
| `household` | `name`, `user` (relation→users) | 1 membro "Me" por user | `household` table |
| `categories` | `name`, `user` (relation→users) | 17 categorias default | `categories` table |
| `payment_methods` | `name`, `icon` (text), `enabled` (bool), `sort_order` (int), `user` (rel) | 31 métodos default | `payment_methods` table |
| `currencies` | `name`, `code`, `symbol`, `rate` (float), `main_currency` (bool), `user` (rel) | 34 moedas default | `currencies` table |
| `cycles` | `name` | 4: Daily/Weekly/Monthly/Yearly | `cycles` table |
| `frequencies` | `name`, `cycle` (rel→cycles), `value` (int) | 31 freq default | `frequencies` table |
| `subscriptions` | `name`, `logo` (file), `price` (float), `currency` (rel), `frequency` (int), `cycle` (rel), `next_payment` (date), `auto_renew` (bool), `start_date` (date), `payment_method` (rel), `payer` (rel→household), `category` (rel), `notes` (text), `url` (url), `notify` (bool), `notify_days_before` (int), `inactive` (bool), `cancellation_date` (date), `replacement_subscription` (rel→self), `user` (rel) | — | `subscriptions` table + `endpoints/subscription/add.php` |
| `notifications_config` | `user` (rel), `type` (select: email/discord/telegram/gotify/pushover/ntfy/pushplus/mattermost/webhook/serverchan), `enabled` (bool), `config` (json) | — | `notifications` table + 22 endpoints save/test |
| `fixer_settings` | `api_key`, `base_url`, `provider` (select: fixer/apilayer), `user` (rel) | — | `fixer` + `endpoints/currency/*` |
| `ai_settings` | `user` (rel), `type` (select: chatgpt/gemini/openrouter/ollama), `enabled` (bool), `api_key`, `model`, `url` | — | `ai_settings` table |
| `ai_recommendations` | `user` (rel), `type`, `title`, `description`, `savings` | — | `ai_recommendations` table |
| `admin_settings` | `open_registrations` (bool), `max_users` (int), `require_email_validation` (bool), `server_url`, `disable_login` (bool), `oidc_enabled` (bool), `oidc_config` (json: name/clientId/secret/authUrl/tokenUrl/userInfoUrl/redirectUrl/logoutUrl/identifier/scopes/authStyle/autoCreate/passwordDisabled), `update_notification` (bool), `webhook_allowlist` (text), `smtp_config` (json: address/port/encryption/username/password/fromEmail) | — | `admin.php` + `endpoints/admin/*` |
| `yearly_costs` | `user` (rel), `year` (int), `month` (int), `cost` (float) | — | `storetotalyearlycost.php` |
| `exchange_log` | `last_update` (date) | — | `last_exchange_update` table |

---

## ETAPA 2 — Backend: Cronjobs (`pb_hooks`)

Cada cronjob original vira um `cronAdd()` no PocketBase:

| Cron | Schedule | Lógica | Origem |
|---|---|---|---|
| `updateNextPayment` | `0 0 * * *` | Para cada sub ATIVA com `auto_renew=true` e `next_payment <= hoje`: calcular próx. data baseado em `cycle` (1=dias, 2=semanas, 3=meses, 4=anos) × `frequency`. Loop enquanto `next_payment <= hoje`. | `updatenextpayment.php` |
| `updateExchange` | `0 2 * * *` | Para cada user com `fixer_api_key`: chamar Fixer/APILayer API, recalcular `rate` de cada moeda relativa à `main_currency`. Suporta 2 providers com URLs distintas. | `updateexchange.php` |
| `storeYearlyCost` | `0 3 1 * *` | Calcular custo mensal total (usando `getPricePerMonth` com conversão de câmbio) e salvar em `yearly_costs`. | `storetotalyearlycost.php` |
| `sendNotifications` | `0 8 * * *` | Para cada sub com `notify=true`: se `next_payment - notify_days_before <= hoje`, disparar para todos os providers habilitados do user. Agrupa por `payer_user_id`. Suporta 10 providers com templates de webhook (`{{subscription_name}}`, `{{subscription_price}}`, etc). | `sendnotifications.php` (889 linhas) |
| `sendCancellationNotifications` | `0 9 * * *` | Notificar sobre subscriptions com `cancellation_date` próxima. | `sendcancellationnotifications.php` |
| `checkForUpdates` | `0 0 * * 0` | Checar GitHub releases para nova versão do Zublo. | `checkforupdates.php` |

---

## ETAPA 3 — Backend: API Routes Custom (`pb_hooks`)

| Rota | Método | Lógica | Origem |
|---|---|---|---|
| `/api/logo_search` | GET `?search=` | Scraping Google Images (filtro `iar:xw,ift:png`) com fallback para Brave Search. Extrai `<img>` tags da resposta HTML. Suporta proxy via env vars. | `endpoints/logos/search.php` |
| `/api/ai/generate` | POST | Recebe subs do user, monta prompt com 200+ palavras pedindo 3-7 recomendações. Chama ChatGPT/Gemini/OpenRouter/Ollama conforme `ai_settings`. Salva resultado em `ai_recommendations`. Respeita idioma do user. | `endpoints/ai/generate_recommendations.php` (327 linhas) |
| `/api/ai/models` | GET | Lista modelos disponíveis para o provider configurado. Para Ollama: `GET /api/tags`. Para OpenAI/OpenRouter: `GET /v1/models`. | `endpoints/ai/fetch_models.php` |
| `/api/subscriptions/export` | GET | Exporta todas as subs do user como JSON (com campos formatados: cycle, payment method, category, payer, price + symbol). | `endpoints/subscriptions/export.php` |
| `/api/calendar/ical` | GET `?key=` | Gera feed iCalendar (`.ics`) com todos os próximos pagamentos como VEVENT. Autenticado por `api_key`. | `endpoints/subscription/exportcalendar.php` |
| `/api/calendar/data` | GET `?month=&year=` | Retorna subscriptions filtradas por mês/ano para renderizar no calendário. | `endpoints/subscription/getcalendar.php` |
| `/api/subscription/clone` | POST | Duplica uma subscription com novo ID. | `endpoints/subscription/clone.php` |
| `/api/subscription/renew` | POST | Renova manualmente (avança `next_payment` para próximo ciclo). | `endpoints/subscription/renew.php` |
| `/api/db/backup` | POST | Gera ZIP do `pb_data/` para download. | `endpoints/db/backup.php` |
| `/api/db/restore` | POST | Restaura de ZIP validando conteúdo. | `endpoints/db/restore.php` |
| `/api/payments/search` | GET `?search=` | Busca ícones de payment methods (ex: ícones de cartões de crédito). | `endpoints/payments/search.php` |
| `/api/admin/deleteunusedlogos` | POST | Remove logos órfãos não referenciados por nenhuma subscription. | `endpoints/admin/deleteunusedlogos.php` |

---

## ETAPA 4 — Frontend: Pages & Features

### 4.1 Auth (4 telas)
| Tela | Features | Origem |
|---|---|---|
| **Login** | Email + password, OIDC button (se habilitado), "Remember me" com `login_tokens`, auto-detect dark/light theme | `login.php` + `login.js` |
| **Registration** | Username, email, password (+confirm), seletor de moeda principal, persistência de form fields via localStorage, import de DB na criação, language selector | `registration.php` + `registration.js` |
| **TOTP/2FA** | Tela de input de código OTP após login (se `totp_enabled`) | `totp.php` |
| **Password Reset** | Email para reset | `passwordreset.php` |
| **Email Verification** | Verificação de email após registro (se `require_email_validation`) | `verifyemail.php` |

### 4.2 Dashboard (`/dashboard`)
| Feature | Detalhe | Origem |
|---|---|---|
| Cards resumo | Total mensal/anual/semanal/diário convertido na `main_currency` | `index.php` + `subscriptions/get.php` |
| Recomendações IA | Cards expansíveis com título/descrição/savings, botão de delete individual | `dashboard.js` |
| Budget Widget | Barra de progresso: gasto atual vs. `budget` do user | `user/budget.php` |
| Mini Chart | Histórico de custos via `yearly_costs` | `storetotalyearlycost.php` |

### 4.3 Subscriptions (`/subscriptions`)
| Feature | Detalhe | Origem |
|---|---|---|
| Listagem | Cards com logo, nome, preço, próx. pagamento, badge de ciclo, progress bar (se `subscription_progress`), preço original (se `show_original_price`). Se `monthly_price`: mostra preço convertido para mensal. If `hide_disabled`: oculta inativos. If `disabled_to_bottom`: move inativos pro final. | `subscriptions.php` + `subscriptions/get.php` |
| Sort | Por nome/preço/data/estado, salvo em cookie (30 dias) | `subscriptions.js:setSortOption` |
| Search | Filtro local por nome (client-side) | `subscriptions.js:searchSubscriptions` |
| Filtros Multi | 5 dimensões: category, member, payment_method, state (active/inactive), renewalType (auto/manual). Multi-select com toggle visual. | `subscriptions.js:activeFilters` |
| **Form Modal (add/edit)** | 20+ campos: name, price, currency, frequency, cycle, next_payment (auto-fill), start_date, payment_method, payer (household), category, notes, url, auto_renew, notify, notify_days_before, inactive (+replacement_subscription se inactive), cancellation_date, logo (upload file OU URL da busca) | `subscriptions.js` + `subscription/add.php` |
| Logo Search | Popup de busca de logos via Google/Brave, clique para selecionar | `subscriptions.js:searchLogo` |
| SVG→PNG | Upload de SVG é convertido para PNG via canvas | `subscriptions.js:convertSvgToPng` |
| Logo Fetch URL | Download de logo via URL com validação SSRF (no private IPs), resize 135×42px, suporte Imagick e GD, opção remove background | `subscription/add.php` |
| Clone | Duplica subscription | `subscription/clone.php` |
| Renew | Avança `next_payment` para próximo ciclo manualmente | `subscription/renew.php` |
| Delete | Com confirmação | `subscription/delete.php` |
| Mobile Swipe | Gestos de swipe para revelar ações (edit/clone/renew/delete) com animação-hint na primeira subscription | `subscriptions.js:setSwipeElements` |
| Export CSV | Exporta todas as subs como JSON/CSV | `subscriptions/export.php` |

### 4.4 Calendar (`/calendar`)
| Feature | Detalhe | Origem |
|---|---|---|
| Navegação mês/ano | `<` `>` para mudar mês, seletor de ano | `calendar.js` |
| Grid de dias | Highlight nos dias com payment_date, mostra logo mini + preço | `calendar.js` |
| Modal detalhe | Clique no dia mostra lista de subs com detalhes completos | `calendar.js` |
| iCal Export | Gera arquivo `.ics` para download (VTIMEZONE + VEVENT para cada sub) | `subscription/exportcalendar.php` |
| iCal Feed URL | URL pública autenticada por `api_key` para sincronizar com Google Calendar/Apple Calendar | `subscription/exportcalendar.php` |

### 4.5 Statistics (`/stats`)
| Feature | Detalhe | Origem |
|---|---|---|
| Gráfico Pizza | Custo por categoria/payment_method/payer, com formatação Intl de moeda | `stats.js:loadGraph` |
| Gráfico Linha | Histórico de custo total (yearly_costs) com eixo Y formatado por moeda | `stats.js:loadLineGraph` |
| Filtros | 3 dimensões: category, member, payment — via URL params | `stats.js:filter-item` |
| Totais | Total mensal/anual/semanal com conversão de câmbio | `stats.php` |

### 4.6 Settings (`/settings`)
| Seção | Features | Origem |
|---|---|---|
| **Profile** | Nome, email, senha, upload avatar (seleção de built-in + arquivo customizado), delete avatar | `profile.js` |
| **2FA/TOTP** | Enable: gera secret → QR code → input verificação → backup codes. Disable: input de código → confirma. | `profile.js` + `user/enable_totp.php` |
| **Household** | CRUD de membros pagadores | `settings.js` + `endpoints/household/*` |
| **Categories** | CRUD de categorias | `settings.js` + `endpoints/categories/*` |
| **Currencies** | CRUD de moedas + definir main_currency | `settings.js` + `endpoints/currency/*` |
| **Fixer API** | Input de API key + provider selector (Fixer.io / APILayer) + forçar atualização manual | `settings.js` + `endpoints/currency/fixer_api_key.php` |
| **Payment Methods** | CRUD com toggle enable/disable, rename, reorder (drag-and-drop via Sortable.js), busca de ícone | `settings.js` + `endpoints/payments/*` |
| **Display Options** | 8 toggles: `monthly_price`, `show_original_price`, `hide_disabled`, `disabled_to_bottom`, `subscription_progress`, `mobile_navigation`, `remove_background`, `convert_currency` | `endpoints/settings/*.php` (8 arquivos) |
| **Theme** | Dark/Light/Auto selector, 5 cores preset (blue/red/green/yellow/purple), custom colors (main/accent/hover) via color picker, reset | `theme.js` |
| **Custom CSS** | Editor textarea para CSS customizado do user | `theme.js:saveCustomCss` |
| **Notifications** | Config para cada um dos 10 providers: Email (SMTP), Discord (webhook URL), Telegram (bot token + chat ID), Gotify (URL + token), Pushover (user key + API token), Ntfy (URL + topic), PushPlus (token), Mattermost (webhook), Webhook (URL customizada + template vars), Serverchan (key). Cada um com botão "test". | `notifications.js` + 22 endpoints save/test |
| **AI Settings** | Provider selector (ChatGPT/Gemini/OpenRouter/Ollama), API key/URL, model selector (dinâmico via fetch_models), enable/disable | `endpoints/ai/save_settings.php` |
| **API Key** | Gerar/regenerar API key para iCal feed | `user/regenerateapikey.php` |
| **Delete Account** | Confirmação + deletar tudo do user | `settings/deleteaccount.php` |

### 4.7 Admin (`/admin`) — Apenas para owner (user_id=1)
| Feature | Detalhe | Origem |
|---|---|---|
| User Management | Listar users, add user (username/email/password), delete user | `admin.js` + `admin/adduser.php` + `admin/deleteuser.php` |
| Registrations | Open registrations toggle, max users, require email validation, server URL, disable login toggle | `admin.js:saveAccountRegistrationsButton` |
| SMTP Settings | Config SMTP global (address/port/encryption/username/password/fromEmail) + teste | `admin.js:saveSmtpSettingsButton` |
| OIDC SSO | Enable/disable + config completa: name, clientId, secret, authUrl, tokenUrl, userInfoUrl, redirectUrl, logoutUrl, identifier field, scopes, authStyle, auto create user, password login disabled (13 campos) | `admin.js:saveOidcSettingsButton` |
| Security | Webhook notifications allowlist (IPs/ranges permitidos) | `admin.js:saveSecuritySettingsButton` |
| Backup/Restore | Download ZIP backup, upload restore ZIP (com migration + logout) | `admin.js:backupDB/restoreDB` |
| Cronjob Runner | Executor manual de qualquer cronjob com output textarea | `admin.js:executeCronJob` |
| Cleanup | Delete logos não referenciados (com contagem) | `admin.js:deleteUnusedLogos` |
| Update Notification | Toggle para checar atualizações GitHub | `admin.js:toggleUpdateNotification` |

### 4.8 Outras Páginas
| Página | Detalhe | Origem |
|---|---|---|
| About | Info do sistema (versão Zublo) | `about.php` |
| Health | Healthcheck endpoint | `health.php` |
| Logos | Serve logos (possivelmente PWA manifest) | `logos.php` |

---

## ETAPA 5 — Cross-cutting Concerns

| Feature | Detalhe | Origem |
|---|---|---|
| **CSRF Protection** | Header `X-CSRF-Token` em TODAS as chamadas POST | Usado em todos os `fetch()` |
| **Toast System** | Toast de sucesso (verde) e erro (vermelho) com progress bar e auto-dismiss 5s | `common.js` |
| **i18n** | 31 idiomas: ca, cs, da, de, el, en, es, fr, id, it, jp, ko, nl, pl, pt, pt_br, ru, sl, sr, sr_lat, tr, uk, vi, zh_cn, zh_tw + `getlang.js` | `scripts/i18n/*.js` |
| **PWA / Service Worker** | Registro de service worker para funcionar offline | `all.js` |
| **Locale Cookie** | Salva `user_locale` do `navigator.language` em cookie | `common.js` |
| **Responsive** | Layout mobile com `mobile_navigation` (bottom nav), swipe gestures | `subscriptions.js` |
| **Sort Order Cookie** | `sortOrder` salvo em cookie 30 dias | `subscriptions.js` |
| **Theme Auto-detect** | `prefers-color-scheme: dark` media query, `meta[name=theme-color]` dinâmico | `common.js` + `login.js` |

---

## ETAPA 6 — Docker

```dockerfile
# Build React
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime: PocketBase + dist
FROM alpine:latest
RUN apk add --no-cache unzip ca-certificates
ARG PB_VERSION=0.22.8
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${PB_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase && rm *.zip
COPY --from=builder /app/dist /pb_public
COPY pb_hooks /pb_hooks
COPY pb_migrations /pb_migrations
EXPOSE 8080
VOLUME /pb_data
CMD ["/pocketbase", "serve", "--http=0.0.0.0:8080"]
```

```yaml
# docker-compose.yml
services:
  zublo:
    build: .
    ports: ["8080:8080"]
    volumes: ["./pb_data:/pb_data"]
    restart: unless-stopped
```

---

## Verificação

### Automatizada
- Testes E2E com Playwright: auth flow, CRUD subscriptions, calendar, export iCal
- Unit tests para cronjobs (cálculo de datas, conversão de moeda)

### Manual
- Verificar 10 providers de notificação
- Testar 4 providers de IA
- Validar iCal feed em Google Calendar
- Testar backup/restore ciclo completo
- Verificar todos os 8 toggles de display settings
- Testar OIDC flow
