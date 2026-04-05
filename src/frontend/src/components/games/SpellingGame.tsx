import { useCallback, useEffect, useState } from "react";
import { SPELLING_WORDS } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";
import { speakSpelling, speakWord } from "../../utils/speech";

interface SpellingGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
  spellingLevel: number;
}

function getLetterOptions(correct: string): string[] {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const opts = new Set<string>([correct]);
  while (opts.size < 4) {
    const r = alphabet[Math.floor(Math.random() * alphabet.length)];
    if (r !== correct) opts.add(r);
  }
  return [...opts].sort(() => Math.random() - 0.5);
}

export function SpellingGame({
  lang,
  onAnswer,
  spellingLevel,
}: SpellingGameProps) {
  const levelWords = SPELLING_WORDS.filter(
    (w) => w.classLevel === spellingLevel,
  );
  const words = levelWords.length > 0 ? levelWords : SPELLING_WORDS.slice(0, 7);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [spellingDone, setSpellingDone] = useState(false);

  const item = words[index % words.length];
  const correctLetter = item.word[item.missingIndex];

  const [opts, setOpts] = useState<string[]>(() =>
    getLetterOptions(correctLetter),
  );

  // Speak the word when card loads
  useEffect(() => {
    const timer = setTimeout(() => speakWord(item.word, "en"), 400);
    return () => clearTimeout(timer);
  }, [item.word]);

  const displayWord = item.word
    .split("")
    .map((ch, i) => (i === item.missingIndex ? "_" : ch))
    .join(" ");

  const handleSelect = useCallback(
    (opt: string) => {
      if (selected) return;
      setSelected(opt);
      const isCorrect = opt === correctLetter;
      onAnswer(isCorrect);

      if (isCorrect) {
        setSpellingDone(true);
        // Spell the word out loud then say the whole word
        speakSpelling(item.word, () => {
          setSpellingDone(false);
        });
      }

      setTimeout(() => {
        const ni = (index + 1) % words.length;
        setIndex(ni);
        setSelected(null);
        setSpellingDone(false);
        const nextItem = words[ni % words.length];
        setOpts(getLetterOptions(nextItem.word[nextItem.missingIndex]));
      }, 2800);
    },
    [selected, correctLetter, index, words, onAnswer, item.word],
  );

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="spelling.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-4">
        <div className="text-8xl">{item.emoji}</div>

        {/* Completed word with animation */}
        {spellingDone ? (
          <div
            className="text-3xl font-black tracking-[0.2em] px-4 py-2 rounded-2xl"
            style={{
              color: "#22C55E",
              background: "#E8F8EE",
              border: "2px solid #22C55E",
            }}
          >
            {item.word} ✅
          </div>
        ) : (
          <div
            className="text-3xl font-black tracking-[0.3em]"
            style={{ color: "#25B7C7" }}
          >
            {displayWord}
          </div>
        )}

        {spellingDone && (
          <p className="text-sm font-bold" style={{ color: "#22C55E" }}>
            🔊 {lang === "en" ? "Listen to the spelling!" : "वर्तनी सुनें!"}
          </p>
        )}

        {!spellingDone && (
          <p className="text-muted-foreground font-semibold text-sm">
            {lang === "en" ? "Fill in the missing letter!" : "खाली जगह भरें!"}
          </p>
        )}

        {/* Tap to hear word */}
        <button
          type="button"
          onClick={() => speakWord(item.word, "en")}
          className="text-xs font-bold px-3 py-1 rounded-full active:scale-95 transition-transform"
          style={{ background: "#E8F9FB", color: "#25B7C7" }}
        >
          🔊 {lang === "en" ? "Hear the word" : "शब्द सुनें"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 w-full max-w-xs">
        {opts.map((opt, i) => {
          let cls = "bg-white border-2 border-border text-foreground";
          if (selected) {
            if (opt === correctLetter)
              cls = "bg-kids-green border-kids-green text-white";
            else if (opt === selected)
              cls = "bg-destructive border-destructive text-white";
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`h-14 rounded-2xl font-black text-xl transition-transform active:scale-90 shadow-card ${cls}`}
              data-ocid={`spelling.option.${i + 1}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {lang === "en"
          ? `Word ${(index % words.length) + 1} of ${words.length}`
          : `शब्द ${(index % words.length) + 1} / ${words.length}`}
      </div>
    </div>
  );
}
