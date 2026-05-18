# Onboard Quality

Load this reference only before writing or refreshing steering artifacts.

## Anti-Patterns

- Uncited repo claims: architecture, commands, or ownership stated without file evidence.
- Repo-map bloat: exhaustive inventory instead of bounded project truth.
- Guessed topology: treating familiar framework names as proof without checking entrypoints.
- Stale-state overwrite: replacing useful steering without naming what changed.
- Scanning past sufficiency: continuing broad reads after the repo shape is clear.

## Better Shape

- Lead each steering artifact with the current truth, then cite paths.
- Mark uncertain claims as unknown or inferred.
- Keep commands to those observed in manifests, scripts, docs, or working checks.
- Stop when the next action is clear enough for `auto-frame` or `auto-resume`.

## Prose Hygiene

Steering artifacts attract promotional language and uncited claims. Every statement should cite a file path or mark itself as inferred.

Scan for:
- "robust architecture", "well-structured codebase": name the pattern and where it lives
- "comprehensive test suite": name the test runner and count
- "modern technology stack": name the runtime, framework, and version
- Promotional adjectives about the repo's quality
- Any claim without a file path citation

Before: "This is a well-structured, modern codebase with a robust architecture and comprehensive test coverage, reflecting best practices in full-stack development."
After: "Node.js 20 + Express 4 API (src/server.js). React 18 SPA (client/src/). 47 test files under test/ using Vitest. No CI config found (inferred: not yet configured)."

## Final Check

If a fresh agent could not tell which facts were observed versus inferred, revise the artifact.
