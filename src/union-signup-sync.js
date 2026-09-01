/**
 * Union membership sign-up — provision contact custom fields in ACHQglobal.
 *
 * Idempotent by `perstag`. Creates missing fields + options; on --apply also
 * ensures list relationships (fieldRels) and field-group membership so fields
 * appear on the contact record UI.
 *
 * Usage:
 *   # Dry-run (default)
 *   AC_ENV_FILE=.env.achqglobal NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:union-signup
 *
 *   # Create / repair fields in ActiveCampaign
 *   AC_ENV_FILE=.env.achqglobal NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:union-signup -- --apply
 */

import { loadEnv } from "./load-env.js";
import { createAcClient } from "./ac-client.js";
import {
  FIELD_SPECS,
  SECTION_LABELS,
  FIELD_GROUPS,
  FIELD_REL_LIST_IDS,
  groupIdForSection,
} from "./union-signup/fields.js";

loadEnv(process.env.AC_ENV_FILE || ".env.achqglobal");

const APPLY =
  process.argv.includes("--apply") ||
  process.env.AC_APPLY === "1" ||
  process.env.AC_APPLY === "true";

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

function byPerstag(fields) {
  const map = new Map();
  for (const f of fields) {
    if (f.perstag) map.set(String(f.perstag).toUpperCase(), f);
  }
  return map;
}

async function listFieldRels(ac) {
  const all = [];
  let offset = 0;
  while (true) {
    const res = await ac.get(`/fieldRels?limit=100&offset=${offset}`);
    const rows = res.fieldRels || [];
    all.push(...rows);
    if (rows.length < 100) break;
    offset += 100;
    if (offset > 5000) break;
  }
  return all;
}

async function groupMembersFor(ac, groupId) {
  const res = await ac.get(`/groupMembers?group_id=${groupId}&limit=100`);
  return res.groupMembers || [];
}

async function ensureFieldOptions(ac, fieldId, optionValues) {
  if (!optionValues?.length) return { created: 0, skipped: true };

  let existing = [];
  try {
    const res = await ac.get(`/fields/${fieldId}/options`);
    existing = (res.fieldOptions || res.options || []).map(
      (o) => o.value || o.label
    );
  } catch {
    existing = [];
  }

  const missing = optionValues.filter((v) => !existing.includes(v));
  if (!missing.length) return { created: 0, skipped: true };

  await ac.post("/fieldOption/bulk", {
    fieldOptions: missing.map((value, i) => ({
      field: String(fieldId),
      value,
      orderid: existing.length + i + 1,
      isdefault: false,
    })),
  });

  return { created: missing.length, skipped: false };
}

async function ensureFieldRels(ac, fieldId, existingRelKeys) {
  let created = 0;
  for (const listId of FIELD_REL_LIST_IDS) {
    const key = `${fieldId}:${listId}`;
    if (existingRelKeys.has(key)) continue;
    try {
      await ac.post("/fieldRels", {
        fieldRel: {
          field: String(fieldId),
          relid: Number(listId),
        },
      });
      existingRelKeys.add(key);
      created += 1;
    } catch (err) {
      // Duplicate / already related is fine
      if (err.status !== 422 && err.status !== 400) {
        console.warn(
          `  warn: fieldRel field=${fieldId} list=${listId}: ${err.message?.slice(0, 120)}`
        );
      } else {
        existingRelKeys.add(key);
      }
    }
  }
  return created;
}

async function ensureGroupMember(ac, fieldId, groupId, existingByField) {
  const current = existingByField.get(String(fieldId));
  if (current && Number(current.group_id) === Number(groupId)) {
    return { skipped: true };
  }

  // Already in a different group — leave as-is (avoid duplicate membership errors)
  if (current) {
    return { skipped: true, otherGroup: current.group_id };
  }

  await ac.post("/groupMembers", {
    groupMember: {
      rel_id: Number(fieldId),
      group_id: Number(groupId),
      ordernum: null,
    },
  });
  existingByField.set(String(fieldId), {
    rel_id: fieldId,
    group_id: groupId,
  });
  return { skipped: false };
}

