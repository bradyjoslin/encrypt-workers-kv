import { KVNamespace } from '@cloudflare/workers-types'

declare global {
  const ENCRYPTED: KVNamespace
  const PASSWORD: string
}
