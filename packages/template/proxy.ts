import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  externalUnauthorizedRedirect,
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  isAllowedSecureDocsUser,
} from '@/lib/supabase/config'

const PUBLIC_FILE = /\.(?:ico|svg|png|jpg|jpeg|gif|webp|css|js|map|woff2?)$/i

function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/logo/') ||
    PUBLIC_FILE.test(pathname)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicAsset(pathname)) {
    return NextResponse.next()
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  const isAuthRoute = pathname.startsWith('/secure-login') || pathname.startsWith('/auth/')

  if (!hasSupabaseConfig()) {
    return isAuthRoute
      ? NextResponse.next()
      : NextResponse.redirect(externalUnauthorizedRedirect)
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isAuthRoute) {
    return supabaseResponse
  }

  if (!isAllowedSecureDocsUser(user)) {
    return NextResponse.redirect(externalUnauthorizedRedirect)
  }

  supabaseResponse.headers.set('Cache-Control', 'private, no-store')
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
