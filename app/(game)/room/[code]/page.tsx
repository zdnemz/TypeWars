'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { RoomState, Player, ServerEvent, ClientEvent, GameEndResult } from '@/lib/types/game'

const PARTYKIT_HOST = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'

// ─── Types ────────────────────────────────────────────────────
type UIState = 'waiting' | 'countdown' | 'in_progress' | 'finished'

// ─── Main Component ────────────────────────────────────────────
export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const code = (params.code as string).toUpperCase()

  const wsRef = useRef<WebSocket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [uiState, setUIState] = useState<UIState>('waiting')
  const [countdown, setCountdown] = useState(3)
  const [results, setResults] = useState<GameEndResult[]>([])
  const [newAchievements, setNewAchievements] = useState<string[]>([])

  // Typing state
  const [typingInput, setTypingInput] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Copy state
  const [copied, setCopied] = useState(false)

  const send = useCallback((event: ClientEvent) => {
    wsRef.current?.send(JSON.stringify(event))
  }, [])

  // Connect to PartyKit
  useEffect(() => {
    if (!session?.user) return
    const protocol = PARTYKIT_HOST.startsWith('localhost') ? 'ws' : 'wss'
    const ws = new WebSocket(`${protocol}://${PARTYKIT_HOST}/party/${code}`)
    wsRef.current = ws

    ws.onopen = () => {
      send({
        type: 'join_room',
        token: '', // token handled by PartyKit auth in production
        username: (session.user as { username?: string }).username ?? session.user?.name ?? 'Guest',
        avatar: session.user?.image ?? '',
      })
    }

    ws.onmessage = (e) => {
      const event: ServerEvent = JSON.parse(e.data)
      handleServerEvent(event)
    }

    ws.onclose = () => { wsRef.current = null }

    return () => {
      send({ type: 'leave_room' })
      ws.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session])

  const handleServerEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case 'room_state':
        setRoomState(event.state)
        setUIState(event.state.status)
        break
      case 'player_joined':
        setRoomState(prev => prev ? { ...prev, players: { ...prev.players, [event.player.id]: event.player } } : prev)
        break
      case 'player_left':
        setRoomState(prev => {
          if (!prev) return prev
          const players = { ...prev.players }
          delete players[event.playerId]
          return { ...prev, players }
        })
        break
      case 'player_kicked':
        setRoomState(prev => {
          if (!prev) return prev
          const players = { ...prev.players }
          delete players[event.playerId]
          return { ...prev, players }
        })
        break
      case 'countdown':
        setUIState('countdown')
        setCountdown(event.tick)
        break
      case 'game_started':
        setRoomState(prev => prev ? { ...prev, text: event.text, words: event.words, status: 'in_progress' } : prev)
        setUIState('in_progress')
        setStartedAt(Date.now())
        setCurrentIndex(0)
        setErrors(0)
        setTypingInput('')
        setTimeout(() => inputRef.current?.focus(), 100)
        break
      case 'progress_sync':
        setRoomState(prev => prev ? { ...prev, players: event.players } : prev)
        break
      case 'game_ended':
        setUIState('finished')
        setResults(event.results)
        saveResults(event.results)
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveResults(results: GameEndResult[]) {
    if (!session?.user) return
    const userId = session.user.id
    const myResult = results.find(r => r.playerId === userId)
    if (!myResult || !roomState) return

    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: roomState.mode,
        wpm: myResult.wpm,
        accuracy: myResult.accuracy,
        placement: myResult.placement,
        roomCode: code,
      }),
    })

    const achRes = await fetch('/api/achievements/check', { method: 'POST' })
    const { newAchievements: keys } = await achRes.json()
    setNewAchievements(keys)
  }

  // Typing logic
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (uiState !== 'in_progress' || !roomState) return
    const text = roomState.text

    if (e.key === 'Backspace') {
      if (currentIndex > 0) setCurrentIndex(i => i - 1)
      return
    }

    if (e.key.length !== 1) return
    const expected = text[currentIndex]
    if (e.key !== expected) setErrors(n => n + 1)

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    // Compute stats
    const elapsed = startedAt ? (Date.now() - startedAt) / 60000 : 0.001
    const wordsTyped = newIndex / 5
    const newWpm = Math.round(wordsTyped / elapsed)
    const totalChars = newIndex
    const correctChars = totalChars - errors
    const newAccuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100
    setWpm(newWpm)
    setAccuracy(newAccuracy)

    // Send progress update
    send({ type: 'progress_update', wpm: newWpm, accuracy: newAccuracy, progress: Math.round((newIndex / text.length) * 100) })

    // Finished?
    if (newIndex >= text.length) {
      send({ type: 'game_finished', wpm: newWpm, accuracy: newAccuracy })
    }
  }

  const players = roomState ? Object.values(roomState.players) : []
  const isLeader = roomState?.leaderId === session?.user?.id
  const myId = session?.user?.id ?? ''

  function copyCode() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!session) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading session…</p></div>
  if (!roomState) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Connecting to room <strong>{code}</strong>…</p></div>

  return (
    <>
      {/* Countdown Overlay */}
      {uiState === 'countdown' && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown === 0 ? 'GO!' : countdown}</div>
        </div>
      )}

      {/* Achievement Toasts */}
      {newAchievements.length > 0 && (
        <div className="toast-container">
          {newAchievements.map(key => (
            <div key={key} className="toast toast--achievement">
              <span style={{ fontSize: '1.5rem' }}>🏅</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Achievement Unlocked!</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{key.replace(/_/g, ' ')}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <nav className="nav">
        <div className="nav__inner">
          <a href="/lobby" className="nav__logo">⌨️ Type<span>Battle</span></a>
          <div className="flex items-center gap-4">
            <div className="room-code" style={{ fontSize: '1.1rem', padding: '0.4rem 0.875rem' }}>
              {code}
              <button className="btn btn--sm btn--secondary btn--icon" onClick={copyCode} title="Copy room code">
                {copied ? '✓' : '⧉'}
              </button>
            </div>
            <span className="badge badge--accent">{roomState.mode === 'race' ? '🏁 Race' : '🎮 Arcade'}</span>
          </div>
        </div>
      </nav>

      <main style={{ padding: '2rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>

        {/* ── WAITING ── */}
        {uiState === 'waiting' && (
          <WaitingView
            players={players}
            isLeader={isLeader}
            mode={roomState.mode}
            myId={myId}
            onSetMode={mode => send({ type: 'set_mode', mode })}
            onStart={() => send({ type: 'start_game' })}
            onKick={id => send({ type: 'kick_player', targetId: id })}
            code={code}
          />
        )}

        {/* ── IN PROGRESS ── */}
        {(uiState === 'in_progress' || uiState === 'countdown') && roomState.text && (
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

        {/* ── FINISHED ── */}
        {uiState === 'finished' && (
          <FinishedView
            results={results}
            myId={myId}
            onPlayAgain={() => {
              setUIState('waiting')
              setResults([])
              setRoomState(prev => prev ? { ...prev, status: 'waiting' } : prev)
            }}
            onLeave={() => router.push('/lobby')}
          />
        )}
      </main>
    </>
  )
}

// ─── Waiting View ─────────────────────────────────────────────
function WaitingView({ players, isLeader, mode, myId, onSetMode, onStart, onKick, code }: {
  players: Player[]; isLeader: boolean; mode: string; myId: string
  onSetMode: (m: 'race' | 'arcade') => void; onStart: () => void
  onKick: (id: string) => void; code: string
}) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="flex items-center justify-between">
        <h1 style={{ fontSize: '1.4rem' }}>Waiting for players…</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{players.length}/4 players</span>
      </div>

      {/* Mode selector (leader only) */}
      {isLeader && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Game Mode</p>
          <div className="tab-bar" style={{ maxWidth: '300px' }}>
            <button className={`tab-bar__tab ${mode === 'race' ? 'tab-bar__tab--active' : ''}`} onClick={() => onSetMode('race')}>🏁 Race</button>
            <button className={`tab-bar__tab ${mode === 'arcade' ? 'tab-bar__tab--active' : ''}`} onClick={() => onSetMode('arcade')}>🎮 Arcade</button>
          </div>
        </div>
      )}

      {/* Player list */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <p style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Players</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between" style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div className="flex items-center gap-3">
                {p.avatar
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.avatar} alt="" className="avatar" />
                  : <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', background: 'var(--bg-overlay)' }}>👤</div>
                }
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.username}</span>
                {p.id === myId && <span className="badge badge--accent" style={{ fontSize: '0.7rem' }}>You</span>}
              </div>
              <div className="flex items-center gap-2">
                {isLeader && p.id !== myId && (
                  <button className="btn btn--danger btn--sm" onClick={() => onKick(p.id)}>Kick</button>
                )}
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={i} style={{ padding: '0.625rem 0.875rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Waiting for player…
            </div>
          ))}
        </div>
      </div>

      {/* Invite / Start */}
      <div className="flex gap-3">
        <button className="btn btn--secondary flex-1" onClick={copy}>
          {copied ? '✓ Copied!' : `Share Code: ${code}`}
        </button>
        {isLeader && (
          <button id="btn-start-game" className="btn btn--primary" style={{ minWidth: '140px' }} onClick={onStart} disabled={players.length < 1}>
            Start Game
          </button>
        )}
      </div>
    </div>
  )
}

// ─── In Progress View ─────────────────────────────────────────
function InProgressView({ text, mode, currentIndex, players, myId, wpm, accuracy, inputRef, onKeyDown }: {
  text: string; mode: string; currentIndex: number; players: Player[]; myId: string
  wpm: number; accuracy: number; inputRef: React.RefObject<HTMLInputElement | null>
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Live stats bar */}
      <div className="flex gap-4">
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="wpm-display">{wpm}<span className="wpm-display__unit"> wpm</span></div>
          <div className="stat-card__label">Speed</div>
        </div>
        <div className="stat-card" style={{ flex: 1 }}>
          <div className="wpm-display" style={{ fontSize: '2rem' }}>{accuracy}<span className="wpm-display__unit">%</span></div>
          <div className="stat-card__label">Accuracy</div>
        </div>
      </div>

      {/* Opponent progress */}
      {players.length > 1 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <p style={{ marginBottom: '0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Opponents</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {players.filter(p => p.id !== myId).map(p => (
              <div key={p.id}>
                <div className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 500 }}>{p.username}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{p.wpm} wpm · {Math.round(mode === 'race' ? p.progress : p.score)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${mode === 'race' ? p.progress : Math.min(p.score, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typing area */}
      {mode === 'race' && (
        <div className="typing-area" onClick={() => inputRef.current?.focus()}>
          {text.split('').map((ch, i) => {
            let cls = 'typing-char'
            if (i < currentIndex) cls += ' typing-char--correct'
            else if (i === currentIndex) cls += ' typing-char--current'
            return <span key={i} className={cls}>{ch}</span>
          })}
          <input
            ref={inputRef}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, top: 0, left: 0 }}
            onKeyDown={onKeyDown}
            readOnly
            tabIndex={0}
            aria-label="Typing input"
          />
        </div>
      )}

      {/* My progress bar */}
      {mode === 'race' && (
        <div>
          <div className="flex justify-between" style={{ marginBottom: '0.25rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Your progress</span>
            <span>{Math.round((currentIndex / text.length) * 100)}%</span>
          </div>
          <div className="progress-bar" style={{ height: '8px' }}>
            <div className="progress-bar__fill progress-bar__fill--green" style={{ width: `${(currentIndex / text.length) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Finished View ────────────────────────────────────────────
function FinishedView({ results, myId, onPlayAgain, onLeave }: {
  results: GameEndResult[]; myId: string; onPlayAgain: () => void; onLeave: () => void
}) {
  const medals = ['🥇', '🥈', '🥉']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto' }} className="animate-fade-in">
      <h1 style={{ textAlign: 'center', fontSize: '1.75rem' }}>Race Results</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {results.map((r, idx) => (
          <div key={r.playerId} className={`card flex items-center gap-4 ${r.playerId === myId ? 'pulse-glow' : ''}`}
            style={{ background: r.playerId === myId ? 'rgba(108,99,255,0.1)' : undefined, borderColor: r.playerId === myId ? 'rgba(108,99,255,0.4)' : undefined }}
          >
            <span className="medal">{medals[idx] ?? `${idx + 1}`}</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700 }}>{r.username}</span>
                {r.playerId === myId && <span className="badge badge--accent" style={{ fontSize: '0.7rem' }}>You</span>}
              </div>
            </div>
            <div className="flex gap-4" style={{ textAlign: 'right' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-primary)' }}>{r.wpm}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WPM</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem' }}>{r.accuracy}%</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Acc</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3" style={{ justifyContent: 'center' }}>
        <button className="btn btn--primary" onClick={onPlayAgain}>Play Again</button>
        <button className="btn btn--secondary" onClick={onLeave}>Leave Room</button>
      </div>
    </div>
  )
}
