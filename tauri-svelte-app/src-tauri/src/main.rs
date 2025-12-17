#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      use tauri::menu::{MenuBuilder, MenuItem, SubmenuBuilder};

      let handle = app.handle();

      let about = MenuItem::with_id(handle, "lush.about", "About", true, None::<&str>)?;

      let lush = SubmenuBuilder::new(handle, "lush").item(&about).build()?;
      let menu = MenuBuilder::new(handle).item(&lush).build()?;
      app.set_menu(menu)?;

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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
