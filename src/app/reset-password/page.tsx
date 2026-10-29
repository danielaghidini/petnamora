import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/password-recovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova senha — Pet Namora", referrer: "no-referrer" };

export default async function ResetPassword({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { resetToken } = await searchParams;
  return <ResetPasswordForm token={typeof resetToken === "string" ? resetToken : ""} />;
}
