import { NextResponse } from "next/server";
import { z } from "zod";
import { checkOrigin, failure } from "@/lib/http";
import { passwordSchema } from "@/lib/password";
import { resetPassword } from "@/lib/password-reset";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Este link é inválido ou expirou. Peça um novo e-mail de recuperação."),
  password: passwordSchema,
});

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { token, password } = schema.parse(await request.json());
    await resetPassword(token, password);
    return NextResponse.json({ message: "Senha atualizada! Entre novamente para continuar." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
