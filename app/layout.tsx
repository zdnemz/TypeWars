import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'TypeWars — Real-Time Multiplayer Typing Battles',
  description: 'Race against friends in real-time typing battles. Improve your WPM, climb the leaderboard, and earn achievements.',
  keywords: ['typing game', 'multiplayer typing', 'typing race', 'WPM', 'typing battle'],
  openGraph: {
    title: 'TypeWars',
    description: 'Real-time multiplayer typing battles',
    type: 'website',
  },
}

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${fredoka.className} ${nunito.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
