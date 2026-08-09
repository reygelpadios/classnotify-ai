import jwt from "jsonwebtoken";
import { env } from "@config/env";

const EXPIRES_IN = "30d";

export function issueJwt(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyJwt(token: string): { userId: string } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: string };
}
