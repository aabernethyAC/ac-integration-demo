/**
 * Source → schema mapping, validation, and safe logging for university alumni objects.
 *
 * Contact matching: ActiveCampaign contact ID (canonical in this repo).
 * Record dedup: record.externalId === object external-*-id field.
 */

import { FIELD_SPECS, SCHEMAS } from "./schemas.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Map snake_case / common source keys → kebab-case field ids. */
export function normalizeFieldKey(key) {
  if (!key || typeof key !== "string") return key;
  return key.trim().replace(/_/g, "-").toLowerCase();
}

/**
 * Source-system column maps (forms / events platform / spreadsheets).
 * Values are kebab-case schema field ids.
 */
export const SOURCE_MAPPINGS = {
  eventParticipation: {
    description: "Events platform registration + attendance export",
    columns: {
      event_id: "external-event-id",
      external_event_id: "external-event-id",
      event_name: "event-name",
      title: "event-name",
      event_type: "event-type",
      programme: "programme",
      program: "programme",
      event_date: "event-date",
      location_mode: "location-mode",
      country: "country-region",
      country_region: "country-region",
      registration_source: "registration-source",
      attendance_status: "attendance-status",
      engagement_level: "engagement-level",
      follow_up_status: "follow-up-status",
      last_updated_at: "last-updated-at",
      updated_at: "last-updated-at",
    },
  },
  programmeInterest: {
    description: "Form submissions and spreadsheet interest imports",
    columns: {
      interest_id: "external-interest-id",
      external_interest_id: "external-interest-id",
      programme: "programme",
      program: "programme",
      study_mode: "study-mode",
      intake_period: "intake-period",
      interest_date: "interest-date",
      submitted_at: "interest-date",
      interest_source: "interest-source",
      intent_level: "intent-level",
      information_requested: "information-requested",
      consent_status: "consent-status",
      next_step: "next-step",
      follow_up_status: "follow-up-status",
      last_updated_at: "last-updated-at",
      updated_at: "last-updated-at",
    },
  },
  donations: {
    description: "Fundraising system or sanitized gift spreadsheet",
    columns: {
      donation_id: "external-donation-id",
      gift_id: "external-donation-id",
      external_donation_id: "external-donation-id",
      donation_date: "donation-date",
      gift_date: "donation-date",
      amount: "amount",
      currency: "currency",
      donation_type: "donation-type",
      campaign: "campaign-name",
      campaign_name: "campaign-name",
      fund: "fund-designation",
      fund_designation: "fund-designation",
      payment_status: "payment-status",
      recurring_frequency: "recurring-frequency",
      anonymous: "anonymous-flag",
      anonymous_flag: "anonymous-flag",
      receipt_status: "receipt-status",
      last_updated_at: "last-updated-at",
      updated_at: "last-updated-at",
    },
  },
};

export function mapSourceRow(objectKey, row) {
  const mapping = SOURCE_MAPPINGS[objectKey];
  if (!mapping) throw new Error(`Unknown object key: ${objectKey}`);

  const out = {};
  for (const [src, dest] of Object.entries(mapping.columns)) {
    if (row[src] !== undefined && row[src] !== null && row[src] !== "") {
      out[dest] = row[src];
    }
  }
  // Also accept already-normalized kebab-case keys
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeFieldKey(key);
    if (
      FIELD_SPECS[objectKey].some((f) => f.id === normalized) &&
      value !== undefined &&
      value !== null &&
      value !== "" &&
      out[normalized] === undefined
    ) {
      out[normalized] = value;
    }
  }
  return out;
}

function isBlank(value) {
  return value === undefined || value === null || value === "";
}

function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return NaN;
  return Number(cleaned);
}

function validateDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function validateDatetime(value) {
  if (typeof value !== "string" || !DATETIME_RE.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

/**
 * Validate a field map for an object. Returns { ok, errors, fields, externalId }.
 * Does not mutate production data; safe for dry-run and tests.
 */
export function validateRecord(objectKey, input, { contactId } = {}) {
  const specs = FIELD_SPECS[objectKey];
  const meta = SCHEMAS[objectKey];
  if (!specs || !meta) {
    return { ok: false, errors: [`Unknown object key: ${objectKey}`], fields: [] };
  }

  const errors = [];
  const values = { ...input };

  if (contactId == null || contactId === "") {
    errors.push("contactId is required (ActiveCampaign contact ID)");
  } else if (!Number.isFinite(Number(contactId)) || Number(contactId) <= 0) {
    errors.push(`Invalid contactId: ${contactId}`);
  }

  for (const spec of specs) {
    const raw = values[spec.id];

    if (spec.required && isBlank(raw)) {
      errors.push(`Missing required field: ${spec.id}`);
      continue;
    }
    if (isBlank(raw)) continue;

    if (spec.type === "dropdown") {
      if (!spec.options.includes(raw)) {
        errors.push(
          `Invalid ${spec.id}: "${raw}" (allowed: ${spec.options.join("; ")})`
        );
      }
    } else if (spec.type === "multiselect") {
      const list = Array.isArray(raw) ? raw : [raw];
      values[spec.id] = list;
      for (const item of list) {
        if (!spec.options.includes(item)) {
          errors.push(
            `Invalid ${spec.id} value: "${item}" (allowed: ${spec.options.join("; ")})`
          );
        }
      }
    } else if (spec.type === "date") {
      if (!validateDate(String(raw))) {
        errors.push(`Invalid date for ${spec.id}: expected YYYY-MM-DD`);
      }
    } else if (spec.type === "datetime") {
      if (!validateDatetime(String(raw))) {
        errors.push(
          `Invalid datetime for ${spec.id}: expected ISO 8601 (e.g. 2026-07-10T09:00:00Z)`
        );
      }
    } else if (spec.type === "number") {
      const num = parseAmount(raw);
      if (!Number.isFinite(num)) {
        errors.push(`Invalid number for ${spec.id}`);
      } else if (objectKey === "donations" && spec.id === "amount" && num < 0) {
        errors.push("Donation amount must not be negative");
      } else {
        values[spec.id] = num;
      }
    } else if (spec.type === "text" || spec.type === "textarea") {
      if (typeof raw !== "string" && typeof raw !== "number") {
        errors.push(`Invalid text for ${spec.id}`);
      } else {
        values[spec.id] = String(raw);
      }
    }
  }

  const externalId = values[meta.externalIdField];
  if (isBlank(externalId)) {
    errors.push(`Missing external id field: ${meta.externalIdField}`);
  }

  const fields = specs
    .filter((s) => !isBlank(values[s.id]))
    .map((s) => ({ id: s.id, value: values[s.id] }));

  return {
    ok: errors.length === 0,
    errors,
    fields,
    externalId: externalId != null ? String(externalId) : null,
    contactId: contactId != null ? Number(contactId) : null,
    objectKey,
  };
}

/**
 * Map + validate a source row. Idempotent key = externalId + contactId.
 */
export function prepareRecord(objectKey, sourceRow, { contactId } = {}) {
  const mapped = mapSourceRow(objectKey, sourceRow);
  return validateRecord(objectKey, mapped, { contactId });
}

/** Dedup key used for reconcile / upsert decisions. */
export function recordKey(contactId, externalId) {
  return `${contactId}::${externalId}`;
}

/**
 * Reconciliation guidance for upstream cancels / updates.
 * Cancelled / failed / no-show should update the same externalId record,
 * not create a new one — preserves history while reflecting current status.
 */
export const RECONCILIATION = {
  strategy: "upsert-by-externalId-and-contact",
  notes: [
    "Create/update via POST /customObjects/records/{schemaId} with the same externalId.",
    "Upstream cancellations: update attendance-status / payment-status on the existing record.",
    "Removed upstream records: mark Cancelled / Suppressed rather than deleting (history preserved).",
    "Duplicate source rows with the same external ID collapse to one AC record.",
  ],
};

/** Strip donation amount and other sensitive values before logging. */
export function sanitizeForLog(objectKey, payload) {
  if (objectKey !== "donations") {
    return payload;
  }
  const clone =
    typeof structuredClone === "function"
      ? structuredClone(payload)
      : JSON.parse(JSON.stringify(payload));

  if (Array.isArray(clone.fields)) {
    clone.fields = clone.fields.map((f) =>
      f.id === "amount" ? { ...f, value: "[redacted]" } : f
    );
  }
  if (clone.amount !== undefined) clone.amount = "[redacted]";
  if (clone.record?.fields) {
    clone.record.fields = clone.record.fields.map((f) =>
      f.id === "amount" ? { ...f, value: "[redacted]" } : f
    );
  }
  return clone;
}

export function safeLog(objectKey, message, payload) {
  const safe = sanitizeForLog(objectKey, payload);
  console.log(message, typeof safe === "string" ? safe : JSON.stringify(safe));
}
