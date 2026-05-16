import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSecureDocsSuperUser } from '@/lib/supabase/config'

export async function requireDocsAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !isSecureDocsSuperUser(user)) {
    return {
      user: null,
      response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }),
    }
  }

  return { user, response: null }
}
