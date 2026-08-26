# Commit Rules for AI Agents

Follow these rules strictly when committing.

## Format

- Use Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`
- Scope is optional but recommended

## Description Rules

- First line: short summary (≤50 chars)
- Body: use bullet points, each pointer is ONE line
- No paragraphs. No essays. No "this PR adds..." fluff.

## Grouping Rules

- DO NOT commit everything at once
- Group related files into logical commits
- One feature/fix per commit
- Keep commits atomic and focused

## Example

```
feat(landing): add Hero and Navbar sections

- Add Hero with gradient headline and CTA button
- Add Navbar with scroll-aware background blur
- Add Logo component with shield icon
```

## Before Committing

1. Run `git status` to see changed files
2. Group related files together
3. Write a clear, concise message
4. Verify with `git diff --staged` before pushing
