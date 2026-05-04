'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LobbyPage() {
  const router = useRouter()
  const [joinCode, setJoinCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setCreating(true); setError('')
    try {
      const res = await fetch('/api/rooms', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create room')
      const { code } = await res.json()
      router.push(`/room/${code}`)
    } catch {
      setError('Failed to create room. Please try again.')
      setCreating(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 6) { setError('Room code must be 6 characters'); return }
    setJoining(true); setError('')
    router.push(`/room/${code}`)
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-snow-muted hover:text-snow text-sm font-semibold transition-colors hidden sm:block">Leaderboard</Link>
            <Link href="/profile/me" className="text-snow-muted hover:text-snow text-sm font-semibold transition-colors">Profile</Link>
          </div>
        </div>
      </nav>

      <main className="min-h-[85vh] flex items-start py-10 px-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold text-snow mb-1">Game Lobby</h1>
            <p className="text-snow-muted">Create a room, join a friend, or go solo.</p>
          </div>

          {error && (
            <div className="badge-pink flex items-center gap-2 mb-5 px-4 py-3 rounded-xl w-full text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Multiplayer cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Create */}
            <div className="card flex flex-col gap-4 border border-orange/20 hover:border-orange/50 transition-colors">
              <div>
                <div className="text-4xl mb-3">🚀</div>
                <h2 className="font-display text-xl font-semibold text-snow mb-1">Create Room</h2>
                <p className="text-snow-muted text-sm leading-relaxed">Start a new room. You'll be the leader — invite up to 5 friends.</p>
              </div>
              <button
                id="btn-create-room"
                className="btn-primary w-full justify-center"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </span>
                ) : '🚀 Create Room'}
              </button>
            </div>

            {/* Join */}
            <div className="card flex flex-col gap-4 border border-game-cyan/20 hover:border-game-cyan/50 transition-colors">
              <div>
                <div className="text-4xl mb-3">🔗</div>
                <h2 className="font-display text-xl font-semibold text-snow mb-1">Join Room</h2>
                <p className="text-snow-muted text-sm leading-relaxed">Enter a 6-character room code to join a friend's game.</p>
              </div>
              <form onSubmit={handleJoin} className="flex flex-col gap-3">
                <input
                  id="input-room-code"
                  className="input font-mono text-lg tracking-[0.2em] uppercase text-center"
                  placeholder="ABCDEF"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                />
                <button
                  id="btn-join-room"
                  className="btn-cyan w-full justify-center"
                  type="submit"
                  disabled={joining || joinCode.length !== 6}
                >
                  {joining ? 'Joining…' : '🔗 Join Room'}
                </button>
              </form>
            </div>
          </div>

          {/* Solo modes */}
          <div className="grid grid-cols-3 gap-3">
            <ModeCard id="btn-solo" href="/solo" icon="⚡" title="Solo Race" desc="Race the clock" color="border-game-yellow/20 hover:border-game-yellow/50" />
            <ModeCard id="btn-training" href="/training" icon="🎯" title="Training" desc="No pressure" color="border-game-lime/20 hover:border-game-lime/50" />
            <ModeCard id="btn-arcade" href="/arcade" icon="🎮" title="Arcade" desc="60-second sprint" color="border-game-violet/20 hover:border-game-violet/50" />
          </div>
        </div>
      </main>
    </>
  )
}

function ModeCard({ id, href, icon, title, desc, color }: {
  id: string; href: string; icon: string; title: string; desc: string; color: string
}) {
  return (
    <Link href={href} id={id} className="block">
      <div className={`card cursor-pointer text-center border ${color} transition-colors`}>
        <div className="text-3xl mb-2">{icon}</div>
        <h3 className="font-display text-sm font-semibold text-snow mb-0.5">{title}</h3>
        <p className="text-snow-faint text-xs">{desc}</p>
      </div>
    </Link>
  )
}
