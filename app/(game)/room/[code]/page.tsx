"use client"
import { useEffect, useRef, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import type { RoomState, Player, ServerEvent, ClientEvent, GameEndResult } from "@/lib/types/game"
import { GAME_MODES, COUNTDOWN_SECONDS } from "@/lib/types/game"

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999"
type UIState = "waiting" | "countdown" | "in_progress" | "finished"

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const code = (params.code as string).toUpperCase()

  const wsRef = useRef<WebSocket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [uiState, setUIState] = useState<UIState>("waiting")
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [countdownReset, setCountdownReset] = useState<string | null>(null)
  const [results, setResults] = useState<GameEndResult[]>([])
  const [newAchievements, setNewAchievements] = useState<string[]>([])

  // Typing state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)

  const send = useCallback((event: ClientEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event))
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return
    const protocol = PARTYKIT_HOST.startsWith("localhost") ? "ws" : "wss"
    const ws = new WebSocket(`${protocol}://${PARTYKIT_HOST}/party/${code}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "join_room",
        token: "",
        userId: session.user?.id ?? "",          // ← send DB user ID so server can use it as player ID
        username: (session.user as { username?: string }).username ?? session.user?.name ?? "Guest",
        avatar: session.user?.image ?? "",
      }))
    }

    ws.onmessage = (e) => {
      const event: ServerEvent = JSON.parse(e.data)
      handleServerEvent(event)
    }

    ws.onclose = () => { if (wsRef.current === ws) wsRef.current = null }

    return () => {
      ws.onmessage = null; ws.onclose = null
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "leave_room" }))
      ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session])

  const handleServerEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case "room_state":
        setRoomState(event.state)
        setUIState(event.state.status as UIState)
        if (event.state.countdownTick !== null) setCountdown(event.state.countdownTick)
        break
      case "player_joined":
        setRoomState(prev => prev ? { ...prev, players: { ...prev.players, [event.player.id]: event.player } } : prev)
        break
      case "player_left":
        setRoomState(prev => {
          if (!prev) return prev
          const players = { ...prev.players }; delete players[event.playerId]
          return { ...prev, players }
        })
        break
      case "player_kicked":
        setRoomState(prev => {
          if (!prev) return prev
          const players = { ...prev.players }; delete players[event.playerId]
          return { ...prev, players }
        })
        break
      case "leader_changed":
        setRoomState(prev => prev ? { ...prev, leaderId: event.leaderId } : prev)
        break
      case "countdown":
        setUIState("countdown")
        setCountdown(event.tick)
        setCountdownReset(null)
        break
      case "countdown_reset":
        setUIState("waiting")
        setCountdown(COUNTDOWN_SECONDS)
        setCountdownReset(event.reason)
        setTimeout(() => setCountdownReset(null), 3000)
        break
      case "game_started":
        setRoomState(prev => prev ? { ...prev, text: event.text, words: event.words, status: "in_progress" } : prev)
        setUIState("in_progress")
        setStartedAt(Date.now()); setCurrentIndex(0); setErrors(0)
        setTimeout(() => inputRef.current?.focus(), 100)
        break
      case "progress_sync":
        setRoomState(prev => prev ? { ...prev, players: event.players } : prev)
        break
      case "game_ended":
        setUIState("finished"); setResults(event.results)
        saveResults(event.results)
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveResults(results: GameEndResult[]) {
    if (!session?.user) return
    const myResult = results.find(r => r.playerId === session.user!.id)
    if (!myResult || !roomState) return
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: roomState.mode, wpm: myResult.wpm, accuracy: myResult.accuracy, placement: myResult.placement, roomCode: code }),
    })
    const achRes = await fetch("/api/achievements/check", { method: "POST" })
    const { newAchievements: keys } = await achRes.json()
    setNewAchievements(keys)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (uiState !== "in_progress" || !roomState) return
    const text = roomState.text
    if (e.key === "Backspace") { if (currentIndex > 0) setCurrentIndex(i => i - 1); return }
    if (e.key.length !== 1) return

    const expected = text[currentIndex]
    if (e.key !== expected) setErrors(n => n + 1)
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    const elapsed = startedAt ? (Date.now() - startedAt) / 60000 : 0.001
    const newWpm = Math.round((newIndex / 5) / elapsed)
    const totalChars = newIndex
    const newAccuracy = totalChars > 0 ? Math.round(((totalChars - errors) / totalChars) * 100) : 100
    setWpm(newWpm); setAccuracy(newAccuracy)

    send({ type: "progress_update", wpm: newWpm, accuracy: newAccuracy, progress: Math.round((newIndex / text.length) * 100) })
    if (newIndex >= text.length) send({ type: "game_finished", wpm: newWpm, accuracy: newAccuracy })
  }

  const players = roomState ? Object.values(roomState.players) : []
  const myId = session?.user?.id ?? ""
  const isLeader = roomState?.leaderId === myId

  function copyCode() {
    navigator.clipboard.writeText(code); setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!session) return <LoadingScreen msg="Loading session…" />
  if (!roomState) return <LoadingScreen msg={`Connecting to room ${code}…`} />

  const modeInfo = GAME_MODES[roomState.mode] ?? GAME_MODES.race

  return (
    <>
      {/* Countdown Overlay */}
      {uiState === "countdown" && (
        <div className="countdown-overlay">
          <div className="text-center">
            <div className="countdown-number">
              {countdown === 0 ? "GO! 🚀" : countdown}
            </div>
            <p className="text-snow-muted text-base mt-4 font-semibold">
              {countdown > 0 ? `Game starts in ${countdown}s…` : "Let's go!"}
            </p>
            {isLeader && (
              <button
                className="btn-secondary mt-6 text-sm"
                onClick={() => send({ type: "cancel_countdown" })}
              >
                Cancel ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Achievement Toasts */}
      {newAchievements.length > 0 && (
        <div className="toast-stack">
          {newAchievements.map(key => (
            <div key={key} className="toast">
              <span className="text-2xl">🏅</span>
              <div>
                <div className="font-bold text-sm text-snow">Achievement Unlocked!</div>
                <div className="text-xs text-snow-muted">{key.replace(/_/g, " ")}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Countdown reset notification */}
      {countdownReset && (
        <div className="toast-stack">
          <div className="toast border-game-yellow/30">
            <span className="text-xl">⏱️</span>
            <div>
              <div className="font-bold text-sm text-game-yellow">Countdown Reset</div>
              <div className="text-xs text-snow-muted">{countdownReset}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <a href="/lobby" className="nav-logo">⌨️ Type<span>Wars</span></a>
          <div className="flex items-center gap-3">
            {/* Room code */}
            <button
              onClick={copyCode}
              className="flex items-center gap-2 bg-ink-3 border border-snow-faint/20 rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-snow hover:border-orange/40 transition-colors"
            >
              {code}
              <span className="text-xs text-snow-muted">{copied ? "✓" : "⧉"}</span>
            </button>
            <span className={`badge ${roomState.mode === 'race' ? 'badge-orange' : roomState.mode === 'arcade' ? 'badge-cyan' : 'badge-yellow'}`}>
              {modeInfo.icon} {modeInfo.label}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {uiState === "waiting" && (
          <WaitingView
            players={players}
            isLeader={isLeader}
            mode={roomState.mode}
            myId={myId}
            leaderId={roomState.leaderId}
            onSetMode={mode => send({ type: "set_mode", mode })}
            onStart={() => send({ type: "start_game" })}
            onKick={id => send({ type: "kick_player", targetId: id })}
            onTransferLeader={id => send({ type: "transfer_leader", targetId: id })}
            code={code}
          />
        )}

        {(uiState === "in_progress" || uiState === "countdown") && roomState.text && (
          <InProgressView
            text={roomState.text}
            mode={roomState.mode}
            currentIndex={currentIndex}
            players={players}
            myId={myId}
            wpm={wpm}
            accuracy={accuracy}
            inputRef={inputRef}
            onKeyDown={handleKeyDown}
          />
        )}

        {uiState === "finished" && (
          <FinishedView
            results={results}
            myId={myId}
            onPlayAgain={() => { setUIState("waiting"); setResults([]) }}
            onLeave={() => router.push("/lobby")}
          />
        )}
      </main>
    </>
  )
}

// ── Loading screen ──────────────────────────────────────────────
function LoadingScreen({ msg }: { msg: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3">
      <div className="text-4xl" style={{ animation: 'float 1.5s ease-in-out infinite' }}>⌨️</div>
      <p className="text-snow-muted text-sm font-semibold">{msg}</p>
    </div>
  )
}

// ── Waiting View ────────────────────────────────────────────────
function WaitingView({
  players, isLeader, mode, myId, leaderId,
  onSetMode, onStart, onKick, onTransferLeader, code,
}: {
  players: Player[]; isLeader: boolean; mode: string; myId: string; leaderId: string;
  onSetMode: (m: "race" | "arcade" | "blitz") => void;
  onStart: () => void;
  onKick: (id: string) => void;
  onTransferLeader: (id: string) => void;
  code: string;
}) {
  const [copied, setCopied] = useState(false)
  const [showTransfer, setShowTransfer] = useState<string | null>(null)
  const canStart = players.length >= 2

  function copy() {
    navigator.clipboard.writeText(code); setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-snow">Waiting Room</h1>
          <p className="text-snow-muted text-sm">
            {players.length}/6 players
            {players.length < 2 && <span className="text-game-yellow ml-2">— need 2+ to start</span>}
          </p>
        </div>
        {isLeader && <span className="badge-orange text-xs">👑 You're the Leader</span>}
      </div>

      {/* Not enough players warning */}
      {!canStart && (
        <div className="flex items-center gap-3 bg-game-yellow/10 border border-game-yellow/20 rounded-xl px-4 py-3">
          <span className="text-xl">👀</span>
          <p className="text-game-yellow text-sm font-semibold">Waiting for at least 1 more player to join before the game can start.</p>
        </div>
      )}

      {/* Game mode selector — visible to all, clickable only by leader */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-snow-faint">Game Mode</p>
          {!isLeader && (
            <span className="text-xs text-snow-faint">🔒 Only leader can change</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["race", "arcade", "blitz"] as const).map(m => {
            const info = GAME_MODES[m]
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => isLeader && onSetMode(m)}
                disabled={!isLeader}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-bold transition-all
                  ${active
                    ? 'border-orange bg-orange/15 text-orange'
                    : 'border-snow-faint/15 text-snow-muted'
                  }
                  ${isLeader && !active ? 'hover:border-snow-faint/40 cursor-pointer' : ''}
                  ${!isLeader ? 'opacity-60 cursor-not-allowed' : ''}
                `}
              >
                <span className="text-xl">{info.icon}</span>
                <span>{info.label}</span>
                {active && <span className="text-[9px] font-bold uppercase tracking-wider text-orange/80">Selected</span>}
              </button>
            )
          })}
        </div>
        <p className="text-snow-faint text-xs mt-2 text-center">
          {GAME_MODES[mode as keyof typeof GAME_MODES]?.desc}
        </p>
      </div>

      {/* Players */}
      <div className="card">
        <p className="text-xs font-bold uppercase tracking-widest text-snow-faint mb-3">Players</p>
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.id} className="player-row">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {p.avatar
                  ? <img src={p.avatar} alt="" className="avatar flex-shrink-0" />
                  : <div className="avatar flex-shrink-0 bg-ink-4 flex items-center justify-center text-sm">👤</div>
                }
                <span className="font-bold text-sm text-snow truncate">{p.username}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {p.id === myId && <span className="badge-muted text-[10px]">You</span>}
                  {p.id === leaderId && <span className="badge-orange text-[10px]">👑 Leader</span>}
                </div>
              </div>
              {isLeader && p.id !== myId && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="relative">
                    <button
                      className="btn-secondary btn-sm text-xs gap-1"
                      onClick={() => setShowTransfer(showTransfer === p.id ? null : p.id)}
                    >
                      ···
                    </button>
                    {showTransfer === p.id && (
                      <div className="absolute right-0 top-full mt-1 z-20 bg-ink-3 border border-snow-faint/20 rounded-xl p-1 shadow-card min-w-[140px]">
                        <button
                          className="w-full text-left text-xs font-semibold text-game-yellow hover:bg-game-yellow/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                          onClick={() => { onTransferLeader(p.id); setShowTransfer(null) }}
                        >
                          👑 Make Leader
                        </button>
                        <button
                          className="w-full text-left text-xs font-semibold text-game-pink hover:bg-game-pink/10 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
                          onClick={() => { onKick(p.id); setShowTransfer(null) }}
                        >
                          🚫 Kick Player
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-ink/60 border border-dashed border-snow-faint/15 rounded-xl px-4 py-2.5">
              <div className="avatar bg-ink-3 flex items-center justify-center text-snow-faint text-sm border border-dashed border-snow-faint/20">+</div>
              <span className="text-snow-faint text-sm">Waiting for player…</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button className="btn-secondary flex-1 justify-center" onClick={copy}>
          {copied ? '✓ Copied!' : `📋 Share: ${code}`}
        </button>
        {isLeader ? (
          <button
            id="btn-start-game"
            className={`btn-lg justify-center ${canStart ? 'btn-yellow' : 'btn-secondary opacity-60'}`}
            style={{ minWidth: '160px' }}
            onClick={onStart}
            disabled={!canStart}
            title={!canStart ? 'Need at least 2 players to start' : ''}
          >
            {canStart ? '🚀 Start Game!' : '⏳ Waiting...'}
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-snow-muted text-sm font-semibold px-4 py-2 bg-ink-3 rounded-xl border border-dashed border-snow-faint/15">
            <span className="animate-pulse">⏳</span> Waiting for leader to start…
          </div>
        )}
      </div>
    </div>
  )
}

// ── In Progress View ────────────────────────────────────────────
function InProgressView({
  text, mode, currentIndex, players, myId, wpm, accuracy, inputRef, onKeyDown,
}: {
  text: string; mode: string; currentIndex: number; players: Player[]
  myId: string; wpm: number; accuracy: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card">
          <div className="stat-number">{wpm}</div>
          <div className="stat-label">WPM</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ fontSize: '1.75rem' }}>{accuracy}%</div>
          <div className="stat-label">Accuracy</div>
        </div>
      </div>

      {/* Opponents */}
      {players.length > 1 && (
        <div className="card">
          <p className="text-xs font-bold uppercase tracking-widest text-snow-faint mb-3">Opponents</p>
          <div className="flex flex-col gap-3">
            {players.filter(p => p.id !== myId).map(p => (
              <div key={p.id}>
                <div className="flex justify-between mb-1 text-xs">
                  <span className="font-bold text-snow">{p.username}</span>
                  <span className="text-snow-muted font-mono">{p.wpm} wpm · {Math.round(mode === "race" ? p.progress : p.score)}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill progress-fill-cyan" style={{ width: `${mode === "race" ? p.progress : Math.min(p.score, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typing area */}
      {mode === "race" && (
        <div className="typing-area" onClick={() => inputRef.current?.focus()}>
          {text.split("").map((ch, i) => {
            let cls = "char"
            if (i < currentIndex) cls = "char-correct"
            else if (i === currentIndex) cls = "char-current"
            return <span key={i} className={cls}>{ch}</span>
          })}
          <input
            ref={inputRef}
            style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
            onKeyDown={onKeyDown}
            readOnly tabIndex={0}
            aria-label="Typing input"
          />
        </div>
      )}

      {/* My progress */}
      {mode === "race" && (
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-bold text-orange">Your progress</span>
            <span className="text-snow-muted font-mono">{Math.round((currentIndex / text.length) * 100)}%</span>
          </div>
          <div className="progress-track" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${(currentIndex / text.length) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Finished View ───────────────────────────────────────────────
function FinishedView({
  results, myId, onPlayAgain, onLeave,
}: {
  results: GameEndResult[]; myId: string;
  onPlayAgain: () => void; onLeave: () => void;
}) {
  const medals = ["🥇", "🥈", "🥉"]
  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      <div className="text-center">
        <div className="text-5xl mb-3">🏁</div>
        <h1 className="font-display text-3xl font-bold text-snow">Race Results!</h1>
      </div>

      <div className="flex flex-col gap-3">
        {results.map((r, idx) => (
          <div
            key={r.playerId}
            className={`card flex items-center gap-4 border ${
              r.playerId === myId
                ? 'border-orange/40 bg-orange/5'
                : 'border-snow-faint/10'
            }`}
          >
            <span className="text-3xl flex-shrink-0">{medals[idx] ?? `${idx + 1}`}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {r.avatar && <img src={r.avatar} alt="" className="avatar" style={{ width: '1.5rem', height: '1.5rem' }} />}
                <span className="font-bold text-snow text-sm truncate">{r.username}</span>
                {r.playerId === myId && <span className="badge-orange text-[10px]">You</span>}
              </div>
            </div>
            <div className="flex gap-4 text-right flex-shrink-0">
              <div>
                <div className="font-mono font-bold text-xl text-orange">{r.wpm}</div>
                <div className="text-snow-faint text-[10px] font-bold uppercase tracking-wider">WPM</div>
              </div>
              <div>
                <div className="font-mono font-bold text-xl text-snow">{r.accuracy}%</div>
                <div className="text-snow-faint text-[10px] font-bold uppercase tracking-wider">Acc</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <button className="btn-primary" onClick={onPlayAgain}>Play Again 🔄</button>
        <button className="btn-secondary" onClick={onLeave}>Leave Room</button>
      </div>
    </div>
  )
}
