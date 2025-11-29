'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // エラーメッセージを詳細に返す
      return { error: `ログインエラー: ${error.message}` }
    }

    if (!data.user) {
      return { error: 'ログインに失敗しました: ユーザー情報が取得できませんでした' }
    }

    // ユーザーがadminsテーブルに登録されているか確認
    const supabaseAdmin = getSupabaseAdmin()
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admins')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (adminError || !admin) {
      return { error: 'ログインエラー: 管理者として登録されていません。adminsテーブルに登録が必要です。' }
    }

    revalidatePath('/', 'layout')
    redirect('/admin/dashboard')
  } catch (err) {
    // Next.js の redirect() は NEXT_REDIRECT というエラーとしてスローされる。
    // これは正常な挙動なので、そのまま再スローして Next.js に処理を任せる。
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
      throw err
    }

    console.error('Sign in error:', err)
    return {
      error: `予期しないエラーが発生しました: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    }
  }
}

export async function signOut() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}

// 開発用: パスワードリセット機能
export async function resetPassword(email: string) {
  if (process.env.NODE_ENV !== 'development') {
    return { error: 'この機能は開発環境でのみ利用できます' }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/reset-password`,
    })

    if (error) {
      return { error: `パスワードリセットエラー: ${error.message}` }
    }

    return { success: true, message: 'パスワードリセットメールを送信しました' }
  } catch (err) {
    return { error: `予期しないエラー: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }
}
