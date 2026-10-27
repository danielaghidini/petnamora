"use client";
import { useState, type FormEvent } from "react";
import { Camera, Heart, LoaderCircle } from "lucide-react";
import { api } from "@/lib/client";
import type { DogProfile, Viewer } from "./types";

export function AuthForm({
  onSuccess,
}: {
  onSuccess: (user: Viewer, registered: boolean) => void;
}) {
  const [register, setRegister] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const { user } = await api<{ user: Viewer }>("/api/auth", {
        method: "POST",
        body: JSON.stringify({
          action: register ? "register" : "login",
          ...(register ? { name: data.get("name") } : {}),
          email: data.get("email"),
          password: data.get("password"),
        }),
      });
      onSuccess(user, register);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack-form">
      <div className="auth-emblem">
        <Heart size={28} fill="currentColor" />
      </div>
      <p className="form-intro">
        Um cadastro rapidinho pro seu cachorro encontrar um crush.
      </p>
      <div className="segmented">
        <button
          type="button"
          className={register ? "selected" : ""}
          onClick={() => {
            setRegister(true);
            setError("");
          }}
        >
          Criar conta
        </button>
        <button
          type="button"
          className={!register ? "selected" : ""}
          onClick={() => {
            setRegister(false);
            setError("");
          }}
        >
          Já tenho conta
        </button>
      </div>
      {register && (
        <label>
          Seu nome
          <input
            name="name"
            placeholder="Como podemos te chamar?"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
          />
        </label>
      )}
      <label>
        E-mail
        <input
          type="email"
          name="email"
          placeholder="voce@email.com"
          autoComplete="email"
          required
          maxLength={254}
        />
      </label>
      <label>
        Senha
        <input
          type="password"
          name="password"
          placeholder="Pelo menos 8 caracteres"
          autoComplete={register ? "new-password" : "current-password"}
          minLength={8}
          maxLength={72}
          required
        />
      </label>
      {register && (
        <label className="check-label">
          <input type="checkbox" required /> Sou maior de 18 anos e responsável
          pelas informações do perfil.
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} /> : null}
        {register ? "Criar minha conta" : "Entrar"}
      </button>
      <p className="form-note">
        Seus dados de contato não aparecem nos perfis públicos.
      </p>
    </form>
  );
}

export function DogForm({
  dog,
  onSaved,
}: {
  dog?: DogProfile;
  onSaved: (dog: DogProfile) => void;
}) {
  const [photo, setPhoto] = useState(dog?.photoUrl || "");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Use uma foto de até 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    const form = new FormData();
    form.set("image", file);
    try {
      const { url } = await api<{ url: string }>("/api/upload", {
        method: "POST",
        body: form,
      });
      setPhoto(url);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!photo) {
      setError("Adicione uma foto do seu cachorro.");
      return;
    }
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      ...(dog ? { id: dog.id } : {}),
      name: data.get("name"),
      breed: data.get("breed"),
      sex: data.get("sex"),
      ageMonths: Number(data.get("ageMonths")),
      size: data.get("size"),
      city: data.get("city"),
      state: data.get("state"),
      bio: data.get("bio"),
      photoUrl: photo,
      pedigree: data.has("pedigree"),
      vaccinated: data.has("vaccinated"),
      healthTests: data.has("healthTests"),
      neutered: data.has("neutered"),
    };
    try {
      const result = await api<{ dog: DogProfile }>("/api/dogs", {
        method: dog ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      onSaved(result.dog);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const states = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];
  return (
    <form className="stack-form" onSubmit={submit}>
      <label className="photo-upload">
        {photo ? (
          <img src={photo} alt="Foto do seu cachorro" />
        ) : (
          <Camera size={28} />
        )}
        <span>
          {uploading
            ? "A foto fofa está chegando…"
            : "Escolher uma foto bem fofa"}
          <small>JPG, PNG ou WebP · até 5 MB</small>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(event) => void upload(event.target.files?.[0])}
          className="sr-only"
        />
      </label>
      <div className="form-grid">
        <label>
          Nome
          <input
            name="name"
            defaultValue={dog?.name}
            required
            minLength={2}
            maxLength={50}
            placeholder="Ex.: Amora"
          />
        </label>
        <label>
          Raça
          <input
            name="breed"
            defaultValue={dog?.breed}
            required
            minLength={2}
            maxLength={60}
            placeholder="Ex.: Golden Retriever"
          />
        </label>
        <label>
          Sexo
          <select name="sex" defaultValue={dog?.sex || "FEMALE"}>
            <option value="FEMALE">Fêmea</option>
            <option value="MALE">Macho</option>
          </select>
        </label>
        <label>
          Idade em meses
          <input
            type="number"
            name="ageMonths"
            defaultValue={dog?.ageMonths || 24}
            min={1}
            max={240}
            required
          />
        </label>
        <label>
          Porte
          <select name="size" defaultValue={dog?.size || "Médio"}>
            <option>Pequeno</option>
            <option>Médio</option>
            <option>Grande</option>
          </select>
        </label>
        <label>
          Estado
          <select name="state" defaultValue={dog?.state || "SP"}>
            {states.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Cidade
        <input
          name="city"
          defaultValue={dog?.city}
          required
          minLength={2}
          maxLength={80}
          placeholder="Ex.: Campinas"
        />
      </label>
      <label>
        O jeitinho do seu cachorro
        <textarea
          name="bio"
          defaultValue={dog?.bio}
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          placeholder="Adora brincar, passear ou um cafuné? Conte o jeitinho dele e o namorinho que procura."
        />
      </label>
      <div className="health-fields">
        <label className="check-label">
          <input
            type="checkbox"
            name="pedigree"
            defaultChecked={dog?.pedigree}
          />{" "}
          Tem pedigree
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="vaccinated"
            defaultChecked={dog?.vaccinated}
          />{" "}
          Vacinas em dia
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="healthTests"
            defaultChecked={dog?.healthTests}
          />{" "}
          Exames de saúde realizados
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            name="neutered"
            defaultChecked={dog?.neutered}
          />{" "}
          É castrado (fica fora da busca por namorinho)
        </label>
      </div>
      <p className="form-note">
        Conte tudo com carinho e sinceridade. As informações e os documentos não
        são verificados pelo Pet Namora. A aptidão para o cruzamento deve ser
        avaliada por um veterinário.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="primary-button" disabled={busy || uploading}>
        {busy
          ? "Salvando…"
          : dog
            ? "Salvar alterações"
            : "Criar perfil do meu cachorro"}
      </button>
    </form>
  );
}
