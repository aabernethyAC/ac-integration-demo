/**
 * Update Quote + Order Custom Object schemas and upsert example records
 * related to contact 1203 (Glass Outlet demo).
 *
 * Usage: NODE_TLS_REJECT_UNAUTHORIZED=0 node src/custom-objects-sync.js
 */
import { loadEnv } from "./load-env.js";
import { createAcClient } from "./ac-client.js";

loadEnv();

const CONTACT_ID = 1203;
const QUOTE_SCHEMA_ID = "ce8c8d4d-f293-4858-b1b9-04aaffbc37f2"; // slug: enquiry → labels Quote
const ORDER_SCHEMA_ID = "f37d2ad0-7e9a-431d-b52f-ee9ee40fe695"; // slug: purchase → labels Order

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function serializeField(f) {
  const out = {
    id: f.id,
    labels: f.labels,
    type: f.type,
    required: !!f.required,
  };
  if (f.description) out.description = f.description;
  if (f.type === "currency") out.defaultCurrency = f.defaultCurrency || "AUD";
  if (f.type === "number" && f.scale != null) out.scale = f.scale;
  if (f.type === "dropdown" || f.type === "multiselect") {
    out.options = (f.options || []).map((o) =>
      o.id ? { id: o.id, value: o.value } : { value: o.value }
    );
  }
  return out;
}

function newField(id, singular, type, extra = {}) {
  return serializeField({
    id,
    labels: { singular, plural: singular },
    type,
    required: false,
    ...extra,
  });
}

function mergeOptions(existing, values) {
  const opts = [...(existing || [])];
  for (const value of values) {
    if (!opts.some((o) => o.value === value)) opts.push({ value });
  }
  return opts.map((o) => (o.id ? { id: o.id, value: o.value } : { value: o.value }));
}

function fieldOptions(schema, fieldId) {
  return schema.fields.find((f) => f.id === fieldId)?.options?.map((o) => o.value) || [];
}

async function getSchema(ac, id) {
  return (await ac.get(`/customObjects/schemas/${id}?showFields=all`)).schema;
}

async function updateQuoteSchema(ac) {
  const current = await getSchema(ac, QUOTE_SCHEMA_ID);
  const byId = Object.fromEntries((current.fields || []).map((f) => [f.id, f]));

  const fields = [
    serializeField({
      ...byId.name,
      labels: { singular: "Quote Name", plural: "Quote Names" },
    }),
    serializeField(byId.budget),
    serializeField(byId["buy-profile"]),
    serializeField({
      ...byId["enquiry-date"],
      labels: { singular: "Quote Date", plural: "Quote Dates" },
    }),
    serializeField({
      ...byId["enquiry-status"],
      labels: { singular: "Legacy Status", plural: "Legacy Statuses" },
    }),
    byId["quote-number"]
      ? serializeField(byId["quote-number"])
      : newField("quote-number", "Quote Number", "text"),
    byId["quote-status"]
      ? serializeField({
          ...byId["quote-status"],
          options: mergeOptions(byId["quote-status"].options, [
            "Draft",
            "Sent",
            "Accepted",
            "Expired",
            "Rejected",
          ]),
        })
      : newField("quote-status", "Quote Status", "dropdown", {
          options: [
            { value: "Draft" },
            { value: "Sent" },
            { value: "Accepted" },
            { value: "Expired" },
            { value: "Rejected" },
          ],
        }),
    byId["quote-total"]
      ? serializeField(byId["quote-total"])
      : newField("quote-total", "Quote Total", "currency", {
          defaultCurrency: "AUD",
        }),
    byId["valid-until"]
      ? serializeField(byId["valid-until"])
      : newField("valid-until", "Valid Until", "date"),
    byId["line-items-summary"]
      ? serializeField(byId["line-items-summary"])
      : newField("line-items-summary", "Line Items Summary", "textarea"),
    byId["project-site"]
      ? serializeField(byId["project-site"])
      : newField("project-site", "Project Site", "text"),
    byId["product-categories"]
      ? serializeField({
          ...byId["product-categories"],
          options: mergeOptions(byId["product-categories"].options, [
            "Glass Balustrade",
            "Glass Pool Fencing",
            "Aluminium Fencing",
            "Decking",
            "Bathroom Products",
          ]),
        })
      : newField("product-categories", "Product Categories", "multiselect", {
          options: [
            { value: "Glass Balustrade" },
            { value: "Glass Pool Fencing" },
            { value: "Aluminium Fencing" },
            { value: "Decking" },
            { value: "Bathroom Products" },
          ],
        }),
  ];

  const updated = await ac.put(`/customObjects/schemas/${QUOTE_SCHEMA_ID}`, {
    schema: {
      slug: current.slug,
      labels: { singular: "Quote", plural: "Quotes" },
      description:
        "High-level quote from an external system (e.g. Glass Outlet ERP/CRM), synced as a Custom Object and related to a Contact.",
      fields,
      relationships: (current.relationships || []).map((r) => ({
        id: r.id,
        labels: r.labels,
        description: r.description,
        namespace: r.namespace,
        hasMany: false,
      })),
    },
  });

  console.log(`Quote schema updated (${updated.schema.labels.singular})`);
  return updated.schema;
}

