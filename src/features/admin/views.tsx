import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Flag, Heart, PawPrint, Users } from "lucide-react";
import { db } from "@/lib/prisma";
import { AdminActionButton } from "./controls";
import { adminOverview, adminReportFields, adminUserFields } from "./service";
import { reportLabels } from "./validation";

export const adminTabs = [
  { id: "overview", label: "Visão geral" },
  { id: "reports", label: "Denúncias" },
  { id: "dogs", label: "Cachorros" },
  { id: "users", label: "Usuários" },
  { id: "activity", label: "Histórico" },
] as const;
export type AdminView = typeof adminTabs[number]["id"];
export type AdminFilters = { view: AdminView; q: string; status: string; page: number };
const pageSize = 20;
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
function date(value: Date) { return dateFormat.format(value); }
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="admin-empty"><PawPrint size={30} /><h3>Nenhum resultado por aqui</h3><p>{children}</p></div>;
}
function Badge({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  return <span className={`admin-badge${warning ? " warning" : ""}`}>{children}</span>;
}
function pageUrl(filters: AdminFilters, page: number) {
  return `/admin?${new URLSearchParams({ view: filters.view, q: filters.q, status: filters.status, page: String(page) })}`;
}
function Pagination({ total, filters }: { total: number; filters: AdminFilters }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <nav className="admin-pagination" aria-label="Paginação">
    <span>{total} {total === 1 ? "registro" : "registros"} · Página {filters.page} de {pages}</span>
    <div className="admin-actions">
      {filters.page > 1 && <Link className="secondary-button" href={pageUrl(filters, filters.page - 1)}>Anterior</Link>}
      {filters.page < pages && <Link className="secondary-button" href={pageUrl(filters, filters.page + 1)}>Próxima</Link>}
    </div>
  </nav>;
}

export function AdminSearch({ filters }: { filters: AdminFilters }) {
  const choices = filters.view === "reports"
    ? [["OPEN", "Pendentes"], ["RESOLVED", "Concluídas"], ["DISMISSED", "Arquivadas"]]
    : filters.view === "users" ? [["active", "Ativos"], ["suspended", "Suspensos"], ["admin", "Administradores"]]
    : [["available", "Liberados"], ["blocked", "Bloqueados"], ["suspended", "Família suspensa"]];
  return <form className="admin-search" action="/admin">
    <input type="hidden" name="view" value={filters.view} />
    <label>Buscar<input name="q" defaultValue={filters.q} placeholder={filters.view === "users" ? "Nome ou e-mail" : "Nome, raça ou e-mail da família"} maxLength={100} /></label>
    <label>Situação<select name="status" defaultValue={filters.status}>
      <option value="">Todas</option>
      {choices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <button className="primary-button">Buscar</button>
    {(filters.q || filters.status) && <Link className="secondary-button" href={`/admin?view=${filters.view}`}>Limpar</Link>}
  </form>;
}

type ReportRow = Prisma.ReportGetPayload<{ select: typeof adminReportFields }>;
function ReportCards({ reports }: { reports: ReportRow[] }) {
  if (!reports.length) return <Empty>As denúncias que correspondem à busca aparecerão aqui.</Empty>;
  return <div className="admin-report-list">{reports.map((report) => <article key={report.id} className="admin-report-card">
    <div className="admin-report-top">
      <div className="admin-pet-summary"><img src={report.dog.photoUrl} alt={report.dog.name} width={64} height={64} />
        <div><h3>{report.dog.name}</h3><p>{report.dog.breed} · Família: {report.dog.owner.name}</p><p>{report.dog.owner.email}</p></div>
      </div>
      <Badge warning={report.status === "OPEN"}>{reportLabels[report.status]}</Badge>
    </div>
    <div className="admin-report-reason"><strong>Motivo da denúncia</strong><p>{report.reason}</p></div>
    <details className="admin-profile-details"><summary>Ver apresentação do cachorro</summary><p>{report.dog.bio}</p></details>
    <p className="admin-meta">Enviada por {report.reporter.name} ({report.reporter.email}) em {date(report.createdAt)}.
      {report.reviewedAt && ` Analisada em ${date(report.reviewedAt)}.`}</p>
    <div className="admin-actions">
      <AdminActionButton label={report.dog.blockedAt ? "Liberar perfil" : "Bloquear perfil"} target={report.dog.name}
        danger={!report.dog.blockedAt} command={{ kind: "dog", id: report.dog.id, value: !report.dog.blockedAt, expected: Boolean(report.dog.blockedAt) }}
        description={report.dog.blockedAt ? "O perfil poderá aparecer novamente se a família estiver ativa." : "O perfil ficará oculto e suas curtidas e conversas serão bloqueadas."} />
      {report.dog.owner.suspendedAt && <Badge warning>Família suspensa</Badge>}
      {report.status === "OPEN" ? <>
        <AdminActionButton label="Concluir análise" target={`Denúncia sobre ${report.dog.name}`}
          command={{ kind: "report", id: report.id, value: "RESOLVED", expected: report.status }}
          description="Registre a conclusão da análise. O bloqueio do perfil é feito pelo botão Bloquear perfil." />
        <AdminActionButton label="Arquivar" target={`Denúncia sobre ${report.dog.name}`}
          command={{ kind: "report", id: report.id, value: "DISMISSED", expected: report.status }}
          description="Arquive a denúncia sem aplicar uma nova restrição ao perfil." />
      </> : <AdminActionButton label="Reabrir análise" target={`Denúncia sobre ${report.dog.name}`}
        command={{ kind: "report", id: report.id, value: "OPEN", expected: report.status }}
        description="A denúncia voltará para a lista de pendências." />}
    </div>
  </article>)}</div>;
}

export async function OverviewView() {
  const data = await adminOverview();
  const stats = [
    { label: "Usuários", value: data.users, icon: Users, href: "/admin?view=users", note: `${data.suspendedUsers} suspensos` },
    { label: "Cachorros", value: data.dogs, icon: PawPrint, href: "/admin?view=dogs", note: `${data.blockedDogs} bloqueados` },
    { label: "Namorinhos", value: data.matches, icon: Heart, href: null, note: "Conexões criadas" },
    { label: "Denúncias pendentes", value: data.openReports, icon: Flag, href: "/admin?view=reports&status=OPEN", note: "Aguardando sua análise" },
  ];
  return <>
    <div className="admin-stats">{stats.map((stat) => {
      const content = <><span className="admin-stat-icon"><stat.icon size={22} /></span><span>{stat.label}</span><strong>{stat.value.toLocaleString("pt-BR")}</strong><small>{stat.note}</small></>;
      return stat.href ? <Link className="admin-stat" href={stat.href} key={stat.label}>{content}</Link> : <div className="admin-stat" key={stat.label}>{content}</div>;
    })}</div>
    <div className="admin-section-heading"><div><h2>Denúncias para cuidar</h2><p>Comece pelos relatos que precisam de atenção.</p></div><Link className="secondary-button" href="/admin?view=reports&status=OPEN">Ver pendências</Link></div>
    {data.recentReports.length ? <ReportCards reports={data.recentReports} /> : <Empty>Não há denúncias pendentes de análise.</Empty>}
  </>;
}

export async function UsersView({ filters }: { filters: AdminFilters }) {
  const where: Prisma.UserWhereInput = {
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { email: { contains: filters.q, mode: "insensitive" } }] } : {}),
    ...(filters.status === "suspended" ? { suspendedAt: { not: null } } : filters.status === "active" ? { suspendedAt: null } : filters.status === "admin" ? { isAdmin: true } : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({ where, select: { ...adminUserFields, _count: { select: { dogs: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (filters.page - 1) * pageSize }),
  ]);
  return <><AdminSearch filters={filters} />{users.length ? <div className="admin-table-wrap"><table className="admin-table">
    <caption className="sr-only">Usuários cadastrados</caption><thead><tr><th>Família</th><th>Cadastro</th><th>Cachorros</th><th>Situação</th><th>Ação</th></tr></thead>
    <tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><span>{user.email}</span></td><td>{date(user.createdAt)}</td><td>{user._count.dogs}</td>
      <td><Badge warning={Boolean(user.suspendedAt)}>{user.isAdmin ? "Administrador" : user.suspendedAt ? "Suspenso" : "Ativo"}</Badge></td>
      <td>{user.isAdmin ? <span className="admin-meta">Conta protegida</span> : <AdminActionButton target={user.email}
        label={user.suspendedAt ? "Reativar conta" : "Suspender conta"} danger={!user.suspendedAt}
        command={{ kind: "user", id: user.id, value: !user.suspendedAt, expected: Boolean(user.suspendedAt) }}
        description={user.suspendedAt ? "A família poderá entrar novamente. Bloqueios individuais dos perfis serão mantidos." : "As sessões serão encerradas e os perfis, curtidas e conversas da família ficarão indisponíveis."} />}</td>
    </tr>)}</tbody></table></div> : <Empty>Tente outro nome, e-mail ou situação.</Empty>}<Pagination total={total} filters={filters} /></>;
}

