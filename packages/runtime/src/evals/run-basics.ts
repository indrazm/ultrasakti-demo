import type { AgentResponse } from '@anvia/core'
import { agentEvalTarget, contains, runEvalSuite } from '@anvia/core/evals'
import { LensClient } from '@anvia/lens'
import { createAgent } from '../agents.ts'
import { basicCases } from './cases-basics.ts'

const requiredEnv = [
  'OPENAI_API_KEY',
  'OPENAI_MODEL_ID',
  'EXA_API_KEY',
  'ANVIA_LENS_BASE_URL',
  'ANVIA_LENS_PUBLIC_KEY',
  'ANVIA_LENS_SECRET_KEY',
] as const

const missing = requiredEnv.filter((name) => !process.env[name])
if (missing.length) throw new Error(`Missing eval configuration: ${missing.join(', ')}`)

const caseId = process.argv[2]
if (caseId && !basicCases.some((testCase) => testCase.id === caseId)) {
  throw new Error(`Unknown eval case: ${caseId}`)
}

const lens = new LensClient({ serviceName: 'runtime-evals', captureMode: 'safe' })

try {
  const agent = createAgent({
    maxTurns: 3,
    observability: {
      observers: { lens: lens.observer({ captureMode: 'safe' }) },
      primaryTrace: 'lens',
    },
  })

  const result = await runEvalSuite({
    name: 'runtime-basics',
    cases: basicCases,
    caseIds: caseId ? [caseId] : undefined,
    target: agentEvalTarget<string>({
      agent,
      request: ({ input }) => ({ prompt: input }),
    }),
    metrics: [
      contains<string, AgentResponse<string>, string>({
        actual: ({ output }) => output.output.toLowerCase(),
      }),
    ],
    reporters: [lens.evalReporter({ includePayloads: false, onMissingTrace: 'throw' })],
    reporterErrorPolicy: 'throw',
    concurrency: 1,
  })

  await lens.flush()
  for (const item of result.results) console.log(`${item.case.id}: ${item.outcome}`)
  console.log(
    `Cases: ${result.cases.passed} passed, ${result.cases.failed} failed, ${result.cases.invalid} invalid`,
  )
  if (result.cases.failed || result.cases.invalid) process.exitCode = 1
} finally {
  await lens.close()
}
