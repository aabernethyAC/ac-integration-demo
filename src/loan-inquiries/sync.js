/**
 * Loan Inquiries — Custom Object for Solutions English (.env.englishdemo).
 *
 * Ensures the Loan Inquiry schema and upserts demo records for 10 contacts,
 * always including contact 5226.
 *
 * Usage:
 *   # Dry-run (default): print schema + payloads; no API writes
 *   AC_ENV_FILE=.env.englishdemo npm run sync:loan-inquiries
 *
 *   # Provision schema + upsert sample records
 *   AC_ENV_FILE=.env.englishdemo NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:loan-inquiries -- --apply
 */

import { loadEnv } from "../load-env.js";
import { createAcClient } from "../ac-client.js";
import {
  ANCHOR_CONTACT_ID,
  DEMO_CONTACT_COUNT,
  SCHEMA,
  buildSchemaFields,
  schemaShape,
} from "./schemas.js";
import {
  contactRelationship,
  fieldsById,
} from "../university-alumni/schema-helpers.js";
import {
  SAMPLE_LOAN_INQUIRIES,
  requiredContactSlots,
} from "./fixtures.js";

loadEnv(process.env.AC_ENV_FILE || ".env.englishdemo");

const APPLY =
  process.argv.includes("--apply") ||
  process.env.AC_APPLY === "1" ||
  process.env.AC_APPLY === "true";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function toAcFields(row) {
  const skip = new Set(["contactSlot", "externalId"]);
  const fields = [];
  for (const [key, raw] of Object.entries(row)) {
    if (skip.has(key) || raw == null) continue;
    if (
      typeof raw === "object" &&
      raw !== null &&
      "value" in raw &&
      "currency" in raw
    ) {
      fields.push({ id: key, value: raw.value, currency: raw.currency });
    } else {
      fields.push({ id: key, value: raw });
    }
  }
  return fields;
}

async function getSchema(ac, id) {
  return (await ac.get(`/customObjects/schemas/${id}?showFields=all`)).schema;
}

async function findSchemaBySlug(ac, slug) {
  const res = await ac.get("/customObjects/schemas?limit=100");
  return (res.schemas || []).find((s) => s.slug === slug) || null;
}

async function ensureSchema(ac) {
  const existing = await findSchemaBySlug(ac, SCHEMA.slug);

  if (existing) {
    const current = await getSchema(ac, existing.id);
    const byId = fieldsById(current);
    const updated = await ac.put(`/customObjects/schemas/${current.id}`, {
      schema: {
        slug: current.slug,
        labels: SCHEMA.labels,
        description: SCHEMA.description,
        fields: buildSchemaFields(byId),
        relationships: contactRelationship(
          current.relationships,
          "Borrower / inquiry contact for this loan inquiry"
        ),
      },
    });
    console.log(
      `Schema updated: ${SCHEMA.labels.singular} (${updated.schema.id})`
    );
    return updated.schema;
  }

  const created = await ac.post("/customObjects/schemas", {
    schema: {
      slug: SCHEMA.slug,
      labels: SCHEMA.labels,
      description: SCHEMA.description,
      fields: buildSchemaFields(),
      relationships: contactRelationship(
        [],
        "Borrower / inquiry contact for this loan inquiry"
      ),
    },
  });
  console.log(
    `Schema created: ${SCHEMA.labels.singular} (${created.schema.id})`
  );
  return created.schema;
}

