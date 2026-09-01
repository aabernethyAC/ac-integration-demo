import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FIELD_SPECS,
  SCHEMAS,
  schemaShape,
  buildSchemaFields,
  ATTENDANCE_STATUS,
  CONSENT_STATUS,
  CURRENCY,
  PAYMENT_STATUS,
} from "../src/university-alumni/schemas.js";
import {
  validateRecord,
  prepareRecord,
  mapSourceRow,
  recordKey,
  sanitizeForLog,
  SOURCE_MAPPINGS,
} from "../src/university-alumni/validate.js";
import { matchAutomations, AUTOMATION_MAPPINGS } from "../src/university-alumni/automations.js";
import {
  SAMPLE_CONTACT_ID,
  SAMPLE_DONATIONS,
  SAMPLE_EVENT_PARTICIPATIONS,
  SAMPLE_PROGRAMME_INTERESTS,
} from "../src/university-alumni/fixtures.js";

describe("university alumni schemas", () => {
  it("defines three Contact-linked schemas with expected slugs", () => {
    assert.equal(Object.keys(SCHEMAS).length, 3);
    assert.equal(SCHEMAS.eventParticipation.slug, "event-participation");
    assert.equal(SCHEMAS.programmeInterest.slug, "programme-interest");
    assert.equal(SCHEMAS.donations.slug, "alumni-donation");
  });

  it("matches required fields and allowed values from the brief", () => {
    const event = schemaShape("eventParticipation");
    const required = event.fields.filter((f) => f.required).map((f) => f.id);
    assert.deepEqual(required.sort(), [
      "attendance-status",
      "event-date",
      "event-name",
      "event-type",
      "external-event-id",
    ].sort());
    assert.deepEqual(
      event.fields.find((f) => f.id === "attendance-status").options,
      ATTENDANCE_STATUS
    );

    const interest = schemaShape("programmeInterest");
    assert.ok(
      interest.fields.find((f) => f.id === "consent-status").options.includes(
        "Opted in"
      )
    );
    assert.deepEqual(
      interest.fields.find((f) => f.id === "consent-status").options,
      CONSENT_STATUS
    );
    assert.equal(
      interest.fields.find((f) => f.id === "information-requested").type,
      "multiselect"
    );

    const donations = schemaShape("donations");
    const amount = donations.fields.find((f) => f.id === "amount");
    assert.equal(amount.type, "number");
    assert.equal(amount.scale, 2);
    assert.deepEqual(
      donations.fields.find((f) => f.id === "currency").options,
      CURRENCY
    );
    assert.deepEqual(
      donations.fields.find((f) => f.id === "payment-status").options,
      PAYMENT_STATUS
    );
  });

  it("builds AC field payloads with dropdown options", () => {
    const fields = buildSchemaFields("eventParticipation");
    const type = fields.find((f) => f.id === "event-type");
    assert.equal(type.type, "dropdown");
    assert.equal(type.required, true);
    assert.ok(type.options.some((o) => o.value === "Webinar"));
  });

  it("has a source mapping for each object", () => {
    for (const key of Object.keys(SCHEMAS)) {
      assert.ok(SOURCE_MAPPINGS[key], `missing mapping for ${key}`);
      assert.ok(FIELD_SPECS[key].length > 0);
    }
  });
});

