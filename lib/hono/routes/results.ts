import { Hono } from "hono"
import { prisma } from "@/lib/prisma/client"
import { createAuthMiddleware, type HonoEnv } from "@/lib/hono/middleware/auth"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import type { GameResult } from "@prisma/client"

const auth = createAuthMiddleware()

export const resultsRouter = new Hono<HonoEnv>()
  .post(
    "/",
    auth,
    zValidator(
      "json",
      z.object({
        mode: z.enum(["race", "arcade"]),
        wpm: z.number().int().min(0),
        accuracy: z.number().min(0).max(100),
        placement: z.number().int().optional(),
        roomCode: z.string().optional(),
      })
    ),
    async (c) => {
      const userId = c.get("userId")
      const data = c.req.valid("json")

      const result = await prisma.gameResult.create({
        data: { userId, ...data },
      })

      console.log(data)

      const allGames: GameResult[] = await prisma.gameResult.findMany({
        where: { userId },
      })

      const totalGames = allGames.length
      const wins = allGames.filter(
        (g: GameResult) => g.placement === 1 && g.mode === "race"
      ).length
      const avgWpm =
        allGames.reduce((s: number, g: GameResult) => s + g.wpm, 0) / totalGames
      const bestWpm = Math.max(...allGames.map((g: GameResult) => g.wpm))
      const avgAccuracy =
        allGames.reduce((s: number, g: GameResult) => s + g.accuracy, 0) / totalGames

      await prisma.userStats.upsert({
        where: { userId },
        update: {
          totalGames,
          totalWins: wins,
          avgWpm,
          bestWpm,
          accuracy: avgAccuracy,
        },
        create: {
          userId,
          totalGames,
          totalWins: wins,
          avgWpm,
          bestWpm,
          accuracy: avgAccuracy,
        },
      })

      const currentLb = await prisma.leaderboardEntry.findUnique({
        where: {
          userId_mode_period: { userId, mode: data.mode, period: "all_time" },
        },
      })
      if (!currentLb || data.wpm > currentLb.wpm) {
        await prisma.leaderboardEntry.upsert({
          where: {
            userId_mode_period: { userId, mode: data.mode, period: "all_time" },
          },
          update: { wpm: data.wpm, accuracy: data.accuracy },
          create: {
            userId,
            mode: data.mode,
            period: "all_time",
            wpm: data.wpm,
            accuracy: data.accuracy,
          },
        })
      }

      const currentWeeklyLb = await prisma.leaderboardEntry.findUnique({
        where: {
          userId_mode_period: { userId, mode: data.mode, period: "weekly" },
        },
      })
      if (!currentWeeklyLb || data.wpm > currentWeeklyLb.wpm) {
        await prisma.leaderboardEntry.upsert({
          where: {
            userId_mode_period: { userId, mode: data.mode, period: "weekly" },
          },
          update: { wpm: data.wpm, accuracy: data.accuracy },
          create: {
            userId,
            mode: data.mode,
            period: "weekly",
            wpm: data.wpm,
            accuracy: data.accuracy,
          },
        })
      }

      return c.json({ result })
    }
  )
  .get("/me", auth, async (c) => {
    const userId = c.get("userId")
    const games = await prisma.gameResult.findMany({
      where: { userId },
      orderBy: { playedAt: "desc" },
      take: 20,
    })
    return c.json({ games })
  })