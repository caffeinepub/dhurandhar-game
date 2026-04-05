// Web Speech API utilities for KidsLearn

export function speakText(text: string, lang: "en" | "hi" = "en") {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === "hi" ? "hi-IN" : "en-US";
  utter.rate = 0.85;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

export function speakLetter(letter: string) {
  speakText(letter, "en");
}

export function speakWord(word: string, lang: "en" | "hi" = "en") {
  speakText(word, lang);
}

export function speakSpelling(word: string, callback?: () => void) {
  if (!window.speechSynthesis) {
    callback?.();
    return;
  }
  window.speechSynthesis.cancel();
  // Spell it out letter by letter
  const letters = word.split("");
  let i = 0;
  const speakNext = () => {
    if (i < letters.length) {
      const utter = new SpeechSynthesisUtterance(letters[i]);
      utter.lang = "en-US";
      utter.rate = 0.8;
      utter.onend = () => {
        i++;
        setTimeout(speakNext, 100);
      };
      window.speechSynthesis.speak(utter);
    } else {
      // After spelling, say the whole word
      setTimeout(() => {
        const utter = new SpeechSynthesisUtterance(word);
        utter.lang = "en-US";
        utter.rate = 0.85;
        utter.onend = () => callback?.();
        window.speechSynthesis.speak(utter);
      }, 300);
    }
  };
  speakNext();
}

export function speakRhymeLine(line: string, lang: "en" | "hi" = "en") {
  speakText(line, lang);
}
