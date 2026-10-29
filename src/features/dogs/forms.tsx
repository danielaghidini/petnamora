"use client";
import { useState, type FormEvent } from "react";
import { Camera, LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/client";
import { Select } from "@/components/ui/select";
import { BreedField } from "./breed-field";
import type { DogProfile, Viewer } from "./types";
import { dogPhotos, MAX_DOG_PHOTOS } from "./photos";

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
      <img
        className="auth-logo"
        src="/brand/petnamora-logo-02.png"
        alt="Pet Namora"
        width={2172}
        height={724}
      />
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
        <label className="check-label consent-option">
          <input type="checkbox" required />
          <span>
            <strong>Sou maior de 18 anos</strong>
            <small>Sou responsável pelas informações do perfil.</small>
          </span>
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
  const [photos, setPhotos] = useState(() => dog ? dogPhotos(dog) : []);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(files: File[]) {
    if (!files.length || uploading || busy) return;
    if (photos.length + files.length > MAX_DOG_PHOTOS) {
      setError(`Adicione até ${MAX_DOG_PHOTOS} fotos por cachorro.`);
      return;
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      setError("Use fotos JPG, PNG ou WebP de até 5 MB cada.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const form = new FormData();
        form.set("image", file);
        const { url } = await api<{ url: string }>("/api/upload", {
          method: "POST",
          body: form,
        });
        setPhotos((current) => [...current, url]);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || busy) return;
    setError("");
    if (!photos.length) {
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
      photoUrl: photos[0],
      photoUrls: photos,
      pedigree: data.has("pedigree"),
      vaccinated: data.has("vaccinated"),
      healthTests: data.has("healthTests"),
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
    <form className="stack-form dog-form" onSubmit={submit}>
      <label className="photo-upload">
        <Camera size={28} aria-hidden="true" />
        <span>
          {uploading
            ? "As fotos fofas estão chegando…"
            : `Adicionar fotos (${photos.length}/${MAX_DOG_PHOTOS})`}
          <small>Selecione várias fotos · JPG, PNG ou WebP · até 5 MB cada</small>
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || busy || photos.length >= MAX_DOG_PHOTOS}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void upload(files);
          }}
          className="sr-only"
        />
      </label>
      {photos.length > 0 && (
        <div className="dog-photo-editor" aria-label="Fotos do cachorro">
          {photos.map((url, index) => (
            <div className="dog-photo-item" key={url}>
              <img src={url} alt={`Foto ${index + 1} do seu cachorro`} />
              <button type="button" className="photo-remove" aria-label={`Remover foto ${index + 1}`}
                disabled={uploading || busy} onClick={() => setPhotos((current) => current.filter((photo) => photo !== url))}>
                <X size={16} aria-hidden="true" />
              </button>
              <button type="button" className="photo-cover" aria-pressed={index === 0}
                disabled={uploading || busy || index === 0}
                aria-label={index === 0 ? `Foto ${index + 1} é a principal` : `Usar foto ${index + 1} como principal`}
                onClick={() => setPhotos((current) => [url, ...current.filter((photo) => photo !== url)])}>
                {index === 0 ? "Principal" : "Usar como principal"}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="form-grid">
        <label>
          Nome
          <input
            name="name"
            defaultValue={dog?.name}
            required
            minLength={2}
            maxLength={50}
            placeholder="Nome do seu cachorro"
          />
        </label>
        <BreedField defaultValue={dog?.breed} />
        <label>
          Sexo
          <Select label="Sexo" name="sex" defaultValue={dog?.sex}
            placeholder="Selecione o sexo" required
            options={[{ value: "FEMALE", label: "Fêmea" }, { value: "MALE", label: "Macho" }]} />
        </label>
        <label>
          Idade em meses
          <input
            type="number"
            name="ageMonths"
            defaultValue={dog?.ageMonths ?? ""}
            placeholder="Idade do seu cachorro"
            min={1}
            max={240}
            required
          />
        </label>
        <label>
          Porte
          <Select label="Porte" name="size" defaultValue={dog?.size}
            placeholder="Selecione o porte" required
            options={["Pequeno", "Médio", "Grande"].map((size) => ({ value: size, label: size }))} />
        </label>
        <label>
          Estado
          <Select label="Estado" name="state" defaultValue={dog?.state}
            placeholder="Selecione o estado" required
            options={states.map((state) => ({ value: state, label: state }))} />
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
          placeholder="Cidade onde seu cachorro mora"
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
