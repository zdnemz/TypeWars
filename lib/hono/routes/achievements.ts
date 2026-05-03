import { Hono } from "hono"
import { prisma } from "@/lib/prisma/client"
import { createAuthMiddleware, type HonoEnv } from "@/lib/hono/middleware/auth"
import { ACHIEVEMENTS, type AchievementKey } from "@/lib/types/game"
import type { Achievement, UserAchievement } from "@prisma/client"

const auth = createAuthMiddleware()

type UserAchievementWithAchievement = UserAchievement & {
  achievement: Achievement
}

async function ensureAchievementsSeeded() {
  for (const [key, data] of Object.entries(ACHIEVEMENTS)) {
    await prisma.achievement.upsert({
      where: { key },
      update: {},
      create: { key, ...data },
    })
  }
}

async function checkAndAward(userId: string): Promise<AchievementKey[]> {
  await ensureAchievementsSeeded()

  const [stats, allGames, existingAchievements] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId } }),
    prisma.gameResult.findMany({ where: { userId } }),
    prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
    }),
  ])

  const earned = new Set(
    (existingAchievements as UserAchievementWithAchievement[]).map(
      (a: UserAchievementWithAchievement) => a.achievement.key
    )
  )
  const newKeys: AchievementKey[] = []

  const bestWpm = stats?.bestWpm ?? 0
  const totalGames = stats?.totalGames ?? 0
  const totalWins = stats?.totalWins ?? 0
  const multiplayerGames = allGames.filter((g) => g.roomCode !== null).length
  const multiplayerWins = allGames.filter(
    (g) => g.roomCode !== null && g.placement === 1
  ).length
  const hasPerfectAccuracy = allGames.some(
    (g) => g.accuracy >= 100 && g.mode === "race"
  )

  const conditions: [AchievementKey, boolean][] = [
    ["first_game", totalGames >= 1],
    ["first_win", multiplayerWins >= 1],
    ["wpm_50", bestWpm >= 50],
    ["wpm_75", bestWpm >= 75],
    ["wpm_100", bestWpm >= 100],
    ["wpm_120", bestWpm >= 120],
    ["sharpshooter", hasPerfectAccuracy],
    ["social_butterfly", multiplayerGames >= 10],
    ["veteran", totalGames >= 100],
    ["champion", multiplayerWins >= 10],
  ]

  for (const [key, met] of conditions) {
    if (met && !earned.has(key)) {
      newKeys.push(key)
    }
  }

  if (newKeys.length > 0) {
    const achievements = await prisma.achievement.findMany({
      where: { key: { in: newKeys } },
    })
    await prisma.userAchievement.createMany({
      data: achievements.map((a: Achievement) => ({
        userId,
        achievementId: a.id,
      })),
      skipDuplicates: true,
    })
  }

  return newKeys
}

export const achievementsRouter = new Hono<HonoEnv>()
  .get("/", async (c) => {
    await ensureAchievementsSeeded()
    const achievements = await prisma.achievement.findMany({
      orderBy: { key: "asc" },
    })
    return c.json({ achievements })
  })
  .get("/me", auth, async (c) => {
    const userId = c.get("userId")
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: "asc" },
    })
    return c.json({ achievements: userAchievements })
  })
  .post("/check", auth, async (c) => {
    const userId = c.get("userId")
    const newKeys = await checkAndAward(userId)
    return c.json({ newAchievements: newKeys })
  })