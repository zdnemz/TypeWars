import { Hono } from "hono"
import { prisma } from "@/lib/prisma/client"
import { createAuthMiddleware, type HonoEnv } from "@/lib/hono/middleware/auth"
import type { LeaderboardPeriod } from "@/lib/types/game"

const auth = createAuthMiddleware()

async function getBoard(mode: string, period: LeaderboardPeriod, limit = 100) {
  return prisma.leaderboardEntry.findMany({
    where: { mode, period },
    include: { user: { select: { username: true, image: true, name: true } } },
    orderBy: [{ wpm: "desc" }, { accuracy: "desc" }],
    take: limit,
  })
}

export const leaderboardRouter = new Hono<HonoEnv>()
  // GET /api/leaderboard/race?period=all_time|weekly
  .get("/race", async (c) => {
    const period = (c.req.query("period") ?? "all_time") as LeaderboardPeriod
    const entries = await getBoard("race", period)
    return c.json({ entries, mode: "race", period })
  })
  // GET /api/leaderboard/arcade?period=all_time|weekly
  .get("/arcade", async (c) => {
    const period = (c.req.query("period") ?? "all_time") as LeaderboardPeriod
    const entries = await getBoard("arcade", period)
    return c.json({ entries, mode: "arcade", period })
  })
  // GET /api/leaderboard/me — current user's rank on all boards
  .get("/me", auth, async (c) => {
    const userId = c.get("userId")

    const boards = await Promise.all([
      getBoard("race", "all_time"),
      getBoard("race", "weekly"),
      getBoard("arcade", "all_time"),
      getBoard("arcade", "weekly"),
    ])

    const getRank = (entries: { userId: string }[]) => {
      const idx = entries.findIndex((e) => e.userId === userId)
      return idx === -1 ? null : idx + 1
    }

    return c.json({
      race_all_time: getRank(boards[0]),
      race_weekly: getRank(boards[1]),
      arcade_all_time: getRank(boards[2]),
      arcade_weekly: getRank(boards[3]),
    })
  })
