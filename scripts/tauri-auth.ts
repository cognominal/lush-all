import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

type Cmd = 'build'

function usage(): string {
  return [
    'Usage:',
    '  bun scripts/tauri-auth.ts build',
    '',
    'Builds a Tauri bundle that can run AuthKit in production by:',
    '- building svelte-app with TAURI_SERVER=1 (adapter-node)',
    "- copying the SvelteKit server output into src-tauri/gen/appserver (plus a package.json for ESM)",
    '- then running `cargo tauri build --bundles app`.',
    ''
  ].join('\n')
}

function tauriProjectDir(): string {
  return path.resolve(import.meta.dir, '..', 'tauri-svelte-app')
}

function repoRoot(): string {
  return path.resolve(import.meta.dir, '..')
}

function svelteAppDir(): string {
  return path.resolve(repoRoot(), 'svelte-app')
}

function mustExist(p: string): void {
  if (!fs.existsSync(p)) throw new Error(`Missing: ${p}`)
}

function run(cmd: string, args: string[], cwd: string, env?: Record<string, string>): void {
  const res = spawnSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env }
  })
  if (res.status !== 0) process.exit(res.status ?? 1)
}

function rimraf(p: string): void {
  fs.rmSync(p, { recursive: true, force: true })
}

function copyDir(src: string, dest: string): void {
  rimraf(dest)
  fs.mkdirSync(dest, { recursive: true })
  fs.cpSync(src, dest, { recursive: true })
}

function ensureEsmPackageJson(destDir: string): void {
  const pkgPath = path.join(destDir, 'package.json')
  fs.writeFileSync(pkgPath, JSON.stringify({ type: 'module' }, null, 2) + '\n', 'utf8')
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2)
  if (command !== 'build' || rest.length > 0) {
    throw new Error(`Missing/invalid args.\n\n${usage()}`)
  }

  const svelteDir = svelteAppDir()
  const tauriDir = tauriProjectDir()

  const workosKeys = path.join(repoRoot(), 'workos-keys.txt')
  mustExist(workosKeys)

  // Build SvelteKit in "Tauri server" mode (adapter-node) so AuthKit endpoints exist.
  run('bun', ['run', '--cwd', svelteDir, 'build'], repoRoot(), { TAURI: '1', TAURI_SERVER: '1' })

  const buildOut = path.join(svelteDir, 'build')
  mustExist(path.join(buildOut, 'index.js'))
  mustExist(path.join(buildOut, 'handler.js'))
  mustExist(path.join(buildOut, 'client'))

  const dest = path.join(tauriDir, 'src-tauri', 'gen', 'appserver')
  copyDir(buildOut, dest)
  ensureEsmPackageJson(dest)

  // Bundle secrets for the local appserver (developer builds only).
  fs.copyFileSync(workosKeys, path.join(dest, 'workos-keys.txt'))

  // Build the native app bundle (no dmg to avoid hdiutil failures).
  run('cargo', ['tauri', 'build', '--bundles', 'app'], tauriDir, { TAURI_SERVER: '1' })
}

try {
  main()
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err)
  // eslint-disable-next-line no-console
  console.error(msg)
  process.exit(1)
}
