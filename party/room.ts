import type * as Party from "partykit/server"
import type {
  RoomState,
  Player,
  ClientEvent,
  ServerEvent,
  GameEndResult,
  GameMode,
} from "../lib/types/game"
import { COUNTDOWN_SECONDS } from "../lib/types/game"

const RACE_TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Programming is the art of telling another human what one wants the computer to do. Code is like humor, when you have to explain it, it's bad.",
  "The only way to learn a new programming language is by writing programs in it. Always code as if the guy who ends up maintaining your code will be a violent psychopath who knows where you live.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency. Before software can be reusable it first has to be usable.",
  "A good programmer is someone who always looks both ways before crossing a one-way street. The best error message is the one that never shows up.",
  "It is not enough for code to work. Clean code reads like well-written prose. You know you are working with clean code when each routine you read turns out to be pretty much what you expected.",
  "Software is like entropy: it is difficult to grasp, weighs nothing, and obeys the second law of thermodynamics, i.e., it always increases.",
  "In theory there is no difference between theory and practice. In practice there is. Measuring programming progress by lines of code is like measuring aircraft building progress by weight.",
]

const BLITZ_TEXTS = [
  "type fast win big score high beat them all go now run quick fly",
  "speed keys words fire quick run race beat score top win now swift",
  "blazing fingers neon keys rapid fire lightning speed type to win fast",
]

const ARCADE_WORDS = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with","he",
  "as","you","do","at","this","but","his","by","from","they","we","say","her","she","or",
  "an","will","my","one","all","would","there","their","what","so","up","out","if","about",
  "who","get","which","go","me","when","make","can","like","time","no","just","him","know",
  "take","people","into","year","your","good","some","could","them","see","other","than","then",
  "now","look","only","come","its","over","think","also","back","after","use","two","how",
  "type","play","race","code","fast","jump","test","word","game","win","key","run","big",
  "speed","blaze","fire","neon","byte","data","loop","flow","hack","node",
]

function generateWordList(count = 100): string[] {
  return Array.from({ length: count }, () =>
    ARCADE_WORDS[Math.floor(Math.random() * ARCADE_WORDS.length)]
  )
}

function getRandomText(mode: GameMode): string {
  if (mode === "blitz") return BLITZ_TEXTS[Math.floor(Math.random() * BLITZ_TEXTS.length)]
  return RACE_TEXTS[Math.floor(Math.random() * RACE_TEXTS.length)]
}

function broadcast(room: Party.Room, event: ServerEvent, exclude?: string) {
  const msg = JSON.stringify(event)
  for (const conn of room.getConnections()) {
    if (conn.id !== exclude) conn.send(msg)
  }
}

// ─── Core fix: map connId ↔ userId so we can find connections by userId ──────
//
// Problem:  PartyKit sets conn.id to a random UUID per connection.
//           The client identifies players with session.user.id (DB UUID).
//           If we store leaderId = conn.id, the client can never match it with
//           session.user.id → isLeader is always false → mode selector hidden.
//
// Solution: client sends userId in join_room. We store player.id = userId and
//           keep a reverse map connId → userId so we can still close/send to
//           specific connections when kicking/transferring.

export default class RoomServer implements Party.Server {
  state: RoomState
  countdownInterval: ReturnType<typeof setInterval> | null = null

