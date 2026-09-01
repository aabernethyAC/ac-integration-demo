/**
 * Recommended ActiveCampaign automation triggers for university alumni objects.
 *
 * This repository does not provision AC automations via API. Use this mapping
 * in the AC UI (or a future automation adapter) as the source of truth.
 */

export const AUTOMATION_MAPPINGS = [
  {
    id: "event-registered",
    object: "eventParticipation",
    trigger: "record_created",
    condition: { field: "attendance-status", equals: "Registered" },
    recommendedAction:
      "Send confirmation and event logistics (join link / campus details).",
  },
  {
    id: "event-attended",
    object: "eventParticipation",
    trigger: "record_updated",
    condition: { field: "attendance-status", equals: "Attended" },
    recommendedAction:
      "Start postgraduate programme follow-up nurture for the related programme.",
  },
  {
    id: "event-no-show",
    object: "eventParticipation",
    trigger: "record_updated",
    condition: { field: "attendance-status", equals: "No-show" },
    recommendedAction:
      "Offer recording (if webinar) or invite to another upcoming event.",
  },
  {
    id: "interest-high-intent",
    object: "programmeInterest",
    trigger: "record_created",
    condition: { field: "intent-level", equals: "High intent" },
    recommendedAction:
      "Notify admissions / assign advisor for personal outreach.",
  },
  {
    id: "interest-opted-in",
    object: "programmeInterest",
    trigger: "record_created",
    condition: { field: "consent-status", equals: "Opted in" },
    recommendedAction: "Enrol in programme-specific nurture sequence.",
  },
  {
    id: "interest-start-application",
    object: "programmeInterest",
    trigger: "record_updated",
    condition: { field: "next-step", equals: "Start application" },
    recommendedAction:
      "Send application checklist and intake deadline journey.",
  },
  {
    id: "donation-completed",
    object: "donations",
    trigger: "record_created",
    condition: { field: "payment-status", equals: "Completed" },
    recommendedAction: "Send acknowledgement and stewardship content.",
  },
  {
    id: "donation-recurring-completed",
    object: "donations",
    trigger: "record_created",
    conditions: [
      { field: "donation-type", equals: "Recurring" },
      { field: "payment-status", equals: "Completed" },
    ],
    recommendedAction: "Add to recurring donor stewardship track.",
  },
  {
    id: "donation-failed",
    object: "donations",
    trigger: "record_updated",
    condition: { field: "payment-status", equals: "Failed" },
    recommendedAction:
      "Service follow-up or internal alert only — do not send completed-donation acknowledgement.",
  },
];

/**
 * Evaluate which automation mappings match a validated field map.
 * Useful for dry-run previews; does not send communications.
 */
export function matchAutomations(objectKey, fields, trigger) {
  const map = Object.fromEntries(fields.map((f) => [f.id, f.value]));
  return AUTOMATION_MAPPINGS.filter((m) => {
    if (m.object !== objectKey) return false;
    if (trigger && m.trigger !== trigger) return false;
    const conds = m.conditions || (m.condition ? [m.condition] : []);
    return conds.every((c) => map[c.field] === c.equals);
  });
}
