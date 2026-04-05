import { useCallback, useState } from "react";
import { BODY_PARTS } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";
import { speakWord } from "../../utils/speech";

interface BodyPartsGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

function getOptions(lang: Lang, correctIdx: number): string[] {
  const correct =
    lang === "en" ? BODY_PARTS[correctIdx].name : BODY_PARTS[correctIdx].nameHi;
  const pool = BODY_PARTS.filter((_, i) => i !== correctIdx).map((b) =>
    lang === "en" ? b.name : b.nameHi,
  );
  const wrong = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  return [correct, ...wrong].sort(() => Math.random() - 0.5);
}

export function BodyPartsGame({ lang, onAnswer }: BodyPartsGameProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [opts, setOpts] = useState<string[]>(() => getOptions(lang, 0));

  const item = BODY_PARTS[index];
  const correct = lang === "en" ? item.name : item.nameHi;

  const handleSelect = useCallback(
    (opt: string) => {
      if (selected) return;
      setSelected(opt);
      const isCorrect = opt === correct;
      onAnswer(isCorrect);
      if (isCorrect) speakWord(item.name, "en");
      setTimeout(() => {
        const ni = (index + 1) % BODY_PARTS.length;
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
      data-ocid="bodyparts.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4">
        <div className="text-9xl">{item.emoji}</div>
        <p className="font-bold text-lg text-muted-foreground">
          {lang === "en"
            ? "Which body part is this?"
            : "यह कौन सा शरीर का अंग है?"}
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
              data-ocid={`bodyparts.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en"
          ? `Part ${index + 1} of ${BODY_PARTS.length}`
          : `अंग ${index + 1} / ${BODY_PARTS.length}`}
      </div>
    </div>
  );
}
