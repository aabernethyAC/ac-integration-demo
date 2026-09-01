/**
 * Sanitized sample payloads for contact 1203 (no live PII beyond demo names).
 * Donation amounts are present for validation tests; sync logging redacts them.
 */

export const SAMPLE_CONTACT_ID = 1203;

export const SAMPLE_EVENT_PARTICIPATIONS = [
  {
    external_event_id: "uni-evt-mba-webinar-2026-03",
    event_name: "MBA Information Webinar — March 2026",
    event_type: "Webinar",
    programme: "MBA",
    event_date: "2026-03-12",
    location_mode: "Online",
    country_region: "Australia",
    registration_source: "Email",
    attendance_status: "Attended",
    engagement_level: "High",
    follow_up_status: "In progress",
    last_updated_at: "2026-03-12T11:30:00Z",
  },
  {
    external_event_id: "uni-evt-campus-info-2026-04",
    event_name: "Postgraduate Campus Information Session",
    event_type: "Information session",
    programme: "Master of Data Science",
    event_date: "2026-04-08",
    location_mode: "On campus",
    country_region: "Australia",
    registration_source: "Website",
    attendance_status: "Registered",
    engagement_level: "Medium",
    follow_up_status: "Not started",
    last_updated_at: "2026-04-01T02:15:00Z",
  },
  {
    external_event_id: "uni-evt-sg-recruit-2026-05",
    event_name: "Singapore Alumni Recruitment Evening",
    event_type: "Alumni event",
    programme: "MBA",
    event_date: "2026-05-20",
    location_mode: "Off campus",
    country_region: "Singapore",
    registration_source: "LinkedIn",
    attendance_status: "No-show",
    engagement_level: "Low",
    follow_up_status: "Not started",
    last_updated_at: "2026-05-21T01:00:00Z",
  },
];

export const SAMPLE_PROGRAMME_INTERESTS = [
  {
    external_interest_id: "uni-int-mba-form-2026-001",
    programme: "MBA",
    study_mode: "Part-time",
    intake_period: "2027 Semester 1",
    interest_date: "2026-03-13",
    interest_source: "Event",
    intent_level: "High intent",
    information_requested: ["Fees", "Flexible study", "Application process"],
    consent_status: "Opted in",
    next_step: "Speak with advisor",
    follow_up_status: "In progress",
    last_updated_at: "2026-03-13T08:00:00Z",
  },
  {
    external_interest_id: "uni-int-mds-web-2026-014",
    programme: "Master of Data Science",
    study_mode: "Full-time",
    intake_period: "2027 Semester 1",
    interest_date: "2026-04-02",
    interest_source: "Website",
    intent_level: "Considering",
    information_requested: ["Course content", "Career outcomes"],
    consent_status: "Opted in",
    next_step: "Attend event",
    follow_up_status: "Not started",
    last_updated_at: "2026-04-02T04:22:00Z",
  },
];

export const SAMPLE_DONATIONS = [
  {
    external_donation_id: "uni-gift-2025-88421",
    donation_date: "2025-11-18",
    amount: 250.0,
    currency: "AUD",
    donation_type: "One-time",
    campaign_name: "Annual Alumni Fund 2025",
    fund_designation: "Scholarships",
    payment_status: "Completed",
    anonymous_flag: "No",
    receipt_status: "Issued",
    last_updated_at: "2025-11-18T06:45:00Z",
  },
  {
    external_donation_id: "uni-gift-recurring-99102",
    donation_date: "2026-01-05",
    amount: 50.0,
    currency: "AUD",
    donation_type: "Recurring",
    campaign_name: "Monthly Giving Circle",
    fund_designation: "General Fund",
    payment_status: "Completed",
    recurring_frequency: "Monthly",
    anonymous_flag: "No",
    receipt_status: "Issued",
    last_updated_at: "2026-01-05T01:10:00Z",
  },
];
