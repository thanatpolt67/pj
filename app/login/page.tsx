import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { hashPassword, setUserSession } from '../../lib/auth'

export const instant = false

const prisma = new PrismaClient()

const errorMessages: Record<string, string> = {
  missing_login: 'กรุณากรอกอีเมลและรหัสผ่าน',
  not_registered: 'โปรดสมัครก่อนใช้บริการ',
  wrong_password: 'รหัสผ่านไม่ถูกต้อง',
  missing_register: 'กรุณากรอกข้อมูลสมัครสมาชิกให้ครบ',
  email_exists: 'อีเมลนี้ถูกใช้งานแล้ว',
  server_error: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const displayError = error ? errorMessages[error] || error : null

  async function loginAction(formData: FormData) {
    'use server'
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    if (!email || !password) {
      redirect('/login?error=missing_login')
    }

    let user = null
    try {
      user = await prisma.user.findUnique({ where: { email } })
    } catch {
      redirect('/login?error=server_error')
    }

    if (!user) {
      redirect('/login?error=not_registered')
    }

    if (user.password !== hashPassword(password)) {
      redirect('/login?error=wrong_password')
    }

    await setUserSession(user.id)
    redirect('/')
  }

  async function registerAction(formData: FormData) {
    'use server'
    const name = (formData.get('name') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const password = formData.get('password') as string

    if (!name || !email || !password) {
      redirect('/login?error=missing_register')
    }

    let existingUser = null
    try {
      existingUser = await prisma.user.findUnique({ where: { email } })
    } catch {
      redirect('/login?error=server_error')
    }

    if (existingUser) {
      redirect('/login?error=email_exists')
    }

    try {
      const totalUsers = await prisma.user.count()
      const role = totalUsers === 0 ? 'ADMIN' : 'CUSTOMER'

      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashPassword(password),
          role,
        },
      })

      await setUserSession(newUser.id)
    } catch {
      redirect('/login?error=server_error')
    }

    redirect('/')
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#2C221E] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-[#6B4F3A] hover:text-[#3B2E28] font-medium">
            ← กลับไปหน้าร้านค้า
          </Link>
        </div>

        {displayError && (
          <div className="mb-6 bg-[#FDF2F0] border border-[#EBC5BE] text-[#A8382B] px-4 py-3 rounded-xl text-sm font-medium">
            ⚠️ {displayError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#FFFDF9] p-8 rounded-2xl border border-[#E6DDD0] shadow-xs">
            <h1 className="text-2xl font-bold text-[#2C221E] mb-2">เข้าสู่ระบบ</h1>
            <p className="text-sm text-[#7A6B60] mb-6">เข้าสู่ระบบเพื่อสั่งซื้อสินค้าหรือจัดการร้าน</p>

            <form action={loginAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A3B31] mb-1">อีเมล</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2.5 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A3B31] mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2.5 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#6B4F3A] text-[#FAF7F2] py-2.5 rounded-xl font-medium hover:bg-[#563E2D] transition cursor-pointer"
              >
                เข้าสู่ระบบ
              </button>
            </form>
          </div>

          <div className="bg-[#FFFDF9] p-8 rounded-2xl border border-[#E6DDD0] shadow-xs">
            <h2 className="text-2xl font-bold text-[#2C221E] mb-2">สมัครสมาชิกใหม่</h2>
            <p className="text-sm text-[#7A6B60] mb-6">ยังไม่มีบัญชี? สมัครฟรีได้ทันที</p>

            <form action={registerAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A3B31] mb-1">
                  ชื่อ-นามสกุล หรือ ชื่อเล่น
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="เช่น ออม"
                  className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2.5 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A3B31] mb-1">อีเมล</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@example.com"
                  className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2.5 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A3B31] mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="ตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร"
                  className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2.5 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#3B2E28] text-[#FAF7F2] py-2.5 rounded-xl font-medium hover:bg-[#261D19] transition cursor-pointer"
              >
                สมัครสมาชิก
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )
}