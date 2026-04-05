export function InlineDiff({ diff }: { diff: string }) {
  if (!diff || diff === "(no diff available)") {
    return (
      <div className="mb-1 ms-5 me-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-[10px] text-foreground/35 italic">
        No diff available for this file
      </div>
    );
  }
  const lines = diff.split("\n");
  const contentLines = lines.filter(
    (l) => !l.startsWith("diff ") && !l.startsWith("index ") && !l.startsWith("---") && !l.startsWith("+++") && !l.startsWith("\\"),
  );
  return (
    <div className="mb-1 ms-5 me-2 overflow-hidden rounded-md border border-foreground/[0.08] bg-background/40">
      <div className="border-b border-foreground/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        Changes Preview
      </div>
      <pre className="max-h-72 overflow-auto font-mono text-[10px] leading-[1.6]">
        {contentLines.map((line, i) => {
          let textColor = "text-foreground/50";
          let bgColor = "";
          if (line.startsWith("+")) {
            textColor = "text-emerald-700 dark:text-emerald-300/90";
            bgColor = "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.06]";
          } else if (line.startsWith("-")) {
            textColor = "text-red-700 dark:text-red-300/90";
            bgColor = "bg-red-500/[0.08] dark:bg-red-500/[0.06]";
          } else if (line.startsWith("@@")) {
            textColor = "text-blue-600/70 dark:text-blue-300/70";
            bgColor = "bg-blue-500/[0.06] dark:bg-blue-500/[0.04]";
          }
          return (
            <div key={i} className={`px-2.5 ${textColor} ${bgColor}`}>{line || " "}</div>
          );
        })}
      </pre>
    </div>
  );
}
