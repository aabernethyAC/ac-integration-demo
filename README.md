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
