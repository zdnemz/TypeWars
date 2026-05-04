'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const TEXTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Programming is the art of telling another human what one wants the computer to do.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency.",
  "A good programmer is someone who always looks both ways before crossing a one-way street.",
  "Walking on water and developing software from a specification are easy if both are frozen.",
]

export default function TrainingPage() {
  const [textIdx, setTextIdx] = useState(0)
  const text = TEXTS[textIdx]
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [textIdx])

  function handleKeyDown(e: React.KeyboardEvent) {
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
    setWpm(Math.round((newIndex / 5) / Math.max(elapsed, 0.001)))

    if (newIndex >= text.length) setFinished(true)
  }

  function reset() {
    setCurrentIndex(0); setErrors(0); setWpm(0)
    setStartedAt(null); setFinished(false)
    setTextIdx(i => (i + 1) % TEXTS.length)
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/lobby" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <span className="badge-lime">🎯 Training</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold text-snow mb-1">Training Mode</h1>
          <p className="text-snow-muted text-sm">No pressure, no stats saved. Just practice. 🧘</p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="stat-card"><div className="stat-number">{wpm}</div><div className="stat-label">WPM</div></div>
            <div className="stat-card"><div className="stat-number text-game-pink" style={{ fontSize: '1.5rem' }}>{errors}</div><div className="stat-label">Errors</div></div>
          </div>

          {!finished ? (
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
              />
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-4xl mb-3">✅</div>
              <h2 className="font-display text-2xl font-bold text-snow mb-1">Well done!</h2>
              <p className="text-snow-muted text-sm mb-5">{wpm} WPM · {errors} errors</p>
              <button className="btn-primary" onClick={reset}>Next Text 🔄</button>
            </div>
          )}

          <p className="text-center text-snow-faint text-xs font-semibold">
            {!startedAt ? '⌨️ Click the text area and start typing…' : finished ? '' : '🎯 Keep going!'}
          </p>
        </div>
      </main>
    </>
  )
}