export async function DogsView({ filters }: { filters: AdminFilters }) {
  const where: Prisma.DogWhereInput = {
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { breed: { contains: filters.q, mode: "insensitive" } }, { owner: { email: { contains: filters.q, mode: "insensitive" } } }, { owner: { name: { contains: filters.q, mode: "insensitive" } } }] } : {}),
    ...(filters.status === "blocked" ? { blockedAt: { not: null } } : filters.status === "available" ? { blockedAt: null, owner: { suspendedAt: null } } : filters.status === "suspended" ? { owner: { suspendedAt: { not: null } } } : {}),
  };
  const [total, dogs] = await Promise.all([
    db.dog.count({ where }),
    db.dog.findMany({ where, select: {
      id: true, name: true, breed: true, city: true, state: true, bio: true, photoUrl: true, active: true, neutered: true, blockedAt: true,
      owner: { select: { name: true, email: true, suspendedAt: true } },
    }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (filters.page - 1) * pageSize }),
  ]);
  return <><AdminSearch filters={filters} />{dogs.length ? <div className="admin-table-wrap"><table className="admin-table">
    <caption className="sr-only">Perfis de cachorros</caption><thead><tr><th>Cachorro</th><th>Família</th><th>Situação</th><th>Ação</th></tr></thead>
    <tbody>{dogs.map((dog) => <tr key={dog.id}><td><div className="admin-pet-summary"><img src={dog.photoUrl} alt="" width={48} height={48} loading="lazy" /><div><strong>{dog.name}</strong><span>{dog.breed} · {dog.city}/{dog.state}</span></div></div>
      <details className="admin-profile-details"><summary>Ver apresentação</summary><p>{dog.bio}</p></details></td>
      <td><strong>{dog.owner.name}</strong><span>{dog.owner.email}</span></td>
      <td><Badge warning={Boolean(dog.blockedAt || dog.owner.suspendedAt)}>{dog.blockedAt ? "Bloqueado" : dog.owner.suspendedAt ? "Família suspensa" : "Liberado"}</Badge>
        {(!dog.active || dog.neutered) && <span className="admin-meta">Indisponível para namorinho</span>}</td>
      <td><AdminActionButton label={dog.blockedAt ? "Liberar perfil" : "Bloquear perfil"} target={dog.name} danger={!dog.blockedAt}
        command={{ kind: "dog", id: dog.id, value: !dog.blockedAt, expected: Boolean(dog.blockedAt) }}
        description={dog.blockedAt ? "O perfil poderá aparecer novamente se a família estiver ativa." : "O perfil ficará oculto e suas curtidas e conversas serão bloqueadas. Editar o cadastro não remove este bloqueio."} /></td>
    </tr>)}</tbody></table></div> : <Empty>Tente outro nome, raça, e-mail ou situação.</Empty>}<Pagination total={total} filters={filters} /></>;
}

