import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma/client"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username?: string }).username
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return  // safety guard

      const baseUsername = (user.name ?? user.email ?? "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 16)

      let username = baseUsername || "user"  // fallback if result is empty string
      let attempt = 0

      while (true) {
        const existing = await prisma.user.findUnique({ where: { username } })
        if (!existing) break
        attempt++
        username = `${baseUsername}${attempt}`
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          username,
          provider: "oauth",
          stats: { create: {} },
        },
      })
    },
  },
  pages: {
    signIn: "/login",
  },
})
