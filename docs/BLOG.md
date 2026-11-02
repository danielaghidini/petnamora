# Blog Pet Namora

O blog fica em `/blog`, com matérias em `/blog/<slug>`. É público, não exige login e mantém a identidade visual e a preferência de tema do aplicativo. A primeira edição inclui quatro matérias sobre curiosidades, brincadeiras, passeios e fotografia, com fontes consultadas e indicação do uso de IA. Não há alegação de revisão veterinária.

## Publicar ou editar uma matéria

Nesta versão, o conteúdo é mantido no projeto, em `src/features/blog/posts.ts`. Não há editor de matérias no painel administrativo.

1. Adicione um objeto à lista `blogPosts`, com slug único, título, categoria, resumo, data real de publicação no formato `YYYY-MM-DD`, imagem, descrição acessível, introdução, seções e fontes.
2. Coloque a capa em `public/blog/`. As capas iniciais usam WebP de 1200 × 800 pixels. Prefira arquivos otimizados e imagens que você possa usar.
3. Use IDs de seção únicos dentro da matéria. Eles formam os links do sumário.
4. Confira os fatos e as fontes. Assuntos de saúde e reprodução precisam de avaliação editorial apropriada; não declare revisão de um profissional que não participou.
5. Rode as verificações e publique pelo fluxo existente do projeto. Matérias são geradas no build: salvar o arquivo não altera o site em produção.

A ordem da lista controla a apresentação; o primeiro artigo é o destaque. Datas não agendam publicação: adicione apenas matérias prontas para serem publicadas. Ao atualizar substancialmente uma matéria, evolua o modelo com uma data de atualização separada e use-a no sitemap e nos metadados, preservando a data original de publicação.

Cada matéria gera título e descrição, canonical, Open Graph, Twitter Card, `BlogPosting`, `BreadcrumbList`, tempo estimado de leitura, sumário e recomendações. O sitemap inclui automaticamente o blog e os artigos. O domínio absoluto é derivado de `APP_URL`, que deve ser `https://petnamora.com.br` no build de produção. A permissão `index, follow` é explícita nas páginas do blog, sobrescrevendo a restrição padrão do layout raiz. URLs desconhecidas retornam 404.

## Capas originais

Geradas com a ferramenta integrada ImageGen em 02/11/2026 e otimizadas para WebP. As imagens são ilustrativas e não representam usuários ou cachorros cadastrados.

Prompt da capa `public/blog/cabeca-inclinada.webp`:

> Create one original editorial photograph for a friendly Brazilian dog magazine blog. Landscape 3:2 composition. A healthy adult caramel-and-white mixed breed dog with floppy ears, chest-up portrait, head tilted slightly in curiosity, expressive dark brown eyes, anatomically natural, relaxed closed mouth. Warm natural window light, a soft lavender interior and pale cream sofa softly out of focus, candid high-end lifestyle photography with realistic fine fur. Gentle playful affectionate mood. Dog placed center with full ears visible, plenty of room around head for responsive crops. No people, no collar text, no writing, no logos, no watermark. This is a blog cover image, not a website screenshot.

Para as outras capas, foi usado este prompt, substituindo `{scene}` pelos trechos abaixo:

> Create one original landscape 3:2 editorial photograph for a warm friendly Brazilian dog magazine. {scene} Natural realistic anatomy and fine fur texture, candid high-end lifestyle photography, soft natural light, affectionate calm mood, tasteful cream and lavender details. No text, no typography, no logo, no watermark. This is a cover photo, not a website screenshot.

- `public/blog/brincadeiras.webp`: A relaxed healthy black and white adult dog lying on a cream rug in a cozy living room, nosing a durable lavender dog toy, a softly blurred rainy window in the background.
- `public/blog/passeio.webp`: An adult caramel mixed-breed dog wearing a comfortable lilac harness on a loose leash, sniffing grass along a quiet garden path, lush green background. Only a small part of the leash is visible at top edge, no people in frame.
- `public/blog/fotografia.webp`: A healthy adult small white-and-caramel dog sitting peacefully on a pale cream sofa in soft window light, seen at the dog's eye level, looking toward a smartphone held vertically by a human hand just at the left foreground edge. Phone has no visible screen or text.

## Verificação local — 02/11/2026

- TypeScript e ESLint dos arquivos envolvidos passaram.
- `next build` gerou `/blog`, os quatro artigos estáticos e o sitemap. O comando completo `npm run build` encontrou o bloqueio já conhecido da DLL do Prisma pelo servidor de desenvolvimento existente na porta 3004. Como não houve alteração de schema, a compilação foi executada sem regenerar o cliente Prisma, preservando o servidor existente.
- Navegador: filtro Dicas retornou duas matérias; busca por chuva retornou uma; busca sem correspondência mostrou a recuperação para todas. Artigo, sumário e troca de tema funcionaram, sem erros ou avisos no console.
- Em largura de 390 pixels, listagem e artigo não apresentaram rolagem horizontal; capas carregaram e a leitura se adaptou ao celular.
- A saída standalone foi iniciada temporariamente na porta 3005, com `APP_URL=https://petnamora.com.br`. O blog e os quatro artigos responderam 200, com canonical público correto e `index, follow`. O sitemap retornou seis URLs públicas corretas, e as quatro capas responderam 200 como WebP. A URL de artigo inexistente retornou 404 na verificação HTTP.

Os links Blog foram adicionados aos menus de computador e celular do aplicativo. Não houve migração, gravação de usuários ou alterações no banco de dados.
