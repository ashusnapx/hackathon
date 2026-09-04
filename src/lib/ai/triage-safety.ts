export function chooseIncidentAt(
  modelValue: string | null | undefined,
  extractedValue: string | null | undefined,
  now: Date,
): string | undefined {
  for (const value of [modelValue, extractedValue]) {
    if (!value) continue;
    const time = Date.parse(value);
    // Allow a small clock-skew margin, but never turn an invalid/future model
    // value into the legal trigger for an urgent deadline.
    if (Number.isFinite(time) && time <= now.getTime() + 5 * 60_000) {
      return new Date(time).toISOString();
    }
  }
  return undefined;
}

export function triageUrgency(
  financial: boolean,
  incidentAt: string | undefined,
  now: Date,
): "critical" | "high" | "moderate" {
  if (!financial || !incidentAt) return "moderate";
  const minutes = (now.getTime() - Date.parse(incidentAt)) / 60_000;
  if (!Number.isFinite(minutes) || minutes < 0) return "moderate";
  if (minutes < 60) return "critical";
  if (minutes < 1_440) return "high";
  return "moderate";
}
