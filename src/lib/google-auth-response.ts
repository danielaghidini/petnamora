import { NextResponse } from "next/server";
import { GOOGLE_OAUTH_COOKIE, googleAppUrl, googleCookieOptions } from "./google-auth";

export function googleAuthRedirect(request: Request, error?: string) {
  const destination = new URL("/", googleAppUrl(request));
  if (error) destination.searchParams.set("auth_error", error);
  else destination.searchParams.set("auth", "google");
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  response.cookies.set(GOOGLE_OAUTH_COOKIE, "", { ...googleCookieOptions(), maxAge: 0 });
  return response;
}