export async function ReportsView({ filters }: { filters: AdminFilters }) {
  const where: Prisma.ReportWhereInput = {
    ...(filters.status === "OPEN" || filters.status === "RESOLVED" || filters.status === "DISMISSED" ? { status: filters.status } : {}),
    ...(filters.q ? { OR: [{ dog: { name: { contains: filters.q, mode: "insensitive" } } }, { dog: { breed: { contains: filters.q, mode: "insensitive" } } }, { dog: { owner: { email: { contains: filters.q, mode: "insensitive" } } } }, { dog: { owner: { name: { contains: filters.q, mode: "insensitive" } } } }] } : {}),
  };
  const [total, reports] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({ where, select: adminReportFields, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (filters.page - 1) * pageSize }),
  ]);
  return <><AdminSearch filters={filters} /><p className="admin-help">Concluir ou arquivar uma denúncia mantém a proteção pessoal de quem denunciou. O bloqueio global do perfil é uma ação separada.</p><ReportCards reports={reports} /><Pagination total={total} filters={filters} /></>;
}

const actionLabels: Record<string, string> = {
  USER_SUSPENDED: "Conta suspensa", USER_RESTORED: "Conta reativada",
  DOG_BLOCKED: "Perfil bloqueado", DOG_RESTORED: "Perfil liberado",
  REPORT_OPEN: "Denúncia reaberta", REPORT_RESOLVED: "Análise concluída", REPORT_DISMISSED: "Denúncia arquivada",
  ADMIN_GRANTED: "Acesso de administrador concedido",
};
export async function ActivityView({ filters }: { filters: AdminFilters }) {
  const [total, actions] = await Promise.all([
    db.adminAction.count(),
    db.adminAction.findMany({ select: { id: true, action: true, reason: true, targetId: true, createdAt: true, actor: { select: { name: true, email: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (filters.page - 1) * pageSize }),
  ]);
  return <>{actions.length ? <div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">Histórico de ações administrativas</caption>
    <thead><tr><th>Quando</th><th>Administrador</th><th>Ação</th><th>Motivo</th></tr></thead>
    <tbody>{actions.map((action) => <tr key={action.id}><td>{date(action.createdAt)}</td><td><strong>{action.actor.name}</strong><span>{action.actor.email}</span></td><td><strong>{actionLabels[action.action] || action.action}</strong><span className="admin-record-id">ID: {action.targetId}</span></td><td className="admin-reason-cell">{action.reason}</td></tr>)}</tbody>
  </table></div> : <Empty>As ações dos administradores serão registradas aqui.</Empty>}<Pagination total={total} filters={filters} /></>;
}
