'use server'

import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getCurrentAdmin } from '@/lib/auth/utils'
import type { Clinic, ClinicUpdate } from '@/types/database'
import { revalidatePath } from 'next/cache'

/**
 * クリニック設定を取得
 */
export async function getClinicSettings(): Promise<Clinic | null> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return null
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { data, error } = await supabaseAdmin
    .from('clinics')
    .select('*')
    .eq('id', admin.clinic_id)
    .single()

  if (error || !data) {
    console.error('Error fetching clinic settings:', error)
    return null
  }

  return data as Clinic
}

/**
 * クリニック設定を更新
 */
export async function updateClinicSettings(
  updates: ClinicUpdate
): Promise<{ error?: string }> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    return { error: '認証が必要です' }
  }

  const supabaseAdmin = getSupabaseAdmin()
  const { error } = await supabaseAdmin
    .from('clinics')
    .update(updates)
    .eq('id', admin.clinic_id)

  if (error) {
    console.error('Error updating clinic settings:', error)
    return { error: '設定の更新に失敗しました' }
  }

  revalidatePath('/admin/settings')
  return {}
}

