import type * as Party from "partykit/server"
import type {
  RoomState,
  Player,
  ClientEvent,
  ServerEvent,
  GameEndResult,
} from "../lib/types/game"

// A large pool of typing texts for race mode
const RACE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Programming is the art of telling another human what one wants the computer to do. Code is like humor, when you have to explain it, it's bad.",
  "The only way to learn a new programming language is by writing programs in it. Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency. Before software can be reusable it first has to be usable.",
  "A good programmer is someone who always looks both ways before crossing a one-way street. The best error message is the one that never shows up.",
  "It is not enough for code to work. Clean code reads like well-written prose. You know you are working with clean code when each routine you read turns out to be pretty much what you expected.",
  "Software is like entropy: it is difficult to grasp, weighs nothing, and obeys the second law of thermodynamics, i.e., it always increases.",
  "The most dangerous phrase in the language is we have always done it this way. Innovation distinguishes between a leader and a follower.",
  "In theory there is no difference between theory and practice. In practice there is. Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
  "Walking on water and developing software from a specification are easy if both are frozen. The function of good software is to make the complex appear to be simple.",
]

// Arcade word list
const ARCADE_WORDS = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "our", "work", "first", "well", "way", "even", "new", "want", "because",
  "any", "these", "give", "day", "most", "type", "play", "race", "code",
  "fast", "jump", "test", "word", "game", "win", "key", "run", "big",
]

function generateWordList(count = 100): string[] {
  const words: string[] = []
  for (let i = 0; i < count; i++) {
    words.push(ARCADE_WORDS[Math.floor(Math.random() * ARCADE_WORDS.length)])
  }
  return words
}

function getRandomText(): string {
  return RACE_TEXTS[Math.floor(Math.random() * RACE_TEXTS.length)]
}

function broadcast(room: Party.Room, event: ServerEvent, exclude?: string) {
  const message = JSON.stringify(event)
  for (const conn of room.getConnections()) {
    if (conn.id !== exclude) {
      conn.send(message)
    }
  }
}

export default class RoomServer implements Party.Server {
  state: RoomState

  constructor(readonly room: Party.Room) {
    this.state = {
      code: room.id,
      status: "waiting",
      mode: "race",
      leaderId: "",
      players: {},
      text: "",
      words: [],
      startedAt: null,
      countdownAt: null,
    }
  }

  onConnect(conn: Party.Connection) {
    // Send full state to new connection
    conn.send(
      JSON.stringify({
        type: "room_state",
        state: this.state,
      } satisfies ServerEvent)
    )
  }

  onMessage(message: string, sender: Party.Connection) {
    let event: ClientEvent
    try {
      event = JSON.parse(message)
    } catch {
      return
    }

    switch (event.type) {
      case "join_room":
        this.handleJoin(sender, event)
        break
      case "leave_room":
        this.handleLeave(sender)
        break
      case "kick_player":
        this.handleKick(sender, event.targetId)
        break
      case "set_mode":
        this.handleSetMode(sender, event.mode)
        break
      case "start_game":
        this.handleStartGame(sender)
        break
      case "progress_update":
        this.handleProgressUpdate(sender, event)
        break
      case "word_typed":
        this.handleWordTyped(sender, event.word)
        break
      case "game_finished":
        this.handleGameFinished(sender, event)
        break
    }
  }

  onClose(conn: Party.Connection) {
    this.handleLeave(conn)
  }

  // ─── Handlers ────────────────────────────────────────────────

  private handleJoin(
    conn: Party.Connection,
    event: Extract<ClientEvent, { type: "join_room" }>
  ) {
    if (Object.keys(this.state.players).length >= 4) {
      conn.send(
        JSON.stringify({ type: "error", message: "Room is full" } satisfies ServerEvent)
      )
      conn.close()
      return
    }

    const isFirst = Object.keys(this.state.players).length === 0
    if (isFirst) this.state.leaderId = conn.id

    const player: Player = {
      id: conn.id,
      username: event.username,
      avatar: event.avatar,
      ready: false,
      wpm: 0,
      accuracy: 0,
      progress: 0,
      score: 0,
      placement: null,
      connected: true,
    }

    this.state.players[conn.id] = player

    broadcast(this.room, { type: "player_joined", player }, conn.id)
    conn.send(JSON.stringify({ type: "room_state", state: this.state } satisfies ServerEvent))
  }

