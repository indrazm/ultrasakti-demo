import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../modules/home/components/home-page'

export const Route = createFileRoute('/')({
  component: HomePage,
})
