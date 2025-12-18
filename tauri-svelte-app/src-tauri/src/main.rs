#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
  process::{Child, Command},
  sync::Mutex,
  thread,
  time::Duration,
};

use tauri::{Emitter, Manager, Url};

struct AppServerState(Mutex<Option<Child>>);

fn start_local_app_server(app: &tauri::AppHandle) -> Result<(), String> {
  const HOST: &str = "127.0.0.1";
  const PORT: u16 = 3210;

  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|_| "Could not resolve resource_dir".to_string())?;
  let server_dir = resource_dir.join("appserver");
  let entrypoint = server_dir.join("index.js");

  if !entrypoint.exists() {
    return Err(format!(
      "Missing appserver entrypoint at {} (did you run `bun run build:tauri:auth`?)",
      entrypoint.display()
    ));
  }

  // Node needs `type: module` to treat `index.js` as ESM.
  let pkg = server_dir.join("package.json");
  if !pkg.exists() {
    return Err(format!(
      "Missing {} (expected to mark appserver as ESM).",
      pkg.display()
    ));
  }

  let child = Command::new("node")
    .current_dir(&server_dir)
    .env("HOST", HOST)
    .env("PORT", PORT.to_string())
    // Ensure the callback URL matches the local server.
    .env(
      "WORKOS_REDIRECT_URI",
      format!("http://{HOST}:{PORT}/auth/callback"),
    )
    .arg(&entrypoint)
    .spawn()
    .map_err(|e| format!("Failed to start app server via `node`: {e}"))?;

  // Wait briefly for the port to open.
  for _ in 0..80 {
    if std::net::TcpStream::connect((HOST, PORT)).is_ok() {
      break;
    }
    thread::sleep(Duration::from_millis(50));
  }

  let url = Url::parse(&format!("http://{HOST}:{PORT}/"))
    .map_err(|e| format!("Invalid local server URL: {e}"))?;

  if let Some(window) = app.get_webview_window("main") {
    let _ = window.navigate(url);
  } else {
    return Err("Missing main webview window".to_string());
  }

  app
    .state::<AppServerState>()
    .0
    .lock()
    .map_err(|_| "Failed to lock AppServerState".to_string())?
    .replace(child);

  Ok(())
}

fn main() {
  let app = tauri::Builder::default()
    .manage(AppServerState(Mutex::new(None)))
    .setup(|app| {
      use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};

      let handle = app.handle();

      let about = MenuItem::with_id(handle, "lush.about", "About", true, None::<&str>)?;

      let lush = SubmenuBuilder::new(handle, "lush").item(&about).build()?;
      let menu = MenuBuilder::new(handle).item(&lush).build()?;
      app.set_menu(menu)?;

      // In production bundles we need a local server so AuthKit endpoints exist.
      if !cfg!(debug_assertions) {
        if let Err(err) = start_local_app_server(&app.handle()) {
          eprintln!("{err}");
        }
      }

      Ok(())
    })
    .on_menu_event(|app, event| {
      if event.id() == "lush.about" {
        let message = "Lush app (early stage)";

        if let Some(window) = app.get_webview_window("main") {
          let _ = window.emit("lush:about", message);

          if let Ok(message) = serde_json::to_string(message) {
            let _ = window.eval(&format!(
              "window.dispatchEvent(new CustomEvent('lush:about', {{ detail: {} }}));",
              message
            ));
          }
        } else {
          let _ = app.emit("lush:about", message);
        }
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application");

  app.run(|app_handle, event| {
    if let tauri::RunEvent::ExitRequested { .. } = event {
      if let Some(mut child) = app_handle
        .state::<AppServerState>()
        .0
        .lock()
        .ok()
        .and_then(|mut g| g.take())
      {
        let _ = child.kill();
      }
    }
  });
}
