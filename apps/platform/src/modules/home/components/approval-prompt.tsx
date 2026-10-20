import { Button } from '@ultrasakti/ui/components/button'

type ApprovalRequest = {
  id: string
  type: string
  toolName?: string
  input?: unknown
  reason?: string
}

type ApprovalPromptProps = {
  request: ApprovalRequest
  onRespond: (approved: boolean) => void
}

export function ApprovalPrompt({ request, onRespond }: ApprovalPromptProps) {
  return (
    <div
      role="group"
      aria-label="Approval required"
      className="mt-2 rounded-2xl border border-[#c96442]/40 bg-white p-4"
    >
      <p className="text-sm font-medium text-[#141413]">Approval required</p>
      <p className="mt-1 text-sm text-[#73726c]">
        {request.reason ?? 'The assistant wants to run a tool that changes data.'}
      </p>
      <p className="mt-2 text-sm text-[#141413]">
        Tool: <code>{request.toolName}</code>
      </p>
      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[#f0eee6] p-3 text-xs text-[#3d3d3a]">
        {JSON.stringify(request.input, null, 2)}
      </pre>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          className="bg-[#c96442] text-white hover:bg-[#b5573a]"
          onClick={() => onRespond(true)}
        >
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => onRespond(false)}>
          Deny
        </Button>
      </div>
    </div>
  )
}
