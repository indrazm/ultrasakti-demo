import { useCallback } from 'react'
import { createFileRoute, Outlet, useNavigate, useParams } from '@tanstack/react-router'
import { HomePage } from '../modules/home/components/home-page'

export const Route = createFileRoute('/_chat')({ component: ChatLayout })

function ChatLayout() {
  const { id } = useParams({ strict: false })
  const navigate = useNavigate()
  const navigateToSession = useCallback(
    (sessionId: string | null) =>
      sessionId ? navigate({ to: '/s/$id', params: { id: sessionId } }) : navigate({ to: '/' }),
    [navigate],
  )

  return (
    <>
      <HomePage activeSessionId={id ?? null} navigateToSession={navigateToSession} />
      <Outlet />
    </>
  )
}
