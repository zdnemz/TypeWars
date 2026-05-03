import { Hono } from "hono"
import { prisma } from "@/lib/prisma/client"
import { createAuthMiddleware, type HonoEnv } from "@/lib/hono/middleware/auth"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"

const auth = createAuthMiddleware()

export const usersRouter = new Hono<HonoEnv>()
  // GET /api/users/me
  .get("/me", auth, async (c) => {
    const userId = c.get("userId")
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { stats: true },
    })
    if (!user) return c.json({ error: "User not found" }, 404)
    return c.json(user)
  })
  // PATCH /api/users/me
  .patch(
    "/me",
    auth,
    zValidator(
      "json",
      z.object({
        username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/).optional(),
        name: z.string().min(1).max(50).optional(),
      })
    ),
    async (c) => {
      const userId = c.get("userId")
      const { username, name } = c.req.valid("json")

      if (username) {
        const existing = await prisma.user.findUnique({ where: { username } })
        if (existing && existing.id !== userId) {
          return c.json({ error: "Username already taken" }, 409)
        }
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { ...(username && { username }), ...(name && { name }) },
      })
      return c.json(updated)
    }
  )
  // GET /api/users/:username
  .get("/:username", async (c) => {
    const { username } = c.req.param()
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        stats: true,
        achievements: {
          include: { achievement: true },
          orderBy: { earnedAt: "asc" },
        },
      },
    })
    if (!user) return c.json({ error: "User not found" }, 404)
    return c.json(user)
  })
  // GET /api/users/:username/games
  .get("/:username/games", async (c) => {
    const { username } = c.req.param()
    const page = Number(c.req.query("page") ?? "1")
    const limit = 20
    const skip = (page - 1) * limit

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return c.json({ error: "User not found" }, 404)

    const games = await prisma.gameResult.findMany({
      where: { userId: user.id },
      orderBy: { playedAt: "desc" },
      take: limit,
      skip,
    })
    return c.json({ games, page, limit })
  })
