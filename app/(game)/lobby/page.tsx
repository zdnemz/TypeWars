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
    setCreating(true)
    setError('')
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
    setJoining(true)
    setError('')
    router.push(`/room/${code}`)
  }

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <div className="nav__links">
            <Link href="/leaderboard" className="nav__link">Leaderboard</Link>
            <Link href="/profile/me" className="nav__link">Profile</Link>
          </div>
        </div>
      </nav>

      <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', padding: '3rem 1.5rem' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Game Lobby</h1>
            <p>Create a private room, join a friend, or play solo.</p>
          </div>

          {error && (
            <div className="badge badge--red" style={{ marginBottom: '1.5rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', width: '100%' }}>
              ⚠️ {error}
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
            {/* Create Room */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Create Room</h2>
                <p style={{ fontSize: '0.875rem' }}>Start a new private room. Share the code with up to 3 friends.</p>
              </div>
              <button
                id="btn-create-room"
                className="btn btn--primary"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create Room'}
              </button>
            </div>

            {/* Join Room */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔗</div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Join Room</h2>
                <p style={{ fontSize: '0.875rem' }}>Enter a 6-character room code to join a friend's game.</p>
              </div>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  id="input-room-code"
                  className="input"
                  placeholder="Enter room code…"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  maxLength={6}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '1.1rem' }}
                />
                <button
                  id="btn-join-room"
                  className="btn btn--secondary"
                  type="submit"
                  disabled={joining || joinCode.length !== 6}
                >
                  {joining ? 'Joining…' : 'Join Room'}
                </button>
              </form>
            </div>
          </div>

          {/* Solo modes */}
          <div className="grid-3">
            <ModeCard id="btn-solo" href="/solo" icon="⚡" title="Solo Race" desc="Race against the clock. Stats saved." />
            <ModeCard id="btn-training" href="/training" icon="🎯" title="Training" desc="Free practice. No pressure." />
            <ModeCard id="btn-arcade" href="/arcade" icon="🎮" title="Arcade" desc="Type words fast for 60 seconds." />
          </div>
        </div>
      </main>
    </>
  )
}

function ModeCard({ id, href, icon, title, desc }: { id: string; href: string; icon: string; title: string; desc: string }) {
  return (
    <Link href={href} id={id} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
      >
        <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{icon}</div>
        <h3 style={{ fontSize: '0.95rem', marginBottom: '0.25rem' }}>{title}</h3>
        <p style={{ fontSize: '0.8rem' }}>{desc}</p>
      </div>
    </Link>
  )
}
