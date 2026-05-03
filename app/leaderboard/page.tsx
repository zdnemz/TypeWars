import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard — TypeBattle',
  description: 'Top typists ranked by WPM in Race and Arcade modes.',
}

type Period = 'all_time' | 'weekly'
type Mode = 'race' | 'arcade'

async function getEntries(mode: Mode, period: Period) {
  return prisma.leaderboardEntry.findMany({
    where: { mode, period },
    include: { user: { select: { id: true, username: true, image: true, name: true } } },
    orderBy: [{ wpm: 'desc' }, { accuracy: 'desc' }],
    take: 50,
  })
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; period?: string }>
}) {
  const params = await searchParams
  const mode = (params.mode === 'arcade' ? 'arcade' : 'race') as Mode
  const period = (params.period === 'weekly' ? 'weekly' : 'all_time') as Period

  const [session, entries] = await Promise.all([
    auth(),
    getEntries(mode, period),
  ])

  const myId = session?.user?.id

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <Link href="/" className="nav__logo">⌨️ Type<span>Battle</span></Link>
          <div className="nav__links">
            {session
              ? <Link href="/lobby" className="btn btn--primary btn--sm">Play</Link>
              : <Link href="/login" className="btn btn--primary btn--sm">Sign In</Link>
            }
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginBottom: '0.5rem' }}>Leaderboard</h1>
          <p>Top typists ranked by best WPM.</p>
        </div>

        {/* Mode / Period tabs */}
        <div className="flex gap-3" style={{ marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div className="tab-bar" style={{ maxWidth: '280px' }}>
            <a href={`/leaderboard?mode=race&period=${period}`}
              className={`tab-bar__tab ${mode === 'race' ? 'tab-bar__tab--active' : ''}`}>🏁 Race</a>
            <a href={`/leaderboard?mode=arcade&period=${period}`}
              className={`tab-bar__tab ${mode === 'arcade' ? 'tab-bar__tab--active' : ''}`}>🎮 Arcade</a>
          </div>
          <div className="tab-bar" style={{ maxWidth: '280px' }}>
            <a href={`/leaderboard?mode=${mode}&period=all_time`}
              className={`tab-bar__tab ${period === 'all_time' ? 'tab-bar__tab--active' : ''}`}>All Time</a>
            <a href={`/leaderboard?mode=${mode}&period=weekly`}
              className={`tab-bar__tab ${period === 'weekly' ? 'tab-bar__tab--active' : ''}`}>This Week</a>
          </div>
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
            <p>No entries yet. Be the first to make the board!</p>
            {session && <Link href="/lobby" className="btn btn--primary" style={{ marginTop: '1.5rem', display: 'inline-flex' }}>Play Now</Link>}
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>WPM</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: (typeof entries)[number], idx: number) => {
                const isMe = entry.user.id === myId
                const rank = idx + 1
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                return (
                  <tr key={entry.id} className={isMe ? 'lb-table__row--me' : ''}>
                    <td>{medal ?? <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{rank}</span>}</td>
                    <td>
                      <Link href={`/profile/${entry.user.username}`} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', textDecoration: 'none', color: 'inherit' }}>
                        {entry.user.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={entry.user.image} alt="" className="avatar" />
                          : <div className="avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-overlay)' }}>👤</div>
                        }
                        <span style={{ fontWeight: 600 }}>{entry.user.username}</span>
                        {isMe && <span className="badge badge--accent" style={{ fontSize: '0.7rem' }}>You</span>}
                      </Link>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>
                      {entry.wpm}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {entry.accuracy.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </main>
    </>
  )
}
