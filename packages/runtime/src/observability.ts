import { LensClient } from '@anvia/lens'

let lens: LensClient | undefined

export function getLensClient() {
  lens ??= new LensClient({
    serviceName: 'runtime',
    optional: true,
    captureMode: 'safe',
    redactInputs: true,
    redactOutputs: true,
  })
  return lens
}

export async function closeRuntimeObservability() {
  await lens?.close()
}
