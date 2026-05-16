import Image from 'next/image'
import { redirect } from 'next/navigation'
import { LoginForm } from './login-form'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig, isAllowedSecureDocsUser } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'

export default async function SecureLoginPage() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (isAllowedSecureDocsUser(user)) {
      redirect('/docs')
    }
  }

  return (
    <main className="min-h-svh bg-[#f7f8fa] text-[#0b0d12] dark:bg-[#0b0d12] dark:text-white">
      <div className="grid min-h-svh lg:grid-cols-[minmax(420px,45vw)_1fr]">
        <section className="relative flex min-h-[430px] flex-col justify-between overflow-hidden bg-[#0a0b0d] px-6 py-8 text-white sm:px-10 sm:py-12 lg:min-h-svh lg:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #ffffff 1px, transparent 1px), linear-gradient(-45deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '42px 42px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"
          />

          <div className="relative z-10">
            <Image
              src="/logo/dark.svg"
              alt="aiConnected"
              width={174}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          <div className="relative z-10 flex max-w-xl flex-col gap-8">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-white/60">Internal documentation</p>
              <h1 className="max-w-[12ch] text-5xl font-semibold leading-[0.96] tracking-normal text-white sm:text-6xl">
                Secure Docs
              </h1>
              <div className="h-0.5 w-16 bg-white/30" />
            </div>

            <div className="grid gap-3 text-sm leading-6 text-white/72 sm:max-w-md">
              {[
                'Product, platform, and implementation records.',
                'Private access for aiConnected team accounts.',
                'Knowledge base, planning docs, and API references.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 size-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(46,149,243,0.16)]" />
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid gap-3 border-t border-white/10 pt-5 text-xs text-white/50 sm:grid-cols-3">
            <div>
              <p className="text-white/90">Docs</p>
              <p>Secure library</p>
            </div>
            <div>
              <p className="text-white/90">Auth</p>
              <p>Supabase backed</p>
            </div>
            <div>
              <p className="text-white/90">Domain</p>
              <p>@aiconnected.ai</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 flex justify-center lg:hidden">
              <Image
                src="/logo/light.svg"
                alt="aiConnected"
                width={174}
                height={40}
                className="h-10 w-auto dark:hidden"
                priority
              />
              <Image
                src="/logo/dark.svg"
                alt="aiConnected"
                width={174}
                height={40}
                className="hidden h-10 w-auto dark:block"
                priority
              />
            </div>
            <LoginForm />
          </div>
        </section>
      </div>
    </main>
  )
}
