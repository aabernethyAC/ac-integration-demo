/**
 * Code Camp Custom Objects — Child (current) + Program (historical)
 * related to contact 1203.
 *
 * Usage:
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 node src/code-camp-sync.js
 *   AC_ENV_FILE=.env.alex NODE_TLS_REJECT_UNAUTHORIZED=0 npm run sync:code-camp
 */
import { loadEnv } from "./load-env.js";
import { createAcClient } from "./ac-client.js";

loadEnv(process.env.AC_ENV_FILE || ".env.alex");

const CONTACT_ID = 1203;
const CHILD_SCHEMA_ID = "8bf24909-84a3-4217-83be-6490c7e4c260"; // slug: child
const PROGRAM_SLUG = "code-camp-program";

const PROGRAM_OPTIONS = [
  "Scratch Creators",
  "Python Basics",
  "Web Dev Bootcamp",
  "Roblox Studio",
  "Game Design Lab",
  "AI Explorers",
];

const GRADE_OPTIONS = [
  "Year 3",
  "Year 4",
  "Year 5",
  "Year 6",
  "Year 7",
  "Year 8",
  "Year 9",
];

const ENROLLMENT_STATUS_OPTIONS = [
  "Enrolled",
  "Waitlisted",
  "Paused",
  "Alumni",
];

const PROGRAM_STATUS_OPTIONS = [
  "Enrolled",
  "In Progress",
  "Completed",
  "Withdrawn",
];

const SKILL_LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

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

function ensureDropdown(byId, id, singular, values) {
  if (byId[id]) {
    return serializeField({
      ...byId[id],
      labels: { singular, plural: singular },
      options: mergeOptions(byId[id].options, values),
    });
  }
  return newField(id, singular, "dropdown", {
    options: values.map((value) => ({ value })),
  });
}

function ensureMultiselect(byId, id, singular, values) {
  if (byId[id]) {
    return serializeField({
      ...byId[id],
      labels: { singular, plural: singular },
      options: mergeOptions(byId[id].options, values),
    });
  }
  return newField(id, singular, "multiselect", {
    options: values.map((value) => ({ value })),
  });
}

function ensureField(byId, id, singular, type, extra = {}) {
  return byId[id]
    ? serializeField({
        ...byId[id],
        labels: { singular, plural: singular },
        ...extra,
      })
    : newField(id, singular, type, extra);
}

function contactRelationship(existing = []) {
  const current = existing.find((r) => r.id === "primary-contact");
  return [
    {
      id: "primary-contact",
      labels: current?.labels || { singular: "Contact", plural: "Contacts" },
      description:
        current?.description || "Parent / guardian contact for this record",
      namespace: "contacts",
      hasMany: false,
    },
  ];
}

async function getSchema(ac, id) {
  return (await ac.get(`/customObjects/schemas/${id}?showFields=all`)).schema;
}

async function findSchemaBySlug(ac, slug) {
  const res = await ac.get("/customObjects/schemas?limit=100");
  return (res.schemas || []).find((s) => s.slug === slug) || null;
}

function isActiveField(f) {
  return f && f.status !== "marked_for_deletion";
}

async function updateChildSchema(ac) {
  const current = await getSchema(ac, CHILD_SCHEMA_ID);
  const byId = Object.fromEntries(
    (current.fields || []).filter(isActiveField).map((f) => [f.id, f])
  );

  const fields = [
    ensureField(byId, "name", "Child Name", "text"),
    ensureField(byId, "date-of-birth", "Date of Birth", "date"),
    byId["age-1"]
      ? serializeField({
          ...byId["age-1"],
          labels: { singular: "Age (years)", plural: "Age (years)" },
          scale: byId["age-1"].scale ?? 0,
        })
      : newField("age-1", "Age (years)", "number", { scale: 0 }),
    ensureDropdown(
      byId,
      "membership-status",
      "Membership Status",
      ["Active", "Paused", "Cancelled"]
    ),
    byId["birth-month"]
      ? serializeField({
          ...byId["birth-month"],
          options: mergeOptions(byId["birth-month"].options, [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ]),
        })
      : null,
    ensureMultiselect(byId, "current-programs", "Current Programs", PROGRAM_OPTIONS),
    ensureDropdown(byId, "grade-level", "Grade Level", GRADE_OPTIONS),
    ensureField(byId, "school", "School", "text"),
    ensureDropdown(
      byId,
      "enrollment-status",
      "Enrollment Status",
      ENROLLMENT_STATUS_OPTIONS
    ),
    ensureField(byId, "emergency-contact", "Emergency Contact", "text"),
    ensureField(byId, "notes", "Notes", "textarea"),
  ].filter(Boolean);

  const updated = await ac.put(`/customObjects/schemas/${CHILD_SCHEMA_ID}`, {
    schema: {
      slug: current.slug,
      labels: { singular: "Child", plural: "Children" },
      description:
        "Child enrolled in a Code Camp program. Shows who the child is and which programs they are currently in.",
      fields,
      relationships: contactRelationship(current.relationships),
    },
  });

  console.log(`Child schema updated (${updated.schema.id})`);
  return updated.schema;
}

