"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardCheck,
  Compass,
  Flag,
  Heart,
  ListFilter,
  LogOut,
  MapPin,
  Mars,
  Menu,
  MessageCircle,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  Venus,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { ThemeSelector } from "@/components/ui/theme-selector";
import { api } from "@/lib/client";
import { cn } from "@/lib/utils";
import { AuthForm, DogForm } from "./forms";
import { DogCard } from "./dog-card";
import { PhotoGallery } from "./photo-gallery";
import { Chat } from "./chat";
import { BreedFilter } from "./breed-filter";
import { SwipeDiscover } from "./swipe-discover";
import { ActiveDogPicker } from "./active-dog-picker";
import type { LikeOutcome } from "./swipe";
import {
  ageLabel,
  type DiscoverPage,
  type DogProfile,
  type MatchProfile,
  type Viewer,
} from "./types";

type Tab = "discover" | "likes" | "matches" | "dogs";
type Filters = {
  breeds: string[];
  city: string;
  sex: string;
  size: string;
  pedigree: boolean;
};
const emptyFilters: Filters = {
  breeds: [],
  city: "",
  sex: "",
  size: "",
  pedigree: false,
};
const navigation = [
  { id: "discover", label: "Descobrir", icon: Compass },
  { id: "likes", label: "Minhas curtidas", icon: Heart },
  { id: "matches", label: "Minhas conversas", icon: MessageCircle },
  { id: "dogs", label: "Meus cachorros", icon: PawPrint },
] as const;

