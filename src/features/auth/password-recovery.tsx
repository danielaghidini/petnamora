"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { api } from "@/lib/client";

function RecoveryCard({ title, children }: { title: string; children: ReactNode }) {
  return <main className="auth-page">
    <section className="auth-card stack-form" aria-labelledby="recovery-title">
      <Link href="/" aria-label="Página inicial do Pet Namora">
        <img className="auth-logo" src="/brand/petnamora-logo-02.png" alt="Pet Namora" width={2172} height={724} />
      </Link>
      <h1 id="recovery-title">{title}</h1>
      {children}
    </section>
  </main>;
}

export function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await api<{ message: string }>("/api/auth/forgot-password", {
        method: "POST", body: JSON.stringify({ email: data.get("email") }),
      });
      setMessage(result.message);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <RecoveryCard title="Esqueceu sua senha?">
    {message ? <>
      <p className="success-banner" role="status">{message}</p>
      <p className="form-note">O link vale por uma hora. Se pedir outro, use o e-mail mais recente.</p>
      <button className="secondary-button" onClick={() => { setMessage(""); setError(""); }}>Pedir outro link</button>
    </> : <>
      <p className="form-intro">Informe o e-mail da sua conta. Vamos mandar um link para você criar uma nova senha.</p>
      <form className="stack-form" onSubmit={submit} aria-busy={busy}>
        <label>E-mail
          <input name="email" type="email" autoComplete="email" placeholder="voce@email.com" required maxLength={254} disabled={busy} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy}>
          {busy && <LoaderCircle className="spin" size={18} />}
          {busy ? "Enviando..." : "Enviar link de recuperação"}
        </button>
      </form>
    </>}
    <Link className="auth-text-link" href="/?auth=login">Voltar para entrar</Link>
  </RecoveryCard>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const validToken = /^[a-f0-9]{64}$/.test(token);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validToken) return;
    const data = new FormData(event.currentTarget);
    setError("");
    if (data.get("password") !== data.get("confirmPassword")) {
      setError("As senhas não coincidem. Confira os dois campos.");
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ message: string }>("/api/auth/reset-password", {
        method: "POST", body: JSON.stringify({ token, password: data.get("password") }),
      });
      // Remove the sensitive link from the current history entry after use.
      window.history.replaceState(window.history.state, "", "/reset-password");
      setMessage(result.message);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <RecoveryCard title="Crie sua nova senha">
    {message ? <>
      <p className="success-banner" role="status">{message}</p>
      <Link className="primary-button" href="/?auth=login">Entrar na minha conta</Link>
    </> : !validToken ? <>
      <p className="form-error" role="alert">Este link de recuperação é inválido. Peça um novo e-mail para continuar.</p>
      <Link className="primary-button" href="/forgot-password">Pedir novo link</Link>
    </> : <>
      <p className="form-intro">Escolha uma senha com pelo menos 8 caracteres.</p>
      <form className="stack-form" onSubmit={submit} aria-busy={busy}>
        <label>Nova senha
          <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} />
        </label>
        <label>Confirme a nova senha
          <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-button" disabled={busy}>
          {busy && <LoaderCircle className="spin" size={18} />}
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      </form>
      <Link className="auth-text-link" href="/forgot-password">Pedir outro link de recuperação</Link>
    </>}
  </RecoveryCard>;
}
