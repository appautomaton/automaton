# Verification Patterns

Common verification commands by technology stack. Use these as starting points, not scripts.

## Node.js / JavaScript

- **Unit tests:** `npm test -- <pattern>` or `node --test <file>`
- **Lint:** `npm run lint` or `npx eslint <path>`
- **Type check:** `npx tsc --noEmit`
- **Build:** `npm run build`
- **Start:** `npm start` and verify no crash

## Python

- **Unit tests:** `pytest <path>` or `python -m unittest <module>`
- **Lint:** `flake8 <path>` or `pylint <module>`
- **Type check:** `mypy <path>`
- **Build:** `python -m build` or `poetry build`

## Rust

- **Unit tests:** `cargo test`
- **Lint:** `cargo clippy`
- **Build:** `cargo build --release`
- **Format check:** `cargo fmt --check`

## Go

- **Unit tests:** `go test ./...`
- **Lint:** `golangci-lint run`
- **Build:** `go build`
- **Format check:** `gofmt -l .`

## General

- **File exists:** `ls <path>`
- **File contains:** `grep -q <pattern> <path>`
- **Process runs:** `pgrep -f <pattern>`
- **Port listens:** `lsof -i :<port>` or `netstat -tlnp | grep <port>`
- **HTTP responds:** `curl -sf http://localhost:<port>/health` or `http GET :<port>/health`

## Verification Principles

1. **Prefer targeted checks over full-suite rituals.** Running the entire test suite for a one-line change wastes context.
2. **Verify the exact behavior, not the absence of errors.** "Tests pass" is weak. "`curl /api/user returns 200 with JSON body containing id`" is strong.
3. **Include rollback verification for migrations.** If you apply a migration, verify you can also revert it.
4. **Verify observability.** If you add a feature, verify it emits the expected log or metric.