function programSchemaFields(byId = {}) {
  return [
    ensureField(byId, "name", "Program Name", "text"),
    ensureField(byId, "child-name", "Child Name", "text"),
    ensureField(byId, "program-code", "Program Code", "text"),
    ensureDropdown(byId, "program-type", "Program Type", PROGRAM_OPTIONS),
    ensureField(byId, "session", "Session", "text"),
    ensureField(byId, "start-date", "Start Date", "date"),
    ensureField(byId, "end-date", "End Date", "date"),
    ensureDropdown(byId, "status", "Status", PROGRAM_STATUS_OPTIONS),
    ensureDropdown(byId, "skill-level", "Skill Level", SKILL_LEVEL_OPTIONS),
    ensureField(byId, "location", "Location", "text"),
    ensureField(byId, "instructor", "Instructor", "text"),
    ensureField(byId, "outcome-summary", "Outcome Summary", "textarea"),
  ];
}

async function ensureProgramSchema(ac) {
  const existing = await findSchemaBySlug(ac, PROGRAM_SLUG);

  if (existing) {
    const current = await getSchema(ac, existing.id);
    const byId = Object.fromEntries(
      (current.fields || []).filter(isActiveField).map((f) => [f.id, f])
    );
    const updated = await ac.put(`/customObjects/schemas/${current.id}`, {
      schema: {
        slug: current.slug,
        labels: { singular: "Program", plural: "Programs" },
        description:
          "Historical Code Camp program enrollments for a child (past and completed sessions).",
        fields: programSchemaFields(byId),
        relationships: contactRelationship(current.relationships),
      },
    });
    console.log(`Program schema updated (${updated.schema.id})`);
    return updated.schema;
  }

  const created = await ac.post("/customObjects/schemas", {
    schema: {
      slug: PROGRAM_SLUG,
      labels: { singular: "Program", plural: "Programs" },
      description:
        "Historical Code Camp program enrollments for a child (past and completed sessions).",
      fields: programSchemaFields(),
      relationships: contactRelationship(),
    },
  });

  console.log(`Program schema created (${created.schema.id})`);
  return created.schema;
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

  console.log("=== Code Camp Custom Objects: Child + Program ===\n");
  console.log(`Contact: ${CONTACT_ID}`);
  console.log(`Env file: ${process.env.AC_ENV_FILE || ".env.alex"}\n`);

  const childSchema = await updateChildSchema(ac);
  const programSchema = await ensureProgramSchema(ac);

  const emma = await upsertRecord(ac, childSchema.id, "codecamp-child-emma-edwards", [
    { id: "name", value: "Emma Edwards" },
    { id: "date-of-birth", value: "2016-03-14" },
    { id: "age-1", value: 10 },
    { id: "membership-status", value: "Active" },
    { id: "birth-month", value: "Mar" },
    {
      id: "current-programs",
      value: ["Scratch Creators", "Python Basics"],
    },
    { id: "grade-level", value: "Year 5" },
    { id: "school", value: "Harbour View Primary" },
    { id: "enrollment-status", value: "Enrolled" },
    { id: "emergency-contact", value: "Anthony Edwards — 0400 000 000" },
    {
      id: "notes",
      value: "Loves Scratch animations; starting Python this term.",
    },
  ]);

  const liam = await upsertRecord(ac, childSchema.id, "codecamp-child-liam-edwards", [
    { id: "name", value: "Liam Edwards" },
    { id: "date-of-birth", value: "2014-09-02" },
    { id: "age-1", value: 12 },
    { id: "membership-status", value: "Active" },
    { id: "birth-month", value: "Sep" },
    { id: "current-programs", value: ["Web Dev Bootcamp"] },
    { id: "grade-level", value: "Year 7" },
    { id: "school", value: "Northside High" },
    { id: "enrollment-status", value: "Enrolled" },
    { id: "emergency-contact", value: "Anthony Edwards — 0400 000 000" },
    {
      id: "notes",
      value: "Completed Game Design Lab last summer; now in Web Dev.",
    },
  ]);

  const programs = [];

  programs.push(
    await upsertRecord(ac, programSchema.id, "codecamp-prog-emma-scratch-2026-winter", [
      { id: "name", value: "Scratch Creators — Winter 2026" },
      { id: "child-name", value: "Emma Edwards" },
      { id: "program-code", value: "CC-SCRATCH-W26" },
      { id: "program-type", value: "Scratch Creators" },
      { id: "session", value: "Winter 2026" },
      { id: "start-date", value: "2026-07-06" },
      { id: "end-date", value: "2026-08-28" },
      { id: "status", value: "In Progress" },
      { id: "skill-level", value: "Beginner" },
      { id: "location", value: "Sydney CBD Studio" },
      { id: "instructor", value: "Maya Chen" },
      {
        id: "outcome-summary",
        value: "Building interactive stories; mid-term showcase project underway.",
      },
    ])
  );

  programs.push(
    await upsertRecord(ac, programSchema.id, "codecamp-prog-emma-python-2026-winter", [
      { id: "name", value: "Python Basics — Winter 2026" },
      { id: "child-name", value: "Emma Edwards" },
      { id: "program-code", value: "CC-PYTHON-W26" },
      { id: "program-type", value: "Python Basics" },
      { id: "session", value: "Winter 2026" },
      { id: "start-date", value: "2026-07-13" },
      { id: "end-date", value: "2026-09-04" },
      { id: "status", value: "Enrolled" },
      { id: "skill-level", value: "Beginner" },
      { id: "location", value: "Sydney CBD Studio" },
      { id: "instructor", value: "Jordan Lee" },
      {
        id: "outcome-summary",
        value: "Just started; focusing on variables and loops.",
      },
    ])
  );

  programs.push(
    await upsertRecord(ac, programSchema.id, "codecamp-prog-liam-webdev-2026-winter", [
      { id: "name", value: "Web Dev Bootcamp — Winter 2026" },
      { id: "child-name", value: "Liam Edwards" },
      { id: "program-code", value: "CC-WEB-W26" },
      { id: "program-type", value: "Web Dev Bootcamp" },
      { id: "session", value: "Winter 2026" },
      { id: "start-date", value: "2026-07-06" },
      { id: "end-date", value: "2026-09-11" },
      { id: "status", value: "In Progress" },
      { id: "skill-level", value: "Intermediate" },
      { id: "location", value: "Online Live" },
      { id: "instructor", value: "Sam Ortiz" },
      {
        id: "outcome-summary",
        value: "Building a personal portfolio site with HTML/CSS/JS.",
      },
    ])
  );

  programs.push(
    await upsertRecord(ac, programSchema.id, "codecamp-prog-liam-gamedesign-2025-summer", [
      { id: "name", value: "Game Design Lab — Summer 2025" },
      { id: "child-name", value: "Liam Edwards" },
      { id: "program-code", value: "CC-GAME-S25" },
      { id: "program-type", value: "Game Design Lab" },
      { id: "session", value: "Summer 2025" },
      { id: "start-date", value: "2025-12-08" },
      { id: "end-date", value: "2026-01-30" },
      { id: "status", value: "Completed" },
      { id: "skill-level", value: "Beginner" },
      { id: "location", value: "Sydney CBD Studio" },
      { id: "instructor", value: "Priya Nair" },
      {
        id: "outcome-summary",
        value: "Completed platformer prototype; earned completion badge.",
      },
    ])
  );

  programs.push(
    await upsertRecord(ac, programSchema.id, "codecamp-prog-emma-roblox-2025-spring", [
      { id: "name", value: "Roblox Studio — Spring 2025" },
      { id: "child-name", value: "Emma Edwards" },
      { id: "program-code", value: "CC-ROBLOX-SP25" },
      { id: "program-type", value: "Roblox Studio" },
      { id: "session", value: "Spring 2025" },
      { id: "start-date", value: "2025-09-15" },
      { id: "end-date", value: "2025-11-07" },
      { id: "status", value: "Completed" },
      { id: "skill-level", value: "Beginner" },
      { id: "location", value: "Online Live" },
      { id: "instructor", value: "Alex Kim" },
      {
        id: "outcome-summary",
        value: "Finished first published Roblox experience.",
      },
    ])
  );

  console.log("\n=== Done ===");
  console.log(
    JSON.stringify(
      {
        contactId: CONTACT_ID,
        children: [
          {
            schemaId: childSchema.id,
            slug: childSchema.slug,
            externalId: emma.externalId || "codecamp-child-emma-edwards",
            id: emma.id,
            name: "Emma Edwards",
          },
          {
            schemaId: childSchema.id,
            slug: childSchema.slug,
            externalId: liam.externalId || "codecamp-child-liam-edwards",
            id: liam.id,
            name: "Liam Edwards",
          },
        ],
        programs: {
          schemaId: programSchema.id,
          slug: programSchema.slug,
          labels: programSchema.labels,
          records: programs.map((p, i) => ({
            id: p.id,
            externalId: p.externalId,
            index: i + 1,
          })),
        },
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
