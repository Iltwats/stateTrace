# Deployment

StateTrace is a static client application. It has no application server,
database, API key, or required environment variables.

**Production:** https://state-trace.vercel.app/

## Vercel

Connect the GitHub repository to Vercel. The default Vite settings are enough:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`
- Node.js: 22

Every production-branch push can then deploy automatically through Vercel's Git
integration. Vercel Analytics and Speed Insights are already initialized in the
application.

For a command-line deployment:

```bash
npm install --global vercel
vercel
vercel --prod
```

## Another static host

Build the site and publish the contents of `dist/`:

```bash
npm ci
npm run build
```

StateTrace has no client-side route configuration, so a rewrite rule is not
required.

## Local verification

Run the development server:

```bash
npm run dev
```

Open `http://localhost:5173`. To inspect the exact production bundle locally:

```bash
npm run build
npm run preview
```

Before deploying, verify:

- The landing page and checkout demo render without console errors.
- The header reports six WebMCP tools when the browser supports WebMCP.
- Manual checkout interaction still works when WebMCP is unavailable.
- Agent mutations create visible activity entries and automatic checkpoints.
- Restoring a checkpoint returns the form to the recorded values.
