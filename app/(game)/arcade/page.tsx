'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

const WORD_POOL = [
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "it",
  "for", "not", "on", "with", "he", "as", "you", "do", "at", "this",
  "but", "his", "by", "from", "they", "we", "say", "her", "she", "or",
  "an", "will", "my", "one", "all", "would", "there", "their", "what",
  "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
  "when", "make", "can", "like", "time", "no", "just", "him", "know",
  "take", "people", "into", "year", "your", "good", "some", "could",
  "them", "see", "other", "than", "then", "now", "look", "only", "come",
  "its", "over", "think", "also", "back", "after", "use", "two", "how",
  "type", "fast", "jump", "test", "word", "game", "win", "key", "run",
]

const GAME_DURATION = 60 // seconds
const WORDS_PER_ROW = 12

function generateWords(count: number) {
  return Array.from({ length: count }, () => WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)])
}

type WordState = 'pending' | 'active' | 'correct' | 'incorrect'

export default function ArcadePage() {
  const [words, setWords] = useState<string[]>(() => generateWords(100))
  const [wordStates, setWordStates] = useState<WordState[]>(() => Array(100).fill('pending'))
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mark first word active on start
  useEffect(() => {
    setWordStates(prev => { const s = [...prev]; s[0] = 'active'; return s })
  }, [])

  const endGame = useCallback(async (finalScore: number) => {
    setFinished(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const wpm = Math.round(finalScore / (GAME_DURATION / 60))
    await fetch('/api/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'arcade', wpm, accuracy: 100 }),
    })
    await fetch('/api/achievements/check', { method: 'POST' })
    setSaved(true)
  }, [])

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setFinished(true)
          endGame(score)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!started && val.length > 0) { setStarted(true); startTimer() }
    if (val.endsWith(' ') || val.endsWith('\n')) {
      const typed = val.trim()
      const correct = typed === words[currentWordIdx]
      const newState: WordState = correct ? 'correct' : 'incorrect'
      setWordStates(prev => {
        const s = [...prev]
        s[currentWordIdx] = newState
        if (currentWordIdx + 1 < s.length) s[currentWordIdx + 1] = 'active'
        return s
      })
      if (correct) setScore(n => n + 1)
      setCurrentWordIdx(i => i + 1)
      setInput('')
    } else {
      setInput(val)
    }
  }

  const timerPercent = (timeLeft / GAME_DURATION) * 100
  const wpm = started ? Math.round(score / ((GAME_DURATION - timeLeft + 1) / 60)) : 0
  const currentRow = Math.floor(currentWordIdx / WORDS_PER_ROW)
  const visibleWords = words.slice(currentRow * WORDS_PER_ROW, (currentRow + 2) * WORDS_PER_ROW)
  const visibleStates = wordStates.slice(currentRow * WORDS_PER_ROW, (currentRow + 2) * WORDS_PER_ROW)

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/lobby" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <span className="badge badge--green">🎮 Arcade</span>
        </div>
      </nav>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {!finished ? (
          <>
            {/* Timer + score bar */}
            <div className="flex gap-4" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ flex: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div className="stat-card__label">Time Left</div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.5rem', color: timeLeft <= 10 ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>{timeLeft}s</span>
                </div>
                <div className="progress-bar" style={{ height: '8px' }}>
                  <div className="progress-bar__fill" style={{ width: `${timerPercent}%`, background: timeLeft <= 10 ? 'var(--accent-secondary)' : undefined, transition: 'width 1s linear' }} />
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="wpm-display">{score}</div>
                <div className="stat-card__label">Words</div>
              </div>
              <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="wpm-display" style={{ fontSize: '1.75rem' }}>{wpm}</div>
                <div className="stat-card__label">WPM</div>
              </div>
            </div>

            {/* Word grid */}
            <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem', lineHeight: 2.2, fontFamily: 'var(--font-mono)', fontSize: '1.2rem' }}>
              {visibleWords.map((word, i) => {
                const state = visibleStates[i]
                let color = 'var(--text-muted)'
                if (state === 'active') color = 'var(--text-primary)'
                if (state === 'correct') color = 'var(--accent-green)'
                if (state === 'incorrect') color = 'var(--accent-secondary)'
                return (
                  <span key={currentRow * WORDS_PER_ROW + i} style={{ marginRight: '1rem', color, fontWeight: state === 'active' ? 700 : 400,
                    textDecoration: state === 'active' ? 'underline' : undefined,
                    transition: 'color 0.15s' }}>
                    {word}
                  </span>
                )
              })}
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              id="arcade-input"
              className="input"
              autoFocus
              value={input}
              onChange={handleInput}
              disabled={finished}
              placeholder={started ? 'Type the highlighted word…' : 'Start typing to begin!'}
              style={{ fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}
            />
          </>
        ) : (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎮</div>
            <h1 style={{ marginBottom: '0.5rem' }}>Time's Up!</h1>
            {saved && <p style={{ color: 'var(--accent-green)', marginBottom: '1.5rem' }}>✓ Stats saved</p>}
            <div className="grid-2" style={{ maxWidth: '360px', margin: '0 auto 2rem' }}>
              <div className="stat-card"><div className="wpm-display">{score}</div><div className="stat-card__label">Words Typed</div></div>
              <div className="stat-card"><div className="wpm-display" style={{ fontSize: '1.75rem' }}>{Math.round(score / (GAME_DURATION / 60))}</div><div className="stat-card__label">WPM</div></div>
            </div>
            <div className="flex gap-3 justify-center">
              <button className="btn btn--primary" onClick={() => window.location.reload()}>Play Again</button>
              <Link href="/lobby" className="btn btn--secondary">Lobby</Link>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
