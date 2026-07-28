# Content Framing

Load this reference when the change involves content creation: writing, articles, briefs, decks, newsletters, documentation, or any deliverable where prose quality matters.

## Content-Aware SPEC.md Fields

When framing a content-oriented change, add these fields to SPEC.md alongside the standard bounded goal, lenses, constraints, and anti-goals:

### Audience

One sentence: who reads this, what they already know, and what belief or behavior the content should change.

**Good:** "Senior engineers who know distributed systems but assume event sourcing is only for CQRS. This piece argues it's a general-purpose audit pattern."

**Bad:** "Technical audience interested in event sourcing."

### Thesis

One falsifiable or debatable claim the piece makes. Not a topic, not a summary. A position.

**Good:** "Feature flags cost more in maintenance debt than they save in deployment safety, and most teams should delete theirs."

**Bad:** "An overview of feature flag best practices."

### Voice

Either a pointer to a voice sample (file path or inline excerpt) or a 2–3 sentence description of the target voice: sentence rhythm, formality level, use of first person, punctuation habits.

**Good:** "Short sentences, contractions, first person. Reads like a senior engineer explaining to a peer, not lecturing. No hedging; state positions directly."

**Bad:** "Professional but approachable."

### Content Anti-Goals

Concrete examples of what the content must not sound like. Name specific patterns, not abstract qualities.

**Good:**
- No significance inflation ("pivotal moment," "stands as a testament")
- No em-dash-heavy lists or rule-of-three conclusions
- No sycophantic framing ("Great question!", "Let's dive in")
- Not a press release, no promotional adjectives ("groundbreaking," "vibrant," "nestled")

**Bad:**
- "High quality"
- "Engaging"
- "Well-written"

## Anti-Slop Checklist

Before finalizing a content-oriented SPEC.md, scan the spec itself against `.agent/.automaton/references/ANTI-SLOP.md`. A spec that tells the implementer to avoid slop but models sloppy prose undermines the direction.

## Lens Interaction

The content lens rule lives here; skills and stage references point instead of restating it.

- Content-only change (article, blog post, newsletter): lenses are `product` + `content`. Add `design` when the deliverable has a visual surface (deck, styled docs page).
- Content inside a feature (onboarding copy, error messages, docs): lenses are `product` + `engineering` + `content`.
- The content lens never triggers `security` or `runtime` unless the content touches sensitive data or is generated at runtime.

## Deferred Dimensions

Capture these when the user already supplied them or when they materially affect scope. Otherwise leave them for planning as explicit assumptions or blocking questions:

- **Channel:** where the content will be published (blog, docs site, newsletter, social).
- **Source policy:** what can be cited, linked, or assumed as common knowledge.
- **Factual risk:** how much fact-checking the content requires (opinion piece vs. technical reference).
- **Format:** structural template (listicle, narrative, tutorial, reference doc).
