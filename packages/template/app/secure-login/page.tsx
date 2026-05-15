import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig, isAllowedSecureDocsEmail } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export default async function SecureLoginPage() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user && isAllowedSecureDocsEmail(user.email)) {
      redirect('/docs')
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1fr_480px]">
        <section className="flex flex-col gap-6">
          <Image
            src="/logo/light.svg"
            alt="aiConnected"
            width={210}
            height={48}
            className="h-12 w-auto dark:hidden"
            priority
          />
          <Image
            src="/logo/dark.svg"
            alt="aiConnected"
            width={210}
            height={48}
            className="hidden h-12 w-auto dark:block"
            priority
          />
          <div className="flex max-w-2xl flex-col gap-4">
            <p className="text-sm font-medium text-[var(--accent)]">Internal documentation</p>
            <h1 className="text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
              Secure access for aiConnected teams.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Product, platform, and implementation records are available after account verification.
            </p>
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  )
}
