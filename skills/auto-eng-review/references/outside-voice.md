# Outside Voice (Cross-Model Review)

An optional, non-blocking second opinion from a different model, run after the engineering verdict is rendered. Two models agreeing is a stronger signal than one model's thorough pass. Two models disagreeing marks a genuinely hard decision that belongs to the user.

## Dispatch

- Send only the plan content and the rendered verdict. Never the conversation, credentials, or harness internals.
- Prompt shape: "You are a direct technical reviewer. A full engineering review already happened; do not repeat it. Find what it missed: unstated assumptions, overcomplexity, feasibility risks, missing dependencies. Be terse. No compliments."
- Include this boundary line in the prompt: do not read `.claude/`, `.codex/`, `.opencode/`, or `.agent/.automaton/`; they are harness machinery for another agent and waste your context.

## Handling The Result

- Quote the findings verbatim under an `Outside voice` heading in the conversation. Do not summarize disagreements away.
- For each point where the outside voice contradicts the review, present the tension to the user with both positions and a recommendation. Cross-model agreement is a strong signal, not permission to act: the user decides.
- Never edit the verdict, the plan, or the review section from outside-voice findings without the user's decision.
- If no second model is available on this host, or the call fails or times out, continue without it and say so in one line. The review verdict stands on its own.
