import { createHash, randomBytes } from "node:crypto";
import { promisify } from "node:util";

export const randomBytesAsync = promisify(randomBytes);

export function sha256(msg: string | Buffer): Buffer {
  return createHash("sha256").update(msg).digest();
}

export async function generateToken(bytesCount = 32): Promise<string> {
  const bytes = await randomBytesAsync(bytesCount);
  return bytes.toString("base64url");
}
