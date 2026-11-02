import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3 } from "lucide-react";
import { BlogListing } from "@/features/blog/blog-listing";
import { blogPosts, postSummary, readingMinutes } from "@/features/blog/posts";

const title = "Blog Pet Namora | Dicas e curiosidades sobre cachorros";
const description = "Curiosidades, brincadeiras e dicas para viver bons momentos com seu cachorro. Descubra o blog do Pet Namora.";

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/blog" },
  robots: { index: true, follow: true },
  openGraph: { title, description, url: "/blog", type: "website", images: [{ url: "/blog/cabeca-inclinada.webp", width: 1200, height: 800, alt: "Cachorro com a cabeça inclinada" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/blog/cabeca-inclinada.webp"] },
};

export default function BlogPage() {
  const featured = blogPosts[0];
  const introStories = [
    { post: blogPosts.find(post => post.slug === "fotos-do-cachorro-com-celular")!, title: "Fotos que mostram o jeitinho do seu cachorro" },
    { post: blogPosts.find(post => post.slug === "brincadeiras-com-cachorro-em-dias-de-chuva")!, title: "Brincadeiras para uma tarde de chuva" },
  ];
  return (
    <div className="blog-container">
      <section className="blog-intro" aria-labelledby="blog-title">
        <div className="blog-intro-copy">
          <p className="blog-eyebrow">BLOG PET NAMORA</p>
          <h1 id="blog-title">A gente ama<br /><span>falar de cachorro.</span></h1>
          <p>Dicas, curiosidades e ideias pra curtir a vida com seu melhor amigo.</p>
        </div>
        <nav className="blog-intro-links" aria-label="Sugestões de leitura">
          <p>Para descobrir hoje</p>
          {introStories.map(({ post, title }) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <span>{title}</span><ArrowRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>
      <article className="blog-featured">
        <Link href={`/blog/${featured.slug}`} className="blog-featured-link">
          <div className="blog-featured-image"><Image src={featured.image} alt={featured.imageAlt} width={1200} height={800} priority sizes="(max-width: 740px) 100vw, 60vw" /><span className="blog-featured-label">A curiosidade da vez</span></div>
          <div className="blog-featured-copy"><div className="blog-card-meta"><span className="blog-category">{featured.category}</span><span><Clock3 size={14} aria-hidden="true" /> {readingMinutes(featured)} min de leitura</span></div><h2>{featured.title}</h2><p>{featured.excerpt}</p><span className="blog-read-link">Vem descobrir <ArrowRight size={19} aria-hidden="true" /></span></div>
        </Link>
      </article>
      <BlogListing posts={blogPosts.map(postSummary)} />
      <aside className="blog-community"><div><p className="blog-eyebrow">UM CORAÇÃOZINHO PODE SER O COMEÇO</p><h2>Seu cachorro também tem uma história.</h2><p>Apresente seu xodó e conheça outras famílias no Pet Namora.</p></div><Link className="primary-button" href="/">Conhecer a comunidade <ArrowRight size={17} aria-hidden="true" /></Link></aside>
    </div>
  );
}
