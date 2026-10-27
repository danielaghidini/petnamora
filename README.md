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
npm run db:seed
npm run dev
```

Abra http://localhost:3003. `db:local` cria `.env` com credenciais aleatórias, sem ler nem alterar o banco do Meu Site Perfeito. Para outro executável PostgreSQL, defina `PG_BIN`. Em outros ambientes, copie `.env.example` para `.env`, configure um PostgreSQL próprio e pule `db:local`. Nunca use o banco de produção de outro SaaS.

## O que funciona

- Cadastro e login do tutor, senha com bcrypt, sessão revogável no banco e cookie HttpOnly.
- Cadastro e edição de até cinco cães por tutor, foto JPG/PNG/WebP, raça, sexo, idade em meses, porte, cidade/UF, descrição e informações de saúde declaradas.
- Busca por raça e cidade; filtros por sexo, porte e pedigree declarado.
- Curtidas entre cães ativos, não castrados, de sexos opostos e tutores diferentes; match somente com reciprocidade.
- Chat persistente exclusivo dos tutores do match; atualização por polling a cada cinco segundos enquanto a página está visível, com as 100 mensagens mais recentes.
- Denúncia persistente que oculta o perfil para o denunciante e bloqueia a conversa entre o par.
- Layout responsivo com navegação móvel e diálogos acessíveis via Radix.

O seed é opcional e idempotente. Seus seis perfis são **exemplos fictícios**, com fotos ilustrativas do Unsplash e sem conta acessível, curtidas ou conversas simuladas. A marcação é exibida em cada cartão. Quando existe outro cão real disponível, a busca do tutor deixa de mostrar exemplos.

## Estrutura

```text
src/app/                 Next.js App Router e endpoints HTTP
src/features/dogs/       regras, contratos, validação e componentes do produto
src/components/ui/       elementos de interface reutilizáveis
src/lib/                 autenticação, banco, HTTP, upload e utilitários
prisma/                  modelo e migração inicial
scripts/                 banco local e seed de exemplos
docs/                    análise de reaproveitamento e próximos módulos
public/brand/            logo fornecida em ID/
uploads/                 fotos locais, ignoradas pelo Git
```

## Verificação

No Windows, encerre o servidor antes de rodar o build: o Prisma Client mantém uma DLL aberta durante a execução.

```powershell
npm run typecheck
npm run lint
npm run build
```

## Limites desta versão

Sem cobrança, recuperação de senha, verificação de e-mail, verificação documental, equipe/painel de moderação, notificações e geolocalização por raio. Saúde e pedigree são autodeclarados, sem selo de certificação. O app não avalia aptidão veterinária para reprodução. Busca limitada aos 60 resultados mais recentes; curtidas e conexões, a 100 registros.

O limitador de login é por e-mail e processo; substitua por proteção compartilhada por conta/IP antes de escalar ou abrir ao público. Upload local requer volume persistente em produção; a validação atual confere assinatura binária e tamanho e deve evoluir para decodificação/normalização e cotas. As sessões expiradas e fotos órfãs precisam de limpeza periódica. Defina política de privacidade e exclusão/exportação de dados e implemente moderação antes de lançamento público.

## Deploy futuro

Nenhum serviço externo foi criado. O build gera saída standalone, como no Meu Site Perfeito. Configure um projeto próprio no Railway (ou outro host Node), PostgreSQL próprio, segredo JWT aleatório com pelo menos 32 caracteres e `APP_URL` HTTPS. Aplique `npm run db:migrate` antes de iniciar. Use `npm run start` ou prepare os assets de `.next/standalone` antes de executar seu servidor diretamente. Monte um volume no diretório de `UPLOAD_DIR` ou substitua o adaptador de fotos por Cloudflare Images/R2. Não copie `.env`, clientes ou credenciais do outro SaaS.
