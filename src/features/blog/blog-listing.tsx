"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock3, Search } from "lucide-react";
import type { BlogPostSummary } from "./posts";

const categories = ["Todos", "Curiosidades", "Dicas", "Convivência"] as const;

export function BlogListing({ posts }: { posts: BlogPostSummary[] }) {
  const [category, setCategory] = useState<string>("Todos");
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  const filtered = posts.filter(post =>
    (category === "Todos" || post.category === category) &&
    normalize(`${post.title} ${post.excerpt} ${post.category}`).includes(normalize(query.trim())));

  return (
    <section className="blog-library" aria-labelledby="blog-library-heading">
      <div className="blog-library-heading">
        <h2 id="blog-library-heading">Mais histórias para vocês</h2>
        <label className="blog-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Buscar matérias</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="O que você quer descobrir?" />
        </label>
      </div>
      <div className="blog-filters" role="group" aria-label="Filtrar matérias por assunto">
        {categories.map(item => (
          <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>
      <p className="sr-only" role="status">{filtered.length} {filtered.length === 1 ? "matéria encontrada" : "matérias encontradas"}</p>
      {filtered.length > 0 ? (
        <div className="blog-grid">
          {filtered.map(post => (
            <article className="blog-card" key={post.slug}>
              <Link href={`/blog/${post.slug}`} className="blog-card-link">
                <div className="blog-card-image"><Image src={post.image} alt={post.imageAlt} width={768} height={512} sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 380px" /></div>
                <div className="blog-card-content">
                  <div className="blog-card-meta"><span className="blog-category">{post.category}</span><span><Clock3 size={14} aria-hidden="true" /> {post.readingMinutes} min de leitura</span></div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className="blog-read-link">Ler matéria <ArrowRight size={17} aria-hidden="true" /></span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="blog-empty">
          <h3>Nenhuma matéria encontrada.</h3>
          <p>Tente outra palavra ou explore todos os assuntos.</p>
          <button type="button" className="secondary-button" onClick={() => { setCategory("Todos"); setQuery(""); }}>Ver todas as matérias</button>
        </div>
      )}
    </section>
  );
}
