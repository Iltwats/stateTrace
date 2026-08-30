export function App() {
  return (
    <main className="app-shell">
      <header className="hero-panel">
        <p className="eyebrow">WebMCP transaction observatory</p>
        <h1>StateTrace</h1>
        <p className="hero-copy">
          See what the interface claims, what actually committed, and what an
          agent should do next.
        </p>
      </header>

      <section className="scaffold-card" aria-label="Implementation status">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <strong>Transaction engine initializing</strong>
          <p>The deterministic StateTrace workspace is being assembled.</p>
        </div>
      </section>
    </main>
  );
}

