import { useEffect, useState } from "react";

interface FeedbackBannerProps {
  type: "correct" | "wrong" | null;
  lang: "en" | "hi";
}

export function FeedbackBanner({ type, lang }: FeedbackBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 1800);
      return () => clearTimeout(t);
    }
  }, [type]);

  if (!visible || !type) return null;

  const isCorrect = type === "correct";

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-pill font-bold text-lg text-white shadow-lg animate-bounce-in ${
        isCorrect ? "bg-kids-green" : "bg-destructive"
      }`}
      data-ocid="feedback.toast"
    >
      {isCorrect
        ? lang === "en"
          ? "✅ Great! शाबाश! ⭐"
          : "✅ शाबाश! बहुत अच्छे! ⭐"
        : lang === "en"
          ? "❌ Try Again! फिर कोशिश करो 💪"
          : "❌ फिर कोशिश करो! 💪"}
    </div>
  );
}
