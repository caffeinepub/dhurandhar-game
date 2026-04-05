import { useCallback, useState } from "react";
import { ALPHABET } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";
import { speakLetter, speakWord } from "../../utils/speech";

interface AlphabetGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
  classId: string;
}

export function AlphabetGame({
  lang,
  onAnswer,
  classId: _classId,
}: AlphabetGameProps) {
  const [index, setIndex] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);

  const item = ALPHABET[index];

  const generateOptions = useCallback(
    (idx: number) => {
      const correct = lang === "en" ? ALPHABET[idx].word : ALPHABET[idx].wordHi;
      const pool = ALPHABET.filter((_, i) => i !== idx).map((a) =>
        lang === "en" ? a.word : a.wordHi,
      );
      const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 2);
      const opts = [correct, ...shuffled].sort(() => Math.random() - 0.5);
      setQuizOptions(opts);
      setSelectedOption(null);
    },
    [lang],
  );

  const startQuiz = () => {
    generateOptions(index);
    setQuizMode(true);
  };

  // Speak the letter and word when card is shown
  const handleSpeak = () => {
    speakLetter(item.letter);
    setTimeout(() => speakWord(item.word, "en"), 700);
  };

  const handleOption = (opt: string) => {
    if (selectedOption) return;
    const correct = lang === "en" ? item.word : item.wordHi;
    setSelectedOption(opt);
    const isCorrect = opt === correct;
    onAnswer(isCorrect);
    if (isCorrect) speakWord(item.word, "en");
    setTimeout(() => {
      setQuizMode(false);
      setSelectedOption(null);
    }, 1200);
  };

  const prev = () => {
    const ni = (index - 1 + ALPHABET.length) % ALPHABET.length;
    setIndex(ni);
    setQuizMode(false);
    setSelectedOption(null);
  };

  const next = () => {
    const ni = (index + 1) % ALPHABET.length;
    setIndex(ni);
    setQuizMode(false);
    setSelectedOption(null);
  };

  return (
    <div
      className="flex flex-col items-center gap-6 py-4"
      data-ocid="alphabet.card"
    >
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-card p-8 flex flex-col items-center gap-3">
        {/* Letter — tap to hear */}
        <button
          type="button"
          onClick={handleSpeak}
          className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
          title="Tap to hear"
        >
          <div
            className="text-7xl font-black"
            style={{ color: "#F36C2F", textShadow: "2px 4px 0 #C8551F" }}
          >
            {lang === "en" ? item.letter : item.letterHi}
          </div>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: "#FFF3ED", color: "#F36C2F" }}
          >
            🔊 {lang === "en" ? "Tap to hear" : "सुनने के लिए टैप करें"}
          </span>
        </button>

        <div className="text-8xl">{item.emoji}</div>
        <div className="text-2xl font-bold text-foreground">
          {lang === "en" ? item.word : item.wordHi}
        </div>
        <div className="text-sm text-muted-foreground">
          {lang === "en"
            ? `Letter ${index + 1} of 26`
            : `अक्षर ${index + 1} / 26`}
        </div>
      </div>

      {quizMode ? (
        <div
          className="w-full max-w-xs flex flex-col gap-3"
          data-ocid="alphabet.quiz.panel"
        >
          <p className="text-center font-bold text-lg text-foreground">
            {lang === "en" ? "What word starts with" : "कौन सा शब्द शुरू होता है"}{" "}
            <span style={{ color: "#F36C2F" }}>
              {lang === "en" ? item.letter : item.letterHi}
            </span>
            ?
          </p>
          {quizOptions.map((opt, i) => {
            const correct = lang === "en" ? item.word : item.wordHi;
            let bg = "bg-white border-2 border-border";
            if (selectedOption === opt) {
              bg =
                opt === correct
                  ? "bg-kids-green border-kids-green text-white"
                  : "bg-destructive border-destructive text-white";
            } else if (selectedOption && opt === correct) {
              bg = "bg-kids-green border-kids-green text-white";
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleOption(opt)}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-lg transition-transform active:scale-95 ${bg}`}
                data-ocid={`alphabet.quiz.option.${i + 1}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={startQuiz}
          className="px-8 py-3 rounded-pill font-bold text-white text-lg transition-transform active:scale-95"
          style={{ backgroundColor: "#F36C2F", boxShadow: "0 4px 0 #C8551F" }}
          data-ocid="alphabet.quiz_button"
        >
          {lang === "en" ? "Quiz Me! 🎯" : "क्विज़ खेलें! 🎯"}
        </button>
      )}

      <div className="flex gap-4 mt-2">
        <button
          type="button"
          onClick={prev}
          className="w-14 h-14 rounded-full bg-white shadow-card font-bold text-xl text-foreground flex items-center justify-center transition-transform active:scale-90 hover:shadow-card-hover"
          data-ocid="alphabet.prev_button"
        >
          ◀
        </button>
        <div className="flex items-center gap-1">
          {ALPHABET.slice(0, 13).map((letter) => (
            <div
              key={letter.letter}
              className="w-2 h-2 rounded-full transition-colors"
              style={{
                backgroundColor:
                  ALPHABET.indexOf(letter) === index ? "#F36C2F" : "#D0E4F0",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={next}
          className="w-14 h-14 rounded-full bg-white shadow-card font-bold text-xl text-foreground flex items-center justify-center transition-transform active:scale-90 hover:shadow-card-hover"
          data-ocid="alphabet.next_button"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
