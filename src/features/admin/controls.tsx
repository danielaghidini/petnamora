"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/client";
import type { Viewer } from "@/features/dogs/types";
import type { AdminCommand } from "./validation";

export function AdminLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { user } = await api<{ user: Viewer }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({ action: "login", email: form.get("email"), password: form.get("password") }),
      });
      if (!user.isAdmin) setError("Sua conta não tem permissão de administrador.");
      router.refresh();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>E-mail<input name="email" type="email" autoComplete="username" maxLength={254} required /></label>
      <label>Senha<input name="password" type="password" autoComplete="current-password" minLength={8} maxLength={72} required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" disabled={busy}>
        {busy && <LoaderCircle size={18} className="spin" />} Entrar no painel
      </button>
    </form>
  );
}

export function AdminLogout() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await api("/api/auth", { method: "DELETE" });
      window.location.assign("/admin");
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
    }
  }
  return <div>
    <button className="secondary-button" onClick={() => void logout()} disabled={busy}><LogOut size={16} /> Sair</button>
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}

export function AdminActionButton({ command, label, target, description, danger = false }: {
  command: AdminCommand;
  label: string;
  target: string;
  description: string;
  danger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pending = busy || refreshing;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true);
    setError("");
    try {
      await api("/api/admin", { method: "POST", body: JSON.stringify({ ...command, reason }) });
      setOpen(false);
      setNotice("Alteração salva.");
      startTransition(() => router.refresh());
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-action">
      <button className={`admin-action-button${danger ? " danger" : ""}`} disabled={pending}
        aria-label={`${label}: ${target}`} onClick={() => { setError(""); setNotice(""); setOpen(true); }}>
        {pending && <LoaderCircle className="spin" size={14} />} {label}
      </button>
      {notice && <span className="admin-action-notice" role="status">{notice}</span>}
      <Modal open={open} onClose={() => { if (!busy) setOpen(false); }} title={label} description={description}>
        <form className="admin-login-form" onSubmit={submit}>
          <p><strong>{target}</strong></p>
          <label>Motivo da alteração<textarea name="reason" minLength={5} maxLength={1000} rows={3} required disabled={busy} /></label>
          <p className="form-note">O motivo e seu nome serão registrados no histórico de administração.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="admin-actions">
            <button className="secondary-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button>
            <button className="primary-button" disabled={busy}>{busy && <LoaderCircle className="spin" size={16} />} Confirmar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
