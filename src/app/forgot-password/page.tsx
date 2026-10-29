import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/password-recovery";

export const metadata: Metadata = { title: "Recuperar senha — Pet Namora" };

export default function ForgotPassword() {
  return <ForgotPasswordForm />;
}
