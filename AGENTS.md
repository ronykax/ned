# Ned

Ned is a personal agent. Learn more about this project in `README.md`.

## Index

- **AI SDK**: `ai-sdk` skill
- **Glacier**: `glacier/README.md`
- **Agent Memory Repo**: https://cognition.com/agent-memory-repo

## Rules

### General

- Ask questions if you're unsure about something or if the request isn't specific enough.
- The user is usually very specific about what they want, so don't do anything they didn't ask for. But if a request seems wrong or doesn't make sense, point it out and ask before going ahead.
- Never look inside `.env`. Assume every variable in `.env.example` is defined in the real `.env`.
- This is a Bun project. Use `bun` and `bunx`. Don't use `npm`, `pnpm`, `yarn`, or any other package manager.
- Prefer running the scripts in `package.json` over running their commands directly.
- When editing a prompt, reason through the patterns before writing. The system prompt is `instructions` in `src/agent.ts`. Each file under `src/channels` has its own `instructions`, appended as `extraInstructions`. Read how that prompt is shaped, how it fits the other one, and very importantly: how the surrounding code treats the model's output.
- When the prompt is about something specific, research it before writing. The constraints and the wording that works are usually already out there.

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