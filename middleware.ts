import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 環境変数がない場合は、/admin/login 以外へのアクセスをブロック
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Middleware Supabase env missing', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    })

    if (request.nextUrl.pathname === '/admin/login') {
      return NextResponse.next()
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // セッションをリフレッシュ
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // /admin/* へのアクセスを保護
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // /admin/login は除外
    if (request.nextUrl.pathname === '/admin/login') {
      // 既にログインしている場合はダッシュボードにリダイレクト
      if (user) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
      }
      return supabaseResponse
    }

    // ログインしていない場合はログインページにリダイレクト
    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

