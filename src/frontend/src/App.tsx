import { useState } from "react";
import { ParentDashboard } from "./components/ParentDashboard";
import { StarAnimation } from "./components/StarAnimation";
import { AlphabetGame } from "./components/games/AlphabetGame";
import { AnimalsGame } from "./components/games/AnimalsGame";
import { BodyPartsGame } from "./components/games/BodyPartsGame";
import { ColorsGame } from "./components/games/ColorsGame";
import { FruitsGame } from "./components/games/FruitsGame";
import { MathGame } from "./components/games/MathGame";
import { NumbersGame } from "./components/games/NumbersGame";
import { RhymesGame } from "./components/games/RhymesGame";
import { ShapesGame } from "./components/games/ShapesGame";
import { SpellingGame } from "./components/games/SpellingGame";
import {
  ALL_SUBJECTS,
  CLASSES,
  MATH_PROBLEMS_CLASS3,
  MATH_PROBLEMS_CLASS4,
} from "./data/kidsData";
import type { Lang } from "./data/kidsData";
import { useProgress } from "./hooks/useProgress";

// Pass class3/class4 math problems via a prop override
type Screen = "home" | "class" | "game";

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [showParent, setShowParent] = useState(false);
  const [starTrigger, setStarTrigger] = useState(0);
  const { progress, addStar, resetProgress, getTotalStars } = useProgress();

  const handleAnswer = (correct: boolean) => {
    if (selectedClass && selectedSubject) {
      addStar(selectedClass, selectedSubject, correct);
      if (correct) setStarTrigger((t) => t + 1);
    }
  };

  const currentClassDef = CLASSES.find((c) => c.id === selectedClass);
  const currentSubjectDef = ALL_SUBJECTS.find((s) => s.id === selectedSubject);
  const spellingLevel = currentClassDef?.spellingLevel ?? 0;

  const renderGame = () => {
    const props = { lang, onAnswer: handleAnswer, classId: selectedClass };
    switch (selectedSubject) {
      case "rhymes":
        return <RhymesGame lang={lang} onAnswer={handleAnswer} />;
      case "alphabet":
        return <AlphabetGame {...props} />;
      case "numbers":
        return <NumbersGame lang={lang} onAnswer={handleAnswer} />;
      case "shapes":
        return <ShapesGame lang={lang} onAnswer={handleAnswer} />;
      case "colors":
        return <ColorsGame lang={lang} onAnswer={handleAnswer} />;
      case "animals":
        return <AnimalsGame lang={lang} onAnswer={handleAnswer} />;
      case "fruits":
        return <FruitsGame lang={lang} onAnswer={handleAnswer} />;
      case "bodyparts":
        return <BodyPartsGame lang={lang} onAnswer={handleAnswer} />;
      case "math":
        return (
          <MathGame lang={lang} onAnswer={handleAnswer} problems={undefined} />
        );
      case "math3":
        return (
          <MathGame
            lang={lang}
            onAnswer={handleAnswer}
            problems={MATH_PROBLEMS_CLASS3}
          />
        );
      case "math4":
        return (
          <MathGame
            lang={lang}
            onAnswer={handleAnswer}
            problems={MATH_PROBLEMS_CLASS4}
          />
        );
      case "spelling":
        return (
          <SpellingGame
            lang={lang}
            onAnswer={handleAnswer}
            spellingLevel={spellingLevel}
          />
        );
      default:
        return null;
    }
  };

  // Subjects for the current class
  const classSubjects = currentClassDef
    ? currentClassDef.subjects
        .map((id) => ALL_SUBJECTS.find((s) => s.id === id))
        .filter(Boolean)
    : [];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(135deg, #FFF8F0 0%, #E8F9FB 50%, #FFFBEA 100%)",
        fontFamily: "'Nunito', 'Poppins', sans-serif",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 shadow-sm"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(8px)",
        }}
      >
        <button
          type="button"
          onClick={() => {
            if (screen === "game") setScreen("class");
            else if (screen === "class") setScreen("home");
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl transition-colors"
          style={{
            color: screen === "home" ? "transparent" : "#F36C2F",
            pointerEvents: screen === "home" ? "none" : "auto",
          }}
        >
          &#9664;
        </button>

        <div className="flex items-center gap-2">
          <span className="text-2xl">🦁</span>
          <span className="font-black text-xl" style={{ color: "#F36C2F" }}>
            KidsLearn
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "hi" : "en")}
            className="px-3 py-1 rounded-full font-bold text-sm border-2 transition-colors"
            style={{
              borderColor: "#F36C2F",
              color: "#F36C2F",
              background: "white",
            }}
          >
            {lang === "en" ? "हिन्दी" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setShowParent(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: "#F7C948" }}
          >
            👨‍👩‍👧
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* HOME */}
        {screen === "home" && (
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="text-6xl mb-2">🦁</div>
              <h1 className="text-3xl font-black" style={{ color: "#F36C2F" }}>
                {lang === "en" ? "KidsLearn" : "बच्चों की पढ़ाई"}
              </h1>
              <p className="text-muted-foreground font-semibold mt-1">
                {lang === "en"
                  ? "Nursery to Class 4 • English & Hindi"
                  : "नर्सरी से कक्षा 4 • अंग्रेजी और हिंदी"}
              </p>
            </div>

            <div className="w-full grid grid-cols-2 gap-3">
              {CLASSES.map((cls) => {
                const stars = getTotalStars(cls.id);
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls.id);
                      setScreen("class");
                    }}
                    className="rounded-3xl p-5 flex flex-col items-center gap-2 font-bold text-white shadow-lg active:scale-95 transition-transform"
                    style={{
                      background: cls.color,
                      boxShadow: `0 6px 0 ${cls.color}99`,
                    }}
                  >
                    <span className="text-4xl">{cls.emoji}</span>
                    <span className="text-lg">
                      {lang === "en" ? cls.label : cls.labelHi}
                    </span>
                    {stars > 0 && (
                      <span className="text-sm font-black">⭐ {stars}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CLASS — subject picker shows only THIS class's subjects */}
        {screen === "class" && currentClassDef && (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <div className="text-4xl mb-1">{currentClassDef.emoji}</div>
              <h2
                className="text-2xl font-black"
                style={{ color: currentClassDef.color }}
              >
                {lang === "en"
                  ? currentClassDef.label
                  : currentClassDef.labelHi}
              </h2>
              <p className="text-muted-foreground font-semibold">
                {lang === "en" ? "Choose a subject" : "विषय चुनें"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {classSubjects.map((sub) => {
                if (!sub) return null;
                const sp = progress[selectedClass]?.[sub.id];
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub.id);
                      setScreen("game");
                    }}
                    className="rounded-3xl p-5 flex flex-col items-center gap-2 font-bold shadow-md active:scale-95 transition-transform"
                    style={{
                      background: sub.bgColor,
                      border: `2px solid ${sub.color}33`,
                    }}
                  >
                    <span className="text-4xl">{sub.emoji}</span>
                    <span
                      className="text-base font-black"
                      style={{ color: sub.color }}
                    >
                      {lang === "en" ? sub.label : sub.labelHi}
                    </span>
                    {sp && sp.stars > 0 && (
                      <span className="text-sm font-bold text-amber-500">
                        ⭐ {sp.stars}
                      </span>
                    )}
                    {sp?.completed && <span className="text-sm">🏆</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* GAME */}
        {screen === "game" && currentClassDef && currentSubjectDef && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <span
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white text-sm"
                style={{ background: currentSubjectDef.color }}
              >
                {currentSubjectDef.emoji}{" "}
                {lang === "en"
                  ? currentSubjectDef.label
                  : currentSubjectDef.labelHi}
              </span>
            </div>
            {renderGame()}
          </div>
        )}
      </main>

      <StarAnimation trigger={starTrigger} />

      {showParent && (
        <ParentDashboard
          lang={lang}
          progress={progress}
          onClose={() => setShowParent(false)}
          onReset={() => {
            resetProgress();
            setShowParent(false);
          }}
        />
      )}
    </div>
  );
}
