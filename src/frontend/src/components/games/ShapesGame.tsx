import { useCallback, useState } from "react";
import { SHAPES } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";

interface ShapesGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

function getOptions(lang: Lang, correctIdx: number): string[] {
  const correct =
    lang === "en" ? SHAPES[correctIdx].name : SHAPES[correctIdx].nameHi;
  const pool = SHAPES.filter((_, i) => i !== correctIdx).map((s) =>
    lang === "en" ? s.name : s.nameHi,
  );
  const wrong = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  return [correct, ...wrong].sort(() => Math.random() - 0.5);
}

export function ShapesGame({ lang, onAnswer }: ShapesGameProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [opts, setOpts] = useState<string[]>(() => getOptions(lang, 0));

  const item = SHAPES[index];
  const correct = lang === "en" ? item.name : item.nameHi;

  const handleSelect = useCallback(
    (opt: string) => {
      if (selected) return;
      setSelected(opt);
      onAnswer(opt === correct);
      setTimeout(() => {
        const ni = (index + 1) % SHAPES.length;
        setIndex(ni);
        setSelected(null);
        setOpts(getOptions(lang, ni));
      }, 1200);
    },
    [selected, correct, index, lang, onAnswer],
  );

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="shapes.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4">
        <div className="text-9xl">{item.emoji}</div>
        <p className="font-bold text-lg text-muted-foreground">
          {lang === "en" ? "What shape is this?" : "यह कौन सा आकार है?"}
        </p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {opts.map((opt, i) => {
          let cls = "bg-white border-2 border-border text-foreground";
          if (selected) {
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
              className={`w-full py-3 px-4 rounded-2xl font-bold text-lg transition-transform active:scale-95 shadow-card ${cls}`}
              data-ocid={`shapes.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en"
          ? `Shape ${index + 1} of ${SHAPES.length}`
          : `आकार ${index + 1} / ${SHAPES.length}`}
      </div>
    </div>
  );
}