async function getContact(ac, id) {
  try {
    const res = await ac.get(`/contacts/${id}`);
    return res.contact || null;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

/**
 * Resolve DEMO_CONTACT_COUNT contacts, forcing ANCHOR_CONTACT_ID into slot 0.
 */
async function resolveDemoContacts(ac) {
  const slots = requiredContactSlots();
  const needed = Math.max(DEMO_CONTACT_COUNT, slots.length || 0);
  const resolved = new Array(needed).fill(null);

  const anchor = await getContact(ac, ANCHOR_CONTACT_ID);
  if (!anchor) {
    throw new Error(
      `Anchor contact ${ANCHOR_CONTACT_ID} not found in this account. ` +
        `Expected https://update-solutionsenglish.activehosted.com/app/contacts/${ANCHOR_CONTACT_ID}`
    );
  }
  resolved[0] = {
    id: Number(anchor.id),
    email: anchor.email,
    firstName: anchor.firstName,
    lastName: anchor.lastName,
  };

  const seen = new Set([String(ANCHOR_CONTACT_ID)]);
  let offset = 0;
  const pageSize = 100;

  while (resolved.some((c) => !c)) {
    const res = await ac.get(
      `/contacts?limit=${pageSize}&offset=${offset}&orders[id]=ASC`
    );
    const page = res.contacts || [];
    if (!page.length) break;

    for (const c of page) {
      if (seen.has(String(c.id))) continue;
      const emptyIdx = resolved.findIndex((slot) => !slot);
      if (emptyIdx === -1) break;
      resolved[emptyIdx] = {
        id: Number(c.id),
        email: c.email,
        firstName: c.firstName,
        lastName: c.lastName,
      };
      seen.add(String(c.id));
    }

    offset += pageSize;
    const total = Number(res.meta?.total);
    if (Number.isFinite(total) && offset >= total) break;
  }

  const missing = resolved
    .map((c, i) => (c ? null : i))
    .filter((i) => i != null);
  if (missing.length) {
    throw new Error(
      `Could not resolve ${needed} demo contacts (missing slots: ${missing.join(", ")}). ` +
        `Account only returned ${seen.size} usable contact(s).`
    );
  }

  return resolved;
}

async function upsertRecord(ac, schemaId, externalId, fields, contactId) {
  const result = await ac.post(`/customObjects/records/${schemaId}`, {
    record: {
      externalId,
      fields,
      relationships: { "primary-contact": [contactId] },
    },
  });
  return result.record || result;
}

function dryRunPreview() {
  console.log("=== Loan Inquiries Custom Object (DRY-RUN) ===\n");
  console.log(`Anchor contact: ${ANCHOR_CONTACT_ID}`);
  console.log(`Demo contacts: ${DEMO_CONTACT_COUNT}`);
  console.log(`Env file: ${process.env.AC_ENV_FILE || ".env.englishdemo"}`);
  console.log("Mode: dry-run (pass --apply to provision / upsert)\n");

  const shape = schemaShape();
  console.log(`— ${shape.labels.singular} (slug: ${shape.slug})`);
  console.log(`  fields: ${shape.fields.length}`);
  console.log(
    `  required: ${shape.fields
      .filter((f) => f.required)
      .map((f) => f.id)
      .join(", ")}`
  );

  console.log(`\n— Sample records: ${SAMPLE_LOAN_INQUIRIES.length}`);
  for (const row of SAMPLE_LOAN_INQUIRIES) {
    console.log(
      JSON.stringify(
        {
          externalId: row.externalId,
          contactSlot: row.contactSlot,
          contactId:
            row.contactSlot === 0 ? ANCHOR_CONTACT_ID : `(slot ${row.contactSlot})`,
          fields: toAcFields(row),
        },
        null,
        2
      )
    );
  }

  console.log("\nDry-run complete. No API calls were made.");
}

async function apply() {
  const ac = createAcClient({
    apiUrl: requireEnv("AC_API_URL"),
    apiToken: requireEnv("AC_API_TOKEN"),
  });

  console.log("=== Loan Inquiries Custom Object (APPLY) ===\n");
  console.log(`Anchor contact: ${ANCHOR_CONTACT_ID}`);
  console.log(`Env file: ${process.env.AC_ENV_FILE || ".env.englishdemo"}`);
  console.log(`Account: ${process.env.AC_API_URL}\n`);

  const schema = await ensureSchema(ac);
  const contacts = await resolveDemoContacts(ac);

  console.log("\n— Demo contacts");
  contacts.forEach((c, i) => {
    console.log(
      `  [${i}] id=${c.id} ${c.firstName || ""} ${c.lastName || ""} <${c.email || ""}>`
    );
  });

  const records = [];
  console.log("\n— Upserting loan inquiries");
  for (const row of SAMPLE_LOAN_INQUIRIES) {
    const contact = contacts[row.contactSlot];
    if (!contact) {
      throw new Error(`No contact resolved for slot ${row.contactSlot}`);
    }
    const fields = toAcFields(row);
    const record = await upsertRecord(
      ac,
      schema.id,
      row.externalId,
      fields,
      contact.id
    );
    records.push({
      id: record.id,
      externalId: row.externalId,
      contactId: contact.id,
      name: row.name,
      status: row.status,
    });
    console.log(
      `  Upserted ${row.externalId} → contact ${contact.id} (${row.status})`
    );
  }

  console.log("\n=== Done ===");
  console.log(
    JSON.stringify(
      {
        schema: {
          id: schema.id,
          slug: schema.slug,
          labels: schema.labels,
        },
        contacts: contacts.map((c, i) => ({
          slot: i,
          id: c.id,
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(" "),
        })),
        records,
      },
      null,
      2
    )
  );
}

async function main() {
  if (!APPLY) {
    dryRunPreview();
    return;
  }
  await apply();
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  if (err.data) console.error(JSON.stringify(err.data, null, 2));
  process.exit(1);
});
