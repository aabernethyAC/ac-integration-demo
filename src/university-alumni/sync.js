/**
 * University Alumni Marketing — Custom Objects
 * Event Participation + Programme Interest + Donations for contact 1203.
 *
 * Idempotent schema ensure (by slug) and record upsert (by externalId).
 *
 * Usage:
 *   # Dry-run (default): validate + print schemas/payloads; no API writes
 *   AC_ENV_FILE=.env.alex npm run sync:university-alumni
 *
 *   # Provision schemas + upsert sample records
 *   AC_ENV_FILE=.env.alex NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:university-alumni -- --apply
 */

import { loadEnv } from "../load-env.js";
import { createAcClient } from "../ac-client.js";
import {
  CONTACT_ID,
  SCHEMAS,
  buildSchemaFields,
} from "./schemas.js";
import {
  contactRelationship,
  fieldsById,
} from "./schema-helpers.js";
import { prepareRecord, safeLog, RECONCILIATION } from "./validate.js";
import { matchAutomations, AUTOMATION_MAPPINGS } from "./automations.js";
import {
  SAMPLE_DONATIONS,
  SAMPLE_EVENT_PARTICIPATIONS,
  SAMPLE_PROGRAMME_INTERESTS,
} from "./fixtures.js";

loadEnv(process.env.AC_ENV_FILE || ".env.alex");

const APPLY = process.argv.includes("--apply") || process.env.AC_APPLY === "1";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function getSchema(ac, id) {
  return (await ac.get(`/customObjects/schemas/${id}?showFields=all`)).schema;
}

async function findSchemaBySlug(ac, slug) {
  const res = await ac.get("/customObjects/schemas?limit=100");
  return (res.schemas || []).find((s) => s.slug === slug) || null;
}

