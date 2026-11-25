'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { clearUserSession, getCurrentUser } from '../lib/auth'

const prisma = new PrismaClient()

export async function logoutAction() {
  await clearUserSession()
  redirect('/login')
}

export async function addToCartAction(productId: number) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, requireLogin: true, error: 'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าลงตะกร้า' }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  })

  if (!product || product.stock <= 0) {
    return { success: false, error: 'สินค้าหมดหรือไม่มีในระบบ' }
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: user.id,
        productId,
      },
    },
  })

  const nextQty = (existing?.quantity || 0) + 1
  if (nextQty > product.stock) {
    return {
      success: false,
      error: `สินค้า "${product.name}" มีในสต็อกสูงสุด ${product.stock} ตัวครับ`,
    }
  }

  await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: user.id,
        productId,
      },
    },
    update: { quantity: nextQty },
    create: {
      userId: user.id,
      productId,
      quantity: 1,
    },
  })

  revalidatePath('/')
  return { success: true }
}

export async function updateCartQuantityAction(productId: number, delta: number) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      userId_productId: {
        userId: user.id,
        productId,
      },
    },
    include: { product: true },
  })

  if (!existing) {
    return { success: false, error: 'ไม่พบสินค้าในตะกร้า' }
  }

  const newQty = existing.quantity + delta

  if (newQty <= 0) {
    await prisma.cartItem.delete({
      where: { id: existing.id },
    })
  } else {
    if (newQty > existing.product.stock) {
      return {
        success: false,
        error: `สินค้านี้มีในสต็อกสูงสุด ${existing.product.stock} ตัวครับ`,
      }
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    })
  }

  revalidatePath('/')
  return { success: true }
}

export async function removeFromCartAction(productId: number) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบ' }
  }

  await prisma.cartItem.deleteMany({
    where: {
      userId: user.id,
      productId,
    },
  })

  revalidatePath('/')
  return { success: true }
}

export async function checkoutAction(phone: string, address: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนยืนยันการสั่งซื้อ' }
  }

  const cleanPhone = phone.trim()
  const cleanAddress = address.trim()

  if (!cleanPhone || !cleanAddress) {
    return { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์และที่อยู่จัดส่งให้ครบถ้วน' }
  }

  try {
    const order = await prisma.$transaction(async (tx) => {
      const dbCartItems = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: { product: true },
      })

      if (dbCartItems.length === 0) {
        throw new Error('ไม่มีสินค้าในตะกร้า')
      }

      let total = 0
      const orderItemsData: {
        productId: number
        quantity: number
        price: number
      }[] = []

      for (const item of dbCartItems) {
        if (item.product.stock < item.quantity) {
          throw new Error(
            `สินค้า "${item.product.name}" มีสต็อกไม่เพียงพอ (เหลือ ${item.product.stock} ตัว)`
          )
        }

        total += item.product.price * item.quantity
        orderItemsData.push({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        })

        await tx.product.update({
          where: { id: item.product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      }

      const createdOrder = await tx.order.create({
        data: {
          userId: user.id,
          phone: cleanPhone,
          address: cleanAddress,
          total,
          status: 'สำเร็จ',
          items: {
            create: orderItemsData,
          },
        },
      })

      await tx.cartItem.deleteMany({
        where: { userId: user.id },
      })

      return createdOrder
    })

    revalidatePath('/')
    revalidatePath('/admin')
    revalidatePath('/orders')
    return { success: true, orderId: order.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสั่งซื้อ'
    return { success: false, error: message }
  }
}