async function createField(ac, spec) {
  const body = {
    field: {
      title: spec.title,
      type: spec.type,
      descript: spec.descript || "",
      perstag: spec.perstag,
      visible: true,
      show_in_list: false,
    },
  };

  const created = await ac.post("/fields", body);
  const field = created.field;
  if (!field?.id) {
    throw new Error(`Create failed for ${spec.perstag}: ${JSON.stringify(created)}`);
  }

  if (spec.options?.length) {
    await ensureFieldOptions(ac, field.id, spec.options);
  }

  return field;
}

function printPlan(existingMap) {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"} (${FIELD_SPECS.length} specs)\n`);
  console.log(
    `Groups: Join Form=${FIELD_GROUPS.joinForm.id}, Financial Status=${FIELD_GROUPS.financialStatus.id}`
  );
  console.log(`List relations: ${FIELD_REL_LIST_IDS.join(", ")} (0=all lists)\n`);

  let create = 0;
  let skip = 0;
  let lastSection = null;

  for (const spec of FIELD_SPECS) {
    if (spec.section !== lastSection) {
      lastSection = spec.section;
      const gid = groupIdForSection(spec.section);
      console.log(
        `\n## ${SECTION_LABELS[spec.section] || spec.section} → group ${gid}`
      );
    }
    const key = spec.perstag.toUpperCase();
    const found = existingMap.get(key);
    if (found) {
      skip += 1;
      console.log(`  skip  %${spec.perstag}%  (id ${found.id}, ${found.type})`);
    } else {
      create += 1;
      const opts = spec.options?.length
        ? ` options=[${spec.options.join(", ")}]`
        : "";
      console.log(`  create  %${spec.perstag}%  ${spec.type}${opts}`);
      console.log(`         ${spec.title}`);
    }
  }

  console.log(`\nSummary: ${create} to create, ${skip} already exist`);
  if (APPLY) {
    console.log(
      "On apply: will also repair fieldRels + groupMembers for all specs."
    );
  }
  return { create, skip };
}

async function main() {
  const apiUrl = requireEnv("AC_API_URL");
  const apiToken = requireEnv("AC_API_TOKEN");
  const ac = createAcClient({ apiUrl, apiToken });

  console.log(`Account: ${apiUrl}`);
  const existing = await listAllFields(ac);
  const existingMap = byPerstag(existing);
  const { create } = printPlan(existingMap);

  if (!APPLY) {
    console.log("\nRe-run with --apply to create missing fields / repair visibility.");
    return;
  }

  if (create) {
    console.log("\nCreating missing fields…");
    for (const spec of FIELD_SPECS) {
      const key = spec.perstag.toUpperCase();
      if (existingMap.has(key)) continue;

      const field = await createField(ac, spec);
      existingMap.set(key, field);
      console.log(`  created %${field.perstag || spec.perstag}% id=${field.id}`);
    }
  }

  console.log("\nRepairing visibility (fieldRels + groupMembers)…");
  const rels = await listFieldRels(ac);
  const existingRelKeys = new Set(
    rels.map((r) => `${r.field}:${r.relid}`)
  );

  const memberMap = new Map();
  for (const g of Object.values(FIELD_GROUPS)) {
    const members = await groupMembersFor(ac, g.id);
    for (const m of members) {
      memberMap.set(String(m.rel_id), m);
    }
  }

  let relsCreated = 0;
  let groupsCreated = 0;

  for (const spec of FIELD_SPECS) {
    const field = existingMap.get(spec.perstag.toUpperCase());
    if (!field?.id) {
      console.warn(`  warn: missing field %${spec.perstag}%`);
      continue;
    }

    relsCreated += await ensureFieldRels(ac, field.id, existingRelKeys);

    const groupId = groupIdForSection(spec.section);
    try {
      const result = await ensureGroupMember(ac, field.id, groupId, memberMap);
      if (!result.skipped) {
        groupsCreated += 1;
        console.log(
          `  groupMember %${spec.perstag}% → group ${groupId}`
        );
      }
    } catch (err) {
      console.warn(
        `  warn: groupMember %${spec.perstag}%: ${err.message?.slice(0, 120)}`
      );
    }
  }

  console.log(
    `\nDone. fieldRels created=${relsCreated}, groupMembers created=${groupsCreated}`
  );
  console.log(
    "On the contact, expand the Join Form and Financial Status field groups."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
