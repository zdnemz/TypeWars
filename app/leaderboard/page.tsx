import { auth } from '@/auth'
import { prisma } from '@/lib/prisma/client'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard — TypingWars',
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

  const [session, entries] = await Promise.all([auth(), getEntries(mode, period)])
  const myId = session?.user?.id

  const modeIcon = mode === 'race' ? '🏁' : '🎮'
  const periodLabel = period === 'all_time' ? 'All Time' : 'This Week'

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">⌨️ Type<span>Wars</span></Link>
          <div className="flex items-center gap-3">
            {session
              ? <Link href="/lobby" className="btn-primary btn-sm">🎮 Play</Link>
              : <Link href="/login" className="btn-primary btn-sm">Sign In</Link>
            }
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-snow mb-1">
            {modeIcon} Leaderboard
          </h1>
          <p className="text-snow-muted">Top typists ranked by best WPM. {periodLabel}.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Mode tabs */}
          <div className="flex bg-ink-3 rounded-xl p-1 gap-1">
            {[['race', '🏁 Race'], ['arcade', '🎮 Arcade']] .map(([m, label]) => (
              <a key={m} href={`/leaderboard?mode=${m}&period=${period}`}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  mode === m ? 'bg-orange text-white shadow' : 'text-snow-muted hover:text-snow'
                }`}>
                {label}
              </a>
            ))}
          </div>
          {/* Period tabs */}
          <div className="flex bg-ink-3 rounded-xl p-1 gap-1">
            {[['all_time', '🏆 All Time'], ['weekly', '📅 This Week']].map(([p, label]) => (
              <a key={p} href={`/leaderboard?mode=${mode}&period=${p}`}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  period === p ? 'bg-orange text-white shadow' : 'text-snow-muted hover:text-snow'
                }`}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Table */}
        {entries.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🏆</div>
            <p className="text-snow-muted font-semibold">No entries yet. Be the first to make the board!</p>
            {session && (
              <Link href="/lobby" className="btn-primary inline-flex mt-6">Play Now →</Link>
            )}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="flex items-end justify-center gap-3 p-6 pb-0" style={{ background: 'rgba(255,107,53,0.04)' }}>
                {[entries[1], entries[0], entries[2]].map((entry, podiumIdx) => {
                  if (!entry) return null
                  const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                  const heights = [56, 72, 48]
                  const medals = ['🥈', '🥇', '🥉']
                  const isMe = entry.user.id === myId
                  return (
                    <Link key={entry.id} href={`/profile/${entry.user.username}`}
                      className={`flex flex-col items-center gap-1.5 pb-4 px-4 rounded-t-2xl transition-all hover:-translate-y-1 ${
                        isMe ? 'bg-orange/10 border border-orange/30' : 'bg-ink-3/60'
                      }`}
                      style={{ paddingTop: `${heights[podiumIdx]}px`, minWidth: 80 }}>
                      <div className="text-2xl">{medals[podiumIdx]}</div>
                      {entry.user.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.user.image} alt="" className="avatar" style={{ width: rank === 1 ? '2.5rem' : '2rem', height: rank === 1 ? '2.5rem' : '2rem' }} />
                      )}
                      <span className="text-xs font-bold text-snow text-center truncate max-w-[80px]">{entry.user.username}</span>
                      <span className="font-mono font-bold text-orange text-sm">{entry.wpm} wpm</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Rest of the list */}
            <div className="divide-y divide-snow-faint/5">
              {entries.map((entry: (typeof entries)[number], idx: number) => {
                const isMe = entry.user.id === myId
                const rank = idx + 1
                const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
                return (
                  <div key={entry.id}
                    className={`flex items-center gap-4 px-5 py-3 ${isMe ? 'bg-orange/8' : 'hover:bg-ink-3/50'} transition-colors`}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {medals[rank] ? (
                        <span className="text-lg">{medals[rank]}</span>
                      ) : (
                        <span className="font-mono font-bold text-snow-faint text-sm">{rank}</span>
                      )}
                    </div>
                    <Link href={`/profile/${entry.user.username}`}
                      className="flex items-center gap-3 flex-1 min-w-0">
                      {entry.user.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={entry.user.image} alt="" className="avatar flex-shrink-0" />
                        : <div className="avatar bg-ink-4 flex items-center justify-center flex-shrink-0">👤</div>
                      }
                      <span className="font-bold text-sm text-snow truncate">{entry.user.username}</span>
                      {isMe && <span className="badge-orange text-[10px] flex-shrink-0">You</span>}
                    </Link>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-bold text-orange">{entry.wpm}</div>
                      <div className="text-snow-faint text-xs">wpm</div>
                    </div>
                    <div className="text-right flex-shrink-0 w-14 hidden sm:block">
                      <div className="font-mono font-semibold text-snow-muted text-sm">{entry.accuracy.toFixed(0)}%</div>
                      <div className="text-snow-faint text-xs">acc</div>
                    </div>
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
