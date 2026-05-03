'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Programming is the art of telling another human what one wants the computer to do. Code is like humor.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency.",
  "A good programmer is someone who always looks both ways before crossing a one-way street.",
  "In theory there is no difference between theory and practice. In practice there is.",
]

function getRandomText() {
  return TEXTS[Math.floor(Math.random() * TEXTS.length)]
}

export default function SoloPage() {
  const [text] = useState(getRandomText)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (finished) return
    if (e.key === 'Backspace') { if (currentIndex > 0) setCurrentIndex(i => i - 1); return }
    if (e.key.length !== 1) return

    if (!startedAt) setStartedAt(Date.now())

    const expected = text[currentIndex]
    if (e.key !== expected) setErrors(n => n + 1)

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    const elapsed = startedAt ? (Date.now() - startedAt) / 60000 : 0.001
    const newWpm = Math.round((newIndex / 5) / elapsed)
    const newAccuracy = Math.round(((newIndex - errors) / newIndex) * 100)
    setWpm(newWpm)
    setAccuracy(newAccuracy)

    if (newIndex >= text.length) {
      setFinished(true)
      saveSoloResult(newWpm, newAccuracy)
    }
  }

  async function saveSoloResult(w: number, a: number) {
    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'race', wpm: w, accuracy: a }),
    })
    await fetch('/api/achievements/check', { method: 'POST' })
    setSaved(true)
  }

  const progress = Math.round((currentIndex / text.length) * 100)

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/lobby" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <span className="badge badge--accent">⚡ Solo Race</span>
        </div>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {!finished ? (
          <>
            <div className="flex gap-4" style={{ marginBottom: '2rem' }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div className="wpm-display">{wpm}<span className="wpm-display__unit"> wpm</span></div>
                <div className="stat-card__label">Speed</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div className="wpm-display" style={{ fontSize: '2rem' }}>{accuracy}<span className="wpm-display__unit">%</span></div>
                <div className="stat-card__label">Accuracy</div>
              </div>
            </div>

            <div className="typing-area" style={{ marginBottom: '1.5rem' }} onClick={() => inputRef.current?.focus()}>
              {text.split('').map((ch, i) => {
                let cls = 'typing-char'
                if (i < currentIndex) cls += ' typing-char--correct'
                else if (i === currentIndex) cls += ' typing-char--current'
                return <span key={i} className={cls}>{ch}</span>
              })}
              <input ref={inputRef} onKeyDown={handleKeyDown} readOnly
                style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} aria-label="Type here" />
            </div>

            <div className="progress-bar" style={{ height: '8px' }}>
              <div className="progress-bar__fill progress-bar__fill--green" style={{ width: `${progress}%` }} />
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{progress}% complete</p>
          </>
        ) : (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏁</div>
            <h1 style={{ marginBottom: '0.5rem' }}>Race Complete!</h1>
            {saved && <p style={{ marginBottom: '2rem', color: 'var(--accent-green)' }}>✓ Stats saved to your profile</p>}
            <div className="grid-2" style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
              <div className="stat-card"><div className="wpm-display">{wpm}</div><div className="stat-card__label">WPM</div></div>
              <div className="stat-card"><div className="wpm-display" style={{ fontSize: '2rem' }}>{accuracy}%</div><div className="stat-card__label">Accuracy</div></div>
            </div>
            <div className="flex gap-3 justify-center">
              <button className="btn btn--primary" onClick={() => window.location.reload()}>Try Again</button>
              <Link href="/lobby" className="btn btn--secondary">Back to Lobby</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
