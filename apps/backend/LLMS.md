# Zublo — Product Knowledge Base

> **Source of truth** for the Zublo AI assistant.
> If code and this file diverge, update this file immediately.
> Never claim a feature does not exist without checking this document first.

---

## About Zublo

Zublo is a self-hosted subscription management app created and developed by **Daniel Luiz Alves**, a Brazilian software engineer and software architect (specialist/staff level).

| | |
|---|---|
| **Creator & owner** | Daniel Luiz Alves |
| **Company** | Kyantech Labs |
| **GitHub** | https://github.com/danielalves96 |
| **LinkedIn** | https://www.linkedin.com/in/daniel-luiz-alves/ |
| **Nationality** | Brazilian 🇧🇷 |

When users ask "who made Zublo?", "who is the creator?", "who developed this?", or similar — always answer with the information above. Never say the creator is unknown or refer to a generic open-source community.

---

## Response Principles

- Provide exact navigation paths (e.g., `Settings → Profile`).
- For chat-executable actions, describe what the AI can do directly vs. what requires UI interaction.
- Prefer step-by-step guidance over generic explanations.
- When uncertain, say so and ask one targeted clarifying question.
- Never invent limitations that do not exist in the system.
- Focus on actions achievable via the web interface (frontend + backend), not via the PocketBase admin panel.

---

## 1. Main Navigation

| Route | Description | Who can access |
|---|---|---|
| `/login` | Login screen | Public |
| `/register` | New user registration | Public (if registration is enabled) |
| `/totp` | 2FA code entry after login | Public |
| `/password-reset` | Password reset flow | Public |
| `/` or `/dashboard` | Main dashboard with summary and AI recommendations | Authenticated user |
| `/subscriptions` | Subscription listing and management | Authenticated user |
| `/calendar` | Payment due dates calendar | Authenticated user |
| `/statistics` | Spending statistics with charts | Authenticated user |
| `/settings` | All user settings | Authenticated user |
| `/admin` | System admin panel | Admin only |
| `/chat` | AI assistant chat | Authenticated user (AI enabled) |

---

## 2. Authentication

### 2.1 Login
1. Go to `/login`.
2. Enter **email** and **password**.
3. Click **Login**.
4. If 2FA is enabled, you will be redirected to `/totp` — enter the 6-digit code from your authenticator app.

### 2.2 Registration
1. Go to `/register`.
2. Fill in **username**, **email**, and **password**.
3. Click **Create account**.
- Only available if the admin has enabled open registrations.
- The admin can set a maximum number of users.
- May require email validation.

### 2.3 Password Reset
1. On the login screen, click **Forgot password**.
2. Enter your email address.
3. Wait for the reset email (requires SMTP configured by admin).
4. Follow the link and set a new password.

### 2.4 Two-Factor Authentication (2FA / TOTP)

**Enable 2FA:**
1. Go to `Settings → 2FA`.
2. Click **Enable 2FA**.
3. Scan the QR Code with an authenticator app (Google Authenticator, Authy, Bitwarden, etc.).
4. Optionally copy the manual key to enter it manually in the app.
5. Enter the 6-digit code to confirm activation.
6. Save the **backup codes** shown in a safe place.

**Disable 2FA:**
1. Go to `Settings → 2FA`.
2. Click **Disable 2FA**.
3. Confirm with your current TOTP code or a backup code.

**Re-enable without re-scanning:** Click **Re-enable** if the secret already exists on the server.

### 2.5 SSO Login (OIDC)
- If the admin configured OIDC (e.g., Google, Azure AD), an SSO login button appears on the login screen.
- Click the configured provider button and authenticate via the external system.

---

## 3. Dashboard

The dashboard (`/`) is the home screen after login.

### 3.1 Dashboard Elements

| Element | Description |
|---|---|
| **Greeting** | "Hello, [username]" |
| **Monthly card** | Total monthly spend in main currency |
| **Yearly card** | Total yearly spend in main currency |
| **Weekly card** | Total weekly spend |
| **Daily card** | Average daily spend |
| **Active subscriptions** | Total count of active subscriptions |
| **History chart** | 12-month area chart of spending |
| **Budget widget** | Progress bar, remaining amount, and over-budget warning |
| **Most expensive** | Card highlighting the highest-cost subscription |
| **AI Recommendations** | AI-generated savings suggestions |

