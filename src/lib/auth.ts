import { UserRole } from "@prisma/client";
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/env";

const encoder = new TextEncoder();
export const SESSION_COOKIE_NAME = "ff_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type SessionPayload = {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT({
    role: payload.role,
    email: payload.email,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(encoder.encode(getJwtSecret()));
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, encoder.encode(getJwtSecret()), {
    algorithms: ["HS256"],
  });

  if (
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.name !== "string"
  ) {
    throw new Error("Invalid session payload.");
  }

  return {
    sub: payload.sub,
    role: payload.role as UserRole,
    email: payload.email,
    name: payload.name,
  } satisfies SessionPayload;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
