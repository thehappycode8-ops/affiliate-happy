import { NextResponse } from 'next/server';
import { listProducts } from '@/lib/products-server';

export const dynamic = 'force-dynamic';

/** รายการสินค้าที่เปิดใช้งาน — เปิดให้หน้าบ้านเรียกได้ (อ่านอย่างเดียว) */
export async function GET() {
  const data = await listProducts(true);
  return NextResponse.json({ ok: true, data });
}
