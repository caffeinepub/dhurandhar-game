import { useState } from "react";
import { NUMBERS } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";

interface NumbersGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

export function NumbersGame({ lang, onAnswer }: NumbersGameProps) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const item = NUMBERS[index];
  const correct = item.num;

  const genOptions = (num: number): number[] => {
    const opts = new Set<number>([num]);
    while (opts.size < 3) {
      const r = Math.max(1, num + Math.floor(Math.random() * 5) - 2);
      if (r !== num && r >= 1 && r <= 20) opts.add(r);
    }
    return [...opts].sort(() => Math.random() - 0.5);
  };

  const [options] = useState(() => genOptions(correct));
  const [opts, setOpts] = useState<number[]>(options);

  const handleSelect = (opt: number) => {
    if (selected !== null) return;
    setSelected(opt);
    onAnswer(opt === correct);
    setTimeout(() => {
      const ni = (index + 1) % NUMBERS.length;
      setIndex(ni);
      setSelected(null);
      setOpts(genOptions(NUMBERS[ni].num));
    }, 1200);
  };

  const displayEmoji =
    item.num <= 10 ? item.emojis : `${item.emojis.split("x")[0]} × ${item.num}`;

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="numbers.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-6 flex flex-col items-center gap-4">
        <div
          className="text-6xl font-black"
          style={{ color: "#25B7C7", textShadow: "2px 4px 0 #1A8A97" }}
        >
          {item.num}
        </div>
        <div className="text-4xl text-center leading-snug min-h-[4rem]">
          {displayEmoji}
        </div>
        <div className="text-xl font-bold text-foreground">
          {lang === "en" ? item.wordEn : item.wordHi}
        </div>
      </div>

      <p className="font-bold text-lg text-foreground">
        {lang === "en" ? "How many? 🤔" : "कितने हैं? 🤔"}
      </p>

      <div className="flex gap-3">
        {opts.map((opt, i) => {
          let bg = "bg-white border-2 border-border text-foreground";
          if (selected !== null) {
            if (opt === correct)
              bg = "bg-kids-green border-kids-green text-white";
            else if (opt === selected)
              bg = "bg-destructive border-destructive text-white";
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-16 h-16 rounded-2xl font-black text-2xl transition-transform active:scale-90 shadow-card ${bg}`}
              data-ocid={`numbers.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en" ? `Number ${index + 1} of 20` : `संख्या ${index + 1} / 20`}
      </div>
    </div>
  );
}
