# Geração assíncrona de análises e currículos

As operações que dependem da IA são processadas como tarefas persistidas no
PostgreSQL. Os endpoints de criação retornam `202 Accepted` rapidamente e o
frontend acompanha o estado até o resultado estar disponível.

Isso evita manter a requisição HTTP aberta durante o tempo de resposta do
provedor de IA, reduzindo a chance de timeout no proxy ou no Cloudflare.

## Estados

- `QUEUED`: tarefa criada e aguardando o worker.
- `PROCESSING`: o worker está chamando o provedor de IA.
- `COMPLETED`: currículo salvo e associado à geração.
- `FAILED`: tentativas esgotadas; a mensagem fica disponível para o usuário.

Análises usam os mesmos estados, em uma fila própria. O resultado concluído é
salvo em `job_analyses` e o currículo concluído em `tailored_resumes`.

## Endpoints

```text
POST /job-applications/:id/analyze
GET  /job-applications/:id/analyze/status
POST /job-applications/:id/tailor
GET  /job-applications/:id/tailor/status?language=PT|EN
```

The `POST /analyze` and `POST /tailor` request bodies and responses are
documented in the generated OpenAPI specification at `/docs`. Tailoring still
requires a JSON object body; `targetLanguage` is optional and defaults to the
application language when omitted.

Example request:

```http
POST /job-applications/:id/tailor
Content-Type: application/json

{"targetLanguage":"EN"}
```

The `202 Accepted` response contains the persisted generation identifier and
its current status. A new request normally returns `QUEUED`; when an active
generation already exists for the same application and language, the API
reuses it and may return its current `QUEUED` or `PROCESSING` status. The
client should use that status resource rather than keeping the original
request open.

O worker interno do NestJS processa uma tarefa de cada fila por vez, tenta
novamente uma falha uma vez após um intervalo curto e recupera tarefas que
ficaram em `PROCESSING` depois de um reinício do serviço.

Ao concluir, o frontend consulta novamente a candidatura e atualiza a análise
ou o currículo automaticamente. Se o usuário sair da tela, o status persistido
é recuperado ao retornar.

## Migrações

Em produção, o entrypoint aplica as migrations quando `RUN_MIGRATIONS=true`.
O Compose de desenvolvimento também executa `prisma migrate deploy` antes de
iniciar a API. Em uma inicialização manual fora do Compose, rode após atualizar
o código:

```bash
docker exec tailored-cv-api pnpm --filter @tailored-cv/api prisma:migrate:deploy
```

Esta primeira versão não usa Redis. O PostgreSQL é suficiente para o volume
esperado da aplicação pessoal e mantém o estado mesmo quando o container é
reiniciado. Redis/BullMQ pode ser introduzido depois se houver necessidade de
concorrência maior ou múltiplos workers.
