// ABOUTME: Tauri library entry point for the desktop app.
// ABOUTME: Defines the app configuration, plugins, and HID buzzer integration.

mod hid_buzzer;
mod logging;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(hid_buzzer::BuzzerState(Mutex::new(
            hid_buzzer::BuzzerPairingState::new(),
        )))
        .manage(logging::LoggingState::new())
        .invoke_handler(tauri::generate_handler![
            hid_buzzer::list_hid_devices,
            hid_buzzer::clear_buzzer_pairings,
            logging::log_event,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Auto-start buzzer monitoring for known LinTx buzzers
            hid_buzzer::auto_start_monitoring(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == "main" {
                    window.app_handle().exit(0);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
