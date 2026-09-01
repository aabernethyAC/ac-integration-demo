/**
 * Union membership sign-up — contact custom field definitions for ACHQglobal.
 *
 * Form sections:
 *   1. Your work (Let's get started)
 *   2. About you
 *   3. Membership agreement
 *   4. Your contribution
 *
 * Plus form-progress checkboxes and Membership Payment fields.
 * Standard contact fields (first/last name, email, phone) are not created here.
 */

export const SECTION_LABELS = {
  1: "Your work",
  2: "About you",
  3: "Membership agreement",
  4: "Your contribution",
  progress: "Form progress / drop-off",
  payment: "Membership Payment",
};

/**
 * ACHQglobal contact field groups (groupDefinitions, type_id=1).
 * Fields must be groupMembers of a group to appear on the contact record UI.
 */
export const FIELD_GROUPS = {
  joinForm: { id: 9, label: "Join Form" },
  financialStatus: { id: 10, label: "Financial Status" },
};

/** Lists that should show these fields on subscribed contacts (0 = all lists). */
export const FIELD_REL_LIST_IDS = [0]; // all lists — AC keeps a single fieldRel per field

export function groupIdForSection(section) {
  return section === "payment"
    ? FIELD_GROUPS.financialStatus.id
    : FIELD_GROUPS.joinForm.id;
}

