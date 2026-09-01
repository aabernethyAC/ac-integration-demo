/**
 * University alumni marketing — Custom Object schema definitions.
 * Field ids use kebab-case (ActiveCampaign convention in this repo).
 * Prompt snake_case names map 1:1 (external_event_id → external-event-id).
 */

import {
  ensureDropdown,
  ensureField,
  ensureMultiselect,
} from "./schema-helpers.js";

export const CONTACT_ID = 1203;

export const SCHEMAS = {
  eventParticipation: {
    slug: "event-participation",
    labels: { singular: "Event Participation", plural: "Event Participations" },
    description:
      "One record per contact–event relationship (webinars, info sessions, recruitment events). Preserves full event history.",
    externalIdField: "external-event-id",
  },
  programmeInterest: {
    slug: "programme-interest",
    labels: { singular: "Programme Interest", plural: "Programme Interests" },
    description:
      "One record per programme-interest instance. Multiple records when a contact expresses interest in different programmes or at different times.",
    externalIdField: "external-interest-id",
  },
  donations: {
    slug: "alumni-donation",
    labels: { singular: "Donation", plural: "Donations" },
    description:
      "One record per donation transaction or pledge for stewardship. Not a payment-processing system; no card or bank details.",
    externalIdField: "external-donation-id",
  },
};

export const EVENT_TYPE = [
  "Webinar",
  "Information session",
  "Open day",
  "Alumni event",
  "Campus event",
  "Other",
];

export const LOCATION_MODE = ["Online", "On campus", "Off campus", "Hybrid"];

export const REGISTRATION_SOURCE = [
  "Website",
  "Email",
  "Meta",
  "LinkedIn",
  "Google",
  "QR code",
  "Referral",
  "Other",
];

export const ATTENDANCE_STATUS = [
  "Registered",
  "Attended",
  "No-show",
  "Cancelled",
];

export const ENGAGEMENT_LEVEL = ["Unknown", "Low", "Medium", "High"];

export const FOLLOW_UP_STATUS = [
  "Not started",
  "In progress",
  "Complete",
  "Suppressed",
];

export const STUDY_MODE = [
  "Full-time",
  "Part-time",
  "Online",
  "Hybrid",
  "On campus",
  "Unknown",
];

export const INTEREST_SOURCE = [
  "Event",
  "Website",
  "Email",
  "Meta",
  "LinkedIn",
  "Google",
  "Referral",
  "Alumni campaign",
  "Other",
];

export const INTENT_LEVEL = [
  "Unknown",
  "Exploring",
  "Considering",
  "High intent",
];

export const INFORMATION_REQUESTED = [
  "Fees",
  "Entry requirements",
  "Course content",
  "Career outcomes",
  "Scholarships",
  "Flexible study",
  "Application process",
  "Other",
];

export const CONSENT_STATUS = ["Opted in", "Opted out", "Unknown"];

export const NEXT_STEP = [
  "No action",
  "Download information",
  "Attend event",
  "Speak with advisor",
  "Start application",
  "Other",
];

export const CURRENCY = ["AUD", "SGD", "MYR", "USD", "GBP", "Other"];

export const DONATION_TYPE = [
  "One-time",
  "Recurring",
  "Pledge",
  "In-kind",
  "Other",
];

export const PAYMENT_STATUS = [
  "Pending",
  "Completed",
  "Failed",
  "Refunded",
  "Cancelled",
];

export const RECURRING_FREQUENCY = ["Monthly", "Quarterly", "Annual", "Other"];

export const ANONYMOUS_FLAG = ["Yes", "No"];

export const RECEIPT_STATUS = ["Not issued", "Issued", "Failed"];