export function PetApp({
  initialDiscovery,
  initialUser,
  initialMyDogs,
  initialLikedDogs,
  initialAuthError = "",
  initialGoogleLogin = false,
  initialLogin = false,
}: {
  initialDiscovery: DiscoverPage;
  initialUser: Viewer | null;
  initialMyDogs: DogProfile[];
  initialLikedDogs: DogProfile[];
  initialAuthError?: string;
  initialGoogleLogin?: boolean;
  initialLogin?: boolean;
}) {
  const [user, setUser] = useState(initialUser);
  const [dogs, setDogs] = useState(initialDiscovery.dogs);
  const [nextCursor, setNextCursor] = useState(initialDiscovery.nextCursor);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(emptyFilters);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const discoverRequest = useRef(0);
  const moreInFlight = useRef(false);
  const [myDogs, setMyDogs] = useState(initialMyDogs);
  const [activeDogId, setActiveDogId] = useState(initialMyDogs[0]?.id || "");
  const [tab, setTab] = useState<Tab>("discover");
  const [crushOpen, setCrushOpen] = useState(false);
  const [likedDogs, setLikedDogs] = useState<DogProfile[]>(initialLikedDogs);
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(Boolean(initialAuthError) || initialLogin);
  const [authError, setAuthError] = useState(initialAuthError);
  const [dogFormOpen, setDogFormOpen] = useState(initialGoogleLogin && Boolean(initialUser) && !initialMyDogs.length);
  const [editingDog, setEditingDog] = useState<DogProfile>();
  const [detail, setDetail] = useState<DogProfile | null>(null);
  const [chatMatch, setChatMatch] = useState<MatchProfile | null>(null);
  const [reportDog, setReportDog] = useState<DogProfile | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [likingId, setLikingId] = useState("");
  const [messagingId, setMessagingId] = useState("");
  const conversationInFlight = useRef(false);
  const likeInFlight = useRef(false);
  const crushTrigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!initialAuthError && !initialGoogleLogin && !initialLogin) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    url.searchParams.delete("auth_error");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [initialAuthError, initialGoogleLogin, initialLogin]);

  function discoverParams(nextFilters: Filters) {
    const params = new URLSearchParams();
    const { breeds, ...otherFilters } = nextFilters;
    for (const breed of breeds) params.append("breeds", breed);
    for (const [key, value] of Object.entries(otherFilters))
      if (value) params.set(key, String(value));
    return params;
  }
  async function loadDiscover(nextFilters = appliedFilters) {
    const requestId = ++discoverRequest.current;
    moreInFlight.current = true;
    setLoadingMore(false);
    setLoadMoreError("");
    try {
      const result = await api<DiscoverPage>(`/api/dogs?${discoverParams(nextFilters)}`);
      if (requestId !== discoverRequest.current) return;
      setDogs(result.dogs);
      setNextCursor(result.nextCursor);
      setAppliedFilters(nextFilters);
    } finally {
      if (requestId === discoverRequest.current) moreInFlight.current = false;
    }
  }
  async function loadMore() {
    if (!nextCursor || busy || moreInFlight.current) return;
    const requestId = discoverRequest.current;
    moreInFlight.current = true;
    setLoadingMore(true);
    setLoadMoreError("");
    const params = discoverParams(appliedFilters);
    params.set("cursor", nextCursor);
    try {
      const result = await api<DiscoverPage>(`/api/dogs?${params}`);
      if (requestId !== discoverRequest.current) return;
      setDogs((previous) => {
        const ids = new Set(previous.map((dog) => dog.id));
        return [...previous, ...result.dogs.filter((dog) => !ids.has(dog.id))];
      });
      setNextCursor(result.nextCursor);
    } catch (error) {
      if (requestId === discoverRequest.current)
        setLoadMoreError((error as Error).message);
    } finally {
      if (requestId === discoverRequest.current) {
        moreInFlight.current = false;
        setLoadingMore(false);
      }
    }
  }
  async function navigate(next: Tab) {
    if (next !== "discover" && !user) {
      setAuthOpen(true);
      return;
    }
    setTab(next);
    setError("");
    setNotice("");
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
  async function authenticated(viewer: Viewer) {
    setUser(viewer);
    setAuthOpen(false);
    setAuthError("");
    setError("");
    try {
      const [mine] = await Promise.all([
        api<{ dogs: DogProfile[] }>("/api/dogs?mine=true"),
        loadDiscover(),
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
  function deleted(dog: DogProfile) {
    const remaining = myDogs.filter((item) => item.id !== dog.id);
    setMyDogs((previous) => previous.filter((item) => item.id !== dog.id));
    setMatches((previous) => previous.filter((match) => match.dogA.id !== dog.id && match.dogB.id !== dog.id));
    setChatMatch((previous) => previous && (previous.dogA.id === dog.id || previous.dogB.id === dog.id) ? null : previous);
    setDetail((previous) => previous?.id === dog.id ? null : previous);
    setEditingDog(undefined);
    setDogFormOpen(false);
    setError("");
    setNotice(`O perfil de ${dog.name} foi excluído. Sua conta continua ativa.`);
    if (activeDogId === dog.id || !remaining.some((item) => item.id === activeDogId)) {
      setActiveDogId(remaining[0]?.id || "");
      setLikedDogs([]);
      if (remaining.length) void selectDog(remaining[0].id);
    }
  }
  async function like(dog: DogProfile): Promise<LikeOutcome> {
    if (likeInFlight.current) return false;
    setDetail(null);
    if (!user) {
      setAuthOpen(true);
      return false;
    }
    if (!myDogs.length) {
      addDog();
      return false;
    }
    likeInFlight.current = true;
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
      return result.matched ? "matched" : "liked";
    } catch (error) {
      setError((error as Error).message);
      return false;
    } finally {
      setLikingId("");
      likeInFlight.current = false;
    }
  }
  async function message(dog: DogProfile) {
    if (conversationInFlight.current) return;
    setDetail(null);
    if (!user) { setAuthOpen(true); return; }
    if (!myDogs.length) { addDog(); return; }
    conversationInFlight.current = true;
    setMessagingId(dog.id);
    setError("");
    try {
      const { match } = await api<{ match: MatchProfile }>("/api/matches", {
        method: "POST",
        body: JSON.stringify({ fromId: activeDogId || myDogs[0].id, toId: dog.id }),
      });
      setChatMatch(match);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setMessagingId("");
      conversationInFlight.current = false;
    }
  }
  async function filter(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await loadDiscover(filters);
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
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const shownDogs = tab === "likes" ? likedDogs : dogs;
  const activeFilterCount = appliedFilters.breeds.length +
    [appliedFilters.city, appliedFilters.sex, appliedFilters.size, appliedFilters.pedigree].filter(Boolean).length;
  const activeDog = myDogs.find((dog) => dog.id === activeDogId) ?? myDogs[0];
  const activeDogPicker = user ? (
    <ActiveDogPicker
      dogs={myDogs}
      activeDog={activeDog}
      disabled={busy || !!likingId || !!messagingId}
      onSelect={(dogId) => void selectDog(dogId)}
      onAdd={addDog}
    />
  ) : null;
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
          {user?.isAdmin && (
            <Link href="/admin" className="nav-item">
              <ShieldCheck size={20} /> <span>Administração</span>
            </Link>
          )}
        </nav>
        {activeDogPicker}
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
                className="icon-button sidebar-logout"
                onClick={() => void logout()}
                aria-label="Sair"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <Link href="/" className="mobile-brand" aria-label="Pet Namora, início">
            <img src="/brand/petnamora-logo-02.png" alt="Pet Namora" width={2172} height={724} />
          </Link>
          <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
            <Dialog.Trigger asChild>
              <button type="button" className="icon-button mobile-menu-trigger" aria-label="Abrir menu">
                <Menu size={23} aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="modal-overlay mobile-menu-overlay" />
              <Dialog.Content className="mobile-menu-panel">
                <div className="mobile-menu-heading">
                  <Dialog.Title>Meu perfil</Dialog.Title>
                  <Dialog.Close className="icon-button" aria-label="Fechar menu">
                    <X size={21} aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <Dialog.Description className="sr-only">
                  Sua conta, navegação e preferências do Pet Namora.
                </Dialog.Description>
                <div className="mobile-menu-profile">
                  <span className="avatar" aria-hidden="true">
                    {user ? user.name[0].toUpperCase() : <PawPrint size={24} />}
                  </span>
                  <div>
                    <strong>{user?.name || "Oi, que bom te ver!"}</strong>
                    <span>{user?.email || "Entre para apresentar seu cachorro."}</span>
                  </div>
                </div>
                {!user && (
                  <button type="button" className="primary-button" onClick={() => {
                    setMenuOpen(false);
                    setAuthOpen(true);
                  }}>
                    Entrar ou criar conta
                  </button>
                )}
                <nav className="side-nav" aria-label="Menu principal móvel">
                  {navigation.map((item) => (
                    <button key={item.id} type="button"
                      className={cn("nav-item", tab === item.id && "active")}
                      aria-current={tab === item.id ? "page" : undefined}
                      onClick={() => {
                        setMenuOpen(false);
                        void navigate(item.id);
                      }}>
                      <item.icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                  {user?.isAdmin && (
                    <Link href="/admin" className="nav-item" onClick={() => setMenuOpen(false)}>
                      <ShieldCheck size={20} aria-hidden="true" /> Administração
                    </Link>
                  )}
                  <button type="button" className="nav-item" onClick={() => {
                    setMenuOpen(false);
                    setGuideOpen(true);
                  }}>
                    <ShieldCheck size={20} aria-hidden="true" /> Cuidados e segurança
                  </button>
                </nav>
                {activeDogPicker}
                <div className="mobile-menu-preferences">
                  <span>Aparência</span>
                  <ThemeSelector />
                </div>
                {user && (
                  <button type="button" className="nav-item mobile-menu-logout" onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}>
                    <LogOut size={20} aria-hidden="true" /> Sair da conta
                  </button>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="topbar-theme">
            <ThemeSelector />
          </div>
          <div className="topbar-right">
            {user?.isAdmin && (
              <Link href="/admin" className="icon-button" aria-label="Abrir administração">
                <ShieldCheck size={20} />
              </Link>
            )}
            <button ref={crushTrigger} type="button" className="primary-button crush-button" aria-label="Modo crush" aria-haspopup="dialog" aria-expanded={crushOpen} onClick={() => setCrushOpen(true)}>
              <Heart size={19} aria-hidden="true" /> <span>Modo crush</span>
            </button>
            <button className="primary-button topbar-cta" onClick={addDog} aria-label="Cadastrar meu cachorro">
              <PawPrint size={19} aria-hidden="true" />
              <span className="topbar-cta-label">Cadastrar meu cachorro</span>
            </button>
          </div>
        </header>
        <main className="main-content">
          {tab === "matches" && (
            <div className="page-heading">
              <div>
                <h1>Minhas conversas</h1>
                <p>
                  Suas conversas e as trocas de corações ficam todas por aqui.
                </p>
              </div>
              <span className="heading-doodle">
                <PawPrint size={33} />
                <Heart size={15} fill="currentColor" />
              </span>
            </div>
          )}
          {error && !crushOpen && (
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
                    Todo focinho merece um chamego.
                    <br />
                    <span>Cadastre seu peludinho e encontre o par perfeito!</span>
                  </h2>
                  <p>
                    Encontre um crush pro seu cachorro e combine o primeiro
                    encontro.
                  </p>
                  <button onClick={addDog}>
                    Cadastrar meu cachorro <ArrowRight size={16} />
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
                <BreedFilter
                  value={filters.breeds}
                  onChange={(breeds) => setFilters((previous) => ({ ...previous, breeds }))}
                />
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
                      <Select
                        label="Sexo"
                        value={filters.sex}
                        onValueChange={(sex) =>
                          setFilters((previous) => ({
                            ...previous,
                            sex,
                          }))
                        }
                        options={[
                          { value: "", label: "Todos" },
                          { value: "FEMALE", label: "Fêmea" },
                          { value: "MALE", label: "Macho" },
                        ]}
                      />
                    </label>
                    <label>
                      Porte
                      <Select
                        label="Porte"
                        value={filters.size}
                        onValueChange={(size) =>
                          setFilters((previous) => ({
                            ...previous,
                            size,
                          }))
                        }
                        options={[
                          { value: "", label: "Todos os portes" },
                          { value: "Pequeno", label: "Pequeno" },
                          { value: "Médio", label: "Médio" },
                          { value: "Grande", label: "Grande" },
                        ]}
                      />
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
                {activeFilterCount > 0 && (
                  <div className="view-label">
                    <button
                      className="text-button"
                      onClick={() => void clearFilters()}
                    >
                      Limpar busca
                    </button>
                  </div>
                )}
              </div>
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
                      onOpen={() => setDetail(dog)}
                      onMessage={() => void message(dog)}
                      messageBusy={messagingId === dog.id}
                      messageDisabled={!!messagingId}
                      onLike={() => void like(dog)}
                      liked={likedDogs.some((item) => item.id === dog.id)}
                      likeBusy={likingId === dog.id}
                      likeDisabled={!!likingId}
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
              {tab === "discover" && !busy && dogs.length > 0 && (
                <div className="discover-pagination">
                  {loadMoreError && <p className="form-error" role="alert">{loadMoreError}</p>}
                  {nextCursor ? (
                    <button
                      className="secondary-button"
                      disabled={loadingMore}
                      onClick={() => void loadMore()}
                    >
                      {loadingMore ? "Buscando mais cachorros…" : "Ver mais cachorros"}
                    </button>
                  ) : (
                    <p>Você já viu todos os cachorros desta busca.</p>
                  )}
                  <span className="sr-only" role="status">
                    {loadingMore
                      ? "Buscando mais cachorros…"
                      : `${dogs.length} ${dogs.length === 1 ? "cachorro exibido" : "cachorros exibidos"}.`}
                  </span>
                </div>
              )}
            </section>
          )}
          {tab === "dogs" && (
            <section>
              {notice && <p className="success-banner" role="status">{notice}</p>}
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
                  <p>Buscando seus papos…</p>
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
                            {mine.name} {match.isMatch ? <Heart size={13} fill="currentColor" /> : <MessageCircle size={13} />}{" "}
                            {other.name}
                          </strong>
                          <small className="conversation-kind">{match.isMatch ? "Namorinho" : "Conversa direta"}</small>
                          <p>
                            {match.messages[0]?.text ||
                              (match.isMatch ? "Deu namorinho! Que tal mandar o primeiro oi?" : "Mande um oi para começar esse papo.")}
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
                  <MessageCircle size={42} />
                  <h3>Ainda não tem papo por aqui.</h3>
                  <p>
                    Mande uma mensagem pela lista do Descobrir ou troque corações
                    no Modo crush. Seus papos aparecem aqui.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void navigate("discover")}
                  >
                    Explorar perfis
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

      <Modal
        open={crushOpen}
        onClose={() => {
          setCrushOpen(false);
          requestAnimationFrame(() => crushTrigger.current?.focus({ preventScroll: true }));
        }}
        title="Modo crush"
        description="Passe para a esquerda para ver o próximo perfil ou para a direita para curtir. Para fechar, pressione Escape ou toque fora do modal."
        hideHeading
        wide
      >
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button type="button" className="icon-button" onClick={() => setError("")} aria-label="Fechar erro">
              <X size={16} />
            </button>
          </div>
        )}
        <SwipeDiscover
          key={`${activeDogId}:${JSON.stringify(appliedFilters)}`}
          dogs={dogs}
          likedDogs={likedDogs}
          activeDog={activeDog}
          busy={busy}
          loadingMore={loadingMore}
          nextCursor={nextCursor}
          loadMoreError={loadMoreError}
          onLoadMore={loadMore}
          onLike={like}
          onManageDogs={() => {
            setCrushOpen(false);
            void navigate("dogs");
          }}
        />
      </Modal>
      <Modal
        open={authOpen}
        onClose={() => { setAuthOpen(false); setAuthError(""); }}
        title="Oi, que bom ter você aqui!"
        description="Seu cachorro merece um namorinho. Vamos começar?"
      >
        <AuthForm
          initialError={authError}
          initialRegister={!initialLogin}
          onSuccess={(viewer) =>
            void authenticated(viewer)
          }
        />
      </Modal>
      <Modal
        open={dogFormOpen}
        onClose={() => setDogFormOpen(false)}
        title={
          editingDog
            ? `O perfil de ${editingDog.name}`
            : "Cadastre seu pet"
        }
        description={editingDog
          ? "Fotos fofas e o jeitinho dele ajudam o crush a chegar."
          : "Você pode cadastrar mais de um pet na mesma conta. Crie um perfil para cada um."
        }
        wide
      >
        <DogForm
          key={editingDog?.id || "new"}
          dog={editingDog}
          onSaved={(dog) => void saved(dog)}
          onDeleted={deleted}
          onLater={() => setDogFormOpen(false)}
        />
      </Modal>
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Perfil de ${detail.name}` : "Perfil"}
        header={detail && (
          <div className="detail-heading">
            <span className="detail-breed">{detail.breed}</span>
            <p className="detail-name">
              {detail.name} <span>{detail.sex === "MALE" ? <Mars size={24} strokeWidth={3} aria-label="Macho" /> : <Venus size={24} strokeWidth={3} aria-label="Fêmea" />}</span>
            </p>
            <div className="detail-facts">
              <span>{ageLabel(detail.ageMonths)}</span>
              <span>Porte {detail.size.toLowerCase()}</span>
              <span>{detail.sex === "MALE" ? "Macho" : "Fêmea"}</span>
            </div>
            <p className="dog-location">
              <MapPin size={14} />
              {detail.city}, {detail.state}
            </p>
          </div>
        )}
        wide
      >
        {detail && (
          <div className="dog-detail">
            <PhotoGallery key={detail.id} dog={detail} />
            <div className="detail-info">
              <p className="detail-bio">{detail.bio}</p>
              <h4>O que a família contou</h4>
              {detail.vaccinated || detail.pedigree || detail.healthTests ? (
                <ul className="detail-checks" aria-label="Informações declaradas pela família">
                  {detail.vaccinated && <li className="detail-health-tag"><ShieldCheck size={15} aria-hidden="true" /> Vacinado</li>}
                  {detail.pedigree && <li><BadgeCheck size={15} aria-hidden="true" /> Pedigree</li>}
                  {detail.healthTests && <li className="detail-health-tag"><ClipboardCheck size={15} aria-hidden="true" /> Exames em dia</li>}
                </ul>
              ) : <p className="detail-checks-empty">A família ainda não informou esses cuidados.</p>}
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
              {tab === "discover" && !crushOpen && (
                <button type="button" className="secondary-button" disabled={!!messagingId}
                  onClick={() => void message(detail)}>
                  <MessageCircle size={17} /> Mandar mensagem
                </button>
              )}
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
        description={chatMatch?.isMatch ? "O namorinho começou. Agora é só dar um oi!" : "Dê um oi para a família e conheça melhor esse focinho."}
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
            participantes do papo podem abrir a conversa. Guarde endereço
            e documentos pessoais fora do perfil público.
          </p>
          <h3>Nossa primeira versão</h3>
          <p>
            Estamos dando as primeiras patinhas por aqui. Ainda não temos
            verificação de documentos, cobrança ou equipe
            de moderação.
          </p>
        </div>
      </Modal>
    </div>
  );
}
