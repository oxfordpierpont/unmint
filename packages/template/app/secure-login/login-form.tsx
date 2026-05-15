'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, LockKeyhole, Loader2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'
import { hasSupabaseConfig, secureEmailDomain } from '@/lib/supabase/config'

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(searchParams.get('message') || '')
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const emailInvalid = useMemo(() => {
    const normalized = normalizeEmail(email)
    return normalized.length > 0 && !normalized.endsWith(secureEmailDomain)
  }, [email])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')

    const normalizedEmail = normalizeEmail(email)
    const normalizedUsername = username.trim()

    if (!hasSupabaseConfig()) {
      setError('Supabase is not configured for this deployment yet.')
      return
    }

    if (!normalizedEmail.endsWith(secureEmailDomain)) {
      setError(`Use an ${secureEmailDomain} email address.`)
      return
    }

    if (normalizedUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setPending(true)
    const supabase = createClient()

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInData.session) {
      router.replace('/docs')
      router.refresh()
      return
    }

    if (signInError && !/invalid login credentials/i.test(signInError.message)) {
      setPending(false)
      setError(signInError.message)
      return
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: normalizedUsername,
        },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    setPending(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (signUpData.session) {
      router.replace('/docs')
      router.refresh()
      return
    }

    setNotice(`Check ${normalizedEmail} to confirm secure docs access.`)
  }

  return (
    <Card className="w-full rounded-[10px] border-[#e6e8ec] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[#111318]">
      <CardHeader className="gap-5 p-0">
        <div className="flex items-center justify-between border-b border-[#e9ebef] px-7 py-5 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-[var(--accent-muted)] text-[var(--accent)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Verified access</p>
              <p className="text-sm font-medium text-foreground">aiConnected only</p>
            </div>
          </div>
          <div className="size-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-muted)]" />
        </div>

        <div className="flex flex-col gap-3 px-7 pt-2">
          <CardTitle className="text-3xl">Welcome</CardTitle>
          <CardDescription className="text-[15px] leading-6">
            Sign in or create access with your aiConnected team account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-7 pb-7 pt-7">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field data-invalid={emailInvalid || undefined}>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@aiconnected.ai"
                  autoComplete="email"
                  aria-invalid={emailInvalid}
                  className="h-12 rounded-[10px] border-[#dfe3e8] bg-white pl-10 text-[15px] focus-visible:ring-[var(--accent)]/20 dark:border-white/15 dark:bg-white/5"
                  required
                />
              </div>
              <FieldDescription>Only {secureEmailDomain} addresses can continue.</FieldDescription>
              {emailInvalid ? <FieldError>Email must end with {secureEmailDomain}.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="first.last"
                  autoComplete="username"
                  className="h-12 rounded-[10px] border-[#dfe3e8] bg-white pl-10 text-[15px] focus-visible:ring-[var(--accent)]/20 dark:border-white/15 dark:bg-white/5"
                  required
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="h-12 rounded-[10px] border-[#dfe3e8] bg-white px-10 text-[15px] focus-visible:ring-[var(--accent)]/20 dark:border-white/15 dark:bg-white/5"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </Field>
          </FieldGroup>

          {error ? (
            <Alert className="rounded-[10px] border-destructive/40 bg-destructive/5">
              <AlertTitle>Access check failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {notice ? (
            <Alert>
              <AlertTitle>Confirmation sent</AlertTitle>
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-12 rounded-[10px] bg-[#0a0b0d] text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(10,11,13,0.18)] hover:bg-[#20242b] dark:bg-white dark:text-[#0a0b0d] dark:hover:bg-white/90"
          >
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <LockKeyhole data-icon="inline-start" aria-hidden="true" />}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