/** Field definitions keyed by object key; used for schema provisioning and validation. */
export const FIELD_SPECS = {
  eventParticipation: [
    {
      id: "external-event-id",
      label: "External event ID",
      type: "text",
      required: true,
    },
    { id: "event-name", label: "Event name", type: "text", required: true },
    {
      id: "event-type",
      label: "Event type",
      type: "dropdown",
      required: true,
      options: EVENT_TYPE,
    },
    { id: "programme", label: "Programme", type: "text", required: false },
    { id: "event-date", label: "Event date", type: "date", required: true },
    {
      id: "location-mode",
      label: "Location / mode",
      type: "dropdown",
      required: false,
      options: LOCATION_MODE,
    },
    {
      id: "country-region",
      label: "Country / region",
      type: "text",
      required: false,
    },
    {
      id: "registration-source",
      label: "Registration source",
      type: "dropdown",
      required: false,
      options: REGISTRATION_SOURCE,
    },
    {
      id: "attendance-status",
      label: "Attendance status",
      type: "dropdown",
      required: true,
      options: ATTENDANCE_STATUS,
    },
    {
      id: "engagement-level",
      label: "Engagement level",
      type: "dropdown",
      required: false,
      options: ENGAGEMENT_LEVEL,
    },
    {
      id: "follow-up-status",
      label: "Follow-up status",
      type: "dropdown",
      required: false,
      options: FOLLOW_UP_STATUS,
    },
    {
      id: "last-updated-at",
      label: "Last updated at",
      type: "datetime",
      required: false,
    },
  ],
  programmeInterest: [
    {
      id: "external-interest-id",
      label: "External interest ID",
      type: "text",
      required: true,
    },
    { id: "programme", label: "Programme", type: "text", required: true },
    {
      id: "study-mode",
      label: "Study mode",
      type: "dropdown",
      required: false,
      options: STUDY_MODE,
    },
    {
      id: "intake-period",
      label: "Intake period",
      type: "text",
      required: false,
    },
    {
      id: "interest-date",
      label: "Interest date",
      type: "date",
      required: true,
    },
    {
      id: "interest-source",
      label: "Interest source",
      type: "dropdown",
      required: false,
      options: INTEREST_SOURCE,
    },
    {
      id: "intent-level",
      label: "Intent level",
      type: "dropdown",
      required: false,
      options: INTENT_LEVEL,
    },
    {
      id: "information-requested",
      label: "Information requested",
      type: "multiselect",
      required: false,
      options: INFORMATION_REQUESTED,
    },
    {
      id: "consent-status",
      label: "Marketing consent status",
      type: "dropdown",
      required: true,
      options: CONSENT_STATUS,
    },
    {
      id: "next-step",
      label: "Next step",
      type: "dropdown",
      required: false,
      options: NEXT_STEP,
    },
    {
      id: "follow-up-status",
      label: "Follow-up status",
      type: "dropdown",
      required: false,
      options: FOLLOW_UP_STATUS,
    },
    {
      id: "last-updated-at",
      label: "Last updated at",
      type: "datetime",
      required: false,
    },
  ],
  donations: [
    {
      id: "external-donation-id",
      label: "External donation ID",
      type: "text",
      required: true,
    },
    {
      id: "donation-date",
      label: "Donation date",
      type: "date",
      required: true,
    },
    {
      id: "amount",
      label: "Donation amount",
      type: "number",
      required: true,
      scale: 2,
    },
    {
      id: "currency",
      label: "Currency",
      type: "dropdown",
      required: true,
      options: CURRENCY,
    },
    {
      id: "donation-type",
      label: "Donation type",
      type: "dropdown",
      required: true,
      options: DONATION_TYPE,
    },
    {
      id: "campaign-name",
      label: "Campaign / appeal",
      type: "text",
      required: false,
    },
    {
      id: "fund-designation",
      label: "Fund designation",
      type: "text",
      required: false,
    },
    {
      id: "payment-status",
      label: "Payment status",
      type: "dropdown",
      required: true,
      options: PAYMENT_STATUS,
    },
    {
      id: "recurring-frequency",
      label: "Recurring frequency",
      type: "dropdown",
      required: false,
      options: RECURRING_FREQUENCY,
    },
    {
      id: "anonymous-flag",
      label: "Anonymous donation",
      type: "dropdown",
      required: true,
      options: ANONYMOUS_FLAG,
    },
    {
      id: "receipt-status",
      label: "Receipt status",
      type: "dropdown",
      required: false,
      options: RECEIPT_STATUS,
    },
    {
      id: "last-updated-at",
      label: "Last updated at",
      type: "datetime",
      required: false,
    },
  ],
};

/**
 * Build AC schema field payloads from FIELD_SPECS, merging existing option ids.
 */
export function buildSchemaFields(objectKey, byId = {}) {
  const specs = FIELD_SPECS[objectKey];
  if (!specs) throw new Error(`Unknown object key: ${objectKey}`);

  return specs.map((spec) => {
    const extra = { required: !!spec.required };
    if (spec.description) extra.description = spec.description;
    if (spec.type === "number" && spec.scale != null) extra.scale = spec.scale;

    if (spec.type === "dropdown") {
      return ensureDropdown(byId, spec.id, spec.label, spec.options, extra);
    }
    if (spec.type === "multiselect") {
      return ensureMultiselect(byId, spec.id, spec.label, spec.options, extra);
    }
    return ensureField(byId, spec.id, spec.label, spec.type, extra);
  });
}

/** Stable shape summary for tests (no AC ids). */
export function schemaShape(objectKey) {
  const meta = SCHEMAS[objectKey];
  return {
    slug: meta.slug,
    labels: meta.labels,
    externalIdField: meta.externalIdField,
    fields: FIELD_SPECS[objectKey].map((f) => ({
      id: f.id,
      type: f.type,
      required: !!f.required,
      ...(f.options ? { options: [...f.options] } : {}),
      ...(f.scale != null ? { scale: f.scale } : {}),
    })),
  };
}
