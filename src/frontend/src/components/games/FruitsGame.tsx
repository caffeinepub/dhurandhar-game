import { useCallback, useState } from "react";
import { FRUITS } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";
import { speakWord } from "../../utils/speech";

interface FruitsGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

function getOptions(lang: Lang, correctIdx: number): string[] {
  const correct =
    lang === "en" ? FRUITS[correctIdx].name : FRUITS[correctIdx].nameHi;
  const pool = FRUITS.filter((_, i) => i !== correctIdx).map((f) =>
    lang === "en" ? f.name : f.nameHi,
  );
  const wrong = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...wrong].sort(() => Math.random() - 0.5);
}

export function FruitsGame({ lang, onAnswer }: FruitsGameProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [opts, setOpts] = useState<string[]>(() => getOptions(lang, 0));

  const item = FRUITS[index];
  const correct = lang === "en" ? item.name : item.nameHi;

  const handleSelect = useCallback(
    (opt: string) => {
      if (selected) return;
      setSelected(opt);
      const isCorrect = opt === correct;
      onAnswer(isCorrect);
      if (isCorrect) speakWord(item.name, "en");
      setTimeout(() => {
        const ni = (index + 1) % FRUITS.length;
        setIndex(ni);
        setSelected(null);
        setOpts(getOptions(lang, ni));
      }, 1200);
    },
    [selected, correct, index, lang, onAnswer, item.name],
  );

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="fruits.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4">
        <div className="text-9xl">{item.emoji}</div>
        <p className="font-bold text-lg text-muted-foreground">
          {lang === "en" ? "What fruit is this?" : "यह कौन सा फल है?"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
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
              className={`py-3 px-2 rounded-2xl font-bold text-base transition-transform active:scale-95 shadow-card ${cls}`}
              data-ocid={`fruits.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en"
          ? `Fruit ${index + 1} of ${FRUITS.length}`
          : `फल ${index + 1} / ${FRUITS.length}`}
      </div>
    </div>
  );
}
