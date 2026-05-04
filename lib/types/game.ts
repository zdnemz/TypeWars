// Shared types for game state, WebSocket events, and player data
// Used across app/ and party/

export type GameMode = "race" | "arcade" | "blitz"
export type GameStatus = "waiting" | "countdown" | "in_progress" | "finished"
export type LeaderboardPeriod = "all_time" | "weekly"

// ─── Room State ────────────────────────────────────────────────
export type RoomState = {
  code: string
  status: GameStatus
  mode: GameMode
  leaderId: string
  players: Record<string, Player>
  text: string        // race mode paragraph
  words: string[]     // arcade mode word list
  startedAt: number | null
  countdownAt: number | null
  countdownTick: number | null
}

export type Player = {
  id: string
  username: string
  avatar: string
  ready: boolean
  wpm: number
  accuracy: number
  progress: number    // 0-100% for race mode
  score: number       // for arcade mode
  placement: number | null
  connected: boolean
}

// ─── WebSocket Events: Client → Server ─────────────────────────
export type ClientEvent =
  | { type: "join_room"; token: string; userId: string; username: string; avatar: string }
  | { type: "leave_room" }
  | { type: "kick_player"; targetId: string }
  | { type: "transfer_leader"; targetId: string }
  | { type: "set_mode"; mode: GameMode }
  | { type: "start_game" }
  | { type: "cancel_countdown" }
  | { type: "progress_update"; wpm: number; accuracy: number; progress: number }
  | { type: "word_typed"; word: string }
  | { type: "game_finished"; wpm: number; accuracy: number }

// ─── WebSocket Events: Server → Client ─────────────────────────
export type ServerEvent =
  | { type: "room_state"; state: RoomState }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "player_kicked"; playerId: string }
  | { type: "leader_changed"; leaderId: string }
  | { type: "countdown"; tick: number }
  | { type: "countdown_reset"; reason: string }
  | { type: "game_started"; text: string; words: string[] }
  | { type: "progress_sync"; players: Record<string, Player> }
  | { type: "game_ended"; results: GameEndResult[] }
  | { type: "error"; message: string }

export type GameEndResult = {
  playerId: string
  username: string
  avatar: string
  wpm: number
  accuracy: number
  placement: number
  progress?: number   // race mode
  score?: number      // arcade mode
}

// ─── Achievement Keys ──────────────────────────────────────────
export const ACHIEVEMENT_KEYS = [
  "first_game",
  "first_win",
  "wpm_50",
  "wpm_75",
  "wpm_100",
  "wpm_120",
  "sharpshooter",
  "social_butterfly",
  "veteran",
  "champion",
] as const

export type AchievementKey = (typeof ACHIEVEMENT_KEYS)[number]

export const ACHIEVEMENTS: Record<AchievementKey, { name: string; description: string; icon: string }> = {
  first_game: { name: "First Race", description: "Play your first game", icon: "🏁" },
  first_win: { name: "Victory!", description: "Win your first multiplayer match", icon: "🏆" },
  wpm_50: { name: "Speed Typist", description: "Reach 50 WPM in any game", icon: "⚡" },
  wpm_75: { name: "Fast Fingers", description: "Reach 75 WPM in any game", icon: "🔥" },
  wpm_100: { name: "Century", description: "Reach 100 WPM in any game", icon: "💯" },
  wpm_120: { name: "Blazing", description: "Reach 120 WPM in any game", icon: "🚀" },
  sharpshooter: { name: "Sharpshooter", description: "Achieve 100% accuracy in a race", icon: "🎯" },
  social_butterfly: { name: "Social Butterfly", description: "Play 10 multiplayer games", icon: "🦋" },
  veteran: { name: "Veteran", description: "Play 100 total games", icon: "🎖️" },
  champion: { name: "Champion", description: "Win 10 multiplayer matches", icon: "👑" },
}

// ─── Game Mode config ──────────────────────────────────────────
export const GAME_MODES: Record<GameMode, { label: string; icon: string; desc: string; color: string }> = {
  race: { label: "Race", icon: "🏁", desc: "Type the passage first to win", color: "text-orange" },
  arcade: { label: "Arcade", icon: "🎮", desc: "Type as many words as you can in 60s", color: "text-game-cyan" },
  blitz: { label: "Blitz", icon: "⚡", desc: "Ultra-fast 30s word sprint", color: "text-game-yellow" },
}

export const COUNTDOWN_SECONDS = 10