async function ensureSchema(ac, objectKey) {
  const meta = SCHEMAS[objectKey];
  const existing = await findSchemaBySlug(ac, meta.slug);

  if (existing) {
    const current = await getSchema(ac, existing.id);
    const byId = fieldsById(current);
    const updated = await ac.put(`/customObjects/schemas/${current.id}`, {
      schema: {
        slug: current.slug,
        labels: meta.labels,
        description: meta.description,
        fields: buildSchemaFields(objectKey, byId),
        relationships: contactRelationship(
          current.relationships,
          "Alumni / prospective postgraduate contact"
        ),
      },
    });
    console.log(
      `Schema updated: ${meta.labels.singular} (${updated.schema.id})`
    );
    return updated.schema;
  }

  const created = await ac.post("/customObjects/schemas", {
    schema: {
      slug: meta.slug,
      labels: meta.labels,
      description: meta.description,
      fields: buildSchemaFields(objectKey),
      relationships: contactRelationship(
        [],
        "Alumni / prospective postgraduate contact"
      ),
    },
  });
  console.log(
    `Schema created: ${meta.labels.singular} (${created.schema.id})`
  );
  return created.schema;
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

function prepareSamples(objectKey, rows) {
  return rows.map((row) => {
    const prepared = prepareRecord(objectKey, row, { contactId: CONTACT_ID });
    if (!prepared.ok) {
      throw new Error(
        `${objectKey} fixture invalid: ${prepared.errors.join("; ")}`
      );
    }
    return prepared;
  });
}

function dryRunPreview() {
  console.log("=== University Alumni Custom Objects (DRY-RUN) ===\n");
  console.log(`Contact: ${CONTACT_ID}`);
  console.log(`Env file: ${process.env.AC_ENV_FILE || ".env.alex"}`);
  console.log("Mode: dry-run (pass --apply to provision / upsert)\n");

  for (const [key, meta] of Object.entries(SCHEMAS)) {
    console.log(`— ${meta.labels.singular} (slug: ${meta.slug})`);
    console.log(`  fields: ${buildSchemaFields(key).length}`);
    console.log(`  externalId field: ${meta.externalIdField}`);
  }

  console.log("\n— Reconciliation");
  for (const note of RECONCILIATION.notes) console.log(`  • ${note}`);

  console.log(`\n— Automation mappings: ${AUTOMATION_MAPPINGS.length} documented`);

  const events = prepareSamples("eventParticipation", SAMPLE_EVENT_PARTICIPATIONS);
  const interests = prepareSamples(
    "programmeInterest",
    SAMPLE_PROGRAMME_INTERESTS
  );
  const donations = prepareSamples("donations", SAMPLE_DONATIONS);

  console.log("\n— Sample payloads (sanitized)");
  for (const p of events) {
    console.log(
      JSON.stringify(
        {
          object: "eventParticipation",
          externalId: p.externalId,
          contactId: p.contactId,
          fields: p.fields,
          automations: matchAutomations(
            "eventParticipation",
            p.fields,
            p.fields.find((f) => f.id === "attendance-status")?.value ===
              "Registered"
              ? "record_created"
              : "record_updated"
          ).map((a) => a.id),
        },
        null,
        2
      )
    );
  }
  for (const p of interests) {
    console.log(
      JSON.stringify(
        {
          object: "programmeInterest",
          externalId: p.externalId,
          contactId: p.contactId,
          fields: p.fields,
          automations: matchAutomations(
            "programmeInterest",
            p.fields,
            "record_created"
          ).map((a) => a.id),
        },
        null,
        2
      )
    );
  }
  for (const p of donations) {
    safeLog(
      "donations",
      "donation sample:",
      {
        object: "donations",
        externalId: p.externalId,
        contactId: p.contactId,
        fields: p.fields,
        automations: matchAutomations(
          "donations",
          p.fields,
          "record_created"
        ).map((a) => a.id),
      }
    );
  }

  console.log("\nDry-run complete. No API calls were made.");
}

async function apply() {
  const ac = createAcClient({
    apiUrl: requireEnv("AC_API_URL"),
    apiToken: requireEnv("AC_API_TOKEN"),
  });

  console.log("=== University Alumni Custom Objects (APPLY) ===\n");
  console.log(`Contact: ${CONTACT_ID}`);
  console.log(`Env file: ${process.env.AC_ENV_FILE || ".env.alex"}\n`);

  const eventSchema = await ensureSchema(ac, "eventParticipation");
  const interestSchema = await ensureSchema(ac, "programmeInterest");
  const donationSchema = await ensureSchema(ac, "donations");

  const eventRecords = [];
  for (const prepared of prepareSamples(
    "eventParticipation",
    SAMPLE_EVENT_PARTICIPATIONS
  )) {
    const record = await upsertRecord(
      ac,
      eventSchema.id,
      prepared.externalId,
      prepared.fields,
      CONTACT_ID
    );
    eventRecords.push({
      id: record.id,
      externalId: prepared.externalId,
    });
    console.log(`Upserted Event Participation: ${prepared.externalId}`);
  }

  const interestRecords = [];
  for (const prepared of prepareSamples(
    "programmeInterest",
    SAMPLE_PROGRAMME_INTERESTS
  )) {
    const record = await upsertRecord(
      ac,
      interestSchema.id,
      prepared.externalId,
      prepared.fields,
      CONTACT_ID
    );
    interestRecords.push({
      id: record.id,
      externalId: prepared.externalId,
    });
    console.log(`Upserted Programme Interest: ${prepared.externalId}`);
  }

  const donationRecords = [];
  for (const prepared of prepareSamples("donations", SAMPLE_DONATIONS)) {
    const record = await upsertRecord(
      ac,
      donationSchema.id,
      prepared.externalId,
      prepared.fields,
      CONTACT_ID
    );
    donationRecords.push({
      id: record.id,
      externalId: prepared.externalId,
    });
    // Never log amount / raw field values for donations
    console.log(`Upserted Donation: ${prepared.externalId}`);
  }

  console.log("\n=== Done ===");
  console.log(
    JSON.stringify(
      {
        contactId: CONTACT_ID,
        schemas: {
          eventParticipation: {
            id: eventSchema.id,
            slug: eventSchema.slug,
            labels: eventSchema.labels,
          },
          programmeInterest: {
            id: interestSchema.id,
            slug: interestSchema.slug,
            labels: interestSchema.labels,
          },
          donations: {
            id: donationSchema.id,
            slug: donationSchema.slug,
            labels: donationSchema.labels,
          },
        },
        records: {
          eventParticipation: eventRecords,
          programmeInterest: interestRecords,
          donations: donationRecords,
        },
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
