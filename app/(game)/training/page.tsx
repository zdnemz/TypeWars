'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'

const TEXTS = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.",
  "Programming is the art of telling another human what one wants the computer to do.",
  "First, solve the problem. Then, write the code. Simplicity is the soul of efficiency.",
  "A good programmer always looks both ways before crossing a one-way street. Clean code reads like prose.",
  "Walking on water and developing software from a specification are easy if both are frozen.",
]

export default function TrainingPage() {
  const [text] = useState(() => TEXTS[Math.floor(Math.random() * TEXTS.length)])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (finished) return
    if (e.key === 'Backspace') { if (currentIndex > 0) setCurrentIndex(i => i - 1); return }
    if (e.key.length !== 1) return
    if (!startedAt) setStartedAt(Date.now())

    const newIndex = currentIndex + 1
    if (e.key !== text[currentIndex]) setErrors(n => n + 1)
    setCurrentIndex(newIndex)

    const elapsed = startedAt ? (Date.now() - startedAt) / 60000 : 0.001
    setWpm(Math.round((newIndex / 5) / elapsed))
    if (newIndex >= text.length) setFinished(true)
  }

  const accuracy = currentIndex > 0 ? Math.round(((currentIndex - errors) / currentIndex) * 100) : 100

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/lobby" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <span className="badge badge--yellow">🎯 Training Mode</span>
        </div>
      </nav>

      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>Training Mode</h1>
          <p style={{ fontSize: '0.875rem' }}>No pressure, no stats saved. Just practice.</p>
        </div>

        <div className="flex gap-4" style={{ marginBottom: '2rem' }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="wpm-display">{wpm}<span className="wpm-display__unit"> wpm</span></div>
            <div className="stat-card__label">Speed</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="wpm-display" style={{ fontSize: '2rem' }}>{accuracy}<span className="wpm-display__unit">%</span></div>
            <div className="stat-card__label">Accuracy</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="wpm-display" style={{ fontSize: '2rem', color: 'var(--accent-secondary)' }}>{errors}</div>
            <div className="stat-card__label">Errors</div>
          </div>
        </div>

        {!finished ? (
          <div className="typing-area" onClick={() => inputRef.current?.focus()}>
            {text.split('').map((ch, i) => {
              let cls = 'typing-char'
              if (i < currentIndex) cls += ' typing-char--correct'
              else if (i === currentIndex) cls += ' typing-char--current'
              return <span key={i} className={cls}>{ch}</span>
            })}
            <input ref={inputRef} onKeyDown={handleKeyDown} readOnly
              style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} aria-label="Type here" />
          </div>
        ) : (
          <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Done!</h2>
            <p style={{ marginBottom: '2rem' }}>{wpm} WPM · {accuracy}% accuracy · {errors} errors</p>
            <div className="flex gap-3 justify-center">
              <button className="btn btn--primary" onClick={() => window.location.reload()}>Practice Again</button>
              <Link href="/solo" className="btn btn--secondary">Try Solo Race</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
