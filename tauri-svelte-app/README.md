
• To run tauri-svelte-app as a native desktop app (Tauri v2), you run the Rust/Tauri
  runner, which will start your Svelte dev server per tauri-svelte-app/src-tauri/
  tauri.conf.json.

  Prereqs (one-time)

  - Install Rust toolchain: rustup (and on macOS: xcode-select --install)
  - Install the Tauri cargo subcommand: cargo install tauri-cli --locked --version "^2"

  Run (dev)

  - cd tauri-svelte-app/src-tauri
  - cargo tauri dev

  This will run bun run --cwd ../../svelte-app dev -- --host 127.0.0.1 --port 5173 and
  open the native window pointed at http://127.0.0.1:5173.

  Build a distributable app

  - cd tauri-svelte-app/src-tauri
  - cargo tauri build

  If 5173 is busy, change the port in tauri-svelte-app/src-tauri/tauri.conf.json
  (beforeDevCommand + devUrl).

