import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSecureDocsSuperUser } from '@/lib/supabase/config'
import { DocsAdminClient } from './docs-admin-client'

export const dynamic = 'force-dynamic'

export default async function DocsAdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isSecureDocsSuperUser(user)) {
    redirect('/secure-login')
  }

  return <DocsAdminClient userEmail={user?.email || ''} />
}
