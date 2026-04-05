import { useState } from "react";
import { ALL_SUBJECTS, CLASSES } from "../data/kidsData";
import type { Lang } from "../data/kidsData";
import type { AllProgress } from "../hooks/useProgress";

interface ParentDashboardProps {
  lang: Lang;
  progress: AllProgress;
  onClose: () => void;
  onReset: () => void;
}

const PARENT_PIN = "1234";

export function ParentDashboard({
  lang,
  progress,
  onClose,
  onReset,
}: ParentDashboardProps) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handlePinKey = (key: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + key;
    setPin(newPin);
    setError(false);
    if (newPin.length === 4) {
      if (newPin === PARENT_PIN) {
        setUnlocked(true);
      } else {
        setError(true);
        setTimeout(() => setPin(""), 700);
      }
    }
  };

  if (!unlocked) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        data-ocid="parent.modal"
      >
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-card-hover">
          <button
            type="button"
            onClick={onClose}
            className="float-right text-muted-foreground text-xl font-bold"
            data-ocid="parent.close_button"
          >
            ✕
          </button>
          <h2
            className="text-2xl font-black text-center mb-2"
            style={{ color: "#F36C2F" }}
          >
            👨‍👩‍👧 {lang === "en" ? "Parent Dashboard" : "अभिभावक डैशबोर्ड"}
          </h2>
          <p className="text-center text-muted-foreground mb-6 font-semibold">
            {lang === "en"
              ? "Enter PIN to continue"
              : "जारी रखने के लिए PIN दर्ज करें"}
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-black transition-colors ${
                  error
                    ? "border-destructive bg-red-50"
                    : "border-border bg-muted"
                }`}
                data-ocid={`parent.pin.${i + 1}`}
              >
                {pin[i] ? "●" : ""}
              </div>
            ))}
          </div>

          {error && (
            <p
              className="text-center text-destructive font-bold mb-4"
              data-ocid="parent.pin.error_state"
            >
              {lang === "en"
                ? "Wrong PIN! Try again."
                : "गलत PIN! फिर कोशिश करें।"}
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"].map(
              (k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    if (k === "⌫") setPin((p) => p.slice(0, -1));
                    else if (k !== "✓") handlePinKey(k);
                  }}
                  className="h-12 rounded-xl bg-muted hover:bg-border font-bold text-lg transition-colors active:scale-95"
                  data-ocid={`parent.keypad.${k}`}
                >
                  {k}
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto"
      data-ocid="parent.dashboard.modal"
    >
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-card-hover my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black" style={{ color: "#F36C2F" }}>
            👨‍👩‍👧 {lang === "en" ? "Progress Report" : "प्रगति रिपोर्ट"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold hover:bg-border transition-colors"
            data-ocid="parent.dashboard.close_button"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {CLASSES.map((cls) => {
            const cp = progress[cls.id];
            const totalStars = cp
              ? Object.values(cp).reduce((s, v) => s + v.stars, 0)
              : 0;
            // Show subjects specific to this class
            const classSubjects = cls.subjects
              .map((id) => ALL_SUBJECTS.find((s) => s.id === id))
              .filter(Boolean);
            return (
              <div
                key={cls.id}
                className="rounded-2xl border border-border p-4"
                data-ocid={`parent.class.${cls.id}.panel`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-black text-lg">
                    {cls.emoji} {lang === "en" ? cls.label : cls.labelHi}
                  </span>
                  <span
                    className="font-bold text-lg"
                    style={{ color: "#F7C948" }}
                  >
                    ⭐ {totalStars}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {classSubjects.map((sub) => {
                    if (!sub) return null;
                    const sp = cp?.[sub.id];
                    return (
                      <div
                        key={sub.id}
                        className="text-center p-2 rounded-xl bg-muted"
                      >
                        <div className="text-xl">{sub.emoji}</div>
                        <div className="text-xs font-bold text-muted-foreground">
                          {lang === "en" ? sub.label : sub.labelHi}
                        </div>
                        <div
                          className="font-black text-sm"
                          style={{ color: "#F36C2F" }}
                        >
                          ⭐ {sp?.stars ?? 0}
                        </div>
                        {sp?.completed && (
                          <div
                            className="text-xs font-bold"
                            style={{ color: "#34A853" }}
                          >
                            🏆
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          {confirmReset ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
                className="flex-1 py-3 rounded-2xl bg-destructive text-white font-bold"
                data-ocid="parent.reset.confirm_button"
              >
                {lang === "en" ? "Yes, Reset All" : "हाँ, सब रीसेट करें"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-3 rounded-2xl bg-muted font-bold"
                data-ocid="parent.reset.cancel_button"
              >
                {lang === "en" ? "Cancel" : "रद्द करें"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="w-full py-3 rounded-2xl bg-muted text-destructive font-bold hover:bg-border transition-colors"
              data-ocid="parent.reset.delete_button"
            >
              🗑️ {lang === "en" ? "Reset All Progress" : "सारी प्रगति रीसेट करें"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
