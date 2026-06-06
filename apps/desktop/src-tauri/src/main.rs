// ABOUTME: Main entry point for the Tauri desktop application.
// ABOUTME: Prevents console window on Windows in release builds.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    buzz_desktop_lib::run()
}
