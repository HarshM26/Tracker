import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// NOTE: Next.js made cookies()/headers() async starting in v15 (must be
// awaited). package.json pins next@16.3.4 — newer than what this code was
// written against — so if this doesn't compile, check
// node_modules/next/dist/docs (per AGENTS.md) for what changed.

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is not set. Add it to .env.local — see .env.example.");
}
const secretKey = new TextEncoder().encode(process.env.AUTH_SECRET);

export type SessionPayload = {
  username: string;
  displayName: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey);

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (typeof payload.username !== "string" || typeof payload.displayName !== "string") {
      return null;
    }
    return { username: payload.username, displayName: payload.displayName };
  } catch {
    return null; // expired or tampered
  }
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
