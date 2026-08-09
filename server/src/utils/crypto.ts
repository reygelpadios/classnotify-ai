import crypto from "crypto";
import { env } from "@config/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  return Buffer.from(env.TOKEN_ENCRYPTION_KEY, "hex");
}

/** Encrypts a plaintext token. Output format: iv:authTag:cipherText (all hex). */
export function encryptToken(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptToken(payload: string): string {
  const [ivHex, authTagHex, cipherHex] = payload.split(":");
  if (!ivHex || !authTagHex || !cipherHex) {
    throw new Error("Malformed encrypted token payload");
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
