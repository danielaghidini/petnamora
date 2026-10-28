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
- Busca por cidade e múltiplas raças, com lista pesquisável e opção “Outros” para raças fora da lista; filtros por sexo, porte e pedigree declarado. Descobrir carrega 12 perfis por vez, com botão “Ver mais cachorros” que preserva a busca aplicada.
- Curtidas entre cães ativos, não castrados, de sexos opostos e tutores diferentes; match somente com reciprocidade.
- Chat persistente exclusivo dos tutores do match; atualização por polling a cada cinco segundos enquanto a página está visível, com as 100 mensagens mais recentes.
- Denúncia persistente que oculta o perfil para o denunciante e bloqueia a conversa entre o par.
- Layout responsivo com navegação móvel e diálogos acessíveis via Radix.

A instalação começa sem perfis, curtidas ou conversas. Não há carga automática de dados fictícios. A migração `20261027200000_remove_demo_profiles` remove os antigos perfis marcados como demonstração e suas interações, preservando os cadastros reais.

## Carga opcional de perfis

`npm run seed:profiles -- --url=https://petnamora.com.br` cadastra explicitamente 50 tutores fictícios e 50 cachorros pelos endpoints normais do site, sem deploy ou acesso direto ao banco. Para outro ambiente, informe sua origem em `--url`. `npm run seed:profiles -- --dry-run` apenas mostra o conteúdo planejado, sem requisições nem gravações.

Os perfis têm nomes e biografias naturais, dez raças, ambos os sexos, três portes, idades adultas e cidades brasileiras. E-mails usam o domínio reservado `example.com`. As fotos ilustrativas vêm das galerias por raça da [Dog API](https://dog.ceo/dog-api/documentation/breed) e passam pelo upload da aplicação, inclusive Cloudflare em produção. A carga não cria curtidas, matches ou mensagens.

As senhas aleatórias, os IDs e as fontes das fotos ficam em `.local/profile-seeds/<host>/accounts.json`, ignorado pelo Git. Preserve esse arquivo para entrar nas contas e retomar uma carga interrompida sem duplicar registros. Contas existentes só são acessadas quando a senha do manifesto corresponde; seus perfis não são sobrescritos. Nunca publique o manifesto.

No mesmo diretório, `remove.sql` contém a remoção dos IDs criados para execução manual no banco correspondente. O SQL preserva tutores que passaram a ter outros cachorros; as interações dos perfis removidos seguem os cascades existentes. Fotos enviadas à Cloudflare não são apagadas pelo SQL; as URLs e as fontes ficam no manifesto para limpeza posterior.

## Administração

O painel fica em `/admin` e usa o mesmo login do Pet Namora, com permissão de administrador verificada no servidor em cada acesso e alteração. O cadastro público nunca concede essa permissão. Administradores também veem um atalho no menu e no cabeçalho do site.

Após aplicar as migrações (`npm run db:migrate`), cadastre sua conta normalmente e conceda acesso no ambiente que contém essa conta:

```powershell
npm run admin:grant -- --email=seu-email@dominio.com
```

O comando usa o `DATABASE_URL` do ambiente atual, exige uma conta existente e registra a concessão no histórico. Para produção, execute-o no serviço Pet Namora com o banco de produção configurado. Não existe senha administrativa padrão nem promoção automática do primeiro cadastro.

O painel oferece totais da comunidade, busca e paginação de usuários e cachorros, suspensão/reativação de contas, bloqueio/liberação de perfis, análise e reabertura de denúncias e histórico com administrador, motivo e data de cada ação. Toda alteração exige confirmação e motivo. Administradores não podem ser suspensos pelo painel.

Suspender uma conta revoga suas sessões e impede login, descoberta e interações de seus perfis. Bloquear um cachorro impede descoberta, curtidas e conversas; o bloqueio permanece mesmo que a família edite o cadastro. Reativar a conta não remove bloqueios individuais. Concluir ou arquivar uma denúncia não altera automaticamente o bloqueio global nem remove a proteção pessoal do denunciante.

Após `npm run build`, `npm run test:admin` inicia uma instância temporária do Next.js com schema PostgreSQL isolado e verifica permissões, moderação e histórico via HTTP. Os cenários são apagados ao terminar e não usam contas reais.

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

Sem cobrança, recuperação de senha, verificação de e-mail, verificação documental, notificações e geolocalização por raio. Saúde e pedigree são autodeclarados, sem selo de certificação. O app não avalia aptidão veterinária para reprodução. Curtidas e conexões são limitadas a 100 registros.

O limitador de login é por e-mail e processo; substitua por proteção compartilhada por conta/IP antes de escalar ou abrir ao público. A validação de upload confere assinatura binária e tamanho e deve evoluir para decodificação/normalização e cotas. As sessões expiradas e fotos órfãs (inclusive uploads abandonados na Cloudflare) precisam de limpeza periódica. Defina política de privacidade, exclusão/exportação de dados e uma rotina de análise de denúncias antes de lançamento público.

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
