import crypto from 'crypto'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const COOKIE_NAME = 'clothing_shop_user'

export function hashPassword(password: string) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function setUserSession(userId: number) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, String(userId), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function clearUserSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(COOKIE_NAME)?.value
  if (!userId) return null

  return prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { id: true, name: true, email: true, role: true },
  })
}