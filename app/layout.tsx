import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'TypeBattle — Real-Time Multiplayer Typing Race',
  description: 'Race against friends in real-time typing battles. Improve your WPM, climb the leaderboard, and earn achievements.',
  keywords: ['typing game', 'multiplayer typing', 'typing race', 'WPM', 'typing battle'],
  openGraph: {
    title: 'TypeBattle',
    description: 'Real-time multiplayer typing battles',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
