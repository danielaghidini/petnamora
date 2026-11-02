import { ArrowRight, PawPrint, X } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./community-invite.module.css";

export function CommunityInvite({ dismissed, onDismiss, onRegister }: {
  dismissed: boolean;
  onDismiss: () => void;
  onRegister: () => void;
}) {
  return (
    <section className={cn("hero-banner", styles.banner, dismissed && styles.dismissed)}>
      <button type="button" className={styles.close} onClick={onDismiss} aria-label="Fechar convite da comunidade">
        <X size={20} aria-hidden="true" />
      </button>
      <div className={cn("hero-copy", styles.copy)}>
        <h1>
          Todo focinho merece um chamego!
          <br />
          <span>
            Nossa plataforma é nova, ainda não temos muitos amiguinhos.
            Cadastre o seu cachorro e ajude nossa comunidade a crescer! É rápido e gratuito!
          </span>
        </h1>
        <button type="button" onClick={onRegister}>
          Cadastrar meu cachorro <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
      <picture className="hero-art">
        <source media="(min-width: 901px)" srcSet="/brand/petnamora-banner-03.png" />
        <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="Pet Namora: dois cachorros juntos em um coração rosa" />
      </picture>
      <PawPrint className="hero-paw" size={120} aria-hidden="true" />
    </section>
  );
}
