/**
 * Seed a demo Union membership contact in ACHQglobal.
 *
 * Creates/updates aabernethy@activecampaign.com with dummy values for all
 * Union sign-up + Membership Payment custom fields, then applies tags + lists.
 *
 * Usage:
 *   AC_ENV_FILE=.env.achqglobal NODE_TLS_REJECT_UNAUTHORIZED=0 npm run seed:union-contact
 */

import { loadEnv } from "../load-env.js";
import { createAcClient } from "../ac-client.js";
import { FIELD_SPECS } from "./fields.js";

loadEnv(process.env.AC_ENV_FILE || ".env.achqglobal");

const CONTACT = {
  email: "aabernethy@activecampaign.com",
  firstName: "Alex",
  lastName: "Abernethy",
  phone: "+61 400 000 001",
};

/** Dummy values keyed by perstag (uppercase). */
const DUMMY_BY_PERSTAG = {
  UNION_WORK_SUBURB: "South Brisbane",
  UNION_EMPLOYER: "River City Health",
  UNION_JOB_TITLE: "Enrolled Nurse",
  UNION_EMPLOYMENT_TYPE: "Full-time",
  UNION_INDUSTRY: "Healthcare",
  UNION_WORKPLACE: "Mater Hospital South Brisbane",
  UNION_DATE_OF_BIRTH: "1990-05-14",
  UNION_HOME_SUBURB: "West End",
  UNION_HOME_POSTCODE: "4101",
  UNION_PREFERRED_CONTACT: "Email",
  UNION_GENDER: "Prefer not to say",
  UNION_REFERRAL_SOURCE: "Colleague",
  UNION_MEMBERSHIP_TYPE: "Full member",
  UNION_AGREEMENT_ACCEPTED: "Yes",
  UNION_AGREEMENT_DATE: "2026-08-26",
  UNION_PRIVACY_CONSENT: "Yes",
  UNION_CONTRIBUTION_AMOUNT: "28.50",
  UNION_CONTRIBUTION_FREQUENCY: "Fortnightly",
  UNION_PAYMENT_METHOD: "Payroll deduction",
  UNION_PAYROLL_NUMBER: "EMP-78421",
  UNION_CONTRIBUTION_START: "2026-09-01",
  UNION_FORM_S1_COMPLETE: "Yes",
  UNION_FORM_S2_COMPLETE: "Yes",
  UNION_FORM_S3_COMPLETE: "Yes",
  UNION_FORM_S4_COMPLETE: "Yes",
  HAS_MOST_RECENT_PAYMENT_BEEN_MISSED: "No",
  DECLINE_TYPE: "Other",
  NEXT_PAYMENT_DUE: "2026-09-15",
  LAST_PAYMENT_MADE: "2026-08-15",
  MEMBERSHIP_STATUS: "Active",
  MEMBERSHIP_TYPE: "Full",
  RENEWAL_FREQUENCY: "Fortnightly",
};

const TAG_NAMES = [
  "Union: Member",
  "Union: Form Complete",
  "Union: Active Membership",
];

const LIST_NAMES = ["Master List", "Union Members", "Global Subscription List"];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function listAllFields(ac) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await ac.get(`/fields?limit=100&offset=${offset}`);
    const fields = res.fields || [];
    all.push(...fields);
    if (fields.length < 100) break;
    offset += 100;
  }
  return all;
}

async function ensureTag(ac, tagName) {
  const res = await ac.get(`/tags?search=${encodeURIComponent(tagName)}`);
  const found = (res.tags || []).find(
    (t) => t.tag.toLowerCase() === tagName.toLowerCase()
  );
  if (found) return found;

  const created = await ac.post("/tags", {
    tag: {
      tag: tagName,
      tagType: "contact",
      description: "Union membership demo tag",
    },
  });
  return created.tag;
}