async function updateOrderSchema(ac) {
  const current = await getSchema(ac, ORDER_SCHEMA_ID);
  const byId = Object.fromEntries((current.fields || []).map((f) => [f.id, f]));

  const fields = [
    serializeField({
      ...byId.name,
      labels: { singular: "Order Name", plural: "Order Names" },
    }),
    serializeField(byId["purchase-date"]),
    serializeField({
      ...byId["product-type"],
      options: mergeOptions(byId["product-type"].options, [
        "Glass Balustrade",
        "Glass Pool Fencing",
        "Aluminium Fencing",
        "Decking",
        "Bathroom Products",
      ]),
    }),
    serializeField(byId["specific-products-purchased"]),
    serializeField({
      ...byId["order-total"],
      defaultCurrency: byId["order-total"].defaultCurrency || "AUD",
    }),
    serializeField(byId["order-number"]),
    serializeField(byId["completion-date"]),
    serializeField({
      ...byId["project-status"],
      options: mergeOptions(byId["project-status"].options, [
        "Pending",
        "Confirmed",
        "In Production",
        "Shipped",
        "Completed",
        "Cancelled",
      ]),
    }),
    serializeField({
      ...byId["add-on"],
      options: mergeOptions(byId["add-on"].options, [
        "Installation",
        "Delivery",
        "Hardware Kit",
      ]),
    }),
    byId["shipping-method"]
      ? serializeField(byId["shipping-method"])
      : newField("shipping-method", "Shipping Method", "text"),
    byId.depot ? serializeField(byId.depot) : newField("depot", "Depot", "text"),
    byId["external-order-id"]
      ? serializeField(byId["external-order-id"])
      : newField("external-order-id", "External Order ID", "text"),
    byId["currency-code"]
      ? serializeField(byId["currency-code"])
      : newField("currency-code", "Currency Code", "text"),
  ];

  const body = {
    schema: {
      slug: current.slug,
      labels: { singular: "Order", plural: "Orders" },
      description:
        "High-level order from an external commerce/ERP system, synced as a Custom Object related to a Contact.",
      fields,
      relationships: (current.relationships || []).map((r) => ({
        id: r.id,
        labels: r.labels,
        description: r.description,
        namespace: r.namespace,
        hasMany: false,
      })),
    },
  };

  let updated;
  try {
    updated = await ac.put(`/customObjects/schemas/${ORDER_SCHEMA_ID}`, body);
  } catch (err) {
    console.warn("Order label update failed, keeping Purchase labels:", err.message);
    body.schema.labels = { singular: "Purchase", plural: "Purchases" };
    updated = await ac.put(`/customObjects/schemas/${ORDER_SCHEMA_ID}`, body);
  }

  console.log(`Order schema updated (${updated.schema.labels.singular})`);
  return updated.schema;
}

async function upsertRecord(ac, schemaId, externalId, fields) {
  const result = await ac.post(`/customObjects/records/${schemaId}`, {
    record: {
      externalId,
      fields,
      relationships: { "primary-contact": [CONTACT_ID] },
    },
  });
  return result.record || result;
}

