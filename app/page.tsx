import Link from 'next/link'
import { auth } from '@/auth'

export default async function HomePage() {
  const session = await auth()

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-logo">⌨️ Type<span>Wars</span></div>
          <div className="flex items-center gap-3">
            <Link href="/leaderboard" className="text-snow-muted hover:text-snow text-sm font-semibold transition-colors">
              Leaderboard
            </Link>
            {session ? (
              <>
                <Link href="/lobby" className="btn-secondary btn-sm">Play</Link>
                <Link href="/profile/me" className="flex items-center gap-2 text-sm font-semibold text-snow-muted hover:text-snow transition-colors">
                  {session.user?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="avatar" className="avatar" style={{ width: '1.75rem', height: '1.75rem' }} />
                  )}
                  {session.user?.name}
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn-primary btn-sm">Sign In</Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pt-24 pb-16 text-center">
          {/* Background glows */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20"
              style={{ background: 'radial-gradient(ellipse, #FF6B35 0%, transparent 70%)' }} />
            <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(ellipse, #06D6FE 0%, transparent 70%)' }} />
            <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] rounded-full opacity-10"
              style={{ background: 'radial-gradient(ellipse, #FF2D7A 0%, transparent 70%)' }} />
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 badge-orange mb-6 text-xs">
              ⚡ Real-time multiplayer
            </div>
            <h1 className="font-display font-bold mb-4"
              style={{ fontSize: 'clamp(3rem,8vw,5.5rem)', lineHeight: 1.1 }}>
              Race.{' '}
              <span className="text-gradient-orange">Type.</span>{' '}
              <span className="text-game-cyan">Win.</span>
            </h1>
            <p className="text-snow-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Challenge friends in real-time typing battles. Track your WPM, unlock achievements, and dominate the global leaderboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {session ? (
                <Link href="/lobby" className="btn-yellow btn-lg text-base">
                  🎮 Play Now
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn-yellow btn-lg text-base">
                    🚀 Get Started Free
                  </Link>
                  <Link href="/leaderboard" className="btn-secondary btn-lg text-base">
                    View Leaderboard
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Demo typing row */}
        <section className="max-w-2xl mx-auto px-4 mb-16">
          <div className="typing-area cursor-default pointer-events-none select-none">
            {'The quick '.split('').map((ch, i) => (
              <span key={i} className="char-correct">{ch}</span>
            ))}
            <span className="char-current">b</span>
            {'rown fox jumps over the lazy dog.'.split('').map((ch, i) => (
              <span key={i} className="char">{ch}</span>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs text-snow-faint font-mono">
            <span>⚡ 87 WPM</span>
            <span>🎯 96% accuracy</span>
            <span>🏁 3rd place</span>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-snow-faint/10" style={{ background: 'rgba(18,18,28,0.8)' }}>
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="font-display text-center text-3xl font-semibold mb-12 text-snow">
              Everything you need to type faster 🔥
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FeatureCard icon="🏁" title="Race Mode" desc="Up to 6 players race through a shared text. First to finish wins. Live progress keeps the pressure on." color="border-orange/30" glow="hover:border-orange/60" />
              <FeatureCard icon="🎮" title="Arcade Mode" desc="Type a stream of words before they expire. Score as many as you can in 60 seconds." color="border-game-cyan/30" glow="hover:border-game-cyan/60" />
              <FeatureCard icon="⚡" title="Blitz Mode" desc="Ultra-fast 30-second sprints. Maximum intensity, zero mercy." color="border-game-yellow/30" glow="hover:border-game-yellow/60" />
              <FeatureCard icon="📊" title="Live Stats" desc="See WPM and accuracy update in real time. All stats saved after every game." color="border-game-violet/30" glow="hover:border-game-violet/60" />
              <FeatureCard icon="🏆" title="Leaderboard" desc="Compete for the top spot in all-time and weekly rankings." color="border-game-lime/30" glow="hover:border-game-lime/60" />
              <FeatureCard icon="👑" title="Room Leader" desc="Create rooms, kick players, transfer leadership, and choose game modes your way." color="border-game-pink/30" glow="hover:border-game-pink/60" />
            </div>
          </div>
        </section>

        {/* Stats banner */}
        <section className="py-14 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: '6', label: 'Players per room', icon: '👥' },
                { num: '10s', label: 'Countdown', icon: '⏱️' },
                { num: '3', label: 'Game modes', icon: '🎯' },
              ].map(({ num, label, icon }) => (
                <div key={label} className="card text-center">
                  <div className="text-3xl mb-1">{icon}</div>
                  <div className="font-display text-4xl font-bold text-gradient-orange mb-1">{num}</div>
                  <div className="text-snow-muted text-sm font-semibold">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center border-t border-snow-faint/10">
          <div className="max-w-lg mx-auto">
            <div className="text-5xl mb-4">🎮</div>
            <h2 className="font-display text-3xl font-bold mb-3">Ready to type faster?</h2>
            <p className="text-snow-muted mb-8">Join the battle and start your first race today.</p>
            {session
              ? <Link href="/lobby" className="btn-yellow btn-lg text-base">Go to Lobby →</Link>
              : <Link href="/login" className="btn-yellow btn-lg text-base">Start for Free 🚀</Link>
            }
          </div>
        </section>

        <footer className="border-t border-snow-faint/10 py-6 text-center">
          <p className="text-snow-faint text-xs font-semibold">
            © 2026 TypingWars · Built with Next.js, Hono &amp; PartyKit
          </p>
        </footer>
      </main>
    </>
  )
}

function FeatureCard({ icon, title, desc, color, glow }: {
  icon: string; title: string; desc: string; color: string; glow: string
}) {
  return (
    <div className={`card border ${color} ${glow} transition-all duration-200`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-snow mb-2">{title}</h3>
      <p className="text-snow-muted text-sm leading-relaxed">{desc}</p>
    </div>
  )
}
