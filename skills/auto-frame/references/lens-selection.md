# Lens Selection Matrix

Use this matrix to choose lenses when the default (`product` + `engineering`) is insufficient.

## Decision Tree

1. Does the change affect what users see or how they interact? → Include `design`
2. Does the change handle sensitive data, authentication, or trust? → Include `security`
3. Does the change affect performance, deployment, or infrastructure? → Include `runtime`
4. Does the change alter value proposition, scope, or differentiation? → `product` is mandatory
5. Does the change touch architecture, data flow, or APIs? → `engineering` is mandatory

## Examples

| Change | Lenses | Why |
|--------|--------|-----|
| Add a new API endpoint | product, engineering | Affects surface and data flow |
| Redesign checkout flow | product, design, engineering | Affects UX, visuals, and backend |
| Migrate database | engineering, runtime | Affects data layer and deployment |
| Add OAuth login | engineering, security | Affects auth and trust |
| Optimize query performance | engineering, runtime | Affects speed and infrastructure |
| Launch new product line | product, design, engineering | Affects all three |

## Anti-Patterns

- **Include all lenses by default.** This dilutes focus. Start with the minimum and add only when justified.
- **Skip product lens for "pure engineering" changes.** Even refactoring has product implications (risk, timeline).
- **Add security as an afterthought.** If the change touches auth, data, or trust, include security from the start.