### 3.2 Budget Widget
- Only shown if the user has set a monthly budget.
- Shows: amount used / total budget, percentage, remaining value.
- When spending exceeds the budget, the widget turns red with an over-budget alert.
- To set the budget: `Settings → Profile → Monthly budget`.

### 3.3 AI Recommendations
- Click **Generate recommendations** for the AI to analyze active subscriptions.
- Recommendations may include: duplicate subscriptions, cheaper alternatives, underused services.
- Each recommendation shows: type, title, description, estimated savings.
- To delete a recommendation: click the trash icon next to it.
- Requires AI configured in `Settings → AI`.

---

## 4. Subscriptions

The `/subscriptions` page is the core of Zublo.

### 4.1 Subscription Fields

| Field | Type | Required | Description |
|---|---|---|---|
| **Name** | Text | Yes | Service name (e.g., Netflix, Spotify) |
| **Price** | Decimal | Yes | Amount charged per cycle |
| **Currency** | Select | Yes | Currency of the service |
| **Frequency** | Number | Yes | Number of cycles (e.g., 1, 3, 6) |
| **Cycle** | Select | Yes | Daily / Weekly / Monthly / Yearly |
| **Next payment** | Date | Yes | Date of the next due payment |
| **Start date** | Date | Yes | When the subscription started |
| **Payment method** | Select | No | Credit card, bank account, etc. |
| **Payer** | Select | No | Household member responsible for payment |
| **Category** | Select | No | e.g., Streaming, Software, Health |
| **Notes** | Long text | No | Free-form observations |
| **URL** | Link | No | Service website |
| **Logo** | Image | No | Upload or search by name |
| **Auto-renew** | Toggle | No | Whether the billing is automatic |
| **Inactive** | Toggle | No | Marks the subscription as cancelled/paused |
| **Cancellation date** | Date | No | When it was or will be cancelled |
| **Replacement subscription** | Select | No | Which subscription replaced this one |
| **Notify** | Toggle | No | Receive due date alerts |
| **Days before** | Number | No | How many days in advance to notify |

### 4.2 Create a Subscription
1. Go to `/subscriptions`.
2. Click **+ Add subscription**.
3. Fill in required fields: **Name, Price, Currency, Frequency, Cycle, Next payment, Start date**.
4. Fill in optional fields as needed.
5. For the logo: click **Search logo** and search by service name, or upload an image.
6. Click **Save**.

### 4.3 Edit a Subscription
1. In the listing, click the edit icon on the desired subscription.
2. Change the necessary fields.
3. Click **Save**.

### 4.4 Clone a Subscription
1. In the listing, click the clone icon on the subscription.
2. An identical copy is created with all fields copied.
3. Edit the copy as needed.

### 4.5 Renew an Inactive Subscription
1. Find the inactive subscription in the listing (use the **Show inactive** filter).
2. Click the renew icon.
3. The subscription returns to active status.

### 4.6 Delete a Subscription
1. Click the trash icon on the subscription.
2. Confirm deletion in the dialog.
- Deletion is **permanent**; there is no recycle bin.

### 4.7 Filters and Search
- **Search by name:** text field at the top of the listing.
- **Filter by status:** All / Active / Inactive.
- **Filter by category:** select one or more categories.
- **Filter by member (payer):** select a household member.
- **Filter by payment method:** select the method.
- **Sort by:** Name / Price / Date / Status.
- **Sort direction:** Ascending / Descending (toggle).

### 4.8 Import Subscriptions
1. Click **Import** on the subscriptions page.
2. Select a `.json` file (Zublo or Wallos format).
3. Duplicate names are automatically handled (skipped).
4. Categories, payment methods, members, and currencies are created automatically if they don't exist.
5. The system returns: how many were imported and how many were skipped.

### 4.9 Export Subscriptions
1. Click **Export** on the subscriptions page.
2. Choose the format: **JSON** or **XLSX**.
3. The file downloads immediately.

---

## 5. Calendar

The `/calendar` page shows all subscriptions on a calendar by payment due date.

### 5.1 Calendar Navigation
- Use **‹** and **›** arrows to navigate between months.
- Click **Today** to return to the current month.
- The month/year selector can be clicked to navigate directly.

