# Verificação do MVP

Executada em 27/10/2026 no banco próprio `petnamora`, porta 5437.

## História verificada

Dois tutores cadastram seus cães, encontram um parceiro, demonstram interesse mútuo e conversam; um terceiro tutor não pode acessar essa conversa.

| Fronteira | Resultado observado |
| --- | --- |
| Banco e aplicação | `/api/health`: HTTP 200, `status: ok` |
| Cadastro | Três tutores temporários criados, sem hash de senha no JSON público |
| Foto | Upload autenticado HTTP 201; leitura HTTP 200 com `image/png` |
| Perfil | Dois cães criados via API; edição por terceiro negada com HTTP 404 |
| Busca | Raça Golden, cidade Campinas e sexo fêmea retornaram o cão esperado; exemplos excluídos quando há perfis reais de outros tutores |
| Interesse | Primeira curtida não criou match; reciprocidade criou um; repetição não duplicou |
| Conversa | Mensagem gravada por um tutor e lida pelo outro |
| Autorização | Terceiro recebeu HTTP 404 na leitura e envio de mensagens; visitante anônimo recebeu HTTP 401 |
| Origem | Mutação com origem externa recebeu HTTP 403 |
| Denúncia | Bloqueou leitura da conversa para ambos os participantes com HTTP 403 |
| Logout | Reutilizar o cookie após sair retornou usuário nulo |
| Interface | Tela inicial inspecionada; abertura dos filtros, busca Golden com dois resultados e abertura/fechamento do diálogo de cadastro confirmadas no navegador |

Contas, cães, mensagens e foto criados por essa verificação foram removidos ao final. Permaneceram apenas os seis perfis explicitamente marcados como exemplos. Nenhuma conta real do usuário foi usada.

O servidor standalone também foi iniciado localmente com `npm run start`. A página inicial, o health check e a logo responderam HTTP 200; a tela final foi conferida no navegador nessa versão.

`npm run lint`, `npm run typecheck` e o build Next.js passaram. No Windows, pare o servidor antes de gerar novamente o Prisma Client: o processo em execução mantém a DLL aberta. Um build com o servidor ativo encontrou esse bloqueio; repetir após encerrar o servidor concluiu com sucesso.

O fluxo de autenticação, perfil e conversa foi exercitado pelas APIs; no navegador foram verificados a tela inicial, busca e diálogos, sem criação de conta pela interface. Não houve teste em dispositivo móvel físico, auditoria de segurança ou teste de carga. Veja os limites de lançamento no README.

![Prévia da aplicação](screenshots/petnamora-preview.png)
