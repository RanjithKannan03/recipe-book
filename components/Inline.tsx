/** Renders the small amount of inline Markdown the recipes use: **bold**, *italic* and {scaled amounts}. */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\{[^}]+\})/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.length > 4 && p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.length > 2 && p.startsWith("{") && p.endsWith("}")) {
          return (
            <span key={i} className="rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-accent tabular-nums">
              {p.slice(1, -1)}
            </span>
          );
        }
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*")) {
          return (
            <em key={i} className="text-muted">
              {p.slice(1, -1)}
            </em>
          );
        }
        return p;
      })}
    </>
  );
}
