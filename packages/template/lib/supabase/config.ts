export const secureEmailDomain = '@aiconnected.ai'
export const externalUnauthorizedRedirect = 'https://aiconnected.ai'
export const secureDocsSuperUserEmails = ['admin@aiconnected.ai', 'oxfordpierpont@gmail.com']

type SecureDocsUser = {
  email?: string | null
  app_metadata?: Record<string, unknown> | null
}

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
  const normalizedEmail = email?.toLowerCase()

  return Boolean(
    normalizedEmail &&
      (normalizedEmail.endsWith(secureEmailDomain) || secureDocsSuperUserEmails.includes(normalizedEmail)),
  )
}

export function isSecureDocsSuperUser(user?: SecureDocsUser | null) {
  const normalizedEmail = user?.email?.toLowerCase()
  const appMetadata = user?.app_metadata
  const roles = Array.isArray(appMetadata?.roles) ? appMetadata.roles : []

  return Boolean(
    (normalizedEmail && secureDocsSuperUserEmails.includes(normalizedEmail)) ||
      appMetadata?.is_super_user ||
      appMetadata?.role === 'super_user' ||
      appMetadata?.role === 'super_admin' ||
      roles.includes('super_user') ||
      roles.includes('super_admin'),
  )
}

export function isAllowedSecureDocsUser(user?: SecureDocsUser | null) {
  return Boolean(user && (isAllowedSecureDocsEmail(user.email) || isSecureDocsSuperUser(user)))
}