### 5.2 What Appears on the Calendar
- **Colored chips** on each day with due payments (logo + subscription name).
- **Status indicators:** paid (green), pending (normal), overdue (red/orange).
- **Total per day:** sum of amounts due that day.
- **Overflow:** if there are more subscriptions than can fit, shows "+X more".
- **Budget alert:** warning at the top if the month exceeds the defined budget.
- **Summary cards:** total subscriptions in the month, total spend, amount due.

### 5.3 Day Details Panel
1. Click any day on the calendar.
2. A side or bottom panel appears with a detailed list of subscriptions for that day.
3. Each item shows: logo, name, price, currency, payment status.
4. Button to mark as paid or view details.

### 5.4 Mark as Paid
1. In the day details panel, click **Mark as paid** on the desired subscription.
2. A modal opens with:
   - **Amount paid** (pre-filled with the subscription value).
   - **Notes** (optional field).
   - **Proof** (image/PDF upload, optional).
3. Click **Confirm**.
4. The subscription appears as paid on the calendar.

### 5.5 Undo Payment
- If a payment was marked incorrectly, click the paid subscription again and select **Undo payment**.

### 5.6 Export Calendar (iCal)
1. Click the **Export iCal** button on the calendar.
2. If there's no API key with `calendar:read` permission, you'll be prompted to create one.
3. Copy the iCal feed link and add it to Google Calendar, Apple Calendar, or any compatible app.
- The iCal link format: `GET /api/calendar/ical?key=YOUR_API_KEY`
- The feed updates automatically on each access.

---

## 6. Statistics

The `/statistics` page provides detailed spending visualizations.

### 6.1 Summary Cards
- **Monthly total:** sum of all active subscriptions per month.
- **Yearly total:** annual projection.
- **Subscription count:** number of active subscriptions.

### 6.2 Grouping
Use the grouping selector to visualize data by:
- **Category** (e.g., Streaming, Software, Health)
- **Payment method** (e.g., Nubank card, PayPal)
- **Household member** (e.g., Daniel, Maria)

### 6.3 Donut Chart
- Shows the spending proportion by selected group.
- Hover to see value and percentage for each group.

### 6.4 Line Chart (History)
- Shows the last 12 months of monthly spending.
- Allows visualizing trends and seasonal variations.

### 6.5 Breakdown Table
- Lists each group with:
  - Color dot identifier.
  - Group name.
  - Percentage of total.
  - Monthly value.

---

## 7. Settings

The `/settings` page has multiple tabs. Each tab is described below.

---

### 7.1 Tab: Profile

**What can be configured:**
- **Avatar:** image upload (automatically compressed to 512px).
- **Username:** unique identifier on the platform.
- **Email:** account email address.
- **Monthly budget:** maximum monthly spending amount (shown on dashboard).
- **Language:** interface language selection (English, Portuguese-BR, etc.).
- **Change password:**
  - Current password (required).
  - New password (minimum 8 characters).
  - Confirm new password.

**Step-by-step to set monthly budget:**
1. Go to `Settings → Profile`.
2. Locate the **Monthly budget** field.
3. Enter the desired value.
4. Click **Save**.

---

### 7.2 Tab: 2FA