async function ensureList(ac, listName) {
  const res = await ac.get("/lists?limit=100");
  const found = (res.lists || []).find(
    (l) => (l.name || "").toLowerCase() === listName.toLowerCase()
  );
  if (found) return found;

  const stringid = listName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const created = await ac.post("/lists", {
    list: {
      name: listName,
      stringid,
      sender_url: "https://example.com",
      sender_reminder: "You are receiving this because you joined as a union member.",
    },
  });
  return created.list;
}

async function ensureContactTag(ac, contactId, tagId) {
  const existing = await ac.get(`/contacts/${contactId}/contactTags`);
  const already = (existing.contactTags || []).some(
    (ct) => String(ct.tag) === String(tagId)
  );
  if (already) return { skipped: true };

  await ac.post("/contactTags", {
    contactTag: { contact: String(contactId), tag: String(tagId) },
  });
  return { skipped: false };
}

async function ensureContactList(ac, contactId, listId) {
  await ac.post("/contactLists", {
    contactList: {
      list: String(listId),
      contact: String(contactId),
      status: 1,
    },
  });
}

function buildFieldValues(fieldsByPerstag) {
  const values = [];
  for (const spec of FIELD_SPECS) {
    const key = spec.perstag.toUpperCase();
    const dummy = DUMMY_BY_PERSTAG[key];
    if (dummy == null) {
      throw new Error(`No dummy value for ${key}`);
    }
    const field = fieldsByPerstag.get(key);
    if (!field) {
      throw new Error(`Field %${key}% not found in account — run sync:union-signup --apply first`);
    }
    values.push({ field: String(field.id), value: dummy });
  }
  return values;
}

async function main() {
  const ac = createAcClient({
    apiUrl: requireEnv("AC_API_URL"),
    apiToken: requireEnv("AC_API_TOKEN"),
  });

  console.log(`Account: ${process.env.AC_API_URL}`);
  console.log(`Contact: ${CONTACT.email}\n`);

  const fields = await listAllFields(ac);
  const fieldsByPerstag = new Map(
    fields
      .filter((f) => f.perstag)
      .map((f) => [String(f.perstag).toUpperCase(), f])
  );
  const fieldValues = buildFieldValues(fieldsByPerstag);
  console.log(`Field values to set: ${fieldValues.length}`);

  const tags = [];
  for (const name of TAG_NAMES) {
    const tag = await ensureTag(ac, name);
    tags.push(tag);
    console.log(`Tag: ${tag.tag} (id ${tag.id})`);
  }

  const lists = [];
  for (const name of LIST_NAMES) {
    const list = await ensureList(ac, name);
    lists.push(list);
    console.log(`List: ${list.name} (id ${list.id})`);
  }

  const synced = await ac.post("/contact/sync", {
    contact: {
      email: CONTACT.email,
      firstName: CONTACT.firstName,
      lastName: CONTACT.lastName,
      phone: CONTACT.phone,
      fieldValues,
    },
  });

  const contact = synced.contact;
  if (!contact?.id) {
    throw new Error(`Contact sync failed: ${JSON.stringify(synced)}`);
  }
  console.log(`\nContact synced id=${contact.id} ${contact.email}`);

  for (const tag of tags) {
    const result = await ensureContactTag(ac, contact.id, tag.id);
    console.log(
      result.skipped
        ? `  tag already on contact: ${tag.tag}`
        : `  tagged: ${tag.tag}`
    );
  }

  for (const list of lists) {
    await ensureContactList(ac, contact.id, list.id);
    console.log(`  subscribed: ${list.name}`);
  }

  const verify = await ac.get(`/contacts/${contact.id}/fieldValues`);
  const setCount = (verify.fieldValues || []).filter((fv) =>
    FIELD_SPECS.some((s) => {
      const f = fieldsByPerstag.get(s.perstag.toUpperCase());
      return f && String(fv.field) === String(f.id) && fv.value;
    })
  ).length;

  console.log(`\nVerified ${setCount}/${FIELD_SPECS.length} Union field values populated.`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
