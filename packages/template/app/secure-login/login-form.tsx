'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LockKeyhole, Loader2, ShieldCheck } from 'lucide-react'
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
    <Card className="w-full max-w-md">
      <CardHeader className="gap-3">
        <div className="flex size-11 items-center justify-center rounded-md border bg-secondary">
          <ShieldCheck aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1.5">
          <CardTitle>Secure Docs</CardTitle>
          <CardDescription>Sign in with an aiConnected account.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={emailInvalid || undefined}>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@aiconnected.ai"
                autoComplete="email"
                aria-invalid={emailInvalid}
                required
              />
              <FieldDescription>Only {secureEmailDomain} addresses can continue.</FieldDescription>
              {emailInvalid ? <FieldError>Email must end with {secureEmailDomain}.</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="first.last"
                autoComplete="username"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                minLength={8}
                required
              />
            </Field>
          </FieldGroup>

          {error ? (
            <Alert className="border-destructive/50">
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

          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : <LockKeyhole data-icon="inline-start" aria-hidden="true" />}
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
