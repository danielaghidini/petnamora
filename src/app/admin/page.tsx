import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { AdminLogin, AdminLogout } from "@/features/admin/controls";
import { adminTabs, OverviewView, ReportsView, DogsView, UsersView, ActivityView, type AdminFilters } from "@/features/admin/views";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administração | Pet Namora", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (!user?.isAdmin) return <main className="admin-entry">
    <div className="admin-entry-card">
      <Link href="/" className="admin-brand"><img src="/brand/petnamora-logo-02.png" alt="Pet Namora" width={240} height={80} /></Link>
      <span className="admin-entry-icon"><ShieldCheck size={28} /></span>
      <h1>{user ? "Acesso restrito" : "Administração"}</h1>
      <p>{user ? `A conta ${user.email} não tem permissão para acessar este painel.` : "Entre com sua conta de administrador para cuidar da comunidade."}</p>
      {user ? <AdminLogout /> : <AdminLogin />}
      <Link className="admin-return" href="/">Voltar ao Pet Namora</Link>
    </div>
  </main>;
  const params = await searchParams;
  const view = adminTabs.find((tab) => tab.id === params.view)?.id || "overview";
  const page = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Math.max(1, Number(params.page)) : 1;
  const filters: AdminFilters = {
    view, page,
    q: typeof params.q === "string" ? params.q.trim().slice(0, 100) : "",
    status: typeof params.status === "string" ? params.status : "",
  };
  return <div className="admin-shell">
    <header className="admin-header">
      <Link href="/" className="admin-brand"><img src="/brand/petnamora-logo-02.png" alt="Pet Namora" width={180} height={60} /></Link>
      <div className="admin-header-right"><ThemeSelector /><Link className="secondary-button" href="/">Ver o site</Link><AdminLogout /></div>
    </header>
    <main className="admin-main">
      <div className="admin-heading"><div><div className="admin-eyebrow"><ShieldCheck size={17} /> ADMINISTRAÇÃO</div><h1>Cuidar de cada patinha.</h1><p>Olá, {user.name.split(" ")[0]}. Acompanhe a comunidade e cuide dos relatos recebidos.</p></div><span className="admin-account">{user.email}</span></div>
      <nav className="admin-tabs" aria-label="Administração">{adminTabs.map((tab) => <Link key={tab.id} href={`/admin?view=${tab.id}${tab.id === "reports" ? "&status=OPEN" : ""}`} className={view === tab.id ? "active" : ""} aria-current={view === tab.id ? "page" : undefined}>{tab.label}</Link>)}</nav>
      <section aria-label={adminTabs.find((tab) => tab.id === view)?.label}>
        {view === "overview" && <OverviewView />}
        {view === "reports" && <ReportsView filters={filters} />}
        {view === "dogs" && <DogsView filters={filters} />}
        {view === "users" && <UsersView filters={filters} />}
        {view === "activity" && <ActivityView filters={filters} />}
      </section>
    </main>
  </div>;
}
