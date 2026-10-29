import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_COOKIE, GoogleAuthError, createGoogleOAuthContext,
  googleCookieOptions, googleOAuthConfig,
} from "@/lib/google-auth";
import { googleAuthRedirect } from "@/lib/google-auth-response";

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get("adult") !== "1")
      throw new GoogleAuthError("adult_required");
    const { clientId, callbackUrl } = googleOAuthConfig(request);
    const { context, challenge } = createGoogleOAuthContext();
    const authorization = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorization.search = new URLSearchParams({
      client_id: clientId, redirect_uri: callbackUrl, response_type: "code",
      scope: "openid email profile", state: context.state, prompt: "select_account",
      code_challenge: challenge, code_challenge_method: "S256",
    }).toString();
    const response = NextResponse.redirect(authorization);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set(GOOGLE_OAUTH_COOKIE, JSON.stringify(context), googleCookieOptions());
    return response;
  } catch (error) {
    return googleAuthRedirect(request, error instanceof GoogleAuthError ? error.code : "failed");
  }
}
