export type SaveSummary = {
  teamName?: string;
  record?: string;
  rings?: number;
  week?: number;
  year?: number;
  device?: string;
  updatedAt?: string;
};

export type SaveRecord = {
  userId: string;
  slot: 0 | 1 | 2;
  rev: number;
  saveVersion: number;
  hash: string;
  summary: SaveSummary;
  updatedAt: string;
};

export type PutSaveInput = {
  slot: 0 | 1 | 2;
  rev: number;
  saveVersion: number;
  hash: string;
  blob: Uint8Array;
  summary: SaveSummary;
};

/** List cloud save slots for the authenticated user (stub). */
export async function listSaves(_userId: string): Promise<SaveRecord[]> {
  return [];
}

/** Upsert a cloud save with CAS on rev (stub). */
export async function putSave(_userId: string, input: PutSaveInput): Promise<{ rev: number }> {
  return { rev: input.rev + 1 };
}
