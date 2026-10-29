import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin, failure } from "@/lib/http";
import { PASSWORD_RESET_MESSAGE, requestPasswordReset } from "@/lib/password-reset";
import { passwordResetEmailConfig } from "@/lib/password-reset-email";

const schema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido.").max(254)) });

export async function POST(request: Request) {
  try {
    // Validate configured origin before interpreting it in the origin check.
    // Configuration failures are identical for every requested address.
    const config = passwordResetEmailConfig();
    checkOrigin(request);
    const { email } = schema.parse(await request.json());
    await requestPasswordReset(email, config);
    return NextResponse.json({ message: PASSWORD_RESET_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
