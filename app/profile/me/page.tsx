"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ACHIEVEMENTS } from "@/lib/types/game"
import type { AchievementKey } from "@/lib/types/game"
import { signOut } from "next-auth/react"

type UserData = {
  id: string; name: string; username: string; image: string | null;
  stats: { bestWpm: number; avgWpm: number; totalGames: number; totalWins: number; accuracy: number; } | null;
  achievements: { achievement: { key: string; name: string; icon: string; description: string }; earnedAt: string }[];
}

type GameData = {
  id: string; mode: string; wpm: number; accuracy: number; placement: number | null; playedAt: string;
}

export default function MyProfilePage() {
  const { data: session } = useSession()
  const [user, setUser] = useState<UserData | null>(null)
  const [games, setGames] = useState<GameData[]>([])
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/users/me").then(r => r.json()).then(data => setUser({ ...data, achievements: data.achievements ?? [] }))
    fetch("/api/results/me").then(r => r.json()).then(d => setGames(d.games ?? []))
  }, [])

  async function saveUsername() {
    if (!newUsername.trim()) return
    setSaving(true); setError("")
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setUser(prev => prev ? { ...prev, username: data.username } : prev)
      setEditingUsername(false)
    } else {
      const data = await res.json()
      setError(data.error || "Failed to update username")
    }
    setSaving(false)
  }

  const earnedKeys = new Set(user?.achievements?.map(a => a.achievement.key) ?? [])

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-snow-muted font-semibold animate-pulse">Loading profile…</p>
    </div>
  )

  const statItems = [
    { label: 'Best WPM', value: user.stats?.bestWpm ?? 0, icon: '⚡', color: 'text-orange' },
    { label: 'Avg WPM', value: user.stats?.avgWpm ?? 0, icon: '📊', color: 'text-game-cyan' },
    { label: 'Games', value: user.stats?.totalGames ?? 0, icon: '🎮', color: 'text-game-yellow' },
    { label: 'Wins', value: user.stats?.totalWins ?? 0, icon: '🏆', color: 'text-game-lime' },
  ]

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <div className="flex items-center gap-3">
            <Link href="/lobby" className="btn-primary btn-sm">🎮 Play</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Profile header */}
        <div className="card flex flex-col sm:flex-row items-center gap-5">
          <div className="relative flex-shrink-0">
            {user.image
              ? <img src={user.image} alt="avatar" className="rounded-full" style={{ width: '5rem', height: '5rem' }} />
              : <div className="rounded-full bg-ink-4 flex items-center justify-center text-4xl" style={{ width: '5rem', height: '5rem' }}>👤</div>
            }
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-game-lime border-2 border-ink-2 flex items-center justify-center text-[10px]">✓</div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="text-snow-muted text-xs font-bold mb-1">{user.name}</div>
            {editingUsername ? (
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <input
                  className="input text-sm py-2 px-3"
                  style={{ maxWidth: 200 }}
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder={user.username}
                  autoFocus
                />
                <button className="btn-primary btn-sm" onClick={saveUsername} disabled={saving}>
                  {saving ? '…' : 'Save'}
                </button>
                <button className="btn-secondary btn-sm" onClick={() => { setEditingUsername(false); setError('') }}>
                  Cancel
                </button>
                {error && <p className="text-game-pink text-xs w-full">{error}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <h1 className="font-display text-2xl font-bold text-snow">@{user.username}</h1>
                <button
                  className="btn-secondary btn-sm text-xs"
                  onClick={() => { setEditingUsername(true); setNewUsername(user.username) }}
                >
                  ✏️ Edit
                </button>
              </div>
            )}
          </div>
          <button
            className="btn-secondary btn-sm text-xs"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign Out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statItems.map(({ label, value, icon, color }) => (
            <div key={label} className="stat-card">
              <div className="text-xl mb-1">{icon}</div>
              <div className={`stat-number ${color}`}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-snow">Achievements</h2>
            <span className="badge-orange">{earnedKeys.size}/{Object.keys(ACHIEVEMENTS).length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(ACHIEVEMENTS) as [AchievementKey, typeof ACHIEVEMENTS[AchievementKey]][]).map(([key, ach]) => {
              const earned = earnedKeys.has(key)
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all ${
                    earned
                      ? 'bg-game-yellow/8 border-game-yellow/25 text-snow'
                      : 'bg-ink-3/50 border-snow-faint/10 opacity-45'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0">{ach.icon}</span>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-snow truncate">{ach.name}</div>
                    <div className="text-snow-faint text-[10px] truncate">{ach.description}</div>
                  </div>
                  {earned && <span className="ml-auto text-game-lime flex-shrink-0">✓</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent games */}
        {games.length > 0 && (
          <div className="card">
            <h2 className="font-display text-xl font-bold text-snow mb-4">Recent Games</h2>
            <div className="flex flex-col gap-2">
              {games.slice(0, 10).map(g => {
                const modeColors: Record<string, string> = {
                  race: 'badge-orange', arcade: 'badge-cyan', blitz: 'badge-yellow', solo: 'badge-muted', training: 'badge-muted'
                }
                return (
                  <div key={g.id} className="flex items-center gap-3 bg-ink-3/60 rounded-xl px-4 py-2.5">
                    <span className={`${modeColors[g.mode] ?? 'badge-muted'} text-[10px] flex-shrink-0`}>{g.mode}</span>
                    <span className="font-mono font-bold text-orange text-sm">{g.wpm} wpm</span>
                    <span className="font-mono text-snow-muted text-xs">{g.accuracy.toFixed(0)}%</span>
                    {g.placement && <span className="text-xs text-snow-faint">#{g.placement}</span>}
                    <span className="ml-auto text-snow-faint text-xs">{new Date(g.playedAt).toLocaleDateString()}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
