import { useEffect, useState } from "react";

interface StarAnimationProps {
  trigger: number;
}

export function StarAnimation({ trigger }: StarAnimationProps) {
  const [stars, setStars] = useState<{ id: number; x: number }[]>([]);

  useEffect(() => {
    if (trigger > 0) {
      const id = Date.now();
      const x = 40 + Math.random() * 20;
      setStars((prev) => [...prev, { id, x }]);
      setTimeout(() => {
        setStars((prev) => prev.filter((s) => s.id !== id));
      }, 900);
    }
  }, [trigger]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute animate-star-float text-3xl"
          style={{ left: `${s.x}%`, bottom: "30%" }}
        >
          ⭐
        </div>
      ))}
    </div>
  );
}
