/**
 * Shared Custom Object schema helpers (matches patterns in code-camp-sync.js).
 */

export function serializeField(f) {
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

export function newField(id, singular, type, extra = {}) {
  return serializeField({
    id,
    labels: { singular, plural: singular },
    type,
    required: false,
    ...extra,
  });
}

export function mergeOptions(existing, values) {
  const opts = [...(existing || [])];
  for (const value of values) {
    if (!opts.some((o) => o.value === value)) opts.push({ value });
  }
  return opts.map((o) => (o.id ? { id: o.id, value: o.value } : { value: o.value }));
}

export function ensureDropdown(byId, id, singular, values, extra = {}) {
  if (byId[id]) {
    return serializeField({
      ...byId[id],
      labels: { singular, plural: singular },
      options: mergeOptions(byId[id].options, values),
      ...extra,
    });
  }
  return newField(id, singular, "dropdown", {
    options: values.map((value) => ({ value })),
    ...extra,
  });
}

export function ensureMultiselect(byId, id, singular, values, extra = {}) {
  if (byId[id]) {
    return serializeField({
      ...byId[id],
      labels: { singular, plural: singular },
      options: mergeOptions(byId[id].options, values),
      ...extra,
    });
  }
  return newField(id, singular, "multiselect", {
    options: values.map((value) => ({ value })),
    ...extra,
  });
}

export function ensureField(byId, id, singular, type, extra = {}) {
  return byId[id]
    ? serializeField({
        ...byId[id],
        labels: { singular, plural: singular },
        ...extra,
      })
    : newField(id, singular, type, extra);
}

export function contactRelationship(existing = [], description) {
  const current = existing.find((r) => r.id === "primary-contact");
  return [
    {
      id: "primary-contact",
      labels: current?.labels || { singular: "Contact", plural: "Contacts" },
      description:
        current?.description ||
        description ||
        "Primary contact related to this record",
      namespace: "contacts",
      hasMany: false,
    },
  ];
}

export function isActiveField(f) {
  return f && f.status !== "marked_for_deletion";
}

export function fieldsById(schema) {
  return Object.fromEntries(
    (schema.fields || []).filter(isActiveField).map((f) => [f.id, f])
  );
}
