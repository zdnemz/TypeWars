"use client"
import { useState, useRef, useCallback } from "react"
import Link from "next/link"

const WORD_POOL = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with","he",
  "as","you","do","at","this","but","his","by","from","they","we","say","her","she","or",
  "an","will","my","one","all","would","there","their","what","so","up","out","if","about",
  "type","fast","jump","test","word","game","win","key","run","speed","code","race","beat",
  "fire","blaze","ninja","quick","rapid","swift","hyper","turbo","pixel","bytes",
]

const GAME_DURATION = 60
const WORDS_PER_ROW = 10

function generateWords(count: number) {
  return Array.from({ length: count }, () => WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)])
}

type WordState = "pending" | "active" | "correct" | "incorrect"

export default function ArcadePage() {
  const [words] = useState<string[]>(() => generateWords(120))
  const [wordStates, setWordStates] = useState<WordState[]>(() => {
    const s = Array(120).fill("pending") as WordState[]
    s[0] = "active"
    return s
  })
  const [currentWordIdx, setCurrentWordIdx] = useState(0)
  const [input, setInput] = useState("")
  const [score, setScore] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scoreRef = useRef(0)
  const correctRef = useRef(0)
  const totalAttemptsRef = useRef(0)
  const finishedRef = useRef(false)

  const endGame = useCallback(async () => {
    if (finishedRef.current) return
    finishedRef.current = true
    if (timerRef.current) clearInterval(timerRef.current)
    setFinished(true)
    const wpm = Math.round(scoreRef.current / (GAME_DURATION / 60))
    const finalAcc = totalAttemptsRef.current > 0
      ? Math.round((correctRef.current / totalAttemptsRef.current) * 100) : 100
    await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "arcade", wpm, accuracy: finalAcc }),
    })
    await fetch("/api/achievements/check", { method: "POST" })
    setSaved(true)
  }, [])

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!started && val.length > 0) { setStarted(true); startTimer() }

    if (val.endsWith(" ") || val.endsWith("\n")) {
      const typed = val.trim()
      if (!typed) { setInput(""); return }
      const correct = typed === words[currentWordIdx]
      totalAttemptsRef.current += 1
      if (correct) {
        correctRef.current += 1
        setScore(n => { scoreRef.current = n + 1; return n + 1 })
      }
      setAccuracy(Math.round((correctRef.current / totalAttemptsRef.current) * 100))
      setWordStates(prev => {
        const s = [...prev]
        s[currentWordIdx] = correct ? "correct" : "incorrect"
        if (currentWordIdx + 1 < s.length) s[currentWordIdx + 1] = "active"
        return s
      })
      setCurrentWordIdx(i => i + 1)
      setInput("")
    } else {
      setInput(val)
    }
  }

  const timerPercent = (timeLeft / GAME_DURATION) * 100
  const wpm = started ? Math.round(score / ((GAME_DURATION - timeLeft + 1) / 60)) : 0
  const currentRow = Math.floor(currentWordIdx / WORDS_PER_ROW)
  const visibleWords = words.slice(currentRow * WORDS_PER_ROW, (currentRow + 2) * WORDS_PER_ROW)
  const visibleStates = wordStates.slice(currentRow * WORDS_PER_ROW, (currentRow + 2) * WORDS_PER_ROW)
  const finalWpm = Math.round(scoreRef.current / (GAME_DURATION / 60))
  const finalAcc = totalAttemptsRef.current > 0
    ? Math.round((correctRef.current / totalAttemptsRef.current) * 100) : 100

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/lobby" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <span className="badge-cyan">🎮 Arcade</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!finished ? (
          <div className="flex flex-col gap-5">
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="card col-span-2 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-snow-faint">Time Left</span>
                  <span className={`font-mono font-bold text-xl ${timeLeft <= 10 ? 'text-game-pink' : 'text-snow'}`}>{timeLeft}s</span>
                </div>
                <div className="progress-track">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${timerPercent}%`,
                      background: timeLeft <= 10 ? 'linear-gradient(90deg,#FF2D7A,#FF6B35)' : 'linear-gradient(90deg,#06D6FE,#9B5DE5)',
                      transitionDuration: '1s',
                    }}
                  />
                </div>
              </div>
              <div className="stat-card"><div className="stat-number text-game-cyan">{score}</div><div className="stat-label">Words</div></div>
              <div className="stat-card"><div className="stat-number" style={{ fontSize: '1.5rem' }}>{wpm}</div><div className="stat-label">WPM</div></div>
            </div>

            {/* Word grid */}
            <div className="card font-mono text-lg leading-loose p-5 overflow-hidden" style={{ wordSpacing: '0.5rem' }}>
              {visibleWords.map((word, i) => {
                const state = visibleStates[i]
                const cls = state === 'active' ? 'text-game-cyan font-bold underline underline-offset-4'
                  : state === 'correct' ? 'text-game-lime'
                  : state === 'incorrect' ? 'text-game-pink line-through opacity-60'
                  : 'text-snow-faint'
                return (
                  <span key={currentRow * WORDS_PER_ROW + i} className={`mr-3 ${cls} transition-colors`}>
                    {word}
                  </span>
                )
              })}
            </div>

            <input
              ref={inputRef}
              id="arcade-input"
              className="input font-mono text-base"
              autoFocus
              value={input}
              onChange={handleInput}
              disabled={finished}
              placeholder={started ? "Type the highlighted word…" : "🎮 Start typing to begin!"}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center max-w-md mx-auto">
            <div className="text-6xl" style={{ animation: 'float 1.5s ease-in-out infinite' }}>🎮</div>
            <div>
              <h1 className="font-display text-4xl font-bold text-snow mb-1">Time&apos;s Up!</h1>
              {saved && <p className="text-game-lime text-sm font-semibold">✓ Stats saved</p>}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="stat-card"><div className="stat-number text-game-yellow">{scoreRef.current}</div><div className="stat-label">Words Typed</div></div>
              <div className="stat-card"><div className="stat-number">{finalWpm}</div><div className="stat-label">WPM</div></div>
              <div className="stat-card"><div className="stat-number" style={{ fontSize: '1.5rem' }}>{finalAcc}%</div><div className="stat-label">Accuracy</div></div>
              <div className="stat-card"><div className="stat-number text-game-pink" style={{ fontSize: '1.5rem' }}>{totalAttemptsRef.current - scoreRef.current}</div><div className="stat-label">Mistakes</div></div>
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
