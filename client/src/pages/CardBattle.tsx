import { Layout } from "@/components/layout/Layout";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Swords, Shield, Zap, Trophy, Crown, Users, Skull, Package, 
  Dice6, ArrowLeft, Play, X, Star, Heart, Brain, Target
} from "lucide-react";
import { toast } from "sonner";

interface BattleMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  reward: number;
  color: string;
}

interface ChaosModifier {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface BattleCard {
  id: string;
  name: string;
  rarity: string;
  stats: { pwr: number; spd: number; int: number };
  frontImage?: string;
}

const BATTLE_MODES: BattleMode[] = [
  { 
    id: "FRIENDLY", 
    name: "Friendly Battle", 
    icon: <Users className="w-6 h-6" />,
    description: "Safe practice - no card loss", 
    reward: 5,
    color: "#4caf50"
  },
  { 
    id: "FOR_KEEPS", 
    name: "For Keeps", 
    icon: <Skull className="w-6 h-6" />,
    description: "Winner takes opponent card!", 
    reward: 25,
    color: "#f44336"
  },
  { 
    id: "CHAOS", 
    name: "Chaos Mode", 
    icon: <Dice6 className="w-6 h-6" />,
    description: "Random modifiers each round", 
    reward: 15,
    color: "#9c27b0"
  },
  { 
    id: "DECLARE_WAR", 
    name: "I Declare War", 
    icon: <Swords className="w-6 h-6" />,
    description: "First to 10 points wins", 
    reward: 20,
    color: "#ff9800"
  },
  { 
    id: "PS21", 
    name: "PS21", 
    icon: <Target className="w-6 h-6" />,
    description: "Blackjack-style card game", 
    reward: 15,
    color: "#2196f3"
  },
  { 
    id: "RUMBLE_ROYALE", 
    name: "Rumble Royale", 
    icon: <Crown className="w-6 h-6" />,
    description: "Endless streak vs AI", 
    reward: 5,
    color: "#ffc107"
  },
  { 
    id: "TAG_TEAM", 
    name: "Tag Team 2v2", 
    icon: <Users className="w-6 h-6" />,
    description: "2 cards vs 2 cards", 
    reward: 25,
    color: "#00bcd4"
  },
  { 
    id: "SUDDEN_DEATH", 
    name: "Sudden Death", 
    icon: <Zap className="w-6 h-6" />,
    description: "One round, high variance", 
    reward: 15,
    color: "#e91e63"
  },
  { 
    id: "MYSTERY_PACK", 
    name: "Mystery Pack Duel", 
    icon: <Package className="w-6 h-6" />,
    description: "Random pack showdown", 
    reward: 20,
    color: "#673ab7"
  },
];

const CHAOS_MODIFIERS: ChaosModifier[] = [
  { id: "DOUBLE_INT", name: "Brain Boost", icon: "🧠", description: "INT doubled!" },
  { id: "DOUBLE_PWR", name: "Power Surge", icon: "💪", description: "PWR doubled!" },
  { id: "DOUBLE_SPD", name: "Speed Demon", icon: "⚡", description: "SPD doubled!" },
  { id: "ZERO_PWR", name: "Power Drain", icon: "🔋", description: "PWR set to 0!" },
  { id: "ZERO_SPD", name: "Slow Motion", icon: "🐌", description: "SPD set to 0!" },
  { id: "ZERO_INT", name: "Brain Fog", icon: "💭", description: "INT set to 0!" },
  { id: "LEGENDARY_NERF", name: "Giant Killer", icon: "🗡️", description: "Legendary+ cards -20% PWR" },
  { id: "LOW_RARITY_BUFF", name: "Underdog", icon: "🐕", description: "Common/Uncommon +10 all stats" },
  { id: "STAT_SWAP", name: "Switcheroo", icon: "🔄", description: "PWR and INT swap!" },
  { id: "LOWEST_RARITY_WINS", name: "Reverse Rarity", icon: "🔃", description: "Lowest rarity wins round!" },
  { id: "RANDOM_BOOST", name: "Lucky Star", icon: "🌟", description: "Random stat +25" },
  { id: "DURABILITY_MATTERS", name: "Battle Worn", icon: "🛡️", description: "Stats scale with durability" },
];

type BattlePhase = "MODE_SELECT" | "CARD_SELECT" | "BATTLE" | "ROUND_RESULT" | "FINAL_RESULT";

export default function CardBattle() {
  const [, navigate] = useLocation();
  const [phase, setPhase] = useState<BattlePhase>("MODE_SELECT");
  const [selectedMode, setSelectedMode] = useState<BattleMode | null>(null);
  const [playerCard, setPlayerCard] = useState<BattleCard | null>(null);
  const [aiCard, setAiCard] = useState<BattleCard | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [chaosModifier, setChaosModifier] = useState<ChaosModifier | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [selectedStat, setSelectedStat] = useState<"pwr" | "spd" | "int" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const sampleCards: BattleCard[] = [
    { id: "1", name: "Shadow Knight", rarity: "EPIC", stats: { pwr: 85, spd: 70, int: 60 } },
    { id: "2", name: "Cyber Mage", rarity: "RARE", stats: { pwr: 55, spd: 65, int: 90 } },
    { id: "3", name: "Thunder Wolf", rarity: "LEGENDARY", stats: { pwr: 95, spd: 88, int: 75 } },
    { id: "4", name: "Frost Queen", rarity: "MYTHIC", stats: { pwr: 80, spd: 92, int: 98 } },
    { id: "5", name: "Fire Dragon", rarity: "COMMON", stats: { pwr: 45, spd: 40, int: 35 } },
  ];

  const generateAICard = (): BattleCard => {
    const names = ["Dark Reaper", "Neon Striker", "Ghost Warrior", "Steel Titan", "Void Walker"];
    const rarities = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
    return {
      id: `ai_${Date.now()}`,
      name: names[Math.floor(Math.random() * names.length)],
      rarity: rarities[Math.floor(Math.random() * rarities.length)],
      stats: {
        pwr: Math.floor(Math.random() * 60) + 40,
        spd: Math.floor(Math.random() * 60) + 40,
        int: Math.floor(Math.random() * 60) + 40,
      },
    };
  };

  const selectMode = (mode: BattleMode) => {
    setSelectedMode(mode);
    setPhase("CARD_SELECT");
    if (mode.id === "CHAOS") {
      const modifier = CHAOS_MODIFIERS[Math.floor(Math.random() * CHAOS_MODIFIERS.length)];
      setChaosModifier(modifier);
      toast.info(`${modifier.icon} ${modifier.name}: ${modifier.description}`);
    }
  };

  const selectCard = (card: BattleCard) => {
    setPlayerCard(card);
    setAiCard(generateAICard());
    setPhase("BATTLE");
    setBattleLog([`Battle started! ${card.name} vs AI opponent`]);
  };

  const getRarityRank = (rarity: string): number => {
    const ranks: Record<string, number> = {
      "COMMON": 1,
      "UNCOMMON": 2,
      "RARE": 3,
      "EPIC": 4,
      "LEGENDARY": 5,
      "MYTHIC": 6
    };
    return ranks[rarity] || 0;
  };

  const applyModifier = (stats: { pwr: number; spd: number; int: number }, rarity: string, durability: number = 100) => {
    if (!chaosModifier) return stats;
    const modified = { ...stats };
    switch (chaosModifier.id) {
      case "DOUBLE_INT": modified.int *= 2; break;
      case "DOUBLE_PWR": modified.pwr *= 2; break;
      case "DOUBLE_SPD": modified.spd *= 2; break;
      case "ZERO_PWR": modified.pwr = 0; break;
      case "ZERO_SPD": modified.spd = 0; break;
      case "ZERO_INT": modified.int = 0; break;
      case "STAT_SWAP": 
        const temp = modified.pwr;
        modified.pwr = modified.int;
        modified.int = temp;
        break;
      case "RANDOM_BOOST":
        const stat = ["pwr", "spd", "int"][Math.floor(Math.random() * 3)] as "pwr" | "spd" | "int";
        modified[stat] += 25;
        break;
      case "LEGENDARY_NERF":
        if (getRarityRank(rarity) >= 5) {
          modified.pwr = Math.floor(modified.pwr * 0.8);
        }
        break;
      case "LOW_RARITY_BUFF":
        if (getRarityRank(rarity) <= 2) {
          modified.pwr += 10;
          modified.spd += 10;
          modified.int += 10;
        }
        break;
      case "DURABILITY_MATTERS":
        const durabilityMultiplier = durability / 100;
        modified.pwr = Math.floor(modified.pwr * durabilityMultiplier);
        modified.spd = Math.floor(modified.spd * durabilityMultiplier);
        modified.int = Math.floor(modified.int * durabilityMultiplier);
        break;
    }
    return modified;
  };

  const battleRound = (stat: "pwr" | "spd" | "int") => {
    if (!playerCard || !aiCard || isAnimating) return;
    
    setIsAnimating(true);
    setSelectedStat(stat);

    const playerStats = applyModifier(playerCard.stats, playerCard.rarity);
    const aiStats = applyModifier(aiCard.stats, aiCard.rarity);

    const playerValue = playerStats[stat];
    const aiValue = aiStats[stat];

    setTimeout(() => {
      let playerWins = false;
      let aiWins = false;
      let isTie = false;

      if (chaosModifier?.id === "LOWEST_RARITY_WINS") {
        const playerRank = getRarityRank(playerCard.rarity);
        const aiRank = getRarityRank(aiCard.rarity);
        if (playerRank < aiRank) {
          playerWins = true;
        } else if (aiRank < playerRank) {
          aiWins = true;
        } else {
          playerWins = true;
        }
      } else {
        playerWins = playerValue > aiValue;
        aiWins = aiValue > playerValue;
        isTie = playerValue === aiValue;
      }

      if (playerWins) {
        setPlayerScore((s) => s + 1);
        setBattleLog((log) => [...log, `Round ${currentRound}: You win! (${stat.toUpperCase()}: ${playerValue} vs ${aiValue})`]);
        toast.success(`You win the round! +1 point`);
      } else if (aiWins) {
        setAiScore((s) => s + 1);
        setBattleLog((log) => [...log, `Round ${currentRound}: AI wins! (${stat.toUpperCase()}: ${playerValue} vs ${aiValue})`]);
        toast.error(`AI wins the round!`);
      } else {
        setBattleLog((log) => [...log, `Round ${currentRound}: Tie! (${stat.toUpperCase()}: ${playerValue} vs ${aiValue})`]);
        toast.info(`It's a tie!`);
      }

      setCurrentRound((r) => r + 1);
      setSelectedStat(null);
      setIsAnimating(false);

      if (playerScore + 1 >= 3 || aiScore + 1 >= 3 || currentRound >= 5) {
        setTimeout(() => setPhase("FINAL_RESULT"), 500);
      }
    }, 1000);
  };

  const resetBattle = () => {
    setPhase("MODE_SELECT");
    setSelectedMode(null);
    setPlayerCard(null);
    setAiCard(null);
    setPlayerScore(0);
    setAiScore(0);
    setCurrentRound(1);
    setChaosModifier(null);
    setBattleLog([]);
    setSelectedStat(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "COMMON": return "#9ca3af";
      case "UNCOMMON": return "#ffffff";
      case "RARE": return "#3b82f6";
      case "EPIC": return "#a855f7";
      case "LEGENDARY": return "#f59e0b";
      case "MYTHIC": return "#06b6d4";
      default: return "#ffffff";
    }
  };

  return (
    <Layout title="Card Battle">
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => phase === "MODE_SELECT" ? navigate("/") : resetBattle()}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            {phase === "MODE_SELECT" ? "Back to Home" : "Back to Mode Select"}
          </button>

          {phase === "MODE_SELECT" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-black uppercase tracking-wider mb-2">Card Battle</h1>
                <p className="text-white/60">Choose your battle mode</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BATTLE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => selectMode(mode)}
                    className="p-6 rounded-xl border-2 transition-all hover:scale-105 text-left group"
                    style={{
                      borderColor: `${mode.color}40`,
                      background: `linear-gradient(135deg, ${mode.color}10, transparent)`,
                    }}
                  >
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${mode.color}30`, color: mode.color }}
                    >
                      {mode.icon}
                    </div>
                    <h3 className="text-lg font-bold mb-1">{mode.name}</h3>
                    <p className="text-sm text-white/60 mb-3">{mode.description}</p>
                    <div className="flex items-center gap-1 text-sm" style={{ color: mode.color }}>
                      <Trophy className="w-4 h-4" />
                      <span>+{mode.reward} credits</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "CARD_SELECT" && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold uppercase tracking-wider mb-2">Select Your Card</h2>
                <p className="text-white/60">
                  Mode: <span style={{ color: selectedMode?.color }}>{selectedMode?.name}</span>
                </p>
                {chaosModifier && (
                  <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 text-purple-400">
                    <span>{chaosModifier.icon}</span>
                    <span>{chaosModifier.name}: {chaosModifier.description}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {sampleCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => selectCard(card)}
                    className="p-4 rounded-xl border-2 border-white/10 hover:border-white/40 transition-all hover:scale-105 text-left"
                    style={{
                      background: `linear-gradient(135deg, ${getRarityColor(card.rarity)}10, transparent)`,
                    }}
                  >
                    <div 
                      className="w-full aspect-[2.5/3.5] rounded-lg mb-3 flex items-center justify-center"
                      style={{ backgroundColor: `${getRarityColor(card.rarity)}20` }}
                    >
                      <Shield className="w-12 h-12" style={{ color: getRarityColor(card.rarity) }} />
                    </div>
                    <h4 className="font-bold text-sm mb-1">{card.name}</h4>
                    <p className="text-xs mb-2" style={{ color: getRarityColor(card.rarity) }}>{card.rarity}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">PWR</span>
                        <span>{card.stats.pwr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">SPD</span>
                        <span>{card.stats.spd}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">INT</span>
                        <span>{card.stats.int}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "BATTLE" && playerCard && aiCard && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <div className="text-3xl font-black">{playerScore}</div>
                  <div className="text-xs text-white/60">YOU</div>
                </div>
                <div className="text-center">
                  <div className="text-lg text-white/40">Round {currentRound}</div>
                  {chaosModifier && (
                    <div className="text-sm text-purple-400">{chaosModifier.icon} {chaosModifier.name}</div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black">{aiScore}</div>
                  <div className="text-xs text-white/60">AI</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div 
                    className="aspect-[2.5/3.5] rounded-xl border-2 mb-4 flex items-center justify-center"
                    style={{ 
                      borderColor: getRarityColor(playerCard.rarity),
                      background: `linear-gradient(135deg, ${getRarityColor(playerCard.rarity)}20, transparent)`,
                    }}
                  >
                    <Shield className="w-16 h-16" style={{ color: getRarityColor(playerCard.rarity) }} />
                  </div>
                  <h3 className="font-bold mb-1">{playerCard.name}</h3>
                  <p className="text-sm" style={{ color: getRarityColor(playerCard.rarity) }}>{playerCard.rarity}</p>
                </div>

                <div className="text-center">
                  <div 
                    className="aspect-[2.5/3.5] rounded-xl border-2 mb-4 flex items-center justify-center bg-white/5"
                    style={{ borderColor: getRarityColor(aiCard.rarity) }}
                  >
                    <Shield className="w-16 h-16" style={{ color: getRarityColor(aiCard.rarity) }} />
                  </div>
                  <h3 className="font-bold mb-1">{aiCard.name}</h3>
                  <p className="text-sm" style={{ color: getRarityColor(aiCard.rarity) }}>{aiCard.rarity}</p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <p className="text-white/60">Choose a stat to compare:</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => battleRound("pwr")}
                    disabled={isAnimating}
                    className={`px-6 py-4 rounded-xl font-bold transition-all ${
                      selectedStat === "pwr" ? "bg-red-500 scale-105" : "bg-red-500/20 hover:bg-red-500/40"
                    } disabled:opacity-50`}
                  >
                    <div className="text-2xl mb-1">💪</div>
                    <div className="text-sm">PWR</div>
                    <div className="text-lg font-black">{playerCard.stats.pwr}</div>
                  </button>
                  <button
                    onClick={() => battleRound("spd")}
                    disabled={isAnimating}
                    className={`px-6 py-4 rounded-xl font-bold transition-all ${
                      selectedStat === "spd" ? "bg-yellow-500 scale-105" : "bg-yellow-500/20 hover:bg-yellow-500/40"
                    } disabled:opacity-50`}
                  >
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-sm">SPD</div>
                    <div className="text-lg font-black">{playerCard.stats.spd}</div>
                  </button>
                  <button
                    onClick={() => battleRound("int")}
                    disabled={isAnimating}
                    className={`px-6 py-4 rounded-xl font-bold transition-all ${
                      selectedStat === "int" ? "bg-blue-500 scale-105" : "bg-blue-500/20 hover:bg-blue-500/40"
                    } disabled:opacity-50`}
                  >
                    <div className="text-2xl mb-1">🧠</div>
                    <div className="text-sm">INT</div>
                    <div className="text-lg font-black">{playerCard.stats.int}</div>
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-white/5 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-bold mb-2 text-white/60">Battle Log</h4>
                {battleLog.map((log, i) => (
                  <p key={i} className="text-sm text-white/80">{log}</p>
                ))}
              </div>
            </div>
          )}

          {phase === "FINAL_RESULT" && (
            <div className="text-center space-y-8">
              <div className="py-12">
                {playerScore > aiScore ? (
                  <>
                    <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-6" />
                    <h2 className="text-4xl font-black uppercase tracking-wider text-yellow-400 mb-2">Victory!</h2>
                    <p className="text-white/60">You defeated the AI opponent</p>
                    <div className="mt-4 text-2xl font-bold text-green-400">
                      +{selectedMode?.reward || 0} credits
                    </div>
                  </>
                ) : playerScore < aiScore ? (
                  <>
                    <Skull className="w-24 h-24 mx-auto text-red-400 mb-6" />
                    <h2 className="text-4xl font-black uppercase tracking-wider text-red-400 mb-2">Defeat</h2>
                    <p className="text-white/60">The AI opponent was stronger</p>
                  </>
                ) : (
                  <>
                    <Shield className="w-24 h-24 mx-auto text-white/40 mb-6" />
                    <h2 className="text-4xl font-black uppercase tracking-wider text-white/60 mb-2">Draw</h2>
                    <p className="text-white/60">Neither side could claim victory</p>
                  </>
                )}
              </div>

              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-black">{playerScore}</div>
                  <div className="text-sm text-white/60">Your Score</div>
                </div>
                <div className="text-2xl font-bold text-white/20">vs</div>
                <div className="text-center">
                  <div className="text-4xl font-black">{aiScore}</div>
                  <div className="text-sm text-white/60">AI Score</div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={resetBattle}
                  className="px-8 py-4 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-colors"
                >
                  Play Again
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-8 py-4 border border-white/20 rounded-xl font-bold hover:bg-white/10 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
