import { Hono } from "hono"
import { usersRouter } from "./routes/users"
import { roomsRouter } from "./routes/rooms"
import { resultsRouter } from "./routes/results"
import { leaderboardRouter } from "./routes/leaderboard"
import { achievementsRouter } from "./routes/achievements"

const app = new Hono().basePath("/api")

app.route("/users", usersRouter)
app.route("/rooms", roomsRouter)
app.route("/results", resultsRouter)
app.route("/leaderboard", leaderboardRouter)
app.route("/achievements", achievementsRouter)

// Cron: reset weekly leaderboard (called by Vercel cron)
app.post("/cron/reset-weekly", async (c) => {
  const secret = c.req.header("x-cron-secret")
  if (secret !== process.env.CRON_SECRET) {
    return c.json({ error: "Forbidden" }, 403)
  }
  const { prisma } = await import("@/lib/prisma/client")
  await prisma.leaderboardEntry.deleteMany({ where: { period: "weekly" } })
  return c.json({ ok: true })
})

export default app
