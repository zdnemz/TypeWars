import { prisma } from '@/lib/prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ACHIEVEMENTS } from '@/lib/types/game'
import type { Metadata } from 'next'
import type { AchievementKey } from '@/lib/types/game'

type Props = { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title: `${username}'s Profile — TypeBattle`,
    description: `View ${username}'s typing stats, achievements, and match history.`,
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      stats: true,
      achievements: { include: { achievement: true }, orderBy: { earnedAt: 'asc' } },
      games: { orderBy: { playedAt: 'desc' }, take: 10 },
    },
  })

  if (!user) notFound()

  const allKeys = Object.keys(ACHIEVEMENTS) as AchievementKey[]
  const earnedKeys = new Set(user.achievements.map((a: { achievement: { key: string } }) => a.achievement.key))

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <div className="nav__links">
            <Link href="/leaderboard" className="nav__link">Leaderboard</Link>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* Profile Header */}
        <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem', padding: '2rem' }}>
          {user.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.image} alt={user.name} className="avatar avatar--xl" />
            : <div className="avatar avatar--xl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'var(--bg-overlay)' }}>👤</div>
          }
          <div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>{user.name}</h1>
            <p style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>@{user.username}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Achievements <span className="badge badge--accent">{earnedKeys.size}/{allKeys.length}</span></h2>
          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {allKeys.map(key => {
              const data = ACHIEVEMENTS[key]
              const earned = earnedKeys.has(key)
              return (
                <div key={key} className={`achievement-badge ${earned ? 'achievement-badge--earned' : 'achievement-badge--locked'}`}>
                  <div className="achievement-badge__icon">{data.icon}</div>
                  <div className="achievement-badge__name">{earned ? data.name : '???'}</div>
                  <div className="achievement-badge__desc">{earned ? data.description : 'Locked'}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Games */}
        {user.games.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Recent Games</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {user.games.map((game: (typeof user.games)[number]) => (
                <div key={game.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem' }}>
                  <span className="badge badge--accent" style={{ minWidth: '60px', justifyContent: 'center' }}>{game.mode}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>{game.wpm} WPM</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{game.accuracy.toFixed(1)}% acc</span>
                  {game.placement && <span style={{ marginLeft: 'auto' }}>{['🥇','🥈','🥉'][game.placement - 1] ?? `#${game.placement}`}</span>}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    {new Date(game.playedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
