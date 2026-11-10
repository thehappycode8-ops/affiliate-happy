import { supabaseAdmin } from '@/lib/supabase-admin';
import { DEFAULT_REWARD, type RewardSettings } from '@/lib/reward';

/** อ่านค่ารางวัลจากฐานข้อมูล ถ้ายังไม่มีให้ใช้ค่าเริ่มต้น */
export async function getRewardSettings(): Promise<RewardSettings> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('reward_settings')
      .select(
        'enabled, target_clips, prize_title, prize_detail, headline, contact_note, image_url, popup_enabled, contact_title, contact_line_url, contact_line_id'
      )
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return DEFAULT_REWARD;
    return {
      enabled: data.enabled ?? DEFAULT_REWARD.enabled,
      target_clips: data.target_clips ?? null,
      prize_title: data.prize_title || DEFAULT_REWARD.prize_title,
      prize_detail: data.prize_detail ?? null,
      headline: data.headline || DEFAULT_REWARD.headline,
      contact_note: data.contact_note ?? null,
      image_url: data.image_url ?? null,
      popup_enabled: data.popup_enabled ?? DEFAULT_REWARD.popup_enabled,
      contact_title: data.contact_title ?? DEFAULT_REWARD.contact_title,
      contact_line_url: data.contact_line_url ?? DEFAULT_REWARD.contact_line_url,
      contact_line_id: data.contact_line_id ?? DEFAULT_REWARD.contact_line_id,
    };
  } catch {
    return DEFAULT_REWARD;
  }
}