describe("validation and mapping", () => {
  it("accepts valid event fixtures for contact 1203", () => {
    for (const row of SAMPLE_EVENT_PARTICIPATIONS) {
      const result = prepareRecord("eventParticipation", row, {
        contactId: SAMPLE_CONTACT_ID,
      });
      assert.equal(result.ok, true, result.errors?.join("; "));
      assert.equal(result.contactId, 1203);
      assert.ok(result.externalId);
    }
  });

  it("accepts valid programme interest and donation fixtures", () => {
    for (const row of SAMPLE_PROGRAMME_INTERESTS) {
      const result = prepareRecord("programmeInterest", row, {
        contactId: SAMPLE_CONTACT_ID,
      });
      assert.equal(result.ok, true, result.errors?.join("; "));
    }
    for (const row of SAMPLE_DONATIONS) {
      const result = prepareRecord("donations", row, {
        contactId: SAMPLE_CONTACT_ID,
      });
      assert.equal(result.ok, true, result.errors?.join("; "));
    }
  });

  it("rejects missing required fields", () => {
    const result = validateRecord(
      "eventParticipation",
      { "event-name": "Only a name" },
      { contactId: 1203 }
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("external-event-id")));
    assert.ok(result.errors.some((e) => e.includes("attendance-status")));
  });

  it("rejects invalid dropdown values", () => {
    const mapped = mapSourceRow("eventParticipation", {
      ...SAMPLE_EVENT_PARTICIPATIONS[0],
      attendance_status: "Maybe",
    });
    const result = validateRecord("eventParticipation", mapped, {
      contactId: 1203,
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes("attendance-status")));
  });

  it("rejects invalid dates and malformed donation amounts", () => {
    const badDate = prepareRecord(
      "eventParticipation",
      {
        ...SAMPLE_EVENT_PARTICIPATIONS[0],
        event_date: "12-03-2026",
      },
      { contactId: 1203 }
    );
    assert.equal(badDate.ok, false);

    const badAmount = prepareRecord(
      "donations",
      { ...SAMPLE_DONATIONS[0], amount: "not-a-number" },
      { contactId: 1203 }
    );
    assert.equal(badAmount.ok, false);

    const missingContact = prepareRecord(
      "donations",
      SAMPLE_DONATIONS[0],
      {}
    );
    assert.equal(missingContact.ok, false);
  });

  it("deduplicates deterministically by contact + external id", () => {
    const a = prepareRecord("eventParticipation", SAMPLE_EVENT_PARTICIPATIONS[0], {
      contactId: 1203,
    });
    const b = prepareRecord("eventParticipation", SAMPLE_EVENT_PARTICIPATIONS[0], {
      contactId: 1203,
    });
    assert.equal(
      recordKey(a.contactId, a.externalId),
      recordKey(b.contactId, b.externalId)
    );
    assert.notEqual(
      recordKey(1203, a.externalId),
      recordKey(9999, a.externalId)
    );
  });

  it("redacts donation amounts in logs", () => {
    const prepared = prepareRecord("donations", SAMPLE_DONATIONS[0], {
      contactId: 1203,
    });
    const safe = sanitizeForLog("donations", {
      externalId: prepared.externalId,
      fields: prepared.fields,
      amount: 250,
    });
    const amountField = safe.fields.find((f) => f.id === "amount");
    assert.equal(amountField.value, "[redacted]");
    assert.equal(safe.amount, "[redacted]");
    const raw = prepared.fields.find((f) => f.id === "amount");
    assert.equal(raw.value, 250);
  });
});

describe("automation mapping layer", () => {
  it("documents recommended triggers without provisioning", () => {
    assert.ok(AUTOMATION_MAPPINGS.length >= 9);
  });

  it("matches high-intent and completed donation conditions", () => {
    const interest = prepareRecord(
      "programmeInterest",
      SAMPLE_PROGRAMME_INTERESTS[0],
      { contactId: 1203 }
    );
    const matched = matchAutomations(
      "programmeInterest",
      interest.fields,
      "record_created"
    );
    assert.ok(matched.some((m) => m.id === "interest-high-intent"));
    assert.ok(matched.some((m) => m.id === "interest-opted-in"));

    const donation = prepareRecord("donations", SAMPLE_DONATIONS[1], {
      contactId: 1203,
    });
    const donationMatches = matchAutomations(
      "donations",
      donation.fields,
      "record_created"
    );
    assert.ok(donationMatches.some((m) => m.id === "donation-completed"));
    assert.ok(
      donationMatches.some((m) => m.id === "donation-recurring-completed")
    );
  });
});
