import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./prisma";

export const GOOGLE_OAUTH_COOKIE = "petnamora_google_oauth";
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

export class GoogleAuthError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export function googleAppUrl(request: Request) {
  const configured = process.env.APP_URL?.trim();
  if (!configured && process.env.NODE_ENV === "production")
    throw new Error("APP_URL is required for Google login in production.");
  return new URL(configured || request.url).origin;
}

export function googleOAuthConfig(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new GoogleAuthError("not_configured");
  const callbackUrl = new URL(GOOGLE_CALLBACK_PATH, googleAppUrl(request)).toString();
  // Both ends must use the same public origin so the browser returns the OAuth cookie.
  if (process.env.GOOGLE_REDIRECT_URI?.trim() && process.env.GOOGLE_REDIRECT_URI.trim() !== callbackUrl)
    throw new GoogleAuthError("not_configured");
  return { clientId, clientSecret, callbackUrl };
}

export function googleCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/google",
    maxAge: 10 * 60,
  };
}

const contextSchema = z.object({
  state: z.string().regex(/^[\w-]{43}$/),
  verifier: z.string().regex(/^[\w-]{43}$/),
  adult: z.literal(true),
});

export function createGoogleOAuthContext() {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { context: { state, verifier, adult: true as const }, challenge };
}

export function readGoogleOAuthContext(cookie: string | undefined, state: string | null) {
  try {
    const context = contextSchema.parse(JSON.parse(cookie || ""));
    const expected = Buffer.from(context.state);
    const received = Buffer.from(state || "");
    if (expected.length === received.length && timingSafeEqual(expected, received)) return context;
  } catch {
    // Missing, expired and malformed cookies all require restarting authentication.
  }
  throw new GoogleAuthError("invalid_state");
}

const profileSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  email_verified: z.boolean(),
  name: z.string().optional(),
  hd: z.string().min(1).optional(),
});
type GoogleProfile = z.infer<typeof profileSchema>;

export async function getGoogleProfile(request: Request, code: string, verifier: string) {
  const { clientId, clientSecret, callbackUrl } = googleOAuthConfig(request);
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret, redirect_uri: callbackUrl,
      grant_type: "authorization_code", code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!tokenResponse.ok) throw new GoogleAuthError("failed");
  const token = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  // Identity comes directly from Google's authenticated endpoint, never from URL/client claims.
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!profileResponse.ok) throw new GoogleAuthError("failed");
  const profile = profileSchema.parse(await profileResponse.json());
  if (!profile.email_verified) throw new GoogleAuthError("email_not_verified");
  return profile;
}

export async function googleUser(profile: GoogleProfile) {
  async function resolve() {
    return db.$transaction(async (tx) => {
      const linked = await tx.user.findUnique({ where: { googleId: profile.sub } });
      const user = linked || await tx.user.findUnique({ where: { email: profile.email } });
      if (user) {
        if (user.suspendedAt) throw new GoogleAuthError("account_suspended");
        if (linked) return linked;
        // Google is not authoritative for third-party email addresses without a Workspace domain.
        if (user.googleId || (!profile.email.endsWith("@gmail.com") && !profile.hd))
          throw new GoogleAuthError("use_password");
        const result = await tx.user.updateMany({
          where: { id: user.id, googleId: null, suspendedAt: null },
          data: { googleId: profile.sub },
        });
        if (result.count !== 1) throw new GoogleAuthError("failed");
        return user;
      }
      return tx.user.create({
        data: {
          googleId: profile.sub,
          email: profile.email,
          name: profile.name?.trim().slice(0, 80) || profile.email.split("@")[0].slice(0, 80),
          // Preserve the password-login contract without inventing a usable password.
          passwordHash: await bcrypt.hash(randomBytes(32).toString("base64url"), 12),
        },
      });
    });
  }
  try {
    return await resolve();
  } catch (error) {
    // Two callbacks may finish at once; resolve the unique identity again after rollback.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return resolve();
    throw error;
  }
}