  private handleLeave(conn: Party.Connection) {
    const player = this.state.players[conn.id]
    if (!player) return

    delete this.state.players[conn.id]

    // Transfer leadership if leader left
    if (this.state.leaderId === conn.id) {
      const remaining = Object.keys(this.state.players)
      this.state.leaderId = remaining[0] ?? ""
    }

    broadcast(this.room, { type: "player_left", playerId: conn.id })
  }

  private handleKick(sender: Party.Connection, targetId: string) {
    if (this.state.leaderId !== sender.id) return

    const target = this.state.players[targetId]
    if (!target) return

    delete this.state.players[targetId]

    // Notify all players
    broadcast(this.room, { type: "player_kicked", playerId: targetId })

    // Disconnect the kicked player
    for (const conn of this.room.getConnections()) {
      if (conn.id === targetId) conn.close()
    }
  }

  private handleSetMode(
    sender: Party.Connection,
    mode: "race" | "arcade"
  ) {
    if (this.state.leaderId !== sender.id) return
    if (this.state.status !== "waiting") return
    this.state.mode = mode
    broadcast(this.room, { type: "room_state", state: this.state })
  }

  private handleStartGame(sender: Party.Connection) {
    if (this.state.leaderId !== sender.id) return
    if (this.state.status !== "waiting") return
    if (Object.keys(this.state.players).length < 1) return

    this.state.status = "countdown"
    this.state.countdownAt = Date.now()
    this.state.text = getRandomText()
    this.state.words = generateWordList(150)

    // Run 3-2-1 countdown
    let tick = 3
    const interval = setInterval(() => {
      broadcast(this.room, { type: "countdown", tick })
      tick--
      if (tick < 0) {
        clearInterval(interval)
        this.state.status = "in_progress"
        this.state.startedAt = Date.now()
        broadcast(this.room, {
          type: "game_started",
          text: this.state.text,
          words: this.state.words,
        })
      }
    }, 1000)
  }

  private handleProgressUpdate(
    sender: Party.Connection,
    event: Extract<ClientEvent, { type: "progress_update" }>
  ) {
    const player = this.state.players[sender.id]
    if (!player) return

    player.wpm = event.wpm
    player.accuracy = event.accuracy
    player.progress = event.progress

    broadcast(this.room, { type: "progress_sync", players: this.state.players })
  }

  private handleWordTyped(sender: Party.Connection, word: string) {
    const player = this.state.players[sender.id]
    if (!player) return
    player.score += 1
    broadcast(this.room, { type: "progress_sync", players: this.state.players })
  }

  private handleGameFinished(
    sender: Party.Connection,
    event: Extract<ClientEvent, { type: "game_finished" }>
  ) {
    const player = this.state.players[sender.id]
    if (!player) return

    const finishedCount =
      Object.values(this.state.players).filter((p) => p.placement !== null)
        .length + 1

    player.placement = finishedCount
    player.wpm = event.wpm
    player.accuracy = event.accuracy
    player.progress = 100

    const totalPlayers = Object.keys(this.state.players).length
    if (finishedCount >= totalPlayers) {
      this.endGame()
    } else {
      broadcast(this.room, { type: "progress_sync", players: this.state.players })
    }
  }

  private endGame() {
    this.state.status = "finished"

    const results: GameEndResult[] = Object.values(this.state.players)
      .sort((a, b) => {
        if (a.placement !== null && b.placement !== null)
          return a.placement - b.placement
        if (a.placement !== null) return -1
        if (b.placement !== null) return 1
        return b.progress - a.progress || b.wpm - a.wpm
      })
      .map((p, idx) => ({
        playerId: p.id,
        username: p.username,
        avatar: p.avatar,
        wpm: p.wpm,
        accuracy: p.accuracy,
        placement: p.placement ?? idx + 1,
        progress: p.progress,
        score: p.score,
      }))

    broadcast(this.room, { type: "game_ended", results })
  }
}

RoomServer satisfies Party.Worker
