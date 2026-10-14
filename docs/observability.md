# Observability

The API emits structured JSON logs to stdout, exposes Prometheus metrics at
`/metrics`, and can report server-side exceptions to Sentry. Request bodies,
cookies, authorization headers, prompts, and resume content are redacted from
logs.

## Local operation

Start the application normally for development. To start the optional
observability stack as well:

```bash
pnpm run docker:dev:observability:d
```

The equivalent Docker Compose command is:

```bash
docker compose -f compose.dev.yaml -f compose.observability.yaml \
  --profile observability up -d
```

Grafana is available at `http://localhost:3002`. The credentials come from
`GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in `.env`.

## Production operation

On the VPS, run the production stack and the observability profile together:

```bash
docker compose -f compose.yaml -f compose.observability.yaml \
  --profile observability up -d
```

The Grafana port is bound to `127.0.0.1` and should be accessed through an SSH
tunnel or a separately protected reverse proxy. Do not publish Loki or
Prometheus directly to the internet.

## Useful signals

- `tailored_cv_ai_requests_total`: AI calls by operation, provider, and status.
- `tailored_cv_ai_request_duration_seconds`: AI latency distribution.
- `tailored_cv_http_requests_total`: API traffic by route and status.
- `tailored_cv_http_active_requests`: requests currently in progress.

Keep `SENTRY_DSN` empty when Sentry is not configured. A Sentry event contains
only exception metadata and request context; sensitive request bodies are not
sent.
