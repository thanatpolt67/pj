import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '../../lib/auth'

export const instant = false

const prisma = new PrismaClient()

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    redirect('/')
  }

  const { msg } = await searchParams

  const [products, orders] = await Promise.all([
    prisma.product.findMany({ orderBy: { id: 'desc' } }),
    prisma.order.findMany({ where: { status: { not: 'ยกเลิก' } } }),
  ])

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0)
  const totalOrdersCount = orders.length
  const lowStockProducts = products.filter((p) => p.stock <= 3)

  async function addProductAction(formData: FormData) {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') return

    const name = (formData.get('name') as string)?.trim()
    const price = Number(formData.get('price'))
    const stock = Number(formData.get('stock'))
    const color = (formData.get('color') as string)?.trim() || 'ไม่ระบุสี'
    const size = (formData.get('size') as string)?.trim() || 'Free Size'
    const imageUrl = (formData.get('imageUrl') as string)?.trim() || null

    if (!name || isNaN(price) || isNaN(stock)) return

    await prisma.product.create({
      data: { name, price, stock, color, size, imageUrl },
    })

    revalidatePath('/')
    revalidatePath('/admin')
    redirect('/admin?msg=added')
  }

  async function updateProductAction(formData: FormData) {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') return

    const id = Number(formData.get('id'))
    const name = (formData.get('name') as string)?.trim()
    const price = Number(formData.get('price'))
    const stock = Number(formData.get('stock'))
    const color = (formData.get('color') as string)?.trim() || 'ไม่ระบุสี'
    const size = (formData.get('size') as string)?.trim() || 'Free Size'
    const imageUrl = (formData.get('imageUrl') as string)?.trim() || null

    if (!id || !name || isNaN(price) || isNaN(stock)) return

    await prisma.product.update({
      where: { id },
      data: { name, price, stock, color, size, imageUrl },
    })

    revalidatePath('/')
    revalidatePath('/admin')
    redirect('/admin?msg=updated')
  }

  async function quickRestockAction(formData: FormData) {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') return

    const id = Number(formData.get('id'))
    const amount = Number(formData.get('amount'))
    if (!id || isNaN(amount)) return

    await prisma.product.update({
      where: { id },
      data: { stock: { increment: amount } },
    })

    revalidatePath('/')
    revalidatePath('/admin')
    redirect('/admin?msg=restocked')
  }

  async function deleteProductAction(formData: FormData) {
    'use server'
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') return

    const id = Number(formData.get('id'))
    if (!id) return

    try {
      await prisma.product.delete({ where: { id } })
    } catch {
      redirect('/admin?msg=delete_blocked')
    }

    revalidatePath('/')
    revalidatePath('/admin')
    redirect('/admin?msg=deleted')
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#2C221E] p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2C221E]">ระบบจัดการร้านค้า (Admin Dashboard)</h1>
            <p className="text-sm text-[#7A6B60] mt-1">สรุปยอดขาย ตรวจสอบสต็อก และจัดการรายการเสื้อผ้า</p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="bg-[#6B4F3A] text-[#FAF7F2] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#563E2D] transition"
            >
              📦 จัดการคำสั่งซื้อ ({totalOrdersCount})
            </Link>
            <Link
              href="/"
              className="bg-[#FFFDF9] border border-[#D8CBB8] text-[#4A3B31] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#F3ECE1] transition"
            >
              ← กลับหน้าร้าน
            </Link>
          </div>
        </div>

        {msg && (
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium border ${
              msg === 'delete_blocked'
                ? 'bg-[#FDF2F0] border-[#EBC5BE] text-[#A8382B]'
                : 'bg-[#EEF5EC] border-[#C5DEC0] text-[#2F5E29]'
            }`}
          >
            {msg === 'added' && '✓ เพิ่มสินค้าใหม่ลงหน้าร้านเรียบร้อยแล้ว'}
            {msg === 'updated' && '✓ บันทึกการแก้ไขข้อมูลสินค้าเรียบร้อยแล้ว'}
            {msg === 'restocked' && '✓ เติมสต็อกสินค้าเรียบร้อยแล้ว'}
            {msg === 'deleted' && '✓ ลบสินค้าออกจากร้านเรียบร้อยแล้ว'}
            {msg === 'delete_blocked' &&
              '⚠️ ไม่สามารถลบสินค้านี้ได้ เนื่องจากมีประวัติอยู่ในคำสั่งซื้อของลูกค้าแล้ว (แนะนำให้ปรับสต็อกเป็น 0 แทนครับ)'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DDD0] shadow-xs">
            <p className="text-xs font-semibold text-[#7A6B60] uppercase">ยอดขายรวมทั้งหมด</p>
            <p className="text-3xl font-bold text-[#7A5638] mt-2">
              {totalRevenue.toLocaleString()} บาท
            </p>
            <p className="text-xs text-[#9A8B7E] mt-1">นับจากคำสั่งซื้อที่ไม่ถูกยกเลิก</p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DDD0] shadow-xs">
            <p className="text-xs font-semibold text-[#7A6B60] uppercase">คำสั่งซื้อทั้งหมด</p>
            <p className="text-3xl font-bold text-[#2C221E] mt-2">{totalOrdersCount} บิล</p>
            <p className="text-xs text-[#9A8B7E] mt-1">รายการสินค้าในร้านทั้งหมด {products.length} แบบ</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-xs ${
              lowStockProducts.length > 0
                ? 'bg-[#FBF3E4] border-[#E5CFA8]'
                : 'bg-[#FFFDF9] border-[#E6DDD0]'
            }`}
          >
            <p className="text-xs font-semibold text-[#6B5A4E] uppercase">แจ้งเตือนสินค้าใกล้หมด</p>
            <p
              className={`text-3xl font-bold mt-2 ${
                lowStockProducts.length > 0 ? 'text-[#B26A27]' : 'text-[#4F7344]'
              }`}
            >
              {lowStockProducts.length} รายการ
            </p>
            <p className="text-xs text-[#7A6B60] mt-1">
              {lowStockProducts.length > 0
                ? 'สินค้าที่เหลือ 3 ตัวหรือน้อยกว่า'
                : 'สต็อกสินค้าทุกรายการอยู่ในเกณฑ์ปกติ'}
            </p>
          </div>
        </div>

        {lowStockProducts.length > 0 && (
          <div className="bg-[#FBF3E4] border border-[#E5CFA8] rounded-2xl p-4">
            <p className="text-sm font-bold text-[#6E471E] mb-2">
              ⚠️ รายการสินค้าที่ควรเติมสต็อกด่วน:
            </p>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((item) => (
                <span
                  key={item.id}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium border ${
                    item.stock === 0
                      ? 'bg-[#F8E5E2] text-[#A8382B] border-[#EBC5BE]'
                      : 'bg-[#FFFDF9] text-[#7A4E22] border-[#DFC496]'
                  }`}
                >
                  {item.name} ({item.color}/{item.size}) —{' '}
                  {item.stock === 0 ? 'สินค้าหมด (0 ตัว)' : `เหลือ ${item.stock} ตัว`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6DDD0] shadow-xs">
          <h2 className="text-lg font-bold text-[#2C221E] mb-4">+ เพิ่มเสื้อผ้าใหม่เข้าร้าน</h2>
          <form action={addProductAction} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">ชื่อสินค้า *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="เช่น เสื้อยืด Oversize"
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">ราคา (บาท) *</label>
              <input
                type="number"
                name="price"
                required
                min="0"
                placeholder="290"
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">จำนวนสต็อก (ตัว) *</label>
              <input
                type="number"
                name="stock"
                required
                min="0"
                placeholder="10"
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">สี</label>
              <input
                type="text"
                name="color"
                placeholder="เช่น ขาว, น้ำตาลข้าว, ดำ"
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">ไซส์</label>
              <input
                type="text"
                name="size"
                placeholder="เช่น S, M, L, XL"
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#4A3B31] mb-1">ลิงก์รูปภาพ (URL)</label>
              <input
                type="text"
                name="imageUrl"
                placeholder="https://..."
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#2C221E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <button
                type="submit"
                className="bg-[#3B2E28] text-[#FAF7F2] px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#261D19] transition cursor-pointer"
              >
                บันทึกเพิ่มสินค้า
              </button>
            </div>
          </form>
        </div>

        <div className="bg-[#FFFDF9] p-6 rounded-2xl border border-[#E6DDD0] shadow-xs">
          <h2 className="text-lg font-bold text-[#2C221E] mb-4">
            จัดการสต็อกและแก้ไขสินค้า ({products.length} รายการ)
          </h2>

          {products.length === 0 ? (
            <p className="text-sm text-[#7A6B60] py-8 text-center">ยังไม่มีสินค้าในระบบ</p>
          ) : (
            <div className="space-y-4">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="border border-[#E6DDD0] rounded-xl p-4 bg-[#FAF7F2] space-y-3"
                >
                  <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-[#E6DDD0]">
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-12 h-12 rounded-xl object-cover border border-[#E6DDD0] bg-white"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#EFE6D8] flex items-center justify-center text-xs text-[#8C7B6E]">
                          ไม่มีรูป
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-[#2C221E] text-sm">
                          #{item.id} {item.name}
                        </p>
                        <p className="text-xs text-[#7A6B60]">
                          สถานะสต็อก:{' '}
                          <span
                            className={`font-bold ${
                              item.stock === 0
                                ? 'text-[#A8382B]'
                                : item.stock <= 3
                                ? 'text-[#B26A27]'
                                : 'text-[#4F7344]'
                            }`}
                          >
                            {item.stock === 0 ? 'สินค้าหมด (0 ตัว)' : `คงเหลือ ${item.stock} ตัว`}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <form action={quickRestockAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input type="hidden" name="amount" value="5" />
                        <button
                          type="submit"
                          className="bg-[#527347] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#415C38] transition cursor-pointer"
                        >
                          + เติมสต็อก 5 ตัว
                        </button>
                      </form>

                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          className="bg-[#FDF2F0] text-[#A8382B] border border-[#EBC5BE] px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#F8E5E2] transition cursor-pointer"
                        >
                          ลบสินค้า
                        </button>
                      </form>
                    </div>
                  </div>

                  <form
                    action={updateProductAction}
                    className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end"
                  >
                    <input type="hidden" name="id" value={item.id} />

                    <div className="col-span-2 sm:col-span-2">
                      <label className="block text-[11px] text-[#7A6B60] mb-0.5">ชื่อสินค้า</label>
                      <input
                        type="text"
                        name="name"
                        defaultValue={item.name}
                        required
                        className="w-full border border-[#D8CBB8] rounded-lg px-2.5 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#7A6B60] mb-0.5">ราคา (บาท)</label>
                      <input
                        type="number"
                        name="price"
                        defaultValue={item.price}
                        min="0"
                        required
                        className="w-full border border-[#D8CBB8] rounded-lg px-2.5 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#7A6B60] mb-0.5">สต็อก (ตัว)</label>
                      <input
                        type="number"
                        name="stock"
                        defaultValue={item.stock}
                        min="0"
                        required
                        className="w-full border border-[#D8CBB8] rounded-lg px-2.5 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-[#7A6B60] mb-0.5">สี / ไซส์</label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          name="color"
                          defaultValue={item.color}
                          className="w-1/2 border border-[#D8CBB8] rounded-lg px-2 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                        />
                        <input
                          type="text"
                          name="size"
                          defaultValue={item.size}
                          className="w-1/2 border border-[#D8CBB8] rounded-lg px-2 py-1.5 text-xs text-[#2C221E] bg-[#FFFDF9]"
                        />
                      </div>
                    </div>

                    <div>
                      <input type="hidden" name="imageUrl" value={item.imageUrl || ''} />
                      <button
                        type="submit"
                        className="w-full bg-[#6B4F3A] text-[#FAF7F2] py-1.5 px-3 rounded-lg text-xs font-medium hover:bg-[#563E2D] transition cursor-pointer"
                      >
                        บันทึกแก้ไข
                      </button>
                    </div>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}