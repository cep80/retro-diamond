import { randomBytes } from "node:crypto";

/** Crockford base32 alphabet (no I, L, O, U). */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Generate an 8-character Crockford base32 friend invite code. */
export function generateFriendCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += CROCKFORD[bytes[i]! % 32]!;
  }
  return code;
}
