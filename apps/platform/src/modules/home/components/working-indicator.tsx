import { LoaderCircle } from 'lucide-react'

export function WorkingIndicator() {
  return (
    <p role="status" className="flex items-center gap-2 px-1 text-sm text-[#73726c]">
      <LoaderCircle size={16} className="animate-spin text-[#d97757]" aria-hidden />
      Working…
    </p>
  )
}
