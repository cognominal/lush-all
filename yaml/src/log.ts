export type LogLevelId = 'silent' | 'error' | 'warn' | 'debug'

export function debug(logLevel: LogLevelId, ...messages: any[]) {
  if (logLevel === 'debug') console.log(...messages)
}

export function warn(logLevel: LogLevelId, warning: string | Error) {
  if (logLevel === 'debug' || logLevel === 'warn') {
    const emitWarning = (globalThis as any)?.process?.emitWarning
    if (typeof emitWarning === 'function') emitWarning(warning)
    else console.warn(warning)
  }
}
