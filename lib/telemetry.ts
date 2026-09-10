type EventName = "generation" | "validation" | "feedback" | "error";

export function logTelemetry(event: EventName, payload: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    event,
    ...payload,
  };
  console.info("[namegenius]", JSON.stringify(line));
}
