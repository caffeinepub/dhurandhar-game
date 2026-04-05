import { useState } from "react";
import { NURSERY_RHYMES } from "../../data/kidsData";
import type { Lang } from "../../data/kidsData";
import { speakRhymeLine } from "../../utils/speech";

interface RhymesGameProps {
  lang: Lang;
  onAnswer: (correct: boolean) => void;
}

export function RhymesGame({ lang, onAnswer }: RhymesGameProps) {
  const [rhymeIndex, setRhymeIndex] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [playing, setPlaying] = useState(false);

  const rhyme = NURSERY_RHYMES[rhymeIndex];
  const lines = lang === "en" ? rhyme.lines : rhyme.linesHi;

  const playLine = (idx: number) => {
    setCurrentLine(idx);
    speakRhymeLine(lines[idx], lang);
  };

  const playAll = () => {
    if (playing) return;
    setPlaying(true);
    setCurrentLine(0);
    let i = 0;
    const next = () => {
      if (i < lines.length) {
        setCurrentLine(i);
        speakRhymeLine(lines[i], lang);
        i++;
        setTimeout(next, 2200);
      } else {
        setPlaying(false);
        onAnswer(true);
      }
    };
    next();
  };

  const prev = () => {
    setRhymeIndex(
      (r) => (r - 1 + NURSERY_RHYMES.length) % NURSERY_RHYMES.length,
    );
    setCurrentLine(0);
    setPlaying(false);
  };

  const goNext = () => {
    setRhymeIndex((r) => (r + 1) % NURSERY_RHYMES.length);
    setCurrentLine(0);
    setPlaying(false);
  };

  return (
    <div
      className="flex flex-col items-center gap-5 py-4"
      data-ocid="rhymes.card"
    >
      {/* Rhyme selector tabs */}
      <div className="flex gap-2 flex-wrap justify-center">
        {NURSERY_RHYMES.map((r, i) => (
          <button
            key={r.title}
            type="button"
            onClick={() => {
              setRhymeIndex(i);
              setCurrentLine(0);
              setPlaying(false);
            }}
            className="px-3 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: i === rhymeIndex ? "#F36C2F" : "#FFF3ED",
              color: i === rhymeIndex ? "white" : "#F36C2F",
              border: "2px solid #F36C2F",
            }}
          >
            {r.emoji} {lang === "en" ? r.title : r.titleHi}
          </button>
        ))}
      </div>

      {/* Rhyme card */}
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-card p-6 flex flex-col items-center gap-3"
        style={{ border: "2px solid #FDE8D8" }}
      >
        <div className="text-5xl">{rhyme.emoji}</div>
        <h3 className="text-xl font-black" style={{ color: "#F36C2F" }}>
          {lang === "en" ? rhyme.title : rhyme.titleHi}
        </h3>

        <div className="w-full flex flex-col gap-1 mt-2">
          {lines.map((line, i) => {
            const lineKey = `${rhymeIndex}-${line.slice(0, 12)}`;
            return (
              <button
                key={lineKey}
                type="button"
                onClick={() => playLine(i)}
                className="w-full text-left px-3 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{
                  background:
                    i === currentLine && playing ? "#FDE8D8" : "transparent",
                  color: i === currentLine && playing ? "#F36C2F" : "#374151",
                  fontWeight: i === currentLine && playing ? "800" : "600",
                  fontSize: "0.95rem",
                }}
              >
                {line} <span className="text-base">🔊</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={prev}
          className="w-12 h-12 rounded-full bg-white shadow-card font-bold text-xl flex items-center justify-center active:scale-90"
        >
          ◀
        </button>

        <button
          type="button"
          onClick={playAll}
          disabled={playing}
          className="px-6 py-3 rounded-pill font-bold text-white text-base transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: "#F36C2F", boxShadow: "0 4px 0 #C8551F" }}
          data-ocid="rhymes.play_button"
        >
          {playing ? "▶ Playing..." : "▶ Play Rhyme 🎵"}
        </button>

        <button
          type="button"
          onClick={goNext}
          className="w-12 h-12 rounded-full bg-white shadow-card font-bold text-xl flex items-center justify-center active:scale-90"
        >
          ▶
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        {lang === "en"
          ? "Tap any line to hear it, or press Play to hear the full rhyme"
          : "किसी भी लाइन पर टैप करें या पूरी कविता सुनने के लिए Play दबाएं"}
      </p>
    </div>
  );
}
