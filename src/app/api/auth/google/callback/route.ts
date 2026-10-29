import { cookies } from "next/headers";
import { createSession } from "@/lib/auth";
import {
  GOOGLE_OAUTH_COOKIE, GoogleAuthError, getGoogleProfile, googleUser, readGoogleOAuthContext,
} from "@/lib/google-auth";
import { googleAuthRedirect } from "@/lib/google-auth-response";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const jar = await cookies();
    const context = readGoogleOAuthContext(jar.get(GOOGLE_OAUTH_COOKIE)?.value, params.get("state"));
    if (params.has("error"))
      throw new GoogleAuthError(params.get("error") === "access_denied" ? "cancelled" : "failed");
    const code = params.get("code");
    if (!code || code.length > 4096) throw new GoogleAuthError("failed");
    const profile = await getGoogleProfile(request, code, context.verifier);
    const user = await googleUser(profile);
    await createSession(user.id);
    return googleAuthRedirect(request);
  } catch (error) {
    // Do not log Google's tokens, authorization codes or personal profile data.
    if (!(error instanceof GoogleAuthError)) console.error("Google login failed.");
    return googleAuthRedirect(request, error instanceof GoogleAuthError ? error.code : "failed");
  }
}
