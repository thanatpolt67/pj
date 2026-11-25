import { PrismaClient } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '../../../../lib/auth'
import PrintReceiptButton from '../../../../components/PrintReceiptButton'

export const instant = false

const prisma = new PrismaClient()

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const { id } = await params
  const orderId = Number(id)
  if (isNaN(orderId)) {
    redirect('/orders')
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      items: {
        include: { product: true },
      },
    },
  })

  if (!order) {
    redirect('/orders')
  }

  if (order.userId !== user.id && user.role !== 'ADMIN') {
    redirect('/orders')
  }

  const orderDate = new Date(order.createdAt)
  const receiptNumber = `INV-${orderDate.getFullYear()}-${String(order.id).padStart(4, '0')}`
  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <main className="min-h-screen bg-[#F2ECE1] text-[#2C221E] py-8 px-4 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto mb-6 flex flex-wrap justify-between items-center gap-3 print:hidden">
        <Link
          href="/orders"
          className="bg-[#FFFDF9] border border-[#D8CBB8] text-[#4A3B31] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#F5EFE6] transition"
        >
          ← กลับไปหน้าคำสั่งซื้อ
        </Link>

        <PrintReceiptButton />
      </div>

      <div className="max-w-2xl mx-auto bg-[#FFFDF9] rounded-2xl border border-[#E6DDD0] shadow-xs p-8 md:p-10 print:bg-white print:shadow-none print:border-none print:rounded-none">
        <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-[#E6DDD0]">
          <div>
            <h1 className="text-2xl font-bold text-[#2C221E]">Toasted & Co.</h1>
            <p className="text-sm text-[#7A6B60] mt-1">
              ศูนย์รวมเสื้อผ้าแฟชั่นออนไลน์
            </p>
            <p className="text-xs text-[#9A8B7E] mt-0.5">
              โทร: 02-000-0000 • อีเมล: support@myclothingshop.com
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block bg-[#EFE6D8] text-[#5C4033] text-xs font-bold px-3 py-1 rounded-full mb-2">
              ใบเสร็จรับเงิน / RECEIPT
            </span>
            <p className="text-sm font-semibold text-[#2C221E]">
              เลขที่: {receiptNumber}
            </p>
            <p className="text-xs text-[#7A6B60] mt-0.5">
              วันที่:{' '}
              {orderDate.toLocaleString('th-TH', {
                dateStyle: 'long',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-b border-[#E6DDD0] text-sm">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[#8C7B6E] uppercase mb-1">
              ข้อมูลลูกค้า / ผู้รับสินค้า
            </p>
            <p className="font-semibold text-[#2C221E]">{order.user.name}</p>
            <p className="text-[#5E5047]">{order.user.email}</p>
            {order.phone && <p className="text-[#4A3B31]">โทร: {order.phone}</p>}
            {order.address && (
              <p className="text-[#5E5047] text-xs leading-relaxed pt-1">
                ที่อยู่จัดส่ง: {order.address}
              </p>
            )}
          </div>

          <div className="sm:text-right space-y-1">
            <p className="text-xs font-semibold text-[#8C7B6E] uppercase mb-1">
              รายละเอียดคำสั่งซื้อ
            </p>
            <p className="text-[#4A3B31]">รหัสคำสั่งซื้อ: #{order.id}</p>
            <p className="text-[#4A3B31]">
              สถานะ:{' '}
              <span
                className={`font-semibold ${
                  order.status === 'ยกเลิก' ? 'text-[#A8382B]' : 'text-[#3F6636]'
                }`}
              >
                {order.status === 'ยกเลิก' ? 'ยกเลิกคำสั่งซื้อ' : `ชำระเงินแล้ว (${order.status})`}
              </span>
            </p>
          </div>
        </div>

        <div className="py-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6DDD0] text-xs font-semibold text-[#7A6B60] uppercase">
                <th className="py-3 w-12">ลำดับ</th>
                <th className="py-3">รายการสินค้า</th>
                <th className="py-3 text-center w-20">จำนวน</th>
                <th className="py-3 text-right w-28">ราคา/หน่วย</th>
                <th className="py-3 text-right w-28">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6D8] text-sm">
              {order.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="py-3.5 text-[#7A6B60]">{index + 1}</td>
                  <td className="py-3.5">
                    <p className="font-medium text-[#2C221E]">{item.product.name}</p>
                    <p className="text-xs text-[#7A6B60]">
                      สี: {item.product.color} | ไซส์: {item.product.size}
                    </p>
                  </td>
                  <td className="py-3.5 text-center text-[#4A3B31]">{item.quantity}</td>
                  <td className="py-3.5 text-right text-[#4A3B31]">
                    {item.price.toLocaleString()} ฿
                  </td>
                  <td className="py-3.5 text-right font-medium text-[#2C221E]">
                    {(item.price * item.quantity).toLocaleString()} ฿
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t border-[#E6DDD0] flex flex-col items-end space-y-2 text-sm">
          <div className="w-full sm:w-64 flex justify-between text-[#5E5047]">
            <span>จำนวนสินค้าทั้งหมด</span>
            <span>{totalQuantity} ชิ้น</span>
          </div>
          <div className="w-full sm:w-64 flex justify-between text-[#5E5047]">
            <span>ค่าจัดส่ง</span>
            <span>ฟรี</span>
          </div>
          <div className="w-full sm:w-64 flex justify-between items-center pt-3 border-t border-[#E6DDD0]">
            <span className="font-bold text-[#2C221E] text-base">ยอดสุทธิ</span>
            <span className="font-bold text-[#7A5638] text-xl">
              {order.total.toLocaleString()} บาท
            </span>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-dashed border-[#D8CBB8] text-center text-xs text-[#8C7B6E] space-y-1">
          <p>ขอบคุณที่อุดหนุนสินค้ากับ Toasted & Co.</p>
          <p>เอกสารฉบับนี้ออกโดยระบบอัตโนมัติ ใช้เป็นหลักฐานการสั่งซื้อและชำระเงินได้</p>
        </div>
      </div>
    </main>
  )
}