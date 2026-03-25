/**
 * Normalises the `reminders` field stored in notifications_config.
 *
 * Accepts:
 *   - a JSON string  → parsed, then treated as below
 *   - a plain Array  → used directly
 *   - an array-like object (has numeric .length) → iterated
 *   - anything else  → returns the default fallback
 *
 * Each slot must have finite numeric `days` and `hour` values;
 * invalid slots are silently dropped.
 *
 * Always returns at least [{days:3, hour:8}].
 */
function normalizeReminderSlots(raw) {
  const fallback = [{ days: 3, hour: 8 }];
  let parsed = raw;

  if (typeof parsed === "string" && parsed) {
    try {
      parsed = JSON.parse(parsed);
    } catch (_) {
      parsed = raw;
    }
  }

  let source = [];
  if (Array.isArray(parsed)) {
    source = parsed;
  } else if (parsed && typeof parsed === "object" && typeof parsed.length === "number") {
    for (let i = 0; i < parsed.length; i++) {
      source.push(parsed[i]);
    }
  }

  const normalized = [];
  for (const slot of source) {
    const days = Number(slot && slot.days);
    const hour = Number(slot && slot.hour);

    if (!isFinite(days) || !isFinite(hour)) {
      continue;
    }

    normalized.push({
      days: Math.trunc(days),
      hour: Math.trunc(hour),
    });
  }

  return normalized.length > 0 ? normalized : fallback;
}

module.exports = { normalizeReminderSlots };
