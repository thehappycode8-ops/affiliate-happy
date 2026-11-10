import { supabaseAdmin } from './supabase-admin';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];

/** อัปโหลดรูปขึ้น Supabase Storage แล้วคืน public URL */
export async function uploadImage(
  file: File,
  bucket = 'product-images'
): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'รองรับเฉพาะไฟล์รูป PNG, JPG, WEBP หรือ AVIF' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'ไฟล์ใหญ่เกิน 3 MB กรุณาย่อรูปก่อนอัปโหลด' };
  }

  const db = supabaseAdmin();
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await db.storage.from(bucket).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
    cacheControl: '31536000',
  });

  if (error) {
    console.error('[upload] failed', bucket, error);
    return {
      error: /bucket/i.test(error.message)
        ? `ยังไม่มีที่เก็บรูป (bucket "${bucket}") — รันไฟล์ schema.sql ใน Supabase อีกครั้ง`
        : 'อัปโหลดรูปไม่สำเร็จ',
    };
  }

  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}

/** ใช้กับรูปสินค้า */
export const uploadProductImage = (file: File) => uploadImage(file, 'product-images');

/** ใช้กับโปสเตอร์รางวัล */
export const uploadRewardImage = (file: File) => uploadImage(file, 'reward-images');
