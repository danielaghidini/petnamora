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
- Recuperação de senha por e-mail com Resend, link de uso único válido por uma hora e encerramento das sessões antigas após a troca.
- Login e cadastro com Google, com confirmação de maioridade, seleção de conta e abertura do cadastro do cachorro para tutores sem perfis.
- Cadastro e edição de até cinco cães por tutor, até 10 fotos JPG/PNG/WebP por cachorro (5 MB cada), seleção múltipla, remoção e escolha da foto principal. O perfil exibe uma galeria com setas e miniaturas. Raça em lista pesquisável com opção “Outros”, sexo, idade em meses, porte, cidade/UF, descrição e informações de saúde declaradas. Fotos e nomes de raças já cadastrados são preservados na edição.
- Fotos no Cloudflare Images em produção, com entrega pela CDN; armazenamento local para desenvolvimento.
- Exclusão definitiva pelo próprio tutor em **Meus cachorros → Editar perfil → Excluir cachorro**, com confirmação. Remove o cachorro e suas curtidas, namorinhos, conversas, mensagens e denúncias vinculadas, preservando a conta e os outros cachorros. As fotos entram na mesma fila persistente de limpeza usada pela administração; falhas podem ser repetidas no painel.
- Busca por cidade e múltiplas raças, com lista pesquisável e opção “Outros” para raças fora da lista; filtros por sexo, porte e pedigree declarado. Descobrir carrega 12 perfis por vez, com botão “Ver mais cachorros” que preserva a busca aplicada.
- Modo crush no menu superior: um perfil por vez, com arraste à esquerda para passar e à direita para curtir, botões e setas do teclado. Reutiliza os filtros e carrega os próximos perfis automaticamente. As curtidas seguem as regras do aplicativo; passar um perfil vale apenas para a rodada atual.
- Curtidas entre cães ativos, não castrados, de sexos opostos e tutores diferentes; match somente com reciprocidade.
- Conversa direta pela lista normal do Descobrir, sem curtidas ou match. O botão “Mandar mensagem” abre um papo entre as famílias; a conversa aparece na caixa de papos após a primeira mensagem. No Modo crush, a troca de corações continua formando o namorinho.
- Chat persistente exclusivo das duas famílias; atualização por polling a cada cinco segundos enquanto a página está visível, com as 100 mensagens mais recentes. Denúncias, bloqueios e suspensões impedem o contato nos dois tipos de conversa.
- Denúncia persistente que oculta o perfil para o denunciante e bloqueia a conversa entre o par.
- Layout responsivo com navegação móvel e diálogos acessíveis via Radix.

A instalação começa sem perfis, curtidas ou conversas. Não há carga automática de dados fictícios. A migração `20261027200000_remove_demo_profiles` remove os antigos perfis marcados como demonstração e suas interações, preservando os cadastros reais.

## Carga opcional de perfis

`npm run seed:profiles -- --url=https://petnamora.com.br` cadastra explicitamente 50 tutores fictícios e 50 cachorros pelos endpoints normais do site, sem deploy ou acesso direto ao banco. Para outro ambiente, informe sua origem em `--url`. `npm run seed:profiles -- --dry-run` apenas mostra o conteúdo planejado, sem requisições nem gravações.