async function main() {
  const ac = createAcClient({
    apiUrl: requireEnv("AC_API_URL"),
    apiToken: requireEnv("AC_API_TOKEN"),
  });

  console.log("=== Custom Objects: Quote + Order ===\n");

  const quoteSchema = await updateQuoteSchema(ac);
  const orderSchema = await updateOrderSchema(ac);

  const buyProfile = fieldOptions(quoteSchema, "buy-profile")[0];
  const quoteStatus = fieldOptions(quoteSchema, "quote-status").includes("Sent")
    ? "Sent"
    : fieldOptions(quoteSchema, "quote-status")[0];
  const productCats = fieldOptions(quoteSchema, "product-categories");
  const productType = fieldOptions(orderSchema, "product-type").includes(
    "Glass Balustrade"
  )
    ? "Glass Balustrade"
    : fieldOptions(orderSchema, "product-type")[0];
  const projectStatus = fieldOptions(orderSchema, "project-status").includes(
    "Confirmed"
  )
    ? "Confirmed"
    : fieldOptions(orderSchema, "project-status")[0];
  const addOn = fieldOptions(orderSchema, "add-on").includes("Delivery")
    ? ["Delivery"]
    : fieldOptions(orderSchema, "add-on")[0]
      ? [fieldOptions(orderSchema, "add-on")[0]]
      : null;

  const quote = await upsertRecord(ac, quoteSchema.id, "go-quote-BAL-2026-001", [
    { id: "name", value: "Balustrade Quote — Harbour Deck Project" },
    { id: "quote-number", value: "Q-2026-001" },
    { id: "quote-status", value: quoteStatus },
    { id: "enquiry-status", value: "Sent" },
    { id: "budget", value: 12500.0, currency: "AUD" },
    { id: "quote-total", value: 11840.0, currency: "AUD" },
    { id: "enquiry-date", value: "2026-07-10" },
    { id: "valid-until", value: "2026-08-10" },
    { id: "project-site", value: "12 Harbour View Rd, Sydney NSW" },
    {
      id: "line-items-summary",
      value:
        "2x Glass Balustrade Panel 1200mm @ $289.00; 1x Hardware Kit; Trade discount applied",
    },
    {
      id: "product-categories",
      value: productCats.includes("Glass Balustrade")
        ? ["Glass Balustrade"]
        : productCats.slice(0, 1),
    },
    ...(buyProfile ? [{ id: "buy-profile", value: buyProfile }] : []),
  ]);

  const order = await upsertRecord(ac, orderSchema.id, "go-order-2026-8841", [
    { id: "name", value: "Glass Outlet Order #8841" },
    { id: "order-number", value: "GO-8841" },
    { id: "external-order-id", value: "order-1783928532627" },
    { id: "purchase-date", value: "2026-07-13" },
    { id: "order-total", value: 817.0, currency: "AUD" },
    {
      id: "specific-products-purchased",
      value:
        "Glass Balustrade Panel 1200mm (x2); Glass Pool Fencing Clear Panel (x1)",
    },
    { id: "shipping-method", value: "Standard Delivery" },
    { id: "depot", value: "Sydney Depot" },
    { id: "currency-code", value: "AUD" },
    { id: "completion-date", value: "2026-07-20" },
    ...(productType ? [{ id: "product-type", value: productType }] : []),
    ...(projectStatus ? [{ id: "project-status", value: projectStatus }] : []),
    ...(addOn ? [{ id: "add-on", value: addOn }] : []),
  ]);

  console.log("\n=== Done ===");
  console.log(
    JSON.stringify(
      {
        quote: {
          schemaId: quoteSchema.id,
          slug: quoteSchema.slug,
          labels: quoteSchema.labels,
          externalId: quote.externalId || "go-quote-BAL-2026-001",
          id: quote.id,
        },
        order: {
          schemaId: orderSchema.id,
          slug: orderSchema.slug,
          labels: orderSchema.labels,
          externalId: order.externalId || "go-order-2026-8841",
          id: order.id,
        },
        contactId: CONTACT_ID,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
