'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  logoutAction,
  addToCartAction,
  updateCartQuantityAction,
  removeFromCartAction,
  checkoutAction,
} from '../app/actions'

type ProductType = {
  id: number
  name: string
  price: number
  stock: number
  color: string
  size: string
  imageUrl: string | null
}

type UserType = {
  id: number
  name: string
  email: string
  role: string
} | null

type CartItemType = {
  productId: number
  name: string
  price: number
  color: string
  size: string
  imageUrl: string | null
  quantity: number
  maxStock: number
}

export default function StorefrontClient({
  products,
  user,
  initialCart,
}: {
  products: ProductType[]
  user: UserType
  initialCart: CartItemType[]
}) {
  const router = useRouter()
  const [cart, setCart] = useState<CartItemType[]>(initialCart)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [busyProductId, setBusyProductId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSize, setSelectedSize] = useState('ALL')
  const [selectedColor, setSelectedColor] = useState('ALL')

  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    setCart(initialCart)
  }, [initialCart])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(timer)
  }, [toast])

  const availableSizes = Array.from(new Set(products.map((p) => p.size).filter(Boolean)))
  const availableColors = Array.from(new Set(products.map((p) => p.color).filter(Boolean)))

  const filteredProducts = products.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    const matchSize = selectedSize === 'ALL' || item.size === selectedSize
    const matchColor = selectedColor === 'ALL' || item.color === selectedColor
    return matchSearch && matchSize && matchColor
  })

  const hasActiveFilter =
    searchQuery.trim() !== '' || selectedSize !== 'ALL' || selectedColor !== 'ALL'

  function resetFilters() {
    setSearchQuery('')
    setSelectedSize('ALL')
    setSelectedColor('ALL')
  }

  async function handleAddToCart(product: ProductType) {
    if (!user) {
      router.push('/login')
      return
    }

    setMessage(null)
    setBusyProductId(product.id)
    const res = await addToCartAction(product.id)
    setBusyProductId(null)

    if (!res.success) {
      if (res.requireLogin) {
        router.push('/login')
        return
      }
      setToast(res.error || 'ไม่สามารถเพิ่มสินค้าได้')
      return
    }

    setToast(`เพิ่ม "${product.name}" ลงตะกร้าแล้ว!`)
    router.refresh()
  }

  async function handleUpdateQuantity(productId: number, delta: number) {
    setBusyProductId(productId)
    const res = await updateCartQuantityAction(productId, delta)
    setBusyProductId(null)

    if (!res.success) {
      setToast(res.error || 'ไม่สามารถปรับจำนวนได้')
      return
    }

    router.refresh()
  }

  async function handleRemoveFromCart(productId: number) {
    setBusyProductId(productId)
    await removeFromCartAction(productId)
    setBusyProductId(null)
    router.refresh()
  }

  async function handleCheckout() {
    if (!phone.trim() || !address.trim()) {
      setToast('กรุณากรอกเบอร์โทรศัพท์และที่อยู่จัดส่งก่อนยืนยันครับ')
      return
    }

    setIsCheckingOut(true)
    setMessage(null)

    const res = await checkoutAction(phone, address)
    setIsCheckingOut(false)

    if (!res.success) {
      setToast(res.error || 'เกิดข้อผิดพลาดในการสั่งซื้อ')
      return
    }

    setIsCartOpen(false)
    setMessage({
      type: 'success',
      text: `สั่งซื้อสำเร็จ! (หมายเลขคำสั่งซื้อ #${res.orderId}) ระบบตัดสต็อกเรียบร้อยแล้ว`,
    })
    router.refresh()
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#2C221E]">
      {/* แถบ Header ด้านบน */}
      <header className="bg-[#FFFDF9]/95 backdrop-blur border-b border-[#E6DDD0] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-[#3B2E28] tracking-tight">
            Toasted & Co.
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {user ? (
              <>
                <div className="text-sm text-[#4A3B31] bg-[#F3ECE1] border border-[#E6DDD0] px-3.5 py-1.5 rounded-full">
                  สวัสดี, <span className="font-semibold text-[#2C221E]">{user.name}</span>
                  {user.role === 'ADMIN' && (
                    <span className="ml-1.5 text-xs bg-[#DFD0BC] text-[#4A3525] px-2 py-0.5 rounded-full font-semibold">
                      Admin
                    </span>
                  )}
                </div>

                <Link
                  href="/orders"
                  className="bg-[#FFFDF9] border border-[#D8CBB8] text-[#4A3B31] px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#F3ECE1] transition"
                >
                  {user.role === 'ADMIN' ? '📦 คำสั่งซื้อทั้งหมด' : '📦 ประวัติการสั่งซื้อ'}
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="bg-[#3B2E28] text-[#FAF7F2] px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-[#261D19] transition"
                  >
                    + จัดการร้านค้า
                  </Link>
                )}

                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="text-sm text-[#7A6B60] hover:text-red-700 px-2 py-1.5 cursor-pointer transition"
                  >
                    ออกจากระบบ
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-[#4A3B31] hover:text-[#2C221E] bg-[#FFFDF9] border border-[#D8CBB8] hover:bg-[#F3ECE1] px-4 py-2 rounded-xl transition"
              >
                เข้าสู่ระบบ / สมัครสมาชิก
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative bg-[#6B4F3A] text-[#FAF7F2] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#563E2D] transition cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <span>🛒 ตะกร้า</span>
              <span className="bg-[#FAF7F2] text-[#6B4F3A] text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* แจ้งเตือนมุมขวาล่าง */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#3B2E28] text-[#FAF7F2] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 text-sm border border-[#56433A]">
          <span>{toast}</span>
          {user && !isCartOpen && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="text-[#E6C9A8] hover:text-white font-semibold underline cursor-pointer"
            >
              ดูตะกร้า ({totalItems})
            </button>
          )}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium border flex flex-wrap justify-between items-center gap-2 ${
              message.type === 'success'
                ? 'bg-[#EEF5EC] border-[#C5DEC0] text-[#2F5E29]'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <span>{message.text}</span>
            {message.type === 'success' && (
              <Link href="/orders" className="underline font-semibold hover:opacity-80">
                ดูรายละเอียดคำสั่งซื้อ / ใบเสร็จ →
              </Link>
            )}
          </div>
        )}

        {/* แถบค้นหาและตัวกรองสินค้าตามไซส์และสี */}
        {products.length > 0 && (
          <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#E6DDD0] shadow-xs mb-6 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 ค้นหาชื่อเสื้อผ้า เช่น เสื้อยืด, กางเกง..."
                className="w-full bg-[#FAF7F2] border border-[#D8CBB8] rounded-xl px-3.5 py-2 text-sm text-[#2C221E] placeholder-[#9A8B7E] focus:outline-none focus:border-[#6B4F3A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#3B2E28] bg-[#FAF7F2] cursor-pointer focus:outline-none focus:border-[#6B4F3A]"
              >
                <option value="ALL">ไซส์: ทั้งหมด</option>
                {availableSizes.map((size) => (
                  <option key={size} value={size}>
                    ไซส์: {size}
                  </option>
                ))}
              </select>

              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="border border-[#D8CBB8] rounded-xl px-3 py-2 text-sm text-[#3B2E28] bg-[#FAF7F2] cursor-pointer focus:outline-none focus:border-[#6B4F3A]"
              >
                <option value="ALL">สี: ทั้งหมด</option>
                {availableColors.map((color) => (
                  <option key={color} value={color}>
                    สี: {color}
                  </option>
                ))}
              </select>

              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-[#6B4F3A] hover:text-[#3B2E28] bg-[#EFE6D8] px-3 py-2 rounded-xl font-medium cursor-pointer transition"
                >
                  ✕ ล้างตัวกรอง
                </button>
              )}
            </div>
          </div>
        )}

        {/* พื้นที่แสดงรายการสินค้า */}
        {products.length === 0 ? (
          <div className="text-center py-20 bg-[#FFFDF9] rounded-2xl border border-[#E6DDD0] text-[#7A6B60]">
            ยังไม่มีสินค้าในร้าน
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-[#FFFDF9] rounded-2xl border border-[#E6DDD0]">
            <p className="text-[#7A6B60] mb-3">ไม่พบเสื้อผ้าที่ตรงกับเงื่อนไขการค้นหาครับ</p>
            <button
              onClick={resetFilters}
              className="bg-[#6B4F3A] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#563E2D] cursor-pointer transition"
            >
              แสดงสินค้าทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((item) => {
              const inCart = cart.find((c) => c.productId === item.id)
              const isBusy = busyProductId === item.id
              return (
                <div
                  key={item.id}
                  className="bg-[#FFFDF9] border border-[#E6DDD0] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-56 object-cover bg-[#F3ECE1]"
                      />
                    ) : (
                      <div className="w-full h-56 bg-[#EFE6D8] flex items-center justify-center text-[#8C7B6E] text-sm">
                        ไม่มีรูปภาพสินค้า
                      </div>
                    )}

                    <div className="p-4">
                      <h2 className="text-lg font-bold text-[#2C221E] mb-2">{item.name}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs bg-[#F5EFE6] text-[#5C493C] border border-[#E6DDD0] px-2.5 py-1 rounded-full">
                          สี: {item.color}
                        </span>
                        <span className="text-xs bg-[#EAE0D0] text-[#4A3525] px-2.5 py-1 rounded-full font-medium">
                          ไซส์: {item.size}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex justify-between items-center pt-3 border-t border-[#EFE6D8] mb-3">
                      <p className="text-lg font-bold text-[#7A5638]">
                        {item.price.toLocaleString()} บาท
                      </p>
                      {item.stock > 0 ? (
                        <p className="text-sm text-[#4F7344] font-medium">เหลือ {item.stock} ตัว</p>
                      ) : (
                        <p className="text-sm text-[#B84A39] font-medium">สินค้าหมด</p>
                      )}
                    </div>

                    {item.stock > 0 ? (
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={isBusy}
                        className="w-full bg-[#6B4F3A] text-[#FAF7F2] py-2.5 rounded-xl text-sm font-medium hover:bg-[#563E2D] transition cursor-pointer disabled:bg-[#B8A798]"
                      >
                        {isBusy
                          ? 'กำลังบันทึก...'
                          : inCart
                          ? `+ เพิ่มลงตะกร้า (ในตะกร้ามี ${inCart.quantity})`
                          : '+ เพิ่มลงตะกร้า'}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full bg-[#EAE3D9] text-[#9A8B7E] py-2.5 rounded-xl text-sm font-medium cursor-not-allowed"
                      >
                        สินค้าหมดชั่วคราว
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* หน้าต่างตะกร้าสินค้าและกรอกที่อยู่จัดส่ง */}
      {isCartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end bg-[#2C221E]/45 backdrop-blur-[1px]">
          <div className="w-full max-w-md bg-[#FFFDF9] h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto border-l border-[#E6DDD0]">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-[#E6DDD0]">
                <h2 className="text-xl font-bold text-[#2C221E]">
                  ตะกร้าสินค้า ({cart.length} รายการ / {totalItems} ชิ้น)
                </h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-[#7A6B60] hover:text-[#2C221E] text-xl font-bold px-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-20 text-[#8C7B6E] text-sm">
                  {user
                    ? 'ยังไม่มีสินค้าในตะกร้าครับ'
                    : 'กรุณาเข้าสู่ระบบเพื่อใช้งานตะกร้าสินค้าครับ'}
                </div>
              ) : (
                <div className="divide-y divide-[#EFE6D8] max-h-[38vh] overflow-y-auto mt-2">
                  {cart.map((item) => {
                    const isBusy = busyProductId === item.productId
                    return (
                      <div
                        key={item.productId}
                        className="py-3.5 flex justify-between items-center gap-3"
                      >
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-12 h-12 rounded-xl object-cover border border-[#E6DDD0]"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#EFE6D8] flex items-center justify-center text-xs text-[#8C7B6E]">
                              ไม่มีรูป
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-[#2C221E] text-sm">{item.name}</p>
                            <p className="text-xs text-[#7A6B60]">
                              {item.color} | ไซส์ {item.size}
                            </p>
                            <p className="text-sm font-bold text-[#7A5638] mt-0.5">
                              {(item.price * item.quantity).toLocaleString()} บาท
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(item.productId, -1)}
                            disabled={isBusy}
                            className="w-7 h-7 rounded-lg border border-[#D8CBB8] bg-[#FAF7F2] text-[#3B2E28] hover:bg-[#EFE6D8] cursor-pointer disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-5 text-center text-[#2C221E]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.productId, 1)}
                            disabled={isBusy}
                            className="w-7 h-7 rounded-lg border border-[#D8CBB8] bg-[#FAF7F2] text-[#3B2E28] hover:bg-[#EFE6D8] cursor-pointer disabled:opacity-50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveFromCart(item.productId)}
                            disabled={isBusy}
                            className="text-xs text-[#B84A39] hover:text-red-800 ml-1 cursor-pointer disabled:opacity-50"
                          >
                            ลบ
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t border-[#E6DDD0] mt-4 space-y-3">
                {user && (
                  <div className="bg-[#F5EFE6] p-3.5 rounded-xl border border-[#E2D6C5] space-y-2.5">
                    <p className="text-xs font-bold text-[#3B2E28]">📍 ข้อมูลสำหรับจัดส่งสินค้า</p>
                    <div>
                      <label className="block text-xs font-medium text-[#5E5047] mb-1">
                        เบอร์โทรศัพท์ติดต่อ *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="เช่น 081-234-5678"
                        className="w-full border border-[#D8CBB8] rounded-lg px-3 py-1.5 text-sm text-[#2C221E] bg-[#FFFDF9] focus:outline-none focus:border-[#6B4F3A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5E5047] mb-1">
                        ที่อยู่จัดส่งพัสดุ *
                      </label>
                      <textarea
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="บ้านเลขที่, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์"
                        className="w-full border border-[#D8CBB8] rounded-lg px-3 py-1.5 text-sm text-[#2C221E] bg-[#FFFDF9] focus:outline-none focus:border-[#6B4F3A]"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[#5E5047] font-medium">ยอดรวมทั้งหมด</span>
                  <span className="text-2xl font-bold text-[#7A5638]">
                    {totalPrice.toLocaleString()} บาท
                  </span>
                </div>

                {user ? (
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="w-full bg-[#6B4F3A] text-[#FAF7F2] py-3 rounded-xl font-semibold hover:bg-[#563E2D] transition cursor-pointer disabled:bg-[#B8A798]"
                  >
                    {isCheckingOut ? 'กำลังดำเนินการสั่งซื้อ...' : 'ยืนยันการสั่งซื้อ'}
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="block text-center w-full bg-[#3B2E28] text-[#FAF7F2] py-3 rounded-xl font-semibold hover:bg-[#261D19] transition"
                  >
                    เข้าสู่ระบบเพื่อสั่งซื้อสินค้า
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}