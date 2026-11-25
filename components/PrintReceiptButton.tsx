'use client'

export default function PrintReceiptButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-[#6B4F3A] text-[#FAF7F2] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#563E2D] transition cursor-pointer flex items-center gap-2"
    >
      <span>🖨️ พิมพ์ใบเสร็จ / บันทึก PDF</span>
    </button>
  )
}