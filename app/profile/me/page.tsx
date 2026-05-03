'use client'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ACHIEVEMENTS } from '@/lib/types/game'
import type { AchievementKey } from '@/lib/types/game'
import { signOut } from 'next-auth/react'

type UserData = {
  id: string; name: string; username: string; image: string | null
  stats: { bestWpm: number; avgWpm: number; totalGames: number; totalWins: number; accuracy: number } | null
  achievements: { achievement: { key: string; name: string; icon: string; description: string }; earnedAt: string }[]
}

type GameData = { id: string; mode: string; wpm: number; accuracy: number; placement: number | null; playedAt: string }

export default function MyProfilePage() {
  const { data: session } = useSession()
  const [user, setUser] = useState<UserData | null>(null)
  const [games, setGames] = useState<GameData[]>([])
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(setUser)
    fetch('/api/results/me').then(r => r.json()).then(d => setGames(d.games ?? []))
  }, [])

  async function saveUsername() {
    if (newUsername.length < 3) { setError('Username must be at least 3 characters'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername }),
    })
    if (res.ok) {
      const updated = await res.json()
      setUser(prev => prev ? { ...prev, username: updated.username } : prev)
      setEditingUsername(false)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to update username')
    }
    setSaving(false)
  }

  const allKeys = Object.keys(ACHIEVEMENTS) as AchievementKey[]
  const earnedKeys = new Set(user?.achievements.map(a => a.achievement.key) ?? [])

  if (!user) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p>Loading profile…</p>
    </div>
  )

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/lobby" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <div className="nav__links">
            <Link href="/lobby" className="nav__link">Play</Link>
            <button className="btn btn--secondary btn--sm" onClick={() => signOut({ callbackUrl: '/' })}>Sign Out</button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Profile Header */}
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem', padding: '2rem' }}>
          {user.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.image} alt={user.name} className="avatar avatar--xl" />
            : <div className="avatar avatar--xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--bg-overlay)' }}>👤</div>
          }
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{user.name}</h1>

            {editingUsername ? (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id="input-new-username"
                  className="input"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="new username"
                  style={{ fontFamily: 'var(--font-mono)', maxWidth: '200px' }}
                />
                <button className="btn btn--primary btn--sm" onClick={saveUsername} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                <button className="btn btn--secondary btn--sm" onClick={() => setEditingUsername(false)}>Cancel</button>
                {error && <span style={{ color: 'var(--accent-secondary)', fontSize: '0.85rem' }}>{error}</span>}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>@{user.username}</span>
                <button className="btn btn--secondary btn--sm" onClick={() => { setNewUsername(user.username); setEditingUsername(true) }}>Edit username</button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {user.stats && (
          <div className="grid-4" style={{ marginBottom: '2rem' }}>
            <div className="stat-card"><div className="stat-card__value">{user.stats.bestWpm}</div><div className="stat-card__label">Best WPM</div></div>
            <div className="stat-card"><div className="stat-card__value">{Math.round(user.stats.avgWpm)}</div><div className="stat-card__label">Avg WPM</div></div>
            <div className="stat-card"><div className="stat-card__value">{user.stats.totalGames}</div><div className="stat-card__label">Games</div></div>
            <div className="stat-card"><div className="stat-card__value">{user.stats.totalWins}</div><div className="stat-card__label">Wins</div></div>
          </div>
        )}

        {/* Achievements */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
            Achievements <span className="badge badge--accent">{earnedKeys.size}/{allKeys.length}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
            {allKeys.map(key => {
              const data = ACHIEVEMENTS[key]
              const earned = earnedKeys.has(key)
              return (
                <div key={key} className={`achievement-badge ${earned ? 'achievement-badge--earned' : 'achievement-badge--locked'}`}>
                  <div className="achievement-badge__icon">{data.icon}</div>
                  <div className="achievement-badge__name">{data.name}</div>
                  <div className="achievement-badge__desc">{earned ? data.description : 'Locked'}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Games */}
        {games.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Games</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {games.map(game => (
                <div key={game.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem' }}>
                  <span className="badge badge--accent">{game.mode}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{game.wpm} WPM</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{game.accuracy.toFixed(1)}% acc</span>
                  {game.placement && <span>{['🥇','🥈','🥉'][game.placement - 1] ?? `#${game.placement}`}</span>}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {new Date(game.playedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {games.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '1rem' }}>You haven&apos;t played any games yet!</p>
            <Link href="/lobby" className="btn btn--primary">Play your first game</Link>
          </div>
        )}
      </main>
    </>
  )
}
