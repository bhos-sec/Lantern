## Contributing

Thanks for your interest in contributing to Lantern. This guide explains how to
set up the project, make changes, and submit them cleanly.

### Code of Conduct

By participating, you agree to follow the Code of Conduct in
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

### Ways to Contribute

- Fix bugs or regressions
- Improve UX, accessibility, or performance
- Add tests or better developer tooling
- Improve documentation

If you are unsure where to start, open an issue with your idea first.

### Development Setup

Prerequisites:

- Node.js 18+
- npm (or your preferred compatible package manager)

Install dependencies:

```bash
npm install
```

Environment variables:

```bash
cp .env.example .env.local
```

`GEMINI_API_KEY` and `APP_URL` are optional for local development.

Run the dev server (Vite + Node + Socket.IO):

```bash
npm run dev
```

### Useful Scripts

- `npm run dev` - Start the server with Vite middleware
- `npm run build` - Build the client
- `npm run preview` - Preview the production build
- `npm run lint` - Typecheck with `tsc --noEmit`
- `npm run format` - Format files with Prettier
- `npm run format:check` - Verify formatting

### Project Layout

- `server/` - Express + Socket.IO backend
- `shared/` - Shared types for socket payloads
- `src/` - React app (pages, hooks, components)
- `public/` - Static assets + PWA manifest

### Branch and PR Guidelines

- Create a feature branch from `main`.
- Keep changes focused and scoped to one topic.
- Update or add documentation when behavior changes.
- Include screenshots or short clips for UI changes, if possible.

#### Git Workflow Commands

Create and switch to a new branch:

```bash
git switch -c feature/short-description
```

Pull the latest `main` before starting:

```bash
git fetch origin
git switch main
git pull --ff-only
git switch feature/short-description
git merge --ff-only main
```

Stage and commit your work:

```bash
git add -A
git commit -m "Describe your change"
```

Push your branch (first time):

```bash
git push -u origin feature/short-description
```

Update your branch later with latest `main`:

```bash
git fetch origin
git switch main
git pull --ff-only
git switch feature/short-description
git merge --ff-only main
```

Push subsequent commits:

```bash
git push
```

### Code Style and Formatting

This repo uses Prettier and EditorConfig for consistent formatting.

- Run `npm run format` before pushing.
- Avoid manual formatting if a change is noisy.

### Type Safety

Run `npm run lint` to ensure types are valid before opening a PR.

### Adding or Updating Features

- For server work, keep business logic in `server/services/`.
- For new socket events, add handlers in `server/socket/handlers/` and types in
  `shared/types.ts`.
- For client features, prefer hooks in `src/hooks/` and UI in `src/components/`.

### Security

If you find a security issue, please avoid opening a public issue. Instead,
contact the maintainers privately via GitHub.

### Licensing

By contributing, you agree that your contributions will be licensed under the
MIT License (see [LICENSE](LICENSE)).
