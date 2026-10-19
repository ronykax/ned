# Ned

Ned is a personal agent. Learn more about this project in `README.md`.

## Index

- **AI SDK**: `ai-sdk` skill
- **Glacier**: `glacier/README.md`
- **Agent Memory Repo**: https://cognition.com/agent-memory-repo

## Rules

### General

- Ask questions if you're unsure about something or if the request is very vague.
- If a request seems wrong or doesn't make sense, point it out and ask before going ahead.
- Never look inside `.env`. Assume every variable in `.env.example` is defined in the real `.env`.
- This is a Bun project. Use `bun` and `bunx`. Don't use `npm`, `pnpm`, `yarn`, or any other package manager.
- Prefer running the scripts in `package.json` over running their commands directly.
- When editing a prompt, reason through the patterns before writing. Read how that prompt is shaped, how it fits the other one, and very importantly: how the surrounding code treats the model's output.
- When the prompt is about something specific, research it before writing. The constraints and the wording that works are usually already out there.
- Explain technical things so they make sense. Simple and straightforward, at the level of the idea: one connected explanation, not an answer to each question in turn, and not low-level detail.
- For a decision or a next step, say it in one or two sentences, then only the fact that changes what to do next.
- Use the real names and examples. Skip file tours, caveats, and later plans.
- Repeat the noun when a pronoun would make the reader look back. "It", "that", "they", "this", and "there" are only clear when the referent is the subject of the clause just before. Example: "A new Glacier instance is created in `boot.ts`. The Glacier instance is used in `run.ts`."

### Code

- Write simple code.
- No framework hacks. Use the AI SDK the way it's meant to be used, and do the same for every other library.
- Format with `bunx ultracite fix`; check with `bunx ultracite check`.
- Prefer `unknown` over `any`; use `as const` and type narrowing over assertions.
- Prefer `const`, destructuring, optional chaining, nullish coalescing, template literals, `for...of`, and arrow callbacks.
- Always `await` promises in async functions; prefer `async/await` over promise chains.
- Throw `Error` objects; prefer early returns; no `console.log`/`debugger`/`alert` in production.
- Keep functions focused; extract complex conditions; avoid import cycles and nested ternaries.
- Tests: assertions in `it()`/`test()`, no `.only`/`.skip`, flat suites, async/await over done callbacks.