Os perfis têm nomes e biografias naturais, dez raças, ambos os sexos, três portes, idades adultas e cidades brasileiras. E-mails usam o domínio reservado `example.com`. As fotos ilustrativas vêm das galerias por raça da [Dog API](https://dog.ceo/dog-api/documentation/breed) e passam pelo upload da aplicação, inclusive Cloudflare em produção. A carga não cria curtidas, matches ou mensagens.

As senhas aleatórias, os IDs e as fontes das fotos ficam em `.local/profile-seeds/<host>/accounts.json`, ignorado pelo Git. Preserve esse arquivo para entrar nas contas e retomar uma carga interrompida sem duplicar registros. Contas existentes só são acessadas quando a senha do manifesto corresponde; seus perfis não são sobrescritos. Nunca publique o manifesto.

No mesmo diretório, `remove.sql` contém a remoção dos IDs criados para execução manual no banco correspondente. O SQL preserva tutores que passaram a ter outros cachorros; as interações dos perfis removidos seguem os cascades existentes. Fotos enviadas à Cloudflare não são apagadas pelo SQL; as URLs e as fontes ficam no manifesto para limpeza posterior.

## Login com Google

Crie um cliente OAuth do tipo **Aplicativo da Web** para o Pet Namora no [Google Auth Platform](https://console.cloud.google.com/auth/clients). Configure a marca e o público do aplicativo e, enquanto ele estiver em teste, inclua os e-mails permitidos. Cadastre as URLs de redirecionamento exatas dos ambientes utilizados:

- Desenvolvimento: `http://localhost:3003/api/auth/google/callback`
- Produção: `https://petnamora.com.br/api/auth/google/callback` (ajuste se o domínio público for diferente).

No `.env` local e nas variáveis do serviço `petnamora` no Railway, configure:

```dotenv
APP_URL=https://petnamora.com.br
GOOGLE_CLIENT_ID=<ID do cliente OAuth do Pet Namora>
GOOGLE_CLIENT_SECRET=<segredo do cliente OAuth do Pet Namora>
```

Localmente, use `APP_URL=http://localhost:3003`. O retorno é calculado a partir de `APP_URL`; `GOOGLE_REDIRECT_URI` é opcional e, se definido, deve corresponder exatamente a essa origem mais `/api/auth/google/callback`. Não use variáveis `NEXT_PUBLIC_` para credenciais. Reinicie o servidor após configurar. Aplique `npm run db:migrate` antes de iniciar a versão nova: a migração adiciona apenas o identificador Google opcional e único, preservando contas e senhas existentes.

O botão solicita somente `openid email profile`. O servidor confere o estado e o PKCE, consulta o perfil diretamente no Google e exige e-mail verificado. A sessão continua no cookie HttpOnly do Pet Namora; tokens Google não são persistidos nem enviados ao navegador pela URL. Consulte o [fluxo OAuth do Google](https://developers.google.com/identity/protocols/oauth2/web-server) e a [documentação OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

Contas novas recebem nome e e-mail do Google, sem exigir criação de senha, e nunca recebem permissão administrativa. Nos acessos seguintes, o identificador Google reconhece a conta mesmo se o e-mail do provedor mudar. Para uma conta já cadastrada com senha, o vínculo automático por e-mail ocorre somente quando o Google é responsável por esse endereço (Gmail ou Google Workspace). Em endereços de outros provedores, o usuário é orientado a entrar com a senha existente, evitando vincular contas apenas pela coincidência de um e-mail externo. Suspensões também impedem o login Google.

Sem as credenciais, o botão informa que a integração ainda precisa ser configurada, e o acesso por e-mail e senha continua disponível. `npm run test:auth`, após o build, verifica o fluxo HTTP com Google simulado e schema PostgreSQL isolado, sem contas ou serviços Google reais.

## Recuperação de senha

Na opção **Já tenho conta**, o link **Esqueci minha senha** abre `/forgot-password`. O e-mail leva a `/reset-password` para cadastrar e confirmar uma nova senha. Depois da troca, a pessoa precisa entrar novamente; todos os dispositivos conectados perdem a sessão anterior. Contas vinculadas ao Google também podem criar uma senha por esse fluxo, mantendo o vínculo Google.

Aplique `npm run db:migrate` e configure no ambiente do Pet Namora:

```dotenv
APP_URL=https://petnamora.com.br
RESEND_API_KEY=<chave de envio do Resend>
EMAIL_FROM=nao-responda@petnamora.com.br
```

`EMAIL_FROM` deve conter somente o endereço, em um domínio verificado no Resend. O nome “Pet Namora” é acrescentado pelo servidor. Use uma chave com permissão de envio para esse domínio e desative o rastreamento de cliques no domínio usado para recuperação, para preservar o link sensível. A integração utiliza a [API de envio do Resend](https://resend.com/docs/api-reference/emails/send-email), sem dependência adicional. Não copie o `.env` de outro produto. Localmente, `APP_URL=http://localhost:3003` é permitido; em produção, HTTPS é obrigatório. A URL do e-mail vem exclusivamente de `APP_URL`, nunca do Host da requisição.

O token tem 32 bytes aleatórios, é armazenado somente como SHA-256 e expira em uma hora. Pedir outro link substitui o anterior. O consumo, a atualização da senha e a exclusão das sessões são atômicos; envios simultâneos do formulário só permitem uma troca. A criação de sessões também confere a senha atual sob bloqueio da conta, impedindo um login antigo em andamento de criar uma sessão após a recuperação. Contas suspensas não recebem mensagens e não podem usar links já emitidos.

O limitador fica no PostgreSQL e vale entre instâncias e reinícios: um pedido por minuto, até cinco por hora para cada e-mail, incluindo endereços sem cadastro. Somente o hash do endereço fica no limitador; registros sem pedidos há mais de 24 horas e tokens expirados são removidos em novas solicitações. A resposta normal não confirma se o endereço existe. Sem configuração, com rejeição do Resend, resposta sem ID ou timeout de 15 segundos, o endpoint retorna erro 503; o token desse envio é descartado. A confirmação significa que o provedor aceitou a mensagem, não que a caixa de entrada já a recebeu. Consulte os eventos de entrega no Resend em caso de bounce ou bloqueio posterior.

Após `npm run build`, `npm run test:auth` verifica também a recuperação por HTTP, com schema PostgreSQL isolado e Resend simulado. Inclui expiração, reuso, concorrência, revogação de sessões, conta Google, limitação persistente, origem confiável e falhas de configuração/envio. Não envia e-mails reais.

## Administração

O painel fica em `/admin` e usa o mesmo login do Pet Namora, com permissão de administrador verificada no servidor em cada acesso e alteração. O cadastro público nunca concede essa permissão. Administradores também veem um atalho no menu e no cabeçalho do site.

Após aplicar as migrações (`npm run db:migrate`), cadastre sua conta normalmente e conceda acesso no ambiente que contém essa conta:

```powershell
npm run admin:grant -- --email=seu-email@dominio.com
```

O comando usa o `DATABASE_URL` do ambiente atual, exige uma conta existente e registra a concessão no histórico. Para produção, execute-o no serviço Pet Namora com o banco de produção configurado. Não existe senha administrativa padrão nem promoção automática do primeiro cadastro.

O painel oferece totais da comunidade, busca e paginação de usuários e cachorros, suspensão/reativação e exclusão de contas, bloqueio/liberação de perfis, análise e reabertura de denúncias e histórico com administrador, motivo e data de cada ação. Toda alteração exige confirmação e motivo. Administradores não podem ser suspensos nem excluídos pelo painel.

Em Usuários, **Excluir conta** remove definitivamente o usuário, suas sessões, cachorros, curtidas, conversas, mensagens e denúncias vinculadas, preservando o registro da ação administrativa. Contas com histórico como administrador são preservadas para manter a auditoria; podem ser suspensas após perderem a permissão administrativa.

As fotos de capa e das galerias entram em uma fila persistente na mesma transação da exclusão. O servidor tenta apagá-las imediatamente, tanto do armazenamento local quanto da Cloudflare, preservando imagens ainda usadas em outros cadastros. Na Cloudflare, usa a [API de exclusão de imagens](https://developers.cloudflare.com/images/storage/manage-images/delete-images/) com o token `Images Write` já configurado, limitado às URLs da conta configurada e aos IDs `petnamora/<uuid>`. Falhas não perdem as URLs: o painel mostra a quantidade pendente e o botão **Limpar fotos pendentes** para repetir. Novas exclusões também tentam processar a fila, em lotes de até 50 fotos por solicitação. Uploads abandonados ou fotos retiradas anteriormente das galerias continuam sujeitos à limpeza periódica de órfãos.

Suspender uma conta revoga suas sessões e impede login, descoberta e interações de seus perfis. Bloquear um cachorro impede descoberta, curtidas e conversas; o bloqueio permanece mesmo que a família edite o cadastro. Reativar a conta não remove bloqueios individuais. Concluir ou arquivar uma denúncia não altera automaticamente o bloqueio global nem remove a proteção pessoal do denunciante.

Após `npm run build`, `npm run test:admin` inicia uma instância temporária do Next.js com schema PostgreSQL isolado e verifica permissões, moderação, histórico e exclusão de cachorros pelo tutor via HTTP, incluindo cascatas, preservação da conta e fotos compartilhadas, exclusão do último cachorro e falhas de armazenamento. Os cenários são apagados ao terminar e não usam contas reais.

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
npm run test:discover
npm run build
npm run test:photos
```

`test:photos` usa o build standalone e um schema PostgreSQL isolado para conferir upload, cadastro com várias fotos, persistência, escolha da principal, remoção, permissões e compatibilidade com cadastros de foto única. Os dados e arquivos temporários são removidos ao terminar.

O teste de migração usa o PostgreSQL configurado em `DATABASE_URL`, cria cenários em schemas isolados e desfaz todas as alterações ao terminar. Confere a remoção dos dados fictícios e a preservação de perfis, contas e interações reais.

## Limites desta versão

Sem cobrança, verificação de e-mail no cadastro por senha, verificação documental, notificações e geolocalização por raio. Saúde e pedigree são autodeclarados, sem selo de certificação. O app não avalia aptidão veterinária para reprodução. Curtidas e conexões são limitadas a 100 registros.

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
