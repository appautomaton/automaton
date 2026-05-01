# Content Framing

Load this reference when the change involves content creation — writing, articles, briefs, decks, newsletters, documentation, or any deliverable where prose quality matters.

## Content-Aware SPEC.md Fields

When framing a content-oriented change, add these fields to SPEC.md alongside the standard bounded goal, lenses, constraints, and anti-goals:

### Audience

One sentence: who reads this, what they already know, and what belief or behavior the content should change.

**Good:** "Senior engineers who know distributed systems but assume event sourcing is only for CQRS — this piece argues it's a general-purpose audit pattern."

**Bad:** "Technical audience interested in event sourcing."

### Thesis

One falsifiable or debatable claim the piece makes. Not a topic, not a summary — a position.

**Good:** "Feature flags cost more in maintenance debt than they save in deployment safety, and most teams should delete theirs."

**Bad:** "An overview of feature flag best practices."

### Voice Direction

Either a pointer to a voice sample (file path or inline excerpt) or a 2–3 sentence description of the target voice: sentence rhythm, formality level, use of first person, punctuation habits.

**Good:** "Short sentences, contractions, first person. Reads like a senior engineer explaining to a peer, not lecturing. No hedging — state positions directly."

**Bad:** "Professional but approachable."

### Content Anti-Goals

Concrete examples of what the content must not sound like. Name specific patterns, not abstract qualities.

**Good:**
- No significance inflation ("pivotal moment," "stands as a testament")
- No em-dash-heavy lists or rule-of-three conclusions
- No sycophantic framing ("Great question!", "Let's dive in")
- Not a press release — no promotional adjectives ("groundbreaking," "vibrant," "nestled")

**Bad:**
- "High quality"
- "Engaging"
- "Well-written"

## Anti-Slop Checklist

Before finalizing a content-oriented SPEC.md, verify the spec itself does not exhibit these patterns. A spec that tells the implementer to avoid slop but is itself sloppy undermines the direction.

| # | Pattern | What to check |
| --- | --- | --- |
| 1 | Significance inflation | No "pivotal," "testament," "crucial," "vital," "key moment" unless quoting a source. |
| 2 | Promotional language | No "vibrant," "groundbreaking," "nestled," "stunning," "breathtaking." |
| 3 | Superficial -ing analysis | No "highlighting," "underscoring," "emphasizing," "showcasing" as sentence padding. |
| 4 | Vague attribution | No "experts say," "industry observers note" without named sources. |
| 5 | Em dash overuse | Rewrite with commas, periods, or parentheses unless the dash adds genuine rhythm. |
| 6 | Rule of three | Do not force ideas into groups of three for rhetorical effect. |
| 7 | Sycophantic artifacts | No "Great question!", "Certainly!", "I hope this helps!" in any artifact. |
| 8 | Generic conclusions | No "the future looks bright," "exciting times ahead." End with a concrete next action. |
| 9 | Copula avoidance | Use "is" / "are" / "has" instead of "serves as" / "stands as" / "boasts." |
| 10 | Signposting | No "Let's dive in," "Here's what you need to know." Start with the content. |

This checklist is adapted from the Wikipedia AI-writing-tell taxonomy. It covers the 10 most common patterns; the full taxonomy has 29.

## Lens Interaction

Content framing adds a content lens to the standard lens set. It does not replace `product` or `engineering` — it supplements them.

- If the change is content-only (article, blog post, newsletter), lenses are `product` + `design` + content.
- If the change produces content as part of a feature (onboarding copy, error messages, docs), lenses are `product` + `engineering` + content.
- Content lens does not trigger `security` or `runtime` unless the content involves sensitive data or is generated at runtime.

## Pass 2 Dimensions (Deferred)

These are not captured in Pass 1 framing. They affect drafting and verification, not intake and scoping:

- **Channel:** where the content will be published (blog, docs site, newsletter, social).
- **Source policy:** what can be cited, linked, or assumed as common knowledge.
- **Factual risk:** how much fact-checking the content requires (opinion piece vs. technical reference).
- **Format:** structural template (listicle, narrative, tutorial, reference doc).
