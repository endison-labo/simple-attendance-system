import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { Admin } from '@/types/database'

/**
 * 現在のセッションから管理者情報を取得
 */
export async function getCurrentAdmin(): Promise<Admin | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    // admins テーブルから管理者情報を取得
    const supabaseAdmin = getSupabaseAdmin()
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !admin) {
      return null
    }

    return admin as Admin
  } catch (error) {
    // エラーをログに記録するが、null を返して続行を許可
    if (process.env.NODE_ENV === 'development') {
      console.error('Error getting current admin:', error)
    }
    return null
  }
}

/**
 * 管理者がログインしているかチェック
 */
export async function isAuthenticated(): Promise<boolean> {
  const admin = await getCurrentAdmin()
  return admin !== null
}

