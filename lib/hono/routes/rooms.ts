import { Hono } from "hono"
import { prisma } from "@/lib/prisma/client"
import { createAuthMiddleware, type HonoEnv } from "@/lib/hono/middleware/auth"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"

const auth = createAuthMiddleware()

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const roomsRouter = new Hono<HonoEnv>()
  // POST /api/rooms — create room
  .post("/", auth, async (c) => {
    let code = generateRoomCode()
    // Ensure uniqueness (rooms are ephemeral; just generate a fresh code)
    return c.json({ code })
  })
  // GET /api/rooms/:code — check room info
  .get("/:code", async (c) => {
    const { code } = c.req.param()
    // Room state lives in PartyKit; we just validate the code format here
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      return c.json({ error: "Invalid room code" }, 400)
    }
    return c.json({ code, valid: true })
  })
  // POST /api/rooms/:code/join — pre-validate before WS connect
  .post(
    "/:code/join",
    auth,
    zValidator("json", z.object({ code: z.string().length(6) })),
    async (c) => {
      const { code } = c.req.param()
      if (!/^[A-Z0-9]{6}$/.test(code)) {
        return c.json({ error: "Invalid room code" }, 400)
      }
      const userId = c.get("userId")
      return c.json({ code, userId, canJoin: true })
    }
  )
