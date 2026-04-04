import { useCallback, useState } from "react";
import { MATH_PROBLEMS } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";

interface MathGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

function getOptions(correct: number): number[] {
  const opts = new Set<number>([correct]);
  while (opts.size < 3) {
    const r = Math.max(0, correct + Math.floor(Math.random() * 7) - 3);
    if (r !== correct) opts.add(r);
  }
  return [...opts].sort(() => Math.random() - 0.5);
}

function StarRow({
  count,
  dim = false,
  prefix = "",
}: { count: number; dim?: boolean; prefix?: string }) {
  const items: React.ReactNode[] = [];
  for (let n = 1; n <= count; n++) {
    items.push(
      <span key={`${prefix}-${n}`} className={dim ? "opacity-30" : ""}>
        {n % 2 === 0 ? "🌟" : "⭐"}
      </span>,
    );
  }
  return <>{items}</>;
}

export function MathGame({ lang, onAnswer }: MathGameProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const problem = MATH_PROBLEMS[index];
  const correct =
    problem.op === "+" ? problem.a + problem.b : problem.a - problem.b;
  const [opts, setOpts] = useState<number[]>(() => getOptions(correct));

  const handleSelect = useCallback(
    (opt: number) => {
      if (selected !== null) return;
      setSelected(opt);
      onAnswer(opt === correct);
      setTimeout(() => {
        const ni = (index + 1) % MATH_PROBLEMS.length;
        setIndex(ni);
        setSelected(null);
        const newP = MATH_PROBLEMS[ni];
        const newCorrect = newP.op === "+" ? newP.a + newP.b : newP.a - newP.b;
        setOpts(getOptions(newCorrect));
      }, 1200);
    },
    [selected, correct, index, onAnswer],
  );

  const aCount = Math.min(problem.a, 10);
  const bCount = Math.min(problem.b, 10);

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="math.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4">
        <div
          className="text-5xl font-black tracking-wide"
          style={{ color: "#F36C2F" }}
        >
          {problem.a} {problem.op} {problem.b} = ?
        </div>
        <div className="text-2xl">
          <StarRow count={aCount} prefix="a" />
          {problem.op === "+" && (
            <>
              {" "}
              + <StarRow count={bCount} prefix="b" />
            </>
          )}
          {problem.op === "-" && (
            <>
              {" "}
              - <StarRow count={bCount} dim prefix="b" />
            </>
          )}
        </div>
        <p className="text-muted-foreground font-semibold">
          {lang === "en" ? "What is the answer?" : "जवाब क्या है?"}
        </p>
      </div>

      <div className="flex gap-4">
        {opts.map((opt, i) => {
          let cls = "bg-white border-2 border-border text-foreground";
          if (selected !== null) {
            if (opt === correct)
              cls = "bg-kids-green border-kids-green text-white";
            else if (opt === selected)
              cls = "bg-destructive border-destructive text-white";
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-20 h-20 rounded-2xl font-black text-2xl transition-transform active:scale-90 shadow-card ${cls}`}
              data-ocid={`math.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en"
          ? `Problem ${index + 1} of ${MATH_PROBLEMS.length}`
          : `प्रश्न ${index + 1} / ${MATH_PROBLEMS.length}`}
      </div>
    </div>
  );
}
