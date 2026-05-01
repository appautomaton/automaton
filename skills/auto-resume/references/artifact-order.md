# Artifact Dependency Order

Artifacts must be loaded in dependency order. A downstream artifact assumes upstream artifacts are already understood.

## Dependency Graph

```
REPO-MAP.md (wiki)
    │
    ▼
PROJECT.md (steering)
    │
    ▼
REQUIREMENTS.md (steering)
    │
    ▼
ROADMAP.md (steering)
    │
    ▼
STATUS.md (steering)
    │
    ▼
SPEC.md (work) ────────┐
    │                  │
    ▼                  │
DESIGN.md (work)       │
    │                  │
    ▼                  │
PLAN.md (work)         │
    │                  │
    ▼                  │
VERIFY.md (work)       │
                       │
current.json (state) ──┘
```

## Loading Rules by Stage

| Stage | Load These Artifacts | Stop Here |
|-------|----------------------|-----------|
| `frame` | SPEC.md | Do not load DESIGN.md or PLAN.md |
| `plan` | SPEC.md, DESIGN.md (if exists), PLAN.md | Do not load VERIFY.md |
| `execute` | SPEC.md, DESIGN.md (if exists), PLAN.md, current slice | Do not load VERIFY.md unless verifying |
| `verify` | SPEC.md, DESIGN.md (if exists), PLAN.md, VERIFY.md (if exists) | Do not load future slices |
| `resume` | SPEC.md, STATUS.md, current.json | Load only what is needed to orient |

## Anti-Patterns

- **Loading PLAN.md before SPEC.md.** The plan assumes the spec is understood.
- **Loading VERIFY.md during framing.** Verification is irrelevant before implementation.
- **Loading the full wiki during execution.** Wiki pages are reference material, not active context.
