import { supabaseAdmin } from './supabase-admin';
import type { Product } from './products';

/** ดึงรายการสินค้าฝั่งเซิร์ฟเวอร์ (server component / API route) */
export async function listProducts(activeOnly = true): Promise<Product[]> {
  try {
    let q = supabaseAdmin()
      .from('products')
      .select('id, name, sub, image_url, sort_order, is_active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (activeOnly) q = q.eq('is_active', true);

    const { data, error } = await q;
    if (error) {
      console.error('[products] list failed', error);
      return [];
    }
    return (data || []) as Product[];
  } catch (e) {
    console.error('[products] list threw', e);
    return [];
  }
}
