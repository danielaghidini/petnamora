import Link from "next/link";

export default function BlogNotFound() {
  return <div className="blog-container blog-empty"><h1>Essa história não está por aqui.</h1><p>Explore as dicas e curiosidades que já estão no blog.</p><Link href="/blog" className="primary-button">Voltar para o blog</Link></div>;
}
