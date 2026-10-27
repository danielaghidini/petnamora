# Pet Namora

MVP independente para encontrar parceiros para cruzamento de cães. Baseado nos padrões técnicos do Meu Site Perfeito, com identidade própria e banco separado.

## Rodar localmente

Neste Windows, também é possível executar `Iniciar-Windows.cmd`, que inicia o banco próprio, aplica as migrações e abre o servidor de desenvolvimento no terminal.

Requer Node.js 20.9+ e PostgreSQL. No Windows deste workspace, o PostgreSQL 17 já instalado pode servir como executável para criar **um cluster próprio**, na porta 5437:

```powershell
npm install
npm run db:local
npm run db:generate
npm run db:migrate
npm run dev
```

Abra http://localhost:3003. `db:local` cria `.env` com credenciais aleatórias, sem ler nem alterar o banco do Meu Site Perfeito. Para outro executável PostgreSQL, defina `PG_BIN`. Em outros ambientes, copie `.env.example` para `.env`, configure um PostgreSQL próprio e pule `db:local`. Nunca use o banco de produção de outro SaaS.

## O que funciona

- Cadastro e login do tutor, senha com bcrypt, sessão revogável no banco e cookie HttpOnly.
- Cadastro e edição de até cinco cães por tutor, foto JPG/PNG/WebP, raça, sexo, idade em meses, porte, cidade/UF, descrição e informações de saúde declaradas.
- Fotos no Cloudflare Images em produção, com entrega pela CDN; armazenamento local para desenvolvimento.
- Busca por raça e cidade; filtros por sexo, porte e pedigree declarado.
- Curtidas entre cães ativos, não castrados, de sexos opostos e tutores diferentes; match somente com reciprocidade.
- Chat persistente exclusivo dos tutores do match; atualização por polling a cada cinco segundos enquanto a página está visível, com as 100 mensagens mais recentes.
- Denúncia persistente que oculta o perfil para o denunciante e bloqueia a conversa entre o par.
- Layout responsivo com navegação móvel e diálogos acessíveis via Radix.

A instalação começa sem perfis, curtidas ou conversas. Todos os cães exibidos vêm de cadastros de tutores. Não há carga automática de dados fictícios. A migração `20261027200000_remove_demo_profiles` remove os antigos perfis marcados como demonstração e suas interações, preservando os cadastros reais.

## Estrutura

```text
src/app/                 Next.js App Router e endpoints HTTP
src/features/dogs/       regras, contratos, validação e componentes do produto
src/components/ui/       elementos de interface reutilizáveis
src/lib/                 autenticação, banco, HTTP, upload e utilitários
prisma/                  modelo e migração inicial
scripts/                 banco local e execução standalone
docs/                    análise de reaproveitamento e próximos módulos
public/brand/            logo fornecida em ID/
uploads/                 fotos locais, ignoradas pelo Git
```

## Verificação

No Windows, encerre o servidor antes de rodar o build: o Prisma Client mantém uma DLL aberta durante a execução.

```powershell
npm run typecheck
npm run lint
npm run test:migrations
npm run build
```

O teste de migração usa o PostgreSQL configurado em `DATABASE_URL`, cria cenários em schemas isolados e desfaz todas as alterações ao terminar. Confere a remoção dos dados fictícios e a preservação de perfis, contas e interações reais.

## Limites desta versão

Sem cobrança, recuperação de senha, verificação de e-mail, verificação documental, equipe/painel de moderação, notificações e geolocalização por raio. Saúde e pedigree são autodeclarados, sem selo de certificação. O app não avalia aptidão veterinária para reprodução. Busca limitada aos 60 resultados mais recentes; curtidas e conexões, a 100 registros.

O limitador de login é por e-mail e processo; substitua por proteção compartilhada por conta/IP antes de escalar ou abrir ao público. A validação de upload confere assinatura binária e tamanho e deve evoluir para decodificação/normalização e cotas. As sessões expiradas e fotos órfãs (inclusive uploads abandonados na Cloudflare) precisam de limpeza periódica. Defina política de privacidade e exclusão/exportação de dados e implemente moderação antes de lançamento público.

## Fotos na Cloudflare

O Pet Namora usa **Cloudflare Images**, como o Meu Site Perfeito. A mesma conta pode atender os dois produtos: os novos uploads recebem IDs `petnamora/<uuid>` e metadados `app: petnamora`. Esse prefixo organiza as imagens; não cria isolamento de permissões dentro da conta. Nenhuma tabela ou cadastro do Meu Site Perfeito é acessado pela integração.

No Railway, configure estas variáveis no serviço `petnamora`:

```dotenv
PHOTO_STORAGE=cloudflare
CLOUDFLARE_ACCOUNT_ID=<ID da conta Cloudflare Images>
CLOUDFLARE_API_TOKEN=<token com permissão Images Write nessa conta>
CLOUDFLARE_ACCOUNT_HASH=<hash de entrega do Cloudflare Images>
```

A conta precisa ter a variante `public`, já usada pelo Meu Site Perfeito. Prefira um token próprio para o Pet Namora, limitado a Images nessa conta. Nunca use uma variável `NEXT_PUBLIC_` para o token. As fotos são públicas, como os perfis, e suas URLs ficam no PostgreSQL do Pet Namora. O servidor envia o arquivo à Cloudflare; o navegador carrega as imagens diretamente de `imagedelivery.net`. Só são aceitas URLs da conta configurada, no prefixo `petnamora/`, com a variante `public`.

Em desenvolvimento, o padrão continua sendo `local`. Em produção, o padrão é `cloudflare`: configuração ausente ou falha de upload retorna erro, sem salvar silenciosamente no disco temporário. Para usar a Cloudflare localmente, configure as mesmas variáveis no `.env` ignorado pelo Git e reinicie o servidor. O limite continua em 5 MB para JPG, PNG e WebP.

Uploads locais existentes continuam em `/api/photos/...`; não são migrados automaticamente. Se existirem fotos reais nesse formato em produção, mantenha seu volume até migrá-las. Para uma instalação nova usando a Cloudflare, não é necessário volume de uploads no Railway.

## Deploy no Railway

O projeto [Pet Namora](https://railway.com/project/62ad03ed-6f4a-496a-943d-3de20daa9041) está conectado à branch `main` do GitHub. O serviço `Postgres` e seu volume persistente foram criados exclusivamente para este projeto. O serviço `petnamora` usa a referência privada `DATABASE_URL=${{Postgres.DATABASE_URL}}`, e o comando pré-deploy está configurado como `npm run db:migrate`. Nenhuma credencial do banco de produção é salva no repositório ou no `.env` local.

O build gera saída standalone. Para concluir a configuração da aplicação, defina um segredo JWT aleatório com pelo menos 32 caracteres, `APP_URL` HTTPS e `APP_HOST=0.0.0.0`. Use `npm run build` e `npm run start`; configure o health check em `/api/health`. Para as fotos, use as variáveis Cloudflare acima. As migrações do deploy seguem o código publicado na `main`; alterações locais e da `develop` precisam ser incorporadas antes de chegar à produção. O banco, as sessões e os usuários continuam exclusivos do Pet Namora; não copie o `.env` inteiro de outro SaaS.