  // connId → userId  (needed to look up who sent a message)
  private connToUser = new Map<string, string>()
  // userId → connId  (needed to close/send to a specific player)
  private userToConn = new Map<string, string>()

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
      countdownTick: null,
    }
  }

  onConnect(conn: Party.Connection) {
    conn.send(JSON.stringify({ type: "room_state", state: this.state } satisfies ServerEvent))
  }

  onMessage(message: string, sender: Party.Connection) {
    let event: ClientEvent
    try { event = JSON.parse(message) } catch { return }

    // Resolve sender's userId from the map (all events after join use this)
    const senderUserId = this.connToUser.get(sender.id)

    switch (event.type) {
      case "join_room":        this.handleJoin(sender, event); break
      case "leave_room":       if (senderUserId) this.handleLeave(senderUserId); break
      case "kick_player":      if (senderUserId) this.handleKick(senderUserId, event.targetId); break
      case "transfer_leader":  if (senderUserId) this.handleTransferLeader(senderUserId, event.targetId); break
      case "set_mode":         if (senderUserId) this.handleSetMode(senderUserId, event.mode); break
      case "start_game":       if (senderUserId) this.handleStartGame(senderUserId); break
      case "cancel_countdown": if (senderUserId) this.handleCancelCountdown(senderUserId); break
      case "progress_update":  if (senderUserId) this.handleProgressUpdate(senderUserId, event); break
      case "word_typed":       if (senderUserId) this.handleWordTyped(senderUserId, event.word); break
      case "game_finished":    if (senderUserId) this.handleGameFinished(senderUserId, event); break
    }
  }

  onClose(conn: Party.Connection) {
    const userId = this.connToUser.get(conn.id)
    if (userId) this.handleLeave(userId)
  }

  // ─── Handlers ────────────────────────────────────────────────

  private handleJoin(conn: Party.Connection, event: Extract<ClientEvent, { type: "join_room" }>) {
    // Use userId sent by client as the canonical player ID
    const userId = event.userId || conn.id

    console.log(event);
    

    if (Object.keys(this.state.players).length >= 6) {
      conn.send(JSON.stringify({ type: "error", message: "Room is full" } satisfies ServerEvent))
      conn.close()
      return
    }

    // Register the bidirectional mapping
    this.connToUser.set(conn.id, userId)
    this.userToConn.set(userId, conn.id)

    const isFirst = Object.keys(this.state.players).length === 0
    if (isFirst) this.state.leaderId = userId

    const player: Player = {
      id: userId,       // ← userId, not conn.id
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

    this.state.players[userId] = player

    // If someone joins mid-countdown, reset it
    if (this.state.status === "countdown") {
      this.resetCountdown(`${event.username} joined!`)
    }

    // Tell everyone else about the new player
    broadcast(this.room, { type: "player_joined", player }, conn.id)
    // Send full state to the newcomer
    conn.send(JSON.stringify({ type: "room_state", state: this.state } satisfies ServerEvent))
  }

  private handleLeave(userId: string) {
    const player = this.state.players[userId]
    if (!player) return

    delete this.state.players[userId]

    // Clean up maps
    const connId = this.userToConn.get(userId)
    if (connId) this.connToUser.delete(connId)
    this.userToConn.delete(userId)

    // Transfer leadership if leader left
    if (this.state.leaderId === userId) {
      const remaining = Object.keys(this.state.players)
      this.state.leaderId = remaining[0] ?? ""
      if (this.state.leaderId) {
        broadcast(this.room, { type: "leader_changed", leaderId: this.state.leaderId })
      }
    }

    // Cancel countdown if too few players remain
    if (this.state.status === "countdown") {
      if (Object.keys(this.state.players).length < 2) {
        this.resetCountdown("Not enough players")
      }
    }

    broadcast(this.room, { type: "player_left", playerId: userId })
  }

  private handleKick(senderUserId: string, targetUserId: string) {
    if (this.state.leaderId !== senderUserId) return
    if (senderUserId === targetUserId) return

    const target = this.state.players[targetUserId]
    if (!target) return

    delete this.state.players[targetUserId]
    broadcast(this.room, { type: "player_kicked", playerId: targetUserId })

    // Close the target's WebSocket connection
    const targetConnId = this.userToConn.get(targetUserId)
    if (targetConnId) {
      for (const conn of this.room.getConnections()) {
        if (conn.id === targetConnId) { conn.close(); break }
      }
      this.connToUser.delete(targetConnId)
    }
    this.userToConn.delete(targetUserId)
  }

  private handleTransferLeader(senderUserId: string, targetUserId: string) {
    if (this.state.leaderId !== senderUserId) return
    if (!this.state.players[targetUserId]) return
    if (senderUserId === targetUserId) return

    this.state.leaderId = targetUserId
    broadcast(this.room, { type: "leader_changed", leaderId: targetUserId })
    broadcast(this.room, { type: "room_state", state: this.state })
  }

  // ─── KEY FIX: handleSetMode uses userId for auth check ───────
  private handleSetMode(senderUserId: string, mode: GameMode) {
    if (this.state.leaderId !== senderUserId) return   // only leader can change mode
    if (this.state.status !== "waiting") return         // can't change during game
    this.state.mode = mode
    broadcast(this.room, { type: "room_state", state: this.state })
  }

  private handleStartGame(senderUserId: string) {
    if (this.state.leaderId !== senderUserId) return
    if (this.state.status !== "waiting") return
    if (Object.keys(this.state.players).length < 2) return
    this.startCountdown()
  }

  private handleCancelCountdown(senderUserId: string) {
    if (this.state.leaderId !== senderUserId) return
    if (this.state.status !== "countdown") return
    this.resetCountdown("Cancelled by leader")
  }

  private startCountdown() {
    this.state.status = "countdown"
    this.state.countdownAt = Date.now()
    this.state.countdownTick = COUNTDOWN_SECONDS

    let tick = COUNTDOWN_SECONDS
    if (this.countdownInterval) clearInterval(this.countdownInterval)

    broadcast(this.room, { type: "countdown", tick: COUNTDOWN_SECONDS })

    this.countdownInterval = setInterval(() => {
      tick--
      this.state.countdownTick = tick
      broadcast(this.room, { type: "countdown", tick })

      if (tick <= 0) {
        clearInterval(this.countdownInterval!)
        this.countdownInterval = null
        this.launchGame()
      }
    }, 1000)
  }

  private resetCountdown(reason: string) {
    if (this.countdownInterval) { clearInterval(this.countdownInterval); this.countdownInterval = null }
    this.state.status = "waiting"
    this.state.countdownAt = null
    this.state.countdownTick = null
    broadcast(this.room, { type: "countdown_reset", reason })
    broadcast(this.room, { type: "room_state", state: this.state })
  }

  private launchGame() {
    this.state.status = "in_progress"
    this.state.startedAt = Date.now()
    this.state.text = getRandomText(this.state.mode)
    this.state.words = generateWordList(150)

    for (const p of Object.values(this.state.players)) {
      p.wpm = 0; p.accuracy = 0; p.progress = 0; p.score = 0; p.placement = null
    }

    broadcast(this.room, { type: "game_started", text: this.state.text, words: this.state.words })
  }

  private handleProgressUpdate(senderUserId: string, event: Extract<ClientEvent, { type: "progress_update" }>) {
    const player = this.state.players[senderUserId]
    if (!player) return
    player.wpm = event.wpm; player.accuracy = event.accuracy; player.progress = event.progress
    broadcast(this.room, { type: "progress_sync", players: this.state.players })
  }

  private handleWordTyped(senderUserId: string, _word: string) {
    const player = this.state.players[senderUserId]
    if (!player) return
    player.score += 1
    broadcast(this.room, { type: "progress_sync", players: this.state.players })
  }

  private handleGameFinished(senderUserId: string, event: Extract<ClientEvent, { type: "game_finished" }>) {
    const player = this.state.players[senderUserId]
    if (!player) return

    const finishedCount = Object.values(this.state.players).filter(p => p.placement !== null).length + 1
    player.placement = finishedCount
    player.wpm = event.wpm; player.accuracy = event.accuracy; player.progress = 100

    if (finishedCount >= Object.keys(this.state.players).length) {
      this.endGame()
    } else {
      broadcast(this.room, { type: "progress_sync", players: this.state.players })
    }
  }

  private endGame() {
    this.state.status = "finished"

    const results: GameEndResult[] = Object.values(this.state.players)
      .sort((a, b) => {
        if (a.placement !== null && b.placement !== null) return a.placement - b.placement
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
