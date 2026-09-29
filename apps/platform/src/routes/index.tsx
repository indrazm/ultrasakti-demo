import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@ultrasakti/ui/components/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
      <section className="max-w-lg space-y-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Platform is ready</h1>
        <p className="text-muted-foreground">
          React, Vite, Tailwind CSS, TanStack Router, and TanStack Query are connected.
        </p>
        <Button>Get started</Button>
      </section>
    </main>
  )
}
