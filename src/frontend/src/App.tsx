import { ChevronDown, Shield, Sword, Trophy } from "lucide-react";
import { motion } from "motion/react";
import type { ScoreEntry } from "./backend";
import GameCanvas from "./components/GameCanvas";
import { useLeaderboard } from "./hooks/useQueries";

const HEROES = [
  {
    name: "Humza Ali Mazari",
    role: "Hero",
    color: "#FF6D00",
    border: "border-orange-500",
    desc: "Fearless rebel fighter saving the country from traitors. Unstoppable in close combat.",
    badge: "bg-orange-900 text-orange-200",
  },
  {
    name: "Ajay Sanyal",
    role: "Spy Agent",
    color: "#3949AB",
    border: "border-blue-600",
    desc: "Undercover agent, master of stealth and counter-intelligence. Expert with bow and arrow.",
    badge: "bg-blue-900 text-blue-200",
  },
];

const VILLAINS = [
  {
    name: "Rehman Dakait",
    role: "Villain",
    color: "#8B0000",
    border: "border-red-800",
    desc: "Dangerous criminal hiding in the SOUTH. Commands a gang of armed Dakait Goons.",
    badge: "bg-red-900 text-red-200",
    hint: "🗺️ Hunt him SOUTH",
  },
  {
    name: "SP Aslam Choudhury",
    role: "Traitor",
    color: "#9E9E9E",
    border: "border-gray-500",
    desc: "Corrupt officer hiding in the WEST. Uses his police rank to evade justice.",
    badge: "bg-gray-800 text-gray-200",
    hint: "🗺️ Hunt him WEST",
  },
  {
    name: "Major Iqbal",
    role: "Traitor",
    color: "#4E342E",
    border: "border-amber-900",
    desc: "Rogue military officer hiding in the NORTH. Commands heavy firepower.",
    badge: "bg-amber-900 text-amber-200",
    hint: "🗺️ Hunt him NORTH",
  },
  {
    name: "Jameel Jamali",
    role: "Villain Boss",
    color: "#37474F",
    border: "border-slate-600",
    desc: '"Baccha hai tu mera" — hiding in the EAST, but his arrogance will be his downfall.',
    badge: "bg-slate-800 text-slate-200",
    hint: "🗺️ Hunt him EAST",
  },
];

const CONTROLS_DESKTOP = [
  { key: "WASD", action: "Move" },
  { key: "Mouse", action: "Aim" },
  { key: "Click / Space", action: "Attack" },
  { key: "E", action: "Talk / Interact" },
  { key: "R", action: "Pick Up Loot" },
  { key: "1 / 2 / 3", action: "Switch Weapon" },
  { key: "ESC", action: "Pause" },
];

const CONTROLS_MOBILE = [
  { key: "Joystick", action: "Move" },
  { key: "FIRE", action: "Attack" },
  { key: "ACT", action: "Interact / Loot" },
  { key: "WPN", action: "Switch Weapon" },
];

