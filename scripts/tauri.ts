import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

type Command = 'dev' | 'build'

type ParsedArgs =
  | { command: 'dev' }
  | { command: 'build'; target?: string }
  | { command: 'help' }

function usage(): string {
  return [
    'Usage:',
    '  bun scripts/tauri.ts dev',
    '  bun scripts/tauri.ts build [--target <triple>]',
    '',
    'Guards:',
    '  By default, build refuses to run if --target does not match this machine’s OS/arch.',
    '  Override by setting LUSH_ALLOW_CROSS=1.',
    ''
  ].join('\n')
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.includes('--help') || argv.includes('-h')) return { command: 'help' }

  const [command, ...rest] = argv
  if (command !== 'dev' && command !== 'build') {
    throw new Error(`Missing/invalid command.\n\n${usage()}`)
  }

  if (command === 'dev') {
    if (rest.length > 0) throw new Error(`Unexpected args for dev.\n\n${usage()}`)
    return { command: 'dev' }
  }

  let target: string | undefined
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (arg === '--target') {
      const value = rest[i + 1]
      if (!value) throw new Error(`Missing value for --target.\n\n${usage()}`)
      target = value
      i += 1
      continue
    }
    throw new Error(`Unknown arg: ${arg}\n\n${usage()}`)
  }

  return { command: 'build', target }
}

function expectedTargetForCurrentMachine(): string | null {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'darwin') {
    if (arch === 'arm64') return 'aarch64-apple-darwin'
    if (arch === 'x64') return 'x86_64-apple-darwin'
    return null
  }

  if (platform === 'win32') {
    if (arch === 'x64') return 'x86_64-pc-windows-msvc'
    if (arch === 'arm64') return 'aarch64-pc-windows-msvc'
    return null
  }

  if (platform === 'linux') {
    if (arch === 'x64') return 'x86_64-unknown-linux-gnu'
    if (arch === 'arm64') return 'aarch64-unknown-linux-gnu'
    return null
  }

  return null
}

function tauriProjectDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '..', 'tauri-svelte-app')
}

function main(): never {
  const parsed = parseArgs(process.argv.slice(2))
  if (parsed.command === 'help') {
    // eslint-disable-next-line no-console
    console.log(usage())
    process.exit(0)
  }

  const tauriDir = tauriProjectDir()
  const manifestPath = 'src-tauri/Cargo.toml'

  const baseArgs = ['tauri', parsed.command, '--manifest-path', manifestPath]
  const expectedTarget = expectedTargetForCurrentMachine()

  if (parsed.command === 'build') {
    if (!expectedTarget) {
      throw new Error(
        `Unsupported platform/arch for guarded build: ${process.platform}/${process.arch}`
      )
    }

    const allowCross = process.env.LUSH_ALLOW_CROSS === '1'
    const target = parsed.target ?? expectedTarget
    if (!allowCross && target !== expectedTarget) {
      throw new Error(
        [
          `Refusing to build for ${target} on ${process.platform}/${process.arch}.`,
          `Expected target: ${expectedTarget}`,
          'Set LUSH_ALLOW_CROSS=1 to override.'
        ].join('\n')
      )
    }
    baseArgs.push('--target', target)
  }

  const res = spawnSync('cargo', baseArgs, {
    cwd: tauriDir,
    stdio: 'inherit',
    env: process.env
  })

  const code = res.status ?? 1
  process.exit(code)
}

try {
  main()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  // eslint-disable-next-line no-console
  console.error(msg)
  process.exit(1)
}
