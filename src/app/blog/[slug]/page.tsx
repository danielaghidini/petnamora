import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { blogPosts, findPost, formatPostDate, readingMinutes } from "@/features/blog/posts";
import { siteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map(post => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const title = `${post.title} | Blog Pet Namora`;
  return {
    title, description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title, description: post.excerpt, type: "article", url: `/blog/${post.slug}`,
      publishedTime: `${post.publishedAt}T12:00:00-03:00`, authors: ["Pet Namora"],
      images: [{ url: post.image, width: 1200, height: 800, alt: post.imageAlt }],
    },
    twitter: { card: "summary_large_image", title, description: post.excerpt, images: [post.image] },
  };
}

export default async function BlogArticle({ params }: Props) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const related = blogPosts.filter(item => item.slug !== post.slug).slice(0, 3);
  const url = new URL(`/blog/${post.slug}`, siteUrl).href;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting", "@id": `${url}#article`, headline: post.title, description: post.excerpt,
        image: new URL(post.image, siteUrl).href,
        datePublished: `${post.publishedAt}T12:00:00-03:00`, dateModified: `${post.publishedAt}T12:00:00-03:00`,
        inLanguage: "pt-BR", mainEntityOfPage: url, articleSection: post.category,
        author: { "@type": "Organization", name: "Pet Namora", url: siteUrl.href },
        publisher: { "@type": "Organization", name: "Pet Namora", url: siteUrl.href, logo: { "@type": "ImageObject", url: new URL("/brand/petnamora-logo-02.png", siteUrl).href } },
      },
      {
        "@type": "BreadcrumbList", itemListElement: [
          { "@type": "ListItem", position: 1, name: "Pet Namora", item: siteUrl.href },
          { "@type": "ListItem", position: 2, name: "Blog", item: new URL("/blog", siteUrl).href },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
  return (
    <div className="blog-container">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <nav className="blog-breadcrumb" aria-label="Você está aqui"><Link href="/blog"><ArrowLeft size={16} aria-hidden="true" /> Todas as matérias</Link><span aria-hidden="true">/</span><span>{post.category}</span></nav>
      <article>
        <header className="blog-article-heading"><span className="blog-category">{post.category}</span><h1>{post.title}</h1><p>{post.excerpt}</p><div className="blog-byline"><span>Por Pet Namora</span><time dateTime={post.publishedAt}>{formatPostDate(post.publishedAt)}</time><span><Clock3 size={15} aria-hidden="true" /> {readingMinutes(post)} min de leitura</span></div></header>
        <figure className="blog-article-cover"><Image src={post.image} alt={post.imageAlt} width={1200} height={800} priority sizes="(max-width: 1200px) 100vw, 1100px" /><figcaption>Imagem ilustrativa criada com inteligência artificial.</figcaption></figure>
        <div className="blog-reading-layout">
          <aside className="blog-toc"><nav aria-label="Nesta matéria"><p>Nesta matéria</p><ol>{post.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol></nav></aside>
          <div className="blog-article-body"><p className="blog-article-lead">{post.intro}</p>
            {post.sections.map(section => <section key={section.id} id={section.id}><h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}{section.tips ? <ul>{section.tips.map(tip => <li key={tip}>{tip}</li>)}</ul> : null}</section>)}
            <section className="blog-sources" aria-labelledby="blog-sources-heading"><h2 id="blog-sources-heading">Para continuar a descoberta</h2><p>Fontes consultadas para esta matéria:</p><ul>{post.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span className="sr-only">(abre em nova aba)</span><ArrowRight size={14} aria-hidden="true" /></a></li>)}</ul></section>
            <p className="blog-editorial-note">Texto produzido com auxílio de inteligência artificial, com base nas fontes indicadas. Conteúdo informativo; não substitui orientação veterinária individual.</p>
            {post.slug === "fotos-do-cachorro-com-celular" ? <Link href="/" className="primary-button">Apresentar meu cachorro <ArrowRight size={17} aria-hidden="true" /></Link> : null}
          </div>
        </div>
      </article>
      <section className="blog-related" aria-labelledby="related-heading"><div className="blog-library-heading"><h2 id="related-heading">Mais um pouquinho de descoberta</h2><Link href="/blog" className="blog-read-link">Ver todas <ArrowRight size={16} aria-hidden="true" /></Link></div><div className="blog-grid">{related.map(item => <article className="blog-card" key={item.slug}><Link href={`/blog/${item.slug}`} className="blog-card-link"><div className="blog-card-image"><Image src={item.image} alt={item.imageAlt} width={768} height={512} sizes="(max-width: 640px) 100vw, 380px" /></div><div className="blog-card-content"><span className="blog-category">{item.category}</span><h3>{item.title}</h3><span className="blog-read-link">Ler matéria <ArrowRight size={16} aria-hidden="true" /></span></div></Link></article>)}</div></section>
    </div>
  );
}
