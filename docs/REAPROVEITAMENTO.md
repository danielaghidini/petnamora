# Do Meu Site Perfeito ao Pet Namora

Inspeção realizada em 27/10/2026 em `C:/Projetos/01 - Meu Site Perfeito`, sem modificar o projeto de origem.

## Stack observada no código

| Camada       | Evidência no Meu Site Perfeito                                                                                                  | Decisão para o MVP                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Aplicação    | `app/package.json`: Next 16.1.6, React 19.2.3, TypeScript                                                                       | Mesmas versões principais, App Router e handlers HTTP                                                       |
| Banco        | `app/prisma/schema.prisma`, `src/lib/prisma.ts`: PostgreSQL, Prisma 5.22, cliente singleton                                     | Reaproveitar padrão, criar schema/banco próprios                                                            |
| Interface    | `src/components/ui`: Radix, Tailwind 3.4, clsx, tailwind-merge, Lucide                                                          | Radix Dialog e utilitário `cn`; identidade visual própria                                                   |
| Autenticação | `src/lib/auth.ts`, `password-auth.ts`: JWT HS256, identidade resolvida no banco, revogação por sessionVersion; bcrypt nas rotas | Adaptar para sessão revogável por registro e cookie HttpOnly; não carregar claims de tenant                 |
| Imagens      | `src/app/api/upload/route.ts`, `src/lib/cloudflare.ts`: Cloudflare Images, Media e controle de capacidade por tenant            | Arquitetura reaproveitável; MVP usa arquivo local com assinatura binária e tamanho; provedor próprio depois |
| Cobrança     | `stripe.ts`, `stripe-webhook.ts`, `billing-*`: Stripe, ambiente test/production, assinatura de webhooks e entitlements          | Aproveitar padrões depois; novos produtos, preços e associação ao tutor, sem Tenant                         |
| E-mail       | `src/lib/resend.ts`, `email.ts` e webhooks                                                                                      | Reaproveitar lazy client e entrega depois, com domínio e remetente próprios                                 |
| Conversas    | `src/app/api/chat/*`, `src/lib/chat-auth.ts`: conversa e mensagens ligadas ao tenant/visitante                                  | Reutilizar conceito, refazer autorização por participação dos dois tutores no match                         |
| Deploy       | `next.config.ts`, `railway.json`, scripts: standalone e migrações antes do servidor                                             | Mesmo tipo de execução Node/PostgreSQL, projeto e volumes próprios                                          |
| IA           | SDK AI, provedores OpenAI/Google, geração de conteúdo                                                                           | Fora do fluxo inicial; pode ajudar a redigir bio depois, não é necessária ao match                          |

O README de origem ainda menciona Cloudinary, mas a rota de upload inspecionada usa **Cloudflare Images**. A decisão acima segue a implementação.

## O que foi reaproveitado de fato

O utilitário `cn` foi extraído de `src/lib/utils.ts`; as versões-base de Next/React/Prisma e o padrão de singleton do cliente foram mantidos. Estrutura por funcionalidades, validação Zod, APIs no App Router, hash bcrypt e validação de identidade no banco foram adaptados. A marca usa a imagem fornecida em `ID/logo_petnamora_01.png`.

Não houve cópia em massa do projeto. Os módulos de billing, e-mail e Cloudflare são candidatos a extração posterior, não integrações já entregues.

## O que não levar para este SaaS

`Tenant`, proxy por hostname/domínio, construtor, biblioteca de templates, editor/geração de páginas, publicações, CRM de prospecção, agência, sincronização Mercado Livre, gestão de DNS e caixa de e-mail profissional. São capacidades ligadas à venda e operação de sites, sem responsabilidade no encontro entre cães.

Pet Namora é uma comunidade compartilhada com propriedade de dados por tutor, e não um conjunto de sites isolados por tenant. Cada consulta privada deve autorizar o `ownerId` ou a participação no match.

## Modelo do MVP

`User → Dog → Like → Match → Message`, com `Session` para credenciais revogáveis e `Report` para denúncia/bloqueio do par. O par de match é ordenado e único; curtidas recíprocas são processadas em transação serializável, com retry para conflito concorrente. Nenhum usuário pode conversar em um match de terceiros.

## Ordem sugerida após validação do produto

1. Piloto com tutores reais: revisar formulários, compatibilidade e fluxo de interesse; coletar feedback.
2. Preparação para uso público: e-mail/recuperação, moderação administrativa, política de dados/exclusão, validação de uploads e cotas, rate limit compartilhado, observabilidade e backups.
3. Confiança: documentos e avaliação humana, com status claros e auditáveis. Não confundir autodeclaração com verificação.
4. Monetização: assinatura por tutor via Stripe, com benefícios definidos após aprender com o piloto. Reutilizar validação de webhook e isolamento de ambientes; criar novos produtos/segredos.
5. Escala: paginação por cursor, geolocalização aproximada, notificações e transporte de chat em tempo real se a demanda justificar.

Para evoluir ambos os SaaS, extrair pequenos pacotes comuns só quando houver uma segunda implementação real: UI, cliente de imagens, cliente de e-mail e infraestrutura de billing. Não criar uma plataforma genérica antes de validar o novo domínio.

## Referências oficiais consultadas

- [Next.js: cookies assíncronos e opções de sessão](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [Prisma: aplicar migrações em produção](https://docs.prisma.io/docs/cli/migrate/deploy)

O MVP fixa Prisma 5.22, como a origem; comandos e geração seguem essa versão.
