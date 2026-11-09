/**
 * Loan Inquiries — Custom Object schema for Solutions English demo.
 * Contact-linked records for mortgage / lending inquiry journeys.
 */

import {
  ensureDropdown,
  ensureField,
} from "../university-alumni/schema-helpers.js";

export const ANCHOR_CONTACT_ID = 5226;
export const DEMO_CONTACT_COUNT = 10;
export const SCHEMA_SLUG = "loan-inquiry";

export const SCHEMA = {
  slug: SCHEMA_SLUG,
  labels: { singular: "Loan Inquiry", plural: "Loan Inquiries" },
  description:
    "One record per loan inquiry or application interest. Related to a Contact for broker follow-up, segmentation, and automations.",
};

export const LOAN_TYPE = [
  "Home Loan",
  "Investment Loan",
  "Refinance",
  "Personal Loan",
  "Auto Loan",
  "SMSF Loan",
  "Construction Loan",
];

export const LOAN_PURPOSE = [
  "Purchase",
  "Refinance",
  "Equity Release",
  "Debt Consolidation",
  "Renovation",
  "Investment Property",
  "Other",
];

export const PROPERTY_TYPE = [
  "House",
  "Apartment/Unit",
  "Townhouse",
  "Land",
  "Rural",
  "Commercial",
  "Other",
];

export const PROPERTY_STATE = [
  "NSW",
  "VIC",
  "QLD",
  "SA",
  "WA",
  "TAS",
  "NT",
  "ACT",
];

export const EMPLOYMENT_TYPE = [
  "PAYG Full-time",
  "PAYG Part-time",
  "Self-employed",
  "Casual",
  "Contract",
  "Retired",
  "Other",
];

export const CREDIT_PROFILE = [
  "Excellent",
  "Good",
  "Fair",
  "Limited",
  "Unknown",
];

export const INQUIRY_STATUS = [
  "New",
  "Contacted",
  "Documents Requested",
  "Pre-approval",
  "Submitted to Lender",
  "Conditionally Approved",
  "Settled",
  "Declined",
  "Withdrawn",
];

export const URGENCY = ["Low", "Medium", "High"];

export const SOURCE_CHANNEL = [
  "Website",
  "Phone",
  "Email",
  "Referral",
  "Branch",
  "Partner",
  "Social",
  "Other",
];

/** Field definitions used for schema provisioning and validation. */
export const FIELD_SPECS = [
  { id: "name", label: "Inquiry Name", type: "text", required: true },
  {
    id: "inquiry-date",
    label: "Inquiry Date",
    type: "date",
    required: true,
  },
  {
    id: "loan-type",
    label: "Loan Type",
    type: "dropdown",
    required: true,
    options: LOAN_TYPE,
  },
  {
    id: "loan-purpose",
    label: "Loan Purpose",
    type: "dropdown",
    required: true,
    options: LOAN_PURPOSE,
  },
  {
    id: "requested-amount",
    label: "Requested Amount",
    type: "currency",
    required: true,
    defaultCurrency: "AUD",
  },
  {
    id: "property-value",
    label: "Property Value",
    type: "currency",
    required: false,
    defaultCurrency: "AUD",
  },
  {
    id: "deposit-amount",
    label: "Deposit Amount",
    type: "currency",
    required: false,
    defaultCurrency: "AUD",
  },
  {
    id: "lvr-percent",
    label: "LVR %",
    type: "number",
    required: false,
    scale: 1,
  },
  {
    id: "property-type",
    label: "Property Type",
    type: "dropdown",
    required: false,
    options: PROPERTY_TYPE,
  },
  {
    id: "property-suburb",
    label: "Property Suburb",
    type: "text",
    required: false,
  },
  {
    id: "property-state",
    label: "Property State",
    type: "dropdown",
    required: false,
    options: PROPERTY_STATE,
  },
  {
    id: "employment-type",
    label: "Employment Type",
    type: "dropdown",
    required: false,
    options: EMPLOYMENT_TYPE,
  },
  {
    id: "annual-income",
    label: "Annual Income",
    type: "currency",
    required: false,
    defaultCurrency: "AUD",
  },
  {
    id: "credit-profile",
    label: "Credit Profile",
    type: "dropdown",
    required: false,
    options: CREDIT_PROFILE,
  },
  {
    id: "status",
    label: "Status",
    type: "dropdown",
    required: true,
    options: INQUIRY_STATUS,
  },
  {
    id: "lender-preference",
    label: "Lender Preference",
    type: "text",
    required: false,
  },
  {
    id: "urgency",
    label: "Urgency",
    type: "dropdown",
    required: false,
    options: URGENCY,
  },
  {
    id: "source-channel",
    label: "Source Channel",
    type: "dropdown",
    required: false,
    options: SOURCE_CHANNEL,
  },
  {
    id: "assigned-broker",
    label: "Assigned Broker",
    type: "text",
    required: false,
  },
  { id: "notes", label: "Notes", type: "textarea", required: false },
];

/**
 * Build AC schema field payloads from FIELD_SPECS, merging existing option ids.
 */
export function buildSchemaFields(byId = {}) {
  return FIELD_SPECS.map((spec) => {
    const extra = { required: !!spec.required };
    if (spec.description) extra.description = spec.description;
    if (spec.type === "number" && spec.scale != null) extra.scale = spec.scale;
    if (spec.type === "currency") {
      extra.defaultCurrency = spec.defaultCurrency || "AUD";
    }

    if (spec.type === "dropdown") {
      return ensureDropdown(byId, spec.id, spec.label, spec.options, extra);
    }
    return ensureField(byId, spec.id, spec.label, spec.type, extra);
  });
}

/** Stable shape summary for tests (no AC ids). */
export function schemaShape() {
  return {
    slug: SCHEMA.slug,
    labels: SCHEMA.labels,
    fields: FIELD_SPECS.map((f) => ({
      id: f.id,
      type: f.type,
      required: !!f.required,
      ...(f.options ? { options: [...f.options] } : {}),
      ...(f.scale != null ? { scale: f.scale } : {}),
      ...(f.defaultCurrency ? { defaultCurrency: f.defaultCurrency } : {}),
    })),
  };
}
