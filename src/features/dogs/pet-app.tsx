"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  Flag,
  Heart,
  LayoutGrid,
  ListFilter,
  LogOut,
  MapPin,
  MessageCircle,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { AuthForm, DogForm } from "./forms";
import { DogCard } from "./dog-card";
import { Chat } from "./chat";
import {
  ageLabel,
  type DogProfile,
  type MatchProfile,
  type Viewer,
} from "./types";

type Tab = "discover" | "likes" | "matches" | "dogs";
type Filters = {
  breed: string;
  city: string;
  sex: string;
  size: string;
  pedigree: boolean;
};
const emptyFilters: Filters = {
  breed: "",
  city: "",
  sex: "",
  size: "",
  pedigree: false,
};
const navigation = [
  { id: "discover", label: "Descobrir", icon: Compass },
  { id: "likes", label: "Minhas curtidas", icon: Heart },
  { id: "matches", label: "Namorinhos e papos", icon: MessageCircle },
  { id: "dogs", label: "Meus cachorros", icon: PawPrint },
] as const;

export function PetApp({
  initialDogs,
  initialUser,
  initialMyDogs,
  initialLikedDogs,
}: {
  initialDogs: DogProfile[];
  initialUser: Viewer | null;
  initialMyDogs: DogProfile[];
  initialLikedDogs: DogProfile[];
}) {
  const [user, setUser] = useState(initialUser);
  const [dogs, setDogs] = useState(initialDogs);
  const [myDogs, setMyDogs] = useState(initialMyDogs);
  const [activeDogId, setActiveDogId] = useState(initialMyDogs[0]?.id || "");
  const [tab, setTab] = useState<Tab>("discover");
  const [likedDogs, setLikedDogs] = useState<DogProfile[]>(initialLikedDogs);
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [dogFormOpen, setDogFormOpen] = useState(false);
  const [editingDog, setEditingDog] = useState<DogProfile>();
  const [detail, setDetail] = useState<DogProfile | null>(null);
  const [chatMatch, setChatMatch] = useState<MatchProfile | null>(null);
  const [reportDog, setReportDog] = useState<DogProfile | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [likingId, setLikingId] = useState("");

  async function loadDiscover(nextFilters = filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters))
      if (value) params.set(key, String(value));
    const result = await api<{ dogs: DogProfile[] }>(`/api/dogs?${params}`);
    setDogs(result.dogs);
  }
  async function navigate(next: Tab) {
    if (next !== "discover" && !user) {
      setAuthOpen(true);
      return;
    }
    setTab(next);
    setError("");
    setBusy(true);
    try {
      if (next === "discover") await loadDiscover();
      if (next === "likes")
        setLikedDogs(
          (
            await api<{ dogs: DogProfile[] }>(
              `/api/likes${activeDogId ? `?fromId=${encodeURIComponent(activeDogId)}` : ""}`,
            )
          ).dogs,
        );
      if (next === "matches")
        setMatches(
          (await api<{ matches: MatchProfile[] }>("/api/matches")).matches,
        );
      if (next === "dogs")
        setMyDogs(
          (await api<{ dogs: DogProfile[] }>("/api/dogs?mine=true")).dogs,
        );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function addDog() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setEditingDog(undefined);
    setDogFormOpen(true);
  }
  async function authenticated(viewer: Viewer, registered: boolean) {
    setUser(viewer);
    setAuthOpen(false);
    setError("");
    setNotice(
      registered
        ? "Oba, você chegou! Agora falta apresentar seu cachorro."
        : `Que bom te ver, ${viewer.name.split(" ")[0]}!`,
    );
    try {
      const [mine, available] = await Promise.all([
        api<{ dogs: DogProfile[] }>("/api/dogs?mine=true"),
        api<{ dogs: DogProfile[] }>("/api/dogs"),
      ]);
      const firstDogId = mine.dogs[0]?.id || "";
      const liked = firstDogId
        ? await api<{ dogs: DogProfile[] }>(
            `/api/likes?fromId=${encodeURIComponent(firstDogId)}`,
          )
        : { dogs: [] };
      setMyDogs(mine.dogs);
      setActiveDogId(firstDogId);
      setLikedDogs(liked.dogs);
      setDogs(available.dogs);
      if (!mine.dogs.length) {
        setEditingDog(undefined);
        setDogFormOpen(true);
      }
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function saved(dog: DogProfile) {
    setMyDogs((previous) =>
      previous.some((item) => item.id === dog.id)
        ? previous.map((item) => (item.id === dog.id ? dog : item))
        : [...previous, dog],
    );
    setActiveDogId(dog.id);
    setDogFormOpen(false);
    setNotice(`Prontinho! O perfil de ${dog.name} ficou um charme.`);
    try {
      await Promise.all([loadDiscover(), selectDog(dog.id)]);
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function selectDog(dogId: string) {
    setActiveDogId(dogId);
    setLikedDogs([]);
    setBusy(true);
    try {
      setLikedDogs(
        (
          await api<{ dogs: DogProfile[] }>(
            `/api/likes?fromId=${encodeURIComponent(dogId)}`,
          )
        ).dogs,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function like(dog: DogProfile) {
    setDetail(null);
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (!myDogs.length) {
      addDog();
      return;
    }
    setError("");
    setLikingId(dog.id);
    try {
      const result = await api<{ matched: boolean }>("/api/likes", {
        method: "POST",
        body: JSON.stringify({
          fromId: activeDogId || myDogs[0].id,
          toId: dog.id,
        }),
      });
      setLikedDogs((previous) => [
        ...previous.filter((item) => item.id !== dog.id),
        dog,
      ]);
      setNotice(
        result.matched
          ? `Deu namorinho com ${dog.name}! Passe em Namorinhos e papos pra dar um oi.`
          : `Coraçãozinho enviado para ${dog.name}! Se vier outro de volta, vocês já podem bater um papo.`,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLikingId("");
    }
  }
  async function filter(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loadDiscover();
      setFiltersOpen(false);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function clearFilters() {
    setFilters(emptyFilters);
    setBusy(true);
    setError("");
    try {
      await loadDiscover(emptyFilters);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/api/auth", { method: "DELETE" });
      window.location.assign("/");
    } catch (error) {
      setError((error as Error).message);
    }
  }
  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportDog) return;
    const reason = new FormData(event.currentTarget).get("reason");
    setBusy(true);
    try {
      await api("/api/reports", {
        method: "POST",
        body: JSON.stringify({ dogId: reportDog.id, reason }),
      });
      setDogs((previous) => previous.filter((dog) => dog.id !== reportDog.id));
      setReportDog(null);
      setDetail(null);
      setNotice(
        "Denúncia registrada. Esse perfil foi ocultado para você e a conversa foi bloqueada.",
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const shownDogs = tab === "likes" ? likedDogs : dogs;
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Pet Namora, início">
          <img
            src="/brand/petnamora-logo-02.png"
            alt="Pet Namora"
            width={2172}
            height={724}
          />
        </Link>
        <div className="workspace-label">ONDE COMEÇA O NAMORINHO</div>
        <nav className="side-nav" aria-label="Menu principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={cn("nav-item", tab === item.id && "active")}
              onClick={() => void navigate(item.id)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.id === "discover" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-guide">
          <div className="guide-icon">
            <ShieldCheck size={23} />
          </div>
          <h3>Carinho em cada patinha.</h3>
          <p>Cachorro feliz vem primeiro. Sempre.</p>
          <button onClick={() => setGuideOpen(true)}>
            Cuidados com o namorinho <ArrowRight size={14} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <span className="avatar">
              {user ? user.name[0].toUpperCase() : <PawPrint size={21} />}
            </span>
            <button
              onClick={() => (user ? void navigate("dogs") : setAuthOpen(true))}
            >
              <strong>{user?.name || "Oi, que bom te ver!"}</strong>
              <small>{user ? "Minha conta" : "Entre ou crie sua conta"}</small>
            </button>
            {user && (
              <button
                className="icon-button"
                onClick={() => void logout()}
                aria-label="Sair"
              >
                <LogOut size={17} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Seu próximo namorinho</span>
            <span>/</span>
            <strong>{navigation.find((item) => item.id === tab)?.label}</strong>
          </div>
          <div className="topbar-right">
            <ThemeSelector />
            <button className="primary-button topbar-cta" onClick={addDog}>
              <Plus size={17} /> Cadastrar meu cachorro
            </button>
          </div>
        </header>
        <main className="main-content">
          {tab === "matches" && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span /> TEM CORAÇÃO BATENDO POR AQUI
                </div>
                <h1>Deu namorinho!</h1>
                <p>
                  Os cachorros trocaram corações. Agora os humanos podem bater um papo!
                </p>
              </div>
              <span className="heading-doodle">
                <PawPrint size={33} />
                <Heart size={15} fill="currentColor" />
              </span>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Heart size={18} />
              <span>{notice}</span>
              <button
                className="icon-button"
                onClick={() => setNotice("")}
                aria-label="Dispensar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Fechar erro"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {tab === "discover" && (
            <>
              <section className="hero-banner">
                <div className="hero-copy">
                  <h2>
                    Um namorinho de quatro patas.
                    <br />
                    <span>Muito amor pra dar e receber.</span>
                  </h2>
                  <p>
                    Encontre um crush pro seu cachorro e combine o primeiro
                    encontro.
                  </p>
                  <button onClick={addDog}>
                    Apresentar meu cachorro <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art">
                  <img
                    src="/brand/petnamora-banner-03.png"
                    alt="Pet Namora: dois cachorros juntos em um coração rosa"
                  />
                </div>
                <PawPrint className="hero-paw" size={120} />
              </section>
              <form className="search-panel" onSubmit={filter}>
                <label className="search-field">
                  <span>Qual raça você procura?</span>
                  <span className="search-input">
                    <Search size={18} aria-hidden="true" />
                    <input
                      value={filters.breed}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          breed: event.target.value,
                        }))
                      }
                      placeholder="Digite a raça"
                      maxLength={60}
                    />
                  </span>
                </label>
                <label className="search-field location-field">
                  <span>Onde mora o crush?</span>
                  <span className="search-input">
                    <MapPin size={18} aria-hidden="true" />
                    <input
                      value={filters.city}
                      onChange={(event) =>
                        setFilters((previous) => ({
                          ...previous,
                          city: event.target.value,
                        }))
                      }
                      placeholder="Digite a cidade"
                      maxLength={80}
                    />
                  </span>
                </label>
                <button
                  type="button"
                  className={cn("filter-button", filtersOpen && "selected")}
                  onClick={() => setFiltersOpen((value) => !value)}
                  aria-expanded={filtersOpen}
                >
                  <ListFilter size={17} /> Filtros{" "}
                  {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                </button>
                <button
                  className="primary-button search-submit"
                  disabled={busy}
                >
                  <Search size={17} /> Achar um namorinho
                </button>
                {filtersOpen && (
                  <div className="expanded-filters">
                    <label>
                      Sexo
                      <select
                        value={filters.sex}
                        onChange={(event) =>
                          setFilters((previous) => ({
                            ...previous,
                            sex: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos</option>
                        <option value="FEMALE">Fêmea</option>
                        <option value="MALE">Macho</option>
                      </select>
                    </label>
                    <label>
                      Porte
                      <select
                        value={filters.size}
                        onChange={(event) =>
                          setFilters((previous) => ({
                            ...previous,
                            size: event.target.value,
                          }))
                        }
                      >
                        <option value="">Todos os portes</option>
                        <option>Pequeno</option>
                        <option>Médio</option>
                        <option>Grande</option>
                      </select>
                    </label>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={filters.pedigree}
                        onChange={(event) =>
                          setFilters((previous) => ({
                            ...previous,
                            pedigree: event.target.checked,
                          }))
                        }
                      />{" "}
                      Com pedigree informado
                    </label>
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => void clearFilters()}
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
          {(tab === "discover" || tab === "likes") && (
            <section>
              <div className="section-heading">
                <div>
                  <h2>
                    {tab === "discover"
                      ? "Um crush esperando por vocês"
                      : "Minhas curtidas"}{" "}
                    <span>{shownDogs.length}</span>
                  </h2>
                  {tab === "discover" && (
                    <p>
                      Dê uma espiadinha e mande um coração pra quem combinar com
                      seu cachorro.
                    </p>
                  )}
                </div>
                <div className="view-label">
                  <LayoutGrid size={16} /> Perfis
                  {activeFilterCount > 0 && (
                    <button
                      className="text-button"
                      onClick={() => void clearFilters()}
                    >
                      Limpar busca
                    </button>
                  )}
                </div>
              </div>
              {user && myDogs.length > 1 && (
                <label className="active-dog-picker">
                  Mandar um coração em nome de:
                  <select
                    value={activeDogId}
                    disabled={busy || !!likingId}
                    onChange={(event) => void selectDog(event.target.value)}
                  >
                    {myDogs.map((dog) => (
                      <option key={dog.id} value={dog.id}>
                        {dog.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {busy ? (
                <div className="empty-state">
                  <div className="loading-paw">♡</div>
                  <p>Procurando um crush de quatro patas…</p>
                </div>
              ) : shownDogs.length ? (
                <div className="dog-grid">
                  {shownDogs.map((dog) => (
                    <DogCard
                      key={dog.id}
                      dog={dog}
                      liked={likedDogs.some((item) => item.id === dog.id)}
                      busy={likingId === dog.id}
                      onLike={() => void like(dog)}
                      onOpen={() => setDetail(dog)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <PawPrint size={40} />
                  <h3>
                    {tab === "likes"
                      ? "Nenhum coraçãozinho por aqui… ainda!"
                      : activeFilterCount > 0
                        ? "Nenhum cachorro encontrado"
                        : "Os primeiros namorinhos começam aqui"}
                  </h3>
                  <p>
                    {tab === "likes"
                      ? "Conheça os cachorros e mande o primeiro coração."
                      : activeFilterCount > 0
                        ? "Tente outra raça ou cidade para ampliar a busca."
                        : "Ainda não há outros cachorros disponíveis. Cadastre o seu e volte para conhecer quem chegar."}
                  </p>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      tab === "likes"
                        ? void navigate("discover")
                        : activeFilterCount > 0
                          ? void clearFilters()
                          : addDog()
                    }
                  >
                    {tab === "likes"
                      ? "Conhecer os cachorros"
                      : activeFilterCount > 0
                        ? "Ver todos os cachorros"
                        : "Cadastrar meu cachorro"}
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "dogs" && (
            <section>
              <div className="section-heading">
                <h1>
                  Meus cachorros <span>{myDogs.length}</span>
                </h1>
                <button className="secondary-button" onClick={addDog}>
                  <Plus size={16} /> Adicionar cachorro
                </button>
              </div>
              {myDogs.length ? (
                <div className="dog-grid">
                  {myDogs.map((dog) => (
                    <div key={dog.id} className="own-dog">
                      <DogCard
                        dog={dog}
                        liked={false}
                        onLike={() => {
                          setEditingDog(dog);
                          setDogFormOpen(true);
                        }}
                        onOpen={() => {
                          setEditingDog(dog);
                          setDogFormOpen(true);
                        }}
                      />
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setEditingDog(dog);
                          setDogFormOpen(true);
                        }}
                      >
                        Editar perfil de {dog.name}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <PawPrint size={40} />
                  <h3>Vamos apresentar seu xodó?</h3>
                  <p>
                    Escolha uma foto bem fofa e conte um pouquinho sobre seu
                    cachorro.
                  </p>
                  <button className="primary-button" onClick={addDog}>
                    Cadastrar meu primeiro cachorro
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "matches" && (
            <section>
              {busy ? (
                <div className="empty-state">
                  <p>Buscando seus namorinhos…</p>
                </div>
              ) : matches.length ? (
                <div className="match-list">
                  {matches.map((match) => {
                    const other =
                      match.dogA.ownerId === user?.id ? match.dogB : match.dogA;
                    const mine =
                      match.dogA.ownerId === user?.id ? match.dogA : match.dogB;
                    return (
                      <button
                        key={match.id}
                        className="match-item"
                        onClick={() => setChatMatch(match)}
                      >
                        <img src={other.photoUrl} alt={other.name} />
                        <div>
                          <strong>
                            {mine.name} <Heart size={13} fill="currentColor" />{" "}
                            {other.name}
                          </strong>
                          <p>
                            {match.messages[0]?.text ||
                              "Deu namorinho! Que tal mandar o primeiro oi?"}
                          </p>
                        </div>
                        <MessageCircle size={21} />
                        <ArrowRight size={18} />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Heart size={42} />
                  <h3>O namorinho começa com dois corações.</h3>
                  <p>
                    Quando alguém também curtir seu cachorro, o papo de vocês
                    aparece aqui.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void navigate("discover")}
                  >
                    Achar um namorinho
                  </button>
                </div>
              )}
            </section>
          )}
          <section className="care-strip">
            <div className="care-icon">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3>Carinho também é cuidado.</h3>
              <p>
                Antes do namorinho, conheça a outra família, confira os
                documentos e converse com o veterinário sobre o cruzamento.
              </p>
            </div>
            <button
              onClick={() => setGuideOpen(true)}
              aria-label="Ver os cuidados com o namorinho"
            >
              <ArrowRight size={19} />
            </button>
          </section>
          <footer className="footer">
            <span>
              petnamora <Heart size={11} fill="currentColor" /> Aqui tem carinho
              de sobra.
            </span>
            <button onClick={() => setGuideOpen(true)}>
              Cuidados e privacidade <ArrowRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => void navigate(item.id)}
          >
            <item.icon size={21} />
            <span>
              {item.id === "matches"
                ? "Papos"
                : item.id === "likes"
                  ? "Curtidas"
                  : item.id === "dogs"
                    ? "Cachorros"
                    : item.label}
            </span>
          </button>
        ))}
      </nav>

      <Modal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        title="Oi, que bom ter você aqui!"
        description="Seu cachorro merece um namorinho. Vamos começar?"
      >
        <AuthForm
          onSuccess={(viewer, registered) =>
            void authenticated(viewer, registered)
          }
        />
      </Modal>
      <Modal
        open={dogFormOpen}
        onClose={() => setDogFormOpen(false)}
        title={
          editingDog
            ? `O perfil de ${editingDog.name}`
            : "Quem é esse amor de quatro patas?"
        }
        description="Uma foto fofa e o jeitinho dele ajudam o crush a chegar."
        wide
      >
        <DogForm
          key={editingDog?.id || "new"}
          dog={editingDog}
          onSaved={(dog) => void saved(dog)}
        />
      </Modal>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Conheça ${detail.name}` : "Perfil"}
        wide
      >
        {detail && (
          <div className="dog-detail">
            <img
              className="detail-photo"
              src={detail.photoUrl}
              alt={detail.name}
            />
            <div className="detail-info">
              <span className="detail-breed">{detail.breed}</span>
              <h2>
                {detail.name} <span>{detail.sex === "MALE" ? "♂" : "♀"}</span>
              </h2>
              <p className="dog-location">
                <MapPin size={14} />
                {detail.city}, {detail.state}
              </p>
              <div className="detail-facts">
                <span>{ageLabel(detail.ageMonths)}</span>
                <span>Porte {detail.size.toLowerCase()}</span>
                <span>{detail.sex === "MALE" ? "Macho" : "Fêmea"}</span>
              </div>
              <p className="detail-bio">{detail.bio}</p>
              <h4>O que a família contou</h4>
              <div className="detail-checks">
                {[
                  ["Pedigree", detail.pedigree],
                  ["Vacinas em dia", detail.vaccinated],
                  ["Exames realizados", detail.healthTests],
                ].map(([label, value]) => (
                  <p key={String(label)}>
                    <BadgeCheck size={16} />
                    {label}: {value ? "informado" : "não informado"}
                  </p>
                ))}
              </div>
              <p className="form-note">
                Informações contadas pela família, sem verificação dos
                documentos pelo Pet Namora.
              </p>
              <button
                className="primary-button"
                disabled={
                  likingId === detail.id ||
                  likedDogs.some((item) => item.id === detail.id)
                }
                onClick={() => void like(detail)}
              >
                <Heart size={17} />
                {likedDogs.some((item) => item.id === detail.id)
                  ? "Coraçãozinho enviado"
                  : "Mandar um coração"}
              </button>
              <button
                className="report-link"
                onClick={() => {
                  if (!user) {
                    setDetail(null);
                    setAuthOpen(true);
                  } else {
                    setReportDog(detail);
                    setDetail(null);
                  }
                }}
              >
                <Flag size={13} /> Denunciar e ocultar perfil
              </button>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={!!chatMatch}
        onClose={() => setChatMatch(null)}
        title={
          chatMatch
            ? `${chatMatch.dogA.name} e ${chatMatch.dogB.name}`
            : "Conversa"
        }
        description="O namorinho começou. Agora é só dar um oi!"
        wide
      >
        {chatMatch && user && (
          <Chat key={chatMatch.id} match={chatMatch} userId={user.id} />
        )}
      </Modal>
      <Modal
        open={!!reportDog}
        onClose={() => setReportDog(null)}
        title="Denunciar e ocultar perfil"
        description="O perfil será ocultado para você e a conversa será bloqueada."
      >
        <form className="stack-form" onSubmit={(event) => void report(event)}>
          <label>
            O que aconteceu?
            <textarea
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              rows={4}
              placeholder="Conte o motivo da denúncia."
            />
          </label>
          <p className="form-note">
            A denúncia fica registrada para análise. Esta primeira versão ainda
            não possui uma equipe de moderação integrada.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            Registrar denúncia
          </button>
        </form>
      </Modal>
      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Todo namorinho merece cuidado"
        description="Cachorro feliz vem sempre em primeiro lugar."
        wide
      >
        <div className="guide-content">
          <ShieldCheck size={40} />
          <h3>Antes do namorinho</h3>
          <p>
            Antes de planejar o cruzamento, converse com um veterinário sobre
            idade, saúde e aptidão dos dois cachorros. A gente aproxima as
            famílias; a avaliação veterinária fica com o profissional.
          </p>
          <h3>Conheça a família do crush</h3>
          <p>
            Peça pra família mostrar o pedigree e os exames. As informações do
            perfil são contadas por ela e ainda não foram verificadas pelo Pet
            Namora.
          </p>
          <h3>Seus dados e suas conversas</h3>
          <p>
            O nome do cachorro, a foto, a descrição e a cidade aparecem no
            perfil público. Seu e-mail e sua senha ficam de fora. Só os
            responsáveis pelo namorinho podem abrir a conversa. Guarde endereço
            e documentos pessoais fora do perfil público.
          </p>
          <h3>Nossa primeira versão</h3>
          <p>
            Estamos dando as primeiras patinhas por aqui. Ainda não temos
            verificação de documentos, recuperação de senha, cobrança ou equipe
            de moderação.
          </p>
        </div>
      </Modal>
    </div>
  );
}
