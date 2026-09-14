export type PitchEvent =
  | ["o", aimCell: number, swing: number, swingFrame: number]
  | ["d", pitchIdx: number, targetCell: number, delivery: number, kickFrame: number, relFrame: number]
  | ["a"]
  | ["s"];

export type LogHeader = {
  v: 1;
  challengeId?: string;
  simVersion: number;
  userSalt?: string;
  lineup?: string[];
  rotationIdx?: number;
  closerId?: string | null;
  autoPitch?: boolean;
};

export type InputLog = { h: LogHeader; e: PitchEvent[] };

export function emptyLog(simVersion: number): InputLog {
  return { h: { v: 1, simVersion }, e: [] };
}

export function appendEvent(log: InputLog, ev: PitchEvent): InputLog {
  return { h: log.h, e: [...log.e, ev] };
}

export function serializeLog(log: InputLog): string {
  return JSON.stringify(log);
}

export function parseLog(raw: string): InputLog {
  return JSON.parse(raw) as InputLog;
}
