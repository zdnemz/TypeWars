'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Programming is the art of telling another human what one wants the computer to do. Code is like humor — when you have to explain it, it's bad.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency.",
  "A good programmer is someone who always looks both ways before crossing a one-way street.",
  "In theory there is no difference between theory and practice. In practice there is.",
]

export default function SoloPage() {
  const [text] = useState(() => TEXTS[Math.floor(Math.random() * TEXTS.length)])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (finished) return
    if (e.key === 'Backspace') { if (currentIndex > 0) setCurrentIndex(i => i - 1); return }
    if (e.key.length !== 1) return

    const now = Date.now()
    const sa = startedAt ?? now
    if (!startedAt) setStartedAt(now)

    const expected = text[currentIndex]
    if (e.key !== expected) setErrors(n => n + 1)
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    const elapsed = (now - sa) / 60000
    const newWpm = Math.round((newIndex / 5) / Math.max(elapsed, 0.001))
    const newAcc = Math.round(((newIndex - errors) / newIndex) * 100)
    setWpm(newWpm); setAccuracy(newAcc)

    if (newIndex >= text.length) {
      setFinished(true)
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'solo', wpm: newWpm, accuracy: newAcc }),
      })
      await fetch('/api/achievements/check', { method: 'POST' })
      setSaved(true)
    }
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/lobby" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <span className="badge-yellow">⚡ Solo Race</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!finished ? (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card"><div className="stat-number">{wpm}</div><div className="stat-label">WPM</div></div>
              <div className="stat-card"><div className="stat-number" style={{ fontSize: '1.5rem' }}>{accuracy}%</div><div className="stat-label">Accuracy</div></div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="font-bold text-orange">Progress</span>
                <span className="font-mono text-snow-muted">{Math.round((currentIndex / text.length) * 100)}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${(currentIndex / text.length) * 100}%` }} />
              </div>
            </div>

            <div className="typing-area" onClick={() => inputRef.current?.focus()}>
              {text.split('').map((ch, i) => {
                let cls = 'char'
                if (i < currentIndex) cls = 'char-correct'
                else if (i === currentIndex) cls = 'char-current'
                return <span key={i} className={cls}>{ch}</span>
              })}
              <input
                ref={inputRef}
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                onKeyDown={handleKeyDown}
                readOnly tabIndex={0}
                aria-label="Typing input"
              />
            </div>

            <p className="text-center text-snow-faint text-xs font-semibold">
              {!startedAt ? '⌨️ Start typing to begin…' : 'Keep going! 🔥'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center max-w-sm mx-auto">
            <div className="text-6xl" style={{ animation: 'float 1.5s ease-in-out infinite' }}>🏁</div>
            <div>
              <h1 className="font-display text-3xl font-bold text-snow mb-1">Finished!</h1>
              {saved && <p className="text-game-lime text-sm font-semibold">✓ Stats saved</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="stat-card"><div className="stat-number">{wpm}</div><div className="stat-label">WPM</div></div>
              <div className="stat-card"><div className="stat-number" style={{ fontSize: '1.5rem' }}>{accuracy}%</div><div className="stat-label">Accuracy</div></div>
              <div className="stat-card"><div className="stat-number text-game-pink" style={{ fontSize: '1.5rem' }}>{errors}</div><div className="stat-label">Errors</div></div>
              <div className="stat-card"><div className="stat-number text-game-lime" style={{ fontSize: '1.5rem' }}>{text.length}</div><div className="stat-label">Chars</div></div>
            </div>
            <div className="flex gap-3">
              <button className="btn-primary" onClick={() => window.location.reload()}>Play Again 🔄</button>
              <Link href="/lobby" className="btn-secondary">Lobby</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
