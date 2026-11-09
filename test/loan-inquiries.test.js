import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANCHOR_CONTACT_ID,
  DEMO_CONTACT_COUNT,
  SCHEMA,
  FIELD_SPECS,
  LOAN_TYPE,
  INQUIRY_STATUS,
  buildSchemaFields,
  schemaShape,
} from "../src/loan-inquiries/schemas.js";
import {
  SAMPLE_LOAN_INQUIRIES,
  requiredContactSlots,
} from "../src/loan-inquiries/fixtures.js";

describe("loan inquiries schema", () => {
  it("defines a Contact-linked Loan Inquiry schema", () => {
    assert.equal(SCHEMA.slug, "loan-inquiry");
    assert.equal(SCHEMA.labels.singular, "Loan Inquiry");
    assert.equal(SCHEMA.labels.plural, "Loan Inquiries");
  });

  it("anchors demo data on contact 5226 with 10 contact slots", () => {
    assert.equal(ANCHOR_CONTACT_ID, 5226);
    assert.equal(DEMO_CONTACT_COUNT, 10);
    assert.deepEqual(requiredContactSlots(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("requires core lending fields", () => {
    const shape = schemaShape();
    const required = shape.fields.filter((f) => f.required).map((f) => f.id);
    assert.deepEqual(required.sort(), [
      "inquiry-date",
      "loan-purpose",
      "loan-type",
      "name",
      "requested-amount",
      "status",
    ].sort());
    assert.equal(
      shape.fields.find((f) => f.id === "requested-amount").type,
      "currency"
    );
    assert.deepEqual(
      shape.fields.find((f) => f.id === "loan-type").options,
      LOAN_TYPE
    );
    assert.deepEqual(
      shape.fields.find((f) => f.id === "status").options,
      INQUIRY_STATUS
    );
  });

  it("builds schema fields with AUD currency defaults", () => {
    const fields = buildSchemaFields();
    assert.equal(fields.length, FIELD_SPECS.length);
    const amount = fields.find((f) => f.id === "requested-amount");
    assert.equal(amount.type, "currency");
    assert.equal(amount.defaultCurrency, "AUD");
    assert.equal(amount.required, true);
  });
});

describe("loan inquiries fixtures", () => {
  it("covers 10 contacts including two records for the anchor", () => {
    assert.ok(SAMPLE_LOAN_INQUIRIES.length >= 10);
    const anchorRows = SAMPLE_LOAN_INQUIRIES.filter((r) => r.contactSlot === 0);
    assert.equal(anchorRows.length, 2);
    assert.ok(
      anchorRows.every((r) => r.externalId.includes(String(ANCHOR_CONTACT_ID)))
    );
  });

  it("uses unique externalIds and valid dropdown values", () => {
    const ids = SAMPLE_LOAN_INQUIRIES.map((r) => r.externalId);
    assert.equal(new Set(ids).size, ids.length);

    for (const row of SAMPLE_LOAN_INQUIRIES) {
      assert.ok(LOAN_TYPE.includes(row["loan-type"]), row.externalId);
      assert.ok(INQUIRY_STATUS.includes(row.status), row.externalId);
      assert.equal(typeof row.name, "string");
      assert.equal(typeof row["inquiry-date"], "string");
      assert.equal(typeof row["requested-amount"].value, "number");
      assert.equal(row["requested-amount"].currency, "AUD");
    }
  });
});
