# ActiveCampaign Deep Data — Glass Outlet

Demo that wires [Glass Outlet](https://www.glassoutlet.com.au/) into ActiveCampaign via the v3 Deep Data (e-commerce) APIs.

## What it does

1. **Connection** — creates (or reuses) an e-commerce connection for `glassoutlet.com.au`
2. **Customer** — creates or updates an ecom customer for contact `1203`
3. **Orders** — posts:
   - an **abandoned cart** (`externalcheckoutid` + `abandonedDate`, no `externalid`)
   - a **completed order** (with `externalid`, `source: 1` so automations can fire)

## Setup

1. Copy env and add your ActiveCampaign credentials:

```bash
cp .env.example .env
```

Fill in:

| Variable | Where to find it |
|---|---|
| `AC_API_URL` | Settings → Developer → URL (e.g. `https://youraccount.api-us1.com`) |
| `AC_API_TOKEN` | Settings → Developer → Key |
| `AC_ACTID` | Website → Site Tracking → Event Tracking API |
| `AC_EVENT_KEY` | Website → Site Tracking → Event Tracking |

2. Run (Node 18+, no install needed):

```bash
npm run sync
```

## Custom Objects (Quote + Order)

High-level examples of syncing custom ERP/commerce data into Custom Objects related to a contact:

```bash
npm run sync:custom-objects
```

This updates existing schemas (`enquiry` → **Quote**, `purchase` → **Order**) and upserts sample records for contact `1203`.

## Code Camp (Child + Program)

Custom Objects for a Code Camp program on contact `1203` (parent/guardian):

- **Child** — who the child is and which programs they are currently in
- **Program** (`code-camp-program`) — historical enrollments (past/completed sessions)

```bash
AC_ENV_FILE=.env.alex NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:code-camp
```

## University Alumni Marketing (Custom Objects)

Three contact-level Custom Objects for alumni outreach, postgraduate promotion, and donation stewardship on contact `1203`:

| Object | Slug | Purpose |
|---|---|---|
| Event Participation | `event-participation` | One record per contact–event (webinar, info session, etc.) |
| Programme Interest | `programme-interest` | One record per programme-interest instance |
| Donation | `alumni-donation` | One record per gift/pledge (no card/bank data) |

Contact profile attributes (graduation year, alumni segment, preferred region, global consent) stay on the Contact — not duplicated on every object.

### Setup

Uses the same credentials as other demos. Prefer `.env.alex`:

| Variable | Required | Notes |
|---|---|---|
| `AC_API_URL` | Yes (apply) | Account API URL |
| `AC_API_TOKEN` | Yes (apply) | API token |
| `AC_ENV_FILE` | No | Defaults to `.env.alex` for this script |
| `AC_APPLY` | No | Set `1` (or pass `--apply`) to write to AC |

### Dry-run (default — no API calls)

```bash
AC_ENV_FILE=.env.alex npm run sync:university-alumni
```

Validates fixtures, prints schema shapes, sanitized donation payloads, and recommended automation mappings.

### Deploy (idempotent)

```bash
AC_ENV_FILE=.env.alex NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:university-alumni -- --apply
```

**Order:** ensure schemas by slug → upsert sample records by `externalId` for contact `1203`.

Re-running is safe: existing schemas are updated (fields/options merged); records upsert via the same `externalId` so history is not overwritten by duplicates.

### Rollback considerations

- Schemas cannot be fully deleted via this script. To retire a field, mark it unused in AC or leave it in place (AC soft-deletes fields when removed from a schema update).
- Sample records can be removed manually in AC under each Custom Object, filtered by `externalId` prefix `uni-`.
- Automations are **not** provisioned by this repo — see `src/university-alumni/automations.js` for the UI mapping layer.

### Tests

```bash
npm test
```

## Loan Inquiries (Custom Object)

Contact-level **Loan Inquiry** Custom Object for the Solutions English demo account (`.env.englishdemo`):

| Object | Slug | Purpose |
|---|---|---|
| Loan Inquiry | `loan-inquiry` | One record per lending inquiry / application interest |

Demo seeding always includes contact [`5226`](https://update-solutionsenglish.activehosted.com/app/contacts/5226) plus nine other contacts from the account (11 sample records total — two on the anchor contact).

### Setup

| Variable | Required | Notes |
|---|---|---|
| `AC_API_URL` | Yes (apply) | Solutions English API URL |
| `AC_API_TOKEN` | Yes (apply) | API token |
| `AC_ENV_FILE` | No | Defaults to `.env.englishdemo` for this script |
| `AC_APPLY` | No | Set `1` (or pass `--apply`) to write to AC |

```bash
# Dry-run
AC_ENV_FILE=.env.englishdemo npm run sync:loan-inquiries

# Create/update schema + upsert demo records
AC_ENV_FILE=.env.englishdemo NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:loan-inquiries -- --apply
```

**Order:** ensure schema by slug → resolve 10 contacts (5226 first) → upsert records by `externalId`.

## Union sign-up (contact custom fields)

Provisions contact custom fields for a multi-step Union membership form in **ACHQglobal** (`.env.achqglobal`):

| Section | Purpose |
|---|---|
| Your work | Work suburb, employer, job title, employment type, industry, workplace |
| About you | DOB, home suburb/postcode, preferred contact, gender, referral source |
| Membership agreement | Membership type, agreement accepted + date, privacy consent |
| Your contribution | Amount, frequency, payment method, payroll number, start date |
| Form progress | Four checkboxes (`UNION_FORM_S1–S4_COMPLETE`) for section completion / drop-off |
| Membership Payment | Missed payment, decline type, next/last payment dates, status, type, renewal frequency |

Field groups in ACHQglobal: **Join Form** (form + progress fields) and **Financial Status** (payment fields). Fields are also related to Master List + Union Members so they appear on subscribed contacts.

Standard fields (first name, last name, email, phone) are not created.

Membership Payment personalization tags: `%HAS_MOST_RECENT_PAYMENT_BEEN_MISSED%`, `%DECLINE_TYPE%`, `%NEXT_PAYMENT_DUE%`, `%LAST_PAYMENT_MADE%`, `%MEMBERSHIP_STATUS%`, `%MEMBERSHIP_TYPE%`, `%RENEWAL_FREQUENCY%`.

```bash
# Dry-run
AC_ENV_FILE=.env.achqglobal npm run sync:union-signup

# Create missing fields
AC_ENV_FILE=.env.achqglobal NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:union-signup -- --apply

# Seed demo contact (fields + tags + lists)
AC_ENV_FILE=.env.achqglobal NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:union-contact
```

## Aeon.co (events + message variables)

Posts subscriber-behavior events for a demo contact and creates HTML article message variables:

```bash
npm run sync:aeon
```

## Notes

- Deep Data order prices are in **cents** (AUD); Custom Object currency fields use decimal amounts.
- `source: 1` marks Deep Data events as real-time so Abandoned Cart / Makes a Purchase automations can trigger.
- Re-running `sync` reuses the connection and updates the customer; it creates new cart/order IDs each time.
- Re-running `sync:custom-objects` upserts the same Quote/Order records via `externalId`.
- Never commit `.env` (API keys / event keys).
