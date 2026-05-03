import { Hono } from "hono"
import { auth } from "@/auth"
import type { Context, Next } from "hono"

// Extend Hono context with user
type Variables = {
  userId: string
  username: string
}

export type HonoEnv = { Variables: Variables }

export const createAuthMiddleware = () => {
  return async (c: Context<HonoEnv>, next: Next) => {
    const session = await auth()
    if (!session?.user?.id) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    c.set("userId", session.user.id)
    c.set("username", session.user.username ?? "")
    await next()
  }
}
