export const secureEmailDomain = '@aiconnected.ai'
export const externalUnauthorizedRedirect = 'https://aiconnected.ai'

export function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://secure-docs-aiconnected-supabase.sec-admn.com'
  )
}

export function getSupabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  )
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey())
}

export function isAllowedSecureDocsEmail(email?: string | null) {
  return Boolean(email?.toLowerCase().endsWith(secureEmailDomain))
}
