import process from 'process'
import { Buffer } from 'buffer'

;(globalThis as any).process ??= process
;(globalThis as any).Buffer ??= Buffer