export const FIELD_SPECS = [
  // --- Section 1: Your work ---
  {
    section: 1,
    title: "Union: Work suburb",
    perstag: "UNION_WORK_SUBURB",
    type: "text",
    descript: "What suburb do you work in? (form section 1 — Your work)",
  },
  {
    section: 1,
    title: "Union: Employer",
    perstag: "UNION_EMPLOYER",
    type: "text",
    descript: "Who do you work for? (form section 1 — Your work)",
  },
  {
    section: 1,
    title: "Union: Job title",
    perstag: "UNION_JOB_TITLE",
    type: "text",
    descript: "Current job title / role (form section 1 — Your work)",
  },
  {
    section: 1,
    title: "Union: Employment type",
    perstag: "UNION_EMPLOYMENT_TYPE",
    type: "dropdown",
    descript: "Employment arrangement (form section 1 — Your work)",
    options: [
      "Full-time",
      "Part-time",
      "Casual",
      "Fixed-term",
      "Contractor / labour hire",
    ],
  },
  {
    section: 1,
    title: "Union: Industry",
    perstag: "UNION_INDUSTRY",
    type: "dropdown",
    descript: "Workplace industry / sector (form section 1 — Your work)",
    options: [
      "Healthcare",
      "Education",
      "Retail",
      "Hospitality",
      "Construction",
      "Manufacturing",
      "Transport & logistics",
      "Public sector",
      "Professional services",
      "Other",
    ],
  },
  {
    section: 1,
    title: "Union: Workplace / site",
    perstag: "UNION_WORKPLACE",
    type: "text",
    descript: "Workplace, campus, or site name (form section 1 — Your work)",
  },

  // --- Section 2: About you ---
  {
    section: 2,
    title: "Union: Date of birth",
    perstag: "UNION_DATE_OF_BIRTH",
    type: "date",
    descript: "Member date of birth (form section 2 — About you)",
  },
  {
    section: 2,
    title: "Union: Home suburb",
    perstag: "UNION_HOME_SUBURB",
    type: "text",
    descript: "Residential suburb (form section 2 — About you)",
  },
  {
    section: 2,
    title: "Union: Home postcode",
    perstag: "UNION_HOME_POSTCODE",
    type: "text",
    descript: "Residential postcode (form section 2 — About you)",
  },
  {
    section: 2,
    title: "Union: Preferred contact method",
    perstag: "UNION_PREFERRED_CONTACT",
    type: "dropdown",
    descript: "How the member prefers to be contacted (form section 2 — About you)",
    options: ["Email", "Phone", "SMS"],
  },
  {
    section: 2,
    title: "Union: Gender",
    perstag: "UNION_GENDER",
    type: "dropdown",
    descript: "Gender (form section 2 — About you)",
    options: [
      "Woman",
      "Man",
      "Non-binary",
      "Prefer not to say",
      "Self-describe",
    ],
  },
  {
    section: 2,
    title: "Union: Referral source",
    perstag: "UNION_REFERRAL_SOURCE",
    type: "dropdown",
    descript: "How did you hear about us? (form section 2 — About you)",
    options: [
      "Colleague",
      "Workplace visit",
      "Social media",
      "Website",
      "Event",
      "Other",
    ],
  },

  // --- Section 3: Membership agreement ---
  {
    section: 3,
    title: "Union: Membership type",
    perstag: "UNION_MEMBERSHIP_TYPE",
    type: "dropdown",
    descript: "Membership category (form section 3 — Membership agreement)",
    options: ["Full member", "Associate", "Student", "Retired"],
  },
  {
    section: 3,
    title: "Union: Agreement accepted",
    perstag: "UNION_AGREEMENT_ACCEPTED",
    type: "checkbox",
    descript: "Membership agreement accepted (form section 3)",
    options: ["Yes"],
  },
  {
    section: 3,
    title: "Union: Agreement accepted date",
    perstag: "UNION_AGREEMENT_DATE",
    type: "date",
    descript: "Date membership agreement was accepted (form section 3)",
  },
  {
    section: 3,
    title: "Union: Privacy consent",
    perstag: "UNION_PRIVACY_CONSENT",
    type: "checkbox",
    descript: "Privacy / contact consent given (form section 3)",
    options: ["Yes"],
  },

  // --- Section 4: Your contribution ---
  {
    section: 4,
    title: "Union: Contribution amount",
    perstag: "UNION_CONTRIBUTION_AMOUNT",
    type: "text",
    descript: "Membership contribution / dues amount (form section 4)",
  },
  {
    section: 4,
    title: "Union: Contribution frequency",
    perstag: "UNION_CONTRIBUTION_FREQUENCY",
    type: "dropdown",
    descript: "How often contributions are taken (form section 4)",
    options: ["Weekly", "Fortnightly", "Monthly"],
  },
  {
    section: 4,
    title: "Union: Payment method",
    perstag: "UNION_PAYMENT_METHOD",
    type: "dropdown",
    descript: "Contribution payment method (form section 4)",
    options: ["Payroll deduction", "Direct debit", "Credit card"],
  },
  {
    section: 4,
    title: "Union: Payroll / employee number",
    perstag: "UNION_PAYROLL_NUMBER",
    type: "text",
    descript: "Payroll or employee ID for deduction (form section 4)",
  },
  {
    section: 4,
    title: "Union: Contribution start date",
    perstag: "UNION_CONTRIBUTION_START",
    type: "date",
    descript: "When contributions should start (form section 4)",
  },

  // --- Form progress / drop-off ---
  {
    section: "progress",
    title: "Union form: Completed Your work",
    perstag: "UNION_FORM_S1_COMPLETE",
    type: "checkbox",
    descript:
      "Set when section 1 (Your work) is submitted. Unchecked sections after the last checked one indicate drop-off.",
    options: ["Yes"],
  },
  {
    section: "progress",
    title: "Union form: Completed About you",
    perstag: "UNION_FORM_S2_COMPLETE",
    type: "checkbox",
    descript:
      "Set when section 2 (About you) is submitted. Use with S1–S4 flags to measure form drop-off.",
    options: ["Yes"],
  },
  {
    section: "progress",
    title: "Union form: Completed Membership agreement",
    perstag: "UNION_FORM_S3_COMPLETE",
    type: "checkbox",
    descript:
      "Set when section 3 (Membership agreement) is submitted. Use with S1–S4 flags to measure form drop-off.",
    options: ["Yes"],
  },
  {
    section: "progress",
    title: "Union form: Completed Your contribution",
    perstag: "UNION_FORM_S4_COMPLETE",
    type: "checkbox",
    descript:
      "Set when section 4 (Your contribution) is submitted — form fully completed.",
    options: ["Yes"],
  },

  // --- Membership Payment (billing / status sync) ---
  {
    section: "payment",
    title: "Has most recent payment been missed?",
    perstag: "HAS_MOST_RECENT_PAYMENT_BEEN_MISSED",
    type: "radio",
    descript: "Whether the member's most recent scheduled payment was missed",
    options: ["Yes", "No"],
  },
  {
    section: "payment",
    title: "Decline Type",
    perstag: "DECLINE_TYPE",
    type: "radio",
    descript: "Reason the most recent payment declined (if applicable)",
    options: [
      "Insufficient funds",
      "Card expired",
      "Cancelled by member",
      "Bank rejection",
      "Other",
    ],
  },
  {
    section: "payment",
    title: "Next Payment Due",
    perstag: "NEXT_PAYMENT_DUE",
    type: "date",
    descript: "Date the next membership payment is due",
  },
  {
    section: "payment",
    title: "Last Payment Made",
    perstag: "LAST_PAYMENT_MADE",
    type: "date",
    descript: "Date the last successful membership payment was made",
  },
  {
    section: "payment",
    title: "Membership Status",
    perstag: "MEMBERSHIP_STATUS",
    type: "text",
    descript: "Current membership status (e.g. Active, Lapsed, Cancelled)",
  },
  {
    section: "payment",
    title: "Membership Type",
    perstag: "MEMBERSHIP_TYPE",
    type: "text",
    descript:
      "Membership type from billing system (distinct from Union: Membership type on the sign-up form)",
  },
  {
    section: "payment",
    title: "Renewal Frequency",
    perstag: "RENEWAL_FREQUENCY",
    type: "radio",
    descript: "How often membership renews / is billed",
    options: ["Weekly", "Fortnightly", "Monthly", "Quarterly", "Annually"],
  },
];
