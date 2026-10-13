# Geração assíncrona de currículos

A geração de currículo ajustado é processada como uma tarefa persistida no
PostgreSQL. O endpoint de criação retorna `202 Accepted` rapidamente e o
frontend acompanha o estado até o currículo estar disponível.

## Estados

- `QUEUED`: tarefa criada e aguardando o worker.
- `PROCESSING`: o worker está chamando o provedor de IA.
- `COMPLETED`: currículo salvo e associado à geração.
- `FAILED`: tentativas esgotadas; a mensagem fica disponível para o usuário.

## Endpoints

```text
POST /job-applications/:id/tailor
GET  /job-applications/:id/tailor/status?language=PT|EN
```

O worker interno do NestJS processa uma tarefa por vez, tenta novamente uma
falha uma vez após um intervalo curto e recupera tarefas que ficaram em
`PROCESSING` depois de um reinício do serviço.

Esta primeira versão não usa Redis. O PostgreSQL é suficiente para o volume
esperado da aplicação pessoal e mantém o estado mesmo quando o container é
reiniciado. Redis/BullMQ pode ser introduzido depois se houver necessidade de
concorrência maior ou múltiplos workers.