function LeaderboardSection() {
  const { data: scores, isLoading } = useLeaderboard();

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "text-yellow-400 font-bold";
    if (rank === 2) return "text-gray-300 font-bold";
    if (rank === 3) return "text-amber-600 font-bold";
    return "text-muted-foreground";
  };

  const getRankLabel = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <section
      className="w-full max-w-3xl mx-auto"
      data-ocid="leaderboard.section"
    >
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="w-7 h-7 text-gold" />
        <h2 className="font-cinzel text-3xl font-bold text-gold gold-glow tracking-widest uppercase">
          Hall of Legends
        </h2>
      </div>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {isLoading ? (
          <div
            className="flex items-center justify-center p-12"
            data-ocid="leaderboard.loading_state"
          >
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !scores || scores.length === 0 ? (
          <div className="text-center p-12" data-ocid="leaderboard.empty_state">
            <p className="font-cinzel text-muted-foreground">
              No warriors have claimed glory yet.
            </p>
            <p className="font-cinzel text-sm text-muted-foreground mt-1">
              Be the first to submit your score!
            </p>
          </div>
        ) : (
          <table className="w-full" data-ocid="leaderboard.table">
            <thead>
              <tr className="border-b border-border">
                <th className="font-cinzel text-left px-6 py-3 text-gold text-sm tracking-wider">
                  RANK
                </th>
                <th className="font-cinzel text-left px-6 py-3 text-gold text-sm tracking-wider">
                  WARRIOR
                </th>
                <th className="font-cinzel text-right px-6 py-3 text-gold text-sm tracking-wider">
                  SCORE
                </th>
              </tr>
            </thead>
            <tbody>
              {scores.slice(0, 10).map((entry: ScoreEntry, idx: number) => (
                <tr
                  key={`${entry.name}-${idx}`}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  data-ocid={`leaderboard.row.${idx + 1}`}
                >
                  <td
                    className={`px-6 py-3 font-cinzel text-base ${getRankStyle(idx + 1)}`}
                  >
                    {getRankLabel(idx + 1)}
                  </td>
                  <td className="px-6 py-3 font-cinzel text-foreground">
                    {entry.name}
                  </td>
                  <td className="px-6 py-3 font-cinzel text-right text-gold font-bold">
                    {Number(entry.score).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-border py-8 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-950/20 to-transparent pointer-events-none" />
        <div className="relative max-w-6xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-4">
            <Sword className="w-8 h-8 text-gold rotate-45" />
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="font-cinzel text-5xl md:text-6xl font-black text-gold gold-glow tracking-[0.15em] uppercase"
            >
              Dhurandhar
            </motion.h1>
            <Sword className="w-8 h-8 text-gold -rotate-45" />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-cinzel text-sm tracking-[0.3em] text-gold-dim uppercase"
          >
            Hunt the Traitors — Save Your Country
          </motion.p>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-4 py-10 flex flex-col items-center gap-14">
        {/* Game Canvas */}
        <motion.section
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="w-full flex flex-col items-center gap-4"
          data-ocid="game.section"
        >
          <GameCanvas />

          {/* Controls */}
          <div className="w-full max-w-[950px] flex flex-col gap-3">
            <p className="font-cinzel text-xs text-muted-foreground uppercase tracking-widest text-center">
              Desktop Controls
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {CONTROLS_DESKTOP.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-col items-center gap-1 p-2 rounded bg-card border border-border"
                >
                  <kbd className="font-cinzel text-xs text-gold bg-muted px-2 py-0.5 rounded border border-border">
                    {c.key}
                  </kbd>
                  <span className="font-cinzel text-[9px] text-muted-foreground text-center leading-tight">
                    {c.action}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-cinzel text-xs text-muted-foreground uppercase tracking-widest text-center mt-1">
              Mobile Touch Controls
            </p>
            <div className="grid grid-cols-4 gap-2">
              {CONTROLS_MOBILE.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-col items-center gap-1 p-2 rounded bg-card border border-amber-900/50"
                >
                  <kbd className="font-cinzel text-xs text-orange-400 bg-muted px-2 py-0.5 rounded border border-orange-900">
                    {c.key}
                  </kbd>
                  <span className="font-cinzel text-[9px] text-muted-foreground text-center leading-tight">
                    {c.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Warriors section */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="w-full"
          data-ocid="characters.section"
        >
          {/* Heroes */}
          <div className="flex items-center gap-3 mb-4">
            <Sword className="w-6 h-6 text-gold" />
            <h2 className="font-cinzel text-2xl font-bold text-gold gold-glow tracking-widest uppercase">
              Heroes
            </h2>
          </div>
          <p className="font-cinzel text-xs text-muted-foreground mb-4 tracking-wider">
            Humza Ali Mazari &amp; Ajay Sanyal are hiding from the traitors and
            saving their country
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            {HEROES.map((char, i) => (
              <motion.div
                key={char.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className={`bg-card border-2 ${char.border} rounded-lg p-4 flex flex-col gap-3 hover:scale-[1.03] transition-transform`}
                data-ocid={`characters.card.${i + 1}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: char.color,
                      borderColor: char.color,
                    }}
                  />
                  <div>
                    <p className="font-cinzel text-xs font-bold text-gold leading-tight">
                      {char.name}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-cinzel ${char.badge}`}
                    >
                      {char.role}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {char.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Villains */}
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-red-500" />
            <h2 className="font-cinzel text-2xl font-bold text-red-500 tracking-widest uppercase">
              Villain Targets
            </h2>
          </div>
          <p className="font-cinzel text-xs text-muted-foreground mb-4 tracking-wider">
            Find and eliminate all 4 bosses hiding across the map to win
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {VILLAINS.map((char, i) => (
              <motion.div
                key={char.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                viewport={{ once: true }}
                className={`bg-card border-2 ${char.border} rounded-lg p-4 flex flex-col gap-3 hover:scale-[1.03] transition-transform`}
                data-ocid={`characters.card.${i + 3}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: char.color,
                      borderColor: char.color,
                    }}
                  />
                  <div>
                    <p className="font-cinzel text-xs font-bold text-red-300 leading-tight">
                      {char.name}
                    </p>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-cinzel ${char.badge}`}
                    >
                      {char.role}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {char.desc}
                </p>
                <span className="text-[10px] text-amber-400 font-cinzel">
                  {char.hint}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="w-full"
        >
          <LeaderboardSection />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-cinzel text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with{" "}
            <span className="text-gold">♥</span> using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
