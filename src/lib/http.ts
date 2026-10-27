import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message || "Dados inválidos." },
      { status: 400 },
    );
  if (error instanceof SyntaxError)
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  console.error(
    "Pet Namora request failed",
    error instanceof Error ? error.message : "Unknown error",
  );
  return NextResponse.json(
    { error: "Ops, não deu certo dessa vez. Vamos tentar de novo?" },
    { status: 500 },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL || new URL(request.url).origin;
  if (origin && origin !== new URL(expected).origin)
    throw new HttpError("Origem não autorizada.", 403);
}
