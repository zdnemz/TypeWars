import Link from 'next/link'
import { auth } from '@/auth'

export default async function HomePage() {
  const session = await auth()

  return (
    <>
      <nav className="nav">
        <div className="nav__inner">
          <div className="nav__logo">⌨️ Type<span>Battle</span></div>
          <div className="nav__links">
            <Link href="/leaderboard" className="nav__link">Leaderboard</Link>
            {session ? (
              <>
                <Link href="/lobby" className="nav__link">Play</Link>
                <Link href="/profile/me" className="nav__link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {session.user?.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="avatar" className="avatar" style={{ width: '1.6rem', height: '1.6rem' }} />
                  )}
                  {session.user?.name}
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn btn--primary btn--sm">Sign In</Link>
            )}
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section style={{ padding: '8rem 1.5rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -60%)',
            width: '70vw', height: '50vh',
            background: 'radial-gradient(ellipse, rgba(108,99,255,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div className="container animate-fade-in" style={{ position: 'relative' }}>
            <span className="badge badge--accent" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              ⚡ Real-time multiplayer
            </span>
            <h1 style={{ marginBottom: '1.5rem' }}>
              Race. Type. <span style={{ color: 'var(--accent-primary)' }}>Win.</span>
            </h1>
            <p style={{ fontSize: '1.2rem', maxWidth: '560px', margin: '0 auto 2.5rem' }}>
              Challenge friends in real-time typing battles. Track your WPM, unlock achievements, and dominate the global leaderboard.
            </p>
            <div className="flex justify-center gap-4">
              {session ? (
                <Link href="/lobby" className="btn btn--primary btn--lg pulse-glow">Play Now →</Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn--primary btn--lg pulse-glow">Get Started Free</Link>
                  <Link href="/leaderboard" className="btn btn--secondary btn--lg">View Leaderboard</Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Demo typing row */}
        <section className="container" style={{ marginBottom: '5rem' }}>
          <div className="typing-area" style={{ maxWidth: '680px', margin: '0 auto', cursor: 'default', fontSize: '1.1rem' }}>
            {'The quick '.split('').map((ch, i) => (
              <span key={i} className="typing-char typing-char--correct">{ch}</span>
            ))}
            <span className="typing-char typing-char--current">b</span>
            {'rown fox jumps over the lazy dog.'.split('').map((ch, i) => (
              <span key={i} className="typing-char">{ch}</span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '5rem 0', background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="container">
            <h2 className="text-center" style={{ marginBottom: '3rem' }}>Everything you need to type faster</h2>
            <div className="grid-3">
              <FeatureCard icon="🏁" title="Race Mode" desc="Up to 4 players race through a shared text. First to finish wins. Live progress bars keep the pressure on." />
              <FeatureCard icon="🎮" title="Arcade Mode" desc="Type a stream of words before they expire. Score as many as you can in 60 seconds." />
              <FeatureCard icon="📊" title="Live Stats" desc="See WPM and accuracy update in real time. All stats saved after every game." />
              <FeatureCard icon="🏆" title="Leaderboard" desc="Compete for the top spot in all-time and weekly rankings for Race and Arcade." />
              <FeatureCard icon="🎖️" title="Achievements" desc="Unlock 10 achievements from First Race to Champion. Show them off on your profile." />
              <FeatureCard icon="🎯" title="Training Mode" desc="Practice with no pressure. No timer, no stats saved — just you and the keyboard." />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ marginBottom: '1rem' }}>Ready to type faster?</h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.1rem' }}>Join thousands of typists and start your first race today.</p>
            {session
              ? <Link href="/lobby" className="btn btn--primary btn--lg">Go to Lobby →</Link>
              : <Link href="/login" className="btn btn--primary btn--lg">Start for Free</Link>
            }
          </div>
        </section>

        <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '2rem 0', textAlign: 'center' }}>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            © 2026 TypeBattle · Built with Next.js, Hono &amp; PartyKit
          </p>
        </footer>
      </main>
    </>
  )
}

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card animate-fade-in">
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>{title}</h3>
      <p style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>{desc}</p>
    </div>
  )
}
