"use client";

/** Last resort: an error in the root layout itself (no translations or styles are available here). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, background: "#fff", color: "#111", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "10vh auto", padding: 24 }} role="alert">
          <h1 style={{ fontSize: 20 }}>Algo correu mal / Something went wrong</h1>
          <pre style={{ background: "#f3f3f3", padding: 12, borderRadius: 8, whiteSpace: "pre-wrap", fontSize: 12 }}>
            {error.message}
            {error.digest ? `\nref: ${error.digest}` : ""}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{ height: 44, padding: "0 20px", border: 0, borderRadius: 12, background: "#ff5a00", color: "#fff", fontWeight: 600 }}
          >
            Tentar novamente / Retry
          </button>
        </div>
      </body>
    </html>
  );
}