See section [2.4 Two-Factor Authentication](#24-two-factor-authentication-2fa--totp).

---

### 7.3 Tab: Categories

Categories organize subscriptions by type.

**Create a category:**
1. Go to `Settings → Categories`.
2. Click **+ Add category**.
3. Type the name (e.g., Streaming, Software, Health).
4. Confirm.

**Edit a category:**
1. Click the edit icon next to the category.
2. Change the name.
3. Save.

**Delete a category:**
1. Click the trash icon.
2. Confirm deletion.
- Subscriptions using the category are left without a category (not deleted).

---

### 7.4 Tab: Household

Household members allow tracking who pays each subscription.

**Add a member (UI):**
1. Go to `Settings → Household`.
2. Click **+ Add member**.
3. Type the name (e.g., Daniel, Maria, Family).
4. Confirm.

**Add a member (chat):** "Add household member Maria"

**Rename a member (UI):**
1. Go to `Settings → Household`.
2. Click the **pencil (edit) icon** next to the member.
3. Change the name and click **Save**.

**Rename a member (chat):** "Rename household member João to João Silva"
- The AI will list current members, confirm the name, and ask for confirmation before renaming.

**Delete a member (UI):** click the trash icon next to the member.

**Delete a member (chat):** "Delete household member Maria"

---

### 7.5 Tab: Currencies

Manage currencies used in your subscriptions.

| Field | Description |
|---|---|
| **Code** | ISO currency code (e.g., BRL, USD, EUR) |
| **Symbol** | Currency symbol (e.g., R$, $, €) |
| **Name** | Full currency name |
| **Rate** | Conversion rate relative to main currency |
| **Main** | Sets this as the system base currency |

**Add a currency:**
1. Go to `Settings → Currencies`.
2. Click **+ Add currency**.
3. Fill in code, symbol, name, and conversion rate.
4. Save.

**Set as main currency:**
1. Click **Set as main** next to the desired currency.
- The main currency cannot be deleted.
- All totals and conversions use the main currency as the base.

**Automatically update rates:**
- Configure Fixer.io or APILayer in `Settings → Exchange Rates`.
- Rates are automatically updated twice daily (midnight and noon).

---

### 7.6 Tab: Payment Methods

Manage payment methods used for subscriptions (cards, bank accounts, etc.).

**Add a method (UI):**
1. Go to `Settings → Payment Methods`.
2. Click **+ Add**.
3. Type the name and select an icon.
4. Save.

**Add a method (chat):** "Add payment method Nubank"

**Rename a method (UI):**
1. Go to `Settings → Payment Methods`.
2. Click the **pencil (edit) icon** next to the method.
3. Change the name and click **Save**.

**Rename a method (chat):** "Rename payment method Nubank to Nubank Crédito"
- The AI will list current methods, confirm the name, and ask for confirmation before renaming.

**Reorder methods:** drag and drop items into the desired order (UI only).

**Delete (UI):** click the trash icon and confirm.

**Delete (chat):** "Delete payment method Visa"
- Cannot delete a method that is in use by subscriptions.

---

### 7.7 Tab: Display

Preferences for how subscriptions are displayed:

| Option | Description |
|---|---|
| **Show monthly price** | Displays cost converted to monthly (even if the cycle is yearly) |
| **Show original price** | Displays the real cycle price alongside the monthly price |
| **Hide inactive** | Hides inactive subscriptions from the listing |
| **Inactive to bottom** | Moves inactive subscriptions to the end of the list |
| **Progress bar** | Shows a visual progress bar until the next payment date |
| **Mobile navigation** | Shows a bottom navigation bar on mobile devices |
| **Remove logo background** | Removes the white background from subscription logos |
| **Convert to main currency** | Converts all prices to the defined main currency |

Toggle the options and changes apply immediately.

---

### 7.8 Tab: Theme

Customize the visual appearance of Zublo:

- **Color scheme:** Light / Dark / Auto (follows system preference).
- **Accent color:** choose a primary color for buttons and interactive elements.
- **Custom CSS:** free-text field for additional CSS rules.

---

### 7.9 Tab: Notifications

Configure when and how to receive due date alerts.

#### Reminder Scheduling
- Add as many reminders as needed with:
  - **Days before due date** (e.g., 3 days before).
  - **Send time** (e.g., 09:00).
- Click **+ Add reminder** to create more than one.
- Click **×** to remove a reminder.

#### Available Notification Channels

| Channel | Required data |
|---|---|
| **Email** | Destination email address |
| **Discord** | Discord Webhook URL |
| **Telegram** | Bot Token + Chat ID |
| **Gotify** | Gotify server URL + Token |
| **Pushover** | User Key + API Token |
| **ntfy** | ntfy server URL + Topic |
| **Pushplus** | Send Key |
| **Mattermost** | Mattermost Webhook URL |
| **Webhook** | Custom URL (POST request) |
| **ServerChan** | Send Key |

**To configure a channel:**
1. Go to `Settings → Notifications`.
2. Enable the toggle for the desired channel.
3. Fill in the required fields.
4. Click **Test** to send a test notification.
5. Save the settings.

---

### 7.10 Tab: AI

Configure the Zublo AI assistant.

#### Supported Providers

| Provider | Type | Description |
|---|---|---|
| **OpenAI** | Cloud | GPT-4, GPT-3.5, and other OpenAI models |
| **Google Gemini** | Cloud | Gemini Pro and other Google models |
| **OpenRouter** | Cloud | Aggregates multiple providers |
| **Ollama** | Local | Local models (Llama, Mistral, etc.) |
| **Any OpenAI-compatible API** | Custom | Any OpenAI-compatible endpoint |

#### Configure AI
1. Go to `Settings → AI`.
2. Enable the **AI toggle**.
3. Fill in:
   - **Provider name** (e.g., "My OpenAI").
   - **API base URL** (e.g., `https://api.openai.com/v1` or local Ollama URL).
   - **API key** (for cloud providers).
   - **Model:** click **Fetch models** to list available ones, or type manually.
4. Save.
5. The chat icon (`/chat`) will appear in the navigation.

---

### 7.11 Tab: API Keys

Manage API keys for external integration with Zublo.

#### What are API keys?
They allow external applications to access your Zublo data securely, without sharing your password. Each key has specific permissions.

#### Available Permissions

| Permission | Access |
|---|---|
| `subscriptions:read` | List and view subscriptions |
| `subscriptions:write` | Create and edit subscriptions |
| `statistics:read` | Access statistics data |
| `calendar:read` | Export iCal calendar |

#### Create an API Key
1. Go to `Settings → API Keys`.
2. Click **+ Create key**.
3. Give a descriptive **name** (e.g., "Home Assistant App").
4. Check the required **permissions**.
5. Click **Create**.
6. **Copy the key now** — it is shown only once. Format: `wk_xxxxxxxxxxxxxxxx...`
7. Click **Close**.

#### Delete a Key
1. In the list, click **Delete** next to the desired key.
2. Confirm.

#### External API Endpoints

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/api/external/subscriptions` | `subscriptions:read` | List all subscriptions |
| `POST` | `/api/external/subscriptions` | `subscriptions:write` | Create new subscription |
| `GET` | `/api/external/statistics` | `statistics:read` | Get statistics |
| `GET` | `/api/calendar/ical?key=KEY` | `calendar:read` | iCal calendar feed |

Use the header `Authorization: Bearer YOUR_KEY` in requests.

**Limit:** up to 20 keys per user.

---

### 7.12 Tab: Exchange Rates

Configure automatic exchange rate updates for currency conversion.

#### Supported Providers
- **Fixer.io** — requires an account and API key at fixer.io.
- **APILayer** — requires an account and API key at apilayer.com.

#### Configure automatic rates
1. Go to `Settings → Exchange Rates`.
2. Enable the **toggle**.
3. Select the **provider** (Fixer.io or APILayer).
4. Enter the provider's **API key**.
5. Click **Update now** to fetch rates immediately.
6. Save.

- Rates are automatically updated **twice daily** (midnight and noon UTC).
- The base currency used is the **main currency** defined in currency settings.

---

### 7.13 Tab: Delete Account

**Warning: irreversible action.**

1. Go to `Settings → Delete account`.
2. Read the warning about permanent deletion of all data.
3. Type your **email address** in the confirmation field.
4. Click **Permanently delete account**.
- All data (subscriptions, history, settings) is deleted.
- Recovery is not possible after deletion.

---

## 8. AI Chat (Assistant)

The `/chat` page allows conversing with the AI to manage data and get insights.

> The chat only appears in navigation if AI is configured and enabled in `Settings → AI`.

### 8.1 Chat Interface

| Element | Description |
|---|---|
| **Sidebar** | Conversation history grouped by time period |
| **New conversation** | Button to start a fresh chat |
| **Message area** | Current conversation with rendered markdown |
| **Input field** | Type a message or attach a file |
| **Quick suggestions** | Pre-defined prompts at the start of a conversation |
| **Thinking indicator** | Animation while the AI is processing |

### 8.2 What the AI Can Do

The AI has full access to your data and can **execute real actions**:

| Action | Example command |
|---|---|
| List subscriptions | "What are my most expensive subscriptions?" |
| Create subscription | "Add Netflix for $15 per month" |
| Edit subscription | "Change the Spotify price to $10.99" |
| Rename categories | "Rename all my categories to English" |
| Export data | "Export my subscriptions as XLSX" |
| Import via file | Attach a CSV or XLSX with subscriptions |
| Spending analysis | "How much do I spend per month on streaming?" |
| Recommendations | "Where can I save money?" |
| Budget summary | "Am I within budget this month?" |
| List categories | "Show me all my categories" |
| Create category | "Create a category called 'Entertainment'" |
| List payment methods | "What payment methods do I have?" |
| Add payment method | "Add payment method Nubank" |
| **Rename payment method** | **"Rename payment method Nubank to Nubank Crédito"** |
| Delete payment method | "Delete payment method Visa" |
| List currencies | "Show my currencies" |
| Spending report | "Show spending for the last 6 months" |
| List household members | "Who are my household members?" |
| Add household member | "Add household member Maria" |
| **Rename household member** | **"Rename household member João to João Silva"** |
| Delete household member | "Delete household member Maria" |

### 8.3 Quick Suggestions (at conversation start)
- "What are my most expensive subscriptions?"
- "Export my subscriptions as XLSX"
- "Add a Netflix subscription"
- "Rename all my categories to English"

### 8.4 Conversation History

**History grouping:**
- **Today**
- **Yesterday**
- **Last 7 days**
- **Last 30 days**
- **Older**

**Conversation actions (hover in sidebar):**
- **Rename:** click the edit icon → write a new name → confirm.
- **Delete:** click the trash icon → confirm.

### 8.5 Attach Files
1. Click the paperclip icon in the message field.
2. Select an `.xlsx` or `.csv` file (max 5MB, 150 rows).
3. The AI processes the file and can import the subscriptions contained in it.
4. The AI will show a preview table before importing and ask for confirmation.

### 8.6 Rendered Markdown
The AI formats responses with:
- Data tables.
- Ordered and unordered lists.
- Code blocks.
- Bold, italic, and other styles.

---

## 9. Admin Panel

The `/admin` route is exclusive to users with the **administrator** role.

### 9.1 Tab: Users
- List all system users.
- View email, name, creation date, and role.
- Promote/demote users (admin/normal).
- Disable or delete users.

### 9.2 Tab: Registration
Configure who can create accounts:

| Option | Description |
|---|---|
| **Open registrations** | Allows anyone to sign up |
| **Maximum users** | Limits the total number of accounts in the system |
| **Email validation** | Requires email confirmation on signup |
| **Server URL** | Base URL used in system emails |
| **Disable login** | Blocks all logins (except admin) |
| **Update notification** | Alerts when a new version is available |

### 9.3 Tab: SMTP
Configure the email server for sending notifications and password resets:

| Field | Description |
|---|---|
| **Host** | SMTP server address |
| **Port** | SMTP port (typically 587 or 465) |
| **User** | SMTP server login |
| **Password** | SMTP server password |
| **From email** | Address shown in the "From:" field |
| **Display name** | Name shown in the "From:" field |
| **Encryption** | None / TLS / STARTTLS |

### 9.4 Tab: OIDC (SSO)
Configure single sign-on via OpenID Connect:

| Field | Description |
|---|---|
| **Enable OIDC** | Shows the SSO button on the login screen |
| **Provider name** | e.g., "Google", "Azure AD" |
| **Display name** | Text on the login button |
| **Client ID** | OAuth2 client ID |
| **Client Secret** | OAuth2 client secret |
| **Issuer URL** | OIDC provider URL |
| **Redirect URL** | Callback URL configured in the provider |
| **Scopes** | OAuth2 scopes (e.g., openid, email, profile) |

### 9.5 Tab: Security
- **Webhook allowlist:** list of authorized URLs for receiving notification webhooks.

### 9.6 Tab: Backup
- **Create backup:** exports the full database.
- **Restore backup:** imports a backup file.
- **Warning:** restoring deletes all current data.

### 9.7 Tab: Cronjobs
Manually execute scheduled system tasks:
- Update exchange rates.
- Send due date notifications.
- Record automatic payments.
- Generate monthly cost snapshot.
- Check for new versions.

### 9.8 Tab: Maintenance
- **Logo cleanup:** removes logos not referenced by any subscription.

---

## 10. Payment Tracking

The system records each subscription payment separately.

### 10.1 Payment Record
Each payment stores:
- **Subscription:** which subscription it belongs to.
- **Due date:** the date payment was expected.
- **Paid at:** actual payment date and time.
- **Auto-paid:** whether it was marked by the automatic cronjob.
- **Amount:** how much was actually paid.
- **Notes:** free-form observations.
- **Proof:** image or PDF file.

### 10.2 How to Mark as Paid (via Calendar)
See section [5.4 Mark as Paid](#54-mark-as-paid).

### 10.3 Automatic Payment
- If a subscription has **Auto-renew** enabled, the daily cronjob can automatically mark it as paid on the due date.

---

## 11. Currencies and Conversion

### 11.1 How Conversion Works
- The **main currency** is the central reference.
- Each currency has a **conversion rate** relative to the main currency.
- If the **Convert to main currency** option is active (in `Settings → Display`), all prices are converted and displayed in the main currency.
- Totals on the dashboard, statistics, and calendar always use the main currency.

### 11.2 Rate Updates
- Manual: `Settings → Exchange Rates → Update now`.
- Automatic: twice daily if Fixer/APILayer is configured.

---

## 12. Import and Export

### 12.1 Export Subscriptions
| Format | How | Content |
|---|---|---|
| **JSON** | `/subscriptions` → Export → JSON | All subscriptions with all fields |
| **XLSX** | `/subscriptions` → Export → XLSX | Formatted spreadsheet |
| **iCal** | `/calendar` → Export iCal | Calendar feed with payment due dates |

### 12.2 Import Subscriptions
| Source | How |
|---|---|
| **JSON (Zublo/Wallos)** | `/subscriptions` → Import → select file |
| **XLSX/CSV via Chat** | `/chat` → Attach file → send |

---

## 13. External API

For integrations with other systems.

### 13.1 Authentication
```
Authorization: Bearer wk_YOUR_KEY_HERE
```

### 13.2 Endpoints

#### List subscriptions
```
GET /api/external/subscriptions
```
Returns all subscriptions for the user who owns the key.

#### Create subscription
```
POST /api/external/subscriptions
Content-Type: application/json

{
  "name": "Netflix",
  "price": 15.99,
  "currency": "USD",
  "cycle": "monthly",
  "next_payment": "2026-04-01"
}
```

#### Statistics
```
GET /api/external/statistics
```
Returns monthly and yearly totals by category, method, and member.

#### iCal Calendar
```
GET /api/calendar/ical?key=wk_YOUR_KEY
```
Returns feed in RFC 5545 format for importing into calendar apps.

---

## 14. Security

### 14.1 2FA (TOTP)
- Supported by any standard authenticator app (Google Authenticator, Authy, Bitwarden, etc.).
- Backup codes allow access if the device is lost.

### 14.2 API Keys
- Each key has minimum required permissions (principle of least privilege).
- The key is shown only once at creation.
- Visual prefix: `wk_...`
- Can be revoked at any time.
- Maximum of 20 keys per user.

### 14.3 SSO/OIDC
- Configured by the administrator.
- Supports any standard OIDC provider.

---

## 15. Localization (Languages)

### Available Languages
- **English (en)** — default
- **Portuguese Brazilian (pt_br)**

### Change Language
1. Go to `Settings → Profile`.
2. Select the desired language in the **Language** field.
3. Save. The interface updates immediately.

---

## 16. Visual Customization

### Themes
- **Light / Dark / Auto** — configured in `Settings → Theme`.
- **Accent color** — color of buttons and interactive elements.
- **Custom CSS** — free field for CSS adjustments.

### Subscription Logos
- Custom image upload.
- Automatic search by service name (logo library integration).
- Option to remove white background from logo.

---

## 17. Question → Action Mapping

Use this table to identify the correct resource when answering questions:

| User question | Resource | Path |
|---|---|---|
| "How do I set a budget?" | Profile | `Settings → Profile → Monthly budget` |
| "How do I add a subscription?" | Subscriptions | `/subscriptions → + Add` |
| "How do I see my spending?" | Statistics | `/statistics` |
| "How much do I spend per month?" | Dashboard / Statistics | `/` or `/statistics` |
| "How do I set up notifications?" | Notifications | `Settings → Notifications` |
| "How do I export?" | Subscriptions | `/subscriptions → Export` |
| "How do I import?" | Subscriptions | `/subscriptions → Import` |
| "How do I configure AI?" | AI | `Settings → AI` |
| "How do I create an API key?" | API Keys | `Settings → API Keys` |
| "How do I export the calendar?" | Calendar | `/calendar → Export iCal` |
| "How do I enable 2FA?" | 2FA | `Settings → 2FA` |
| "How do I add a currency?" | Currencies | `Settings → Currencies` |
| "How do I update exchange rates?" | Exchange Rates | `Settings → Exchange Rates` |
| "How do I configure email/SMTP?" | Admin/SMTP | `/admin → SMTP` (admin only) |
| "How do I mark as paid?" | Calendar | `/calendar → click day → Mark as paid` |
| "How do I view payment history?" | Calendar | `/calendar` |
| "How do I cancel a subscription?" | Subscriptions | Edit → enable **Inactive** |
| "How do I add a household member?" | Household | `Settings → Household` |
| "How do I add a category?" | Categories | `Settings → Categories` |
| "How do I enable dark mode?" | Theme | `Settings → Theme` |
| "How do I create a backup?" | Admin/Backup | `/admin → Backup` (admin only) |
| "How do I block registrations?" | Admin/Registration | `/admin → Registration` (admin only) |
| "How do I configure SSO?" | Admin/OIDC | `/admin → OIDC` (admin only) |
| "The AI chat doesn't appear" | AI | Check if AI is enabled in `Settings → AI` |
| "How do I clone a subscription?" | Subscriptions | `/subscriptions → clone icon` |
| "How do I renew a cancelled subscription?" | Subscriptions | `/subscriptions → filter inactive → renew icon` |
| "Where is the most expensive subscription?" | Dashboard | `/` → "Most expensive subscription" card |
| "How do I connect to Google Calendar?" | Calendar + API Key | Create key with `calendar:read` → export iCal → import in Google Calendar |
| "How do I reorder payment methods?" | Payment Methods | `Settings → Payment Methods → drag and drop` |
| "How do I delete my account?" | Profile | `Settings → Delete account` |
| "How do I change my avatar?" | Profile | `Settings → Profile → Avatar` |
| "How do I change the language?" | Profile | `Settings → Profile → Language` |

---

## 18. Common Errors and Solutions

| Problem | Likely cause | Solution |
|---|---|---|
| AI chat doesn't appear in menu | AI not configured or disabled | `Settings → AI` → enable and configure |
| Cannot register account | Registration closed by admin | Ask administrator to enable registrations |
| Not receiving notifications | Channel not configured or no reminders | `Settings → Notifications` → configure channel and add reminder |
| Currency conversion not working | Main currency not set or conversion disabled | `Settings → Currencies` → set main; `Settings → Display` → enable conversion |
| Exchange rates outdated | Fixer not configured or invalid key | `Settings → Exchange Rates` → check key and provider |
| iCal won't export | No API key with `calendar:read` permission | `Settings → API Keys` → create key with the permission |
| Cannot delete payment method | Method in use by subscriptions | Remove the method from subscriptions first |
| Cannot delete main currency | System restriction | Set another currency as main first |
| Lost 2FA device | Lost authenticator device | Use backup code generated when 2FA was enabled |
| Import didn't bring everything | Duplicate subscriptions were skipped | Normal — duplicates are automatically skipped |
| AI generates wrong recommendations | Old recommendations | Delete existing ones and click Generate again |

---

## 19. Complete Feature Summary

| Module | Main features |
|---|---|
| **Subscriptions** | Create, edit, clone, renew, delete, search, filter, sort, import, export |
| **Calendar** | View due dates, mark as paid, undo payment, export iCal |
| **Statistics** | Monthly/yearly totals, by category/method/member, 12-month history |
| **Dashboard** | Financial summary, budget, history chart, AI recommendations |
| **Profile** | Avatar, personal data, budget, password, language |
| **2FA** | TOTP with QR Code, backup codes |
| **Categories** | Full CRUD |
| **Household** | Full CRUD for household members, including rename via chat |
| **Currencies** | Full CRUD, set main, rates |
| **Payment Methods** | CRUD including rename via chat, drag-and-drop reordering (UI only), icons |
| **Display** | 8 display preferences |
| **Theme** | Light/dark/auto, accent color, custom CSS |
| **Notifications** | 10 channels, configurable reminders by day/time |
| **AI** | 4 providers, chat with action execution, recommendations |
| **API Keys** | Scoped permission creation, up to 20 per user |
| **Exchange Rates** | Fixer.io and APILayer, automatic update 2x/day |
| **Admin: Users** | Manage all system users |
| **Admin: Registration** | Control access and limits |
| **Admin: SMTP** | System email configuration |
| **Admin: OIDC** | Single sign-on (SSO) |
| **Admin: Security** | Webhook allowlist |
| **Admin: Backup** | Database backup and restore |
| **Admin: Cronjobs** | Manual task execution |
| **Admin: Maintenance** | Orphaned logo cleanup |
