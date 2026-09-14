const KEY = "retro-diamond-telemetry";
const SESSION_KEY = "retro-diamond-session-id";
const DEVICE_KEY = "retro-diamond-device-id";
const MAX = 200;
const APP_VERSION = "1.0.0";

export type TelemetryEvent = {
  t: number;
  name: string;
  props?: Record<string, unknown>;
  session_id?: string;
  device_id?: string;
  user_id?: string;
  version?: string;
};

let enabled = true;
let flushListenerAttached = false;

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `rd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateStorageId(key: string): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = randomId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function getSessionId(): string | undefined {
  return getOrCreateStorageId(SESSION_KEY);
}

export function getDeviceId(): string | undefined {
  return getOrCreateStorageId(DEVICE_KEY);
}

export function setTelemetryEnabled(on: boolean) {
  enabled = on;
}

export function readQueue(): TelemetryEvent[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) ?? "[]") as TelemetryEvent[];
    return Array.isArray(prev) ? prev : [];
  } catch {
    return [];
  }
}

function writeQueue(events: TelemetryEvent[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
  } catch {
    /* quota / private mode */
  }
}

function enrichEvent(name: string, props?: Record<string, unknown>): TelemetryEvent {
  return {
    t: Date.now(),
    name,
    props,
    session_id: getSessionId(),
    device_id: getDeviceId(),
    version: APP_VERSION,
  };
}

export function track(name: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  if (typeof localStorage === "undefined") return;
  const event = enrichEvent(name, props);
  try {
    const next = readQueue();
    next.push(event);
    writeQueue(next);
  } catch {
    /* quota / private mode */
  }
}

/** POST queued events to `/api/telemetry`. No-op when offline or on failure. */
export async function flushTelemetry(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!enabled) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const events = readQueue();
  if (events.length === 0) return;

  const batch = events.slice(0, 50);
  try {
    const res = await fetch("/api/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
    if (!res.ok) return;
    writeQueue(events.slice(batch.length));
  } catch {
    /* network error — keep queue for next flush */
  }
}

function attachFlushListener() {
  if (flushListenerAttached || typeof document === "undefined") return;
  flushListenerAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      void flushTelemetry();
    }
  });
}

attachFlushListener();
