import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '../../lib/auth'

export const instant = false

const prisma = new PrismaClient()

export default async function OrdersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const isAdmin = user.role === 'ADMIN'

  const orders = await prisma.order.findMany({
    where: isAdmin ? undefined : { userId: user.id },
    include: {
      user: {
        select: { name: true, email: true },
      },
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  async function updateStatusAction(formData: FormData) {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') return

    const orderId = Number(formData.get('orderId'))
    const status = formData.get('status') as string
    if (!orderId || !status) return

    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    })

    revalidatePath('/orders')
    revalidatePath('/admin')
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#2C221E] p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#2C221E]">
              {isAdmin ? 'รายการคำสั่งซื้อทั้งหมด (Admin)' : 'ประวัติการสั่งซื้อของฉัน'}
            </h1>
            <p className="text-sm text-[#7A6B60] mt-1">
              {isAdmin
                ? `แสดงคำสั่งซื้อทั้งหมดในระบบ (${orders.length} รายการ)`
                : `บัญชี: ${user.name} (${user.email})`}
            </p>
          </div>

          <Link
            href="/"
            className="bg-[#FFFDF9] border border-[#D8CBB8] text-[#4A3B31] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#F3ECE1] transition"
          >
            ← กลับไปหน้าร้าน
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-[#FFFDF9] rounded-2xl border border-[#E6DDD0] p-12 text-center">
            <p className="text-[#7A6B60] mb-4">ยังไม่มีประวัติคำสั่งซื้อในระบบครับ</p>
            <Link
              href="/"
              className="inline-block bg-[#6B4F3A] text-[#FAF7F2] px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#563E2D] transition"
            >
              เลือกซื้อสินค้าเลย
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-[#FFFDF9] rounded-2xl border border-[#E6DDD0] shadow-xs overflow-hidden"
              >
                <div className="bg-[#F5EFE6] px-6 py-4 border-b border-[#E6DDD0] flex flex-wrap justify-between items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#2C221E]">
                        คำสั่งซื้อ #{order.id}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          order.status === 'จัดส่งแล้ว'
                            ? 'bg-[#E3EFE0] text-[#2F5E29]'
                            : order.status === 'กำลังจัดส่ง'
                            ? 'bg-[#E5ECF2] text-[#2C5270]'
                            : order.status === 'ยกเลิก'
                            ? 'bg-[#F8E5E2] text-[#A8382B]'
                            : 'bg-[#E8D9C3] text-[#5C4033]'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#7A6B60]">
                      วันที่สั่งซื้อ:{' '}
                      {new Date(order.createdAt).toLocaleString('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      {isAdmin && (
                        <span className="ml-2 text-[#4A3B31] font-medium">
                          • ผู้สั่ง: {order.user.name} ({order.user.email})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/orders/${order.id}/receipt`}
                      className="bg-[#EFE6D8] text-[#5C4033] border border-[#D8CBB8] px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#E4D7C3] transition"
                    >
                      🧾 ดูใบเสร็จ
                    </Link>

                    {isAdmin && (
                      <form action={updateStatusAction} className="flex items-center gap-2">
                        <input type="hidden" name="orderId" value={order.id} />
                        <select
                          name="status"
                          defaultValue={order.status}
                          className="border border-[#D8CBB8] rounded-lg px-2.5 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                        >
                          <option value="สำเร็จ">สำเร็จ (รอจัดส่ง)</option>
                          <option value="กำลังจัดส่ง">กำลังจัดส่ง</option>
                          <option value="จัดส่งแล้ว">จัดส่งแล้ว</option>
                          <option value="ยกเลิก">ยกเลิก</option>
                        </select>
                        <button
                          type="submit"
                          className="bg-[#3B2E28] text-[#FAF7F2] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#261D19] transition cursor-pointer"
                        >
                          อัปเดต
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {(order.phone || order.address) && (
                  <div className="bg-[#FAF6F0] px-6 py-3 border-b border-[#EFE6D8] text-xs text-[#5E5047] flex flex-wrap gap-x-6 gap-y-1">
                    {order.phone && (
                      <p>
                        <span className="font-semibold text-[#2C221E]">📞 เบอร์โทร:</span>{' '}
                        {order.phone}
                      </p>
                    )}
                    {order.address && (
                      <p>
                        <span className="font-semibold text-[#2C221E]">📍 ที่อยู่จัดส่ง:</span>{' '}
                        {order.address}
                      </p>
                    )}
                  </div>
                )}

                <div className="divide-y divide-[#EFE6D8] px-6">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex justify-between items-center gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E6DDD0]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#EFE6D8] flex items-center justify-center text-xs text-[#8C7B6E]">
                            ไม่มีรูป
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#2C221E] text-sm">
                            {item.product.name}
                          </p>
                          <p className="text-xs text-[#7A6B60]">
                            สี: {item.product.color} | ไซส์: {item.product.size} • จำนวน{' '}
                            {item.quantity} ตัว ({item.price.toLocaleString()} บาท/ตัว)
                          </p>
                        </div>
                      </div>

                      <p className="font-semibold text-[#2C221E] text-sm">
                        {(item.price * item.quantity).toLocaleString()} บาท
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-[#F9F5EE] px-6 py-3 border-t border-[#EFE6D8] flex justify-between items-center">
                  <span className="text-sm text-[#5E5047]">ยอดชำระรวมทั้งหมด</span>
                  <span className="text-lg font-bold text-[#7A5638]">
                    {order.total.toLocaleString()} บาท
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}