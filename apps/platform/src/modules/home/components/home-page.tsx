import { useState, type FormEvent } from 'react'
import { Button } from '@ultrasakti/ui/components/button'
import { Input } from '@ultrasakti/ui/components/input'
import { Label } from '@ultrasakti/ui/components/label'
import { authClient } from '../../auth/api/auth-client'

export function HomePage() {
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email'))
    const password = String(values.get('password'))
    setPending(true)
    setError('')

    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({ name: String(values.get('name')), email, password })
          : await authClient.signIn.email({ email, password })
      if (result.error) setError(result.error.message ?? 'Authentication failed. Please try again.')
    } catch {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setPending(false)
    }
  }

  async function handleSignOut() {
    setPending(true)
    setError('')
    try {
      const result = await authClient.signOut()
      if (result.error) setError(result.error.message ?? 'Could not sign out. Please try again.')
    } catch {
      setError('Could not connect to the server. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f3ef] text-[#202b25]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-7 sm:px-10">
        <header className="flex items-center justify-between border-b border-[#d8ddd5] pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#173f32] text-xl font-semibold text-white">
              U
            </div>
            <span className="text-lg font-semibold tracking-tight">Ultra Sakti</span>
          </div>
          <span className="text-sm text-[#647168]">Platform</span>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1fr_420px] lg:gap-24">
          <div className="max-w-xl">
            <span className="mb-6 inline-flex rounded-full border border-[#bfd3c4] bg-[#e4f0e4] px-3 py-1 text-xs font-medium tracking-wide text-[#286747]">
              YOUR WORKSPACE
            </span>
            <h1 className="text-5xl font-semibold leading-[1.1] tracking-[-0.05em] sm:text-6xl">
              A better place to get things done.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-[#65736b]">
              Everything starts with a secure account. Sign in to continue, or create yours in a few
              moments.
            </p>
            <div className="mt-12 flex items-center gap-3 text-sm text-[#54715f]">
              <span className="grid size-8 place-items-center rounded-full bg-[#dcebdc] text-[#24613e]">
                ✓
              </span>
              Simple, secure access with your email
            </div>
          </div>

          <section
            className="rounded-3xl border border-[#e1e6df] bg-white p-8 shadow-[0_24px_80px_-40px_rgba(29,57,39,0.3)] sm:p-10"
            aria-label="Account"
          >
            {sessionPending ? (
              <p role="status" className="text-[#65736b]">
                Checking your session…
              </p>
            ) : session ? (
              <div className="space-y-6">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#e3f1e7] text-2xl text-[#266245]">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-medium text-[#4a8060]">SIGNED IN</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                    Welcome, {session.user.name}
                  </h2>
                  <p className="mt-2 text-[#65736b]">{session.user.email}</p>
                </div>
                {error && (
                  <p role="alert" className="text-sm text-red-700">
                    {error}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  disabled={pending}
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium text-[#4a8060]">WELCOME TO ULTRA SAKTI</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
                </h2>
                <p className="mt-2 text-sm text-[#718077]">
                  {mode === 'sign-in'
                    ? 'Enter your details to pick up where you left off.'
                    : 'A few details and you’re ready to get started.'}
                </p>
                <div
                  className="mt-8 grid grid-cols-2 rounded-xl bg-[#f2f5f1] p-1"
                  aria-label="Authentication mode"
                >
                  <button
                    type="button"
                    aria-pressed={mode === 'sign-in'}
                    onClick={() => {
                      setMode('sign-in')
                      setError('')
                    }}
                    className={`rounded-lg py-2 text-sm font-medium ${mode === 'sign-in' ? 'bg-white text-[#193d2d] shadow-sm' : 'text-[#718077]'}`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'sign-up'}
                    onClick={() => {
                      setMode('sign-up')
                      setError('')
                    }}
                    className={`rounded-lg py-2 text-sm font-medium ${mode === 'sign-up' ? 'bg-white text-[#193d2d] shadow-sm' : 'text-[#718077]'}`}
                  >
                    Sign up
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                  {mode === 'sign-up' && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        required
                        className="h-11"
                        placeholder="Your name"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="h-11"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      minLength={mode === 'sign-up' ? 8 : undefined}
                      required
                      className="h-11"
                      placeholder="Enter your password"
                    />
                    {mode === 'sign-up' && (
                      <p className="text-xs text-[#718077]">Use at least 8 characters.</p>
                    )}
                  </div>
                  {error && (
                    <p role="alert" className="text-sm text-red-700">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-11 w-full bg-[#1e563c] text-white hover:bg-[#174630]"
                  >
                    {pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
        <footer className="border-t border-[#d8ddd5] pt-5 text-xs text-[#849087]">
          © {new Date().getFullYear()} Ultra Sakti
        </footer>
      </div>
    </main>
  )
}
