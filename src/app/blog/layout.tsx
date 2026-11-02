import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Heart } from "lucide-react";
import { ThemeSelector } from "@/components/ui/theme-selector";
import styles from "./blog.module.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.blog}>
      <a className="blog-skip" href="#blog-content">Pular para o conteúdo</a>
      <header className="blog-header">
        <div className="blog-header-inner">
          <Link href="/" className="blog-brand" aria-label="Pet Namora, início"><Image src="/brand/petnamora-logo-02.png" alt="Pet Namora" width={2172} height={724} priority sizes="180px" /></Link>
          <nav aria-label="Navegação do blog"><Link href="/blog" className="blog-nav-current">Blog</Link><Link href="/" className="blog-app-link">Conhecer o Pet Namora <ArrowRight size={15} aria-hidden="true" /></Link></nav>
          <ThemeSelector />
        </div>
      </header>
      <main id="blog-content" tabIndex={-1}>{children}</main>
      <footer className="blog-footer"><div><Link href="/">petnamora <Heart size={13} aria-hidden="true" /></Link><span>Uma vida com cachorro tem muita história.</span></div><Link href="/blog">Explorar o blog <ArrowRight size={15} aria-hidden="true" /></Link></footer>
    </div>
  );
}
