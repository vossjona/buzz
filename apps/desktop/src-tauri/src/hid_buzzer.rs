// ABOUTME: USB HID buzzer monitoring module for physical quiz buzzers.
// ABOUTME: Discovers, pairs, and reads input from HID buzzer devices via hidapi.

use hidapi::HidApi;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

/// Information about a connected HID device (for enumeration/debugging).
#[derive(Debug, Clone, Serialize)]
pub struct HidDeviceInfo {
    pub vendor_id: u16,
    pub product_id: u16,
    pub usage_page: u16,
    pub usage: u16,
    pub path: String,
    pub product_name: String,
    pub manufacturer: String,
}

/// Event payload emitted when a paired buzzer is pressed.
#[derive(Debug, Clone, Serialize)]
pub struct BuzzerPressEvent {
    pub device_path: String,
    pub buzzer_index: usize,
}

/// Event payload emitted when a new buzzer is auto-paired.
#[derive(Debug, Clone, Serialize)]
pub struct BuzzerPairedEvent {
    pub device_path: String,
    pub buzzer_index: usize,
}

/// Internal state tracking paired buzzers and monitoring status.
pub struct BuzzerPairingState {
    /// Map from device path to assigned team index (maps to TEAM_CONFIGS on frontend).
    pairings: HashMap<String, usize>,
    /// Team indices to assign in order as buzzers are paired.
    /// First buzzer → index 0 (Team Red), second → index 2 (Team Green), etc.
    pairing_order: Vec<usize>,
    /// How many buzzers have been paired so far.
    paired_count: usize,
    /// Whether the monitoring thread is currently running.
    is_monitoring: bool,
    /// Shutdown signal for the background thread.
    shutdown: Arc<AtomicBool>,
}

impl BuzzerPairingState {
    pub fn new() -> Self {
        Self {
            pairings: HashMap::new(),
            pairing_order: vec![0, 1, 2, 3],
            paired_count: 0,
            is_monitoring: false,
            shutdown: Arc::new(AtomicBool::new(false)),
        }
    }
}

/// Managed Tauri state wrapper.
pub struct BuzzerState(pub Mutex<BuzzerPairingState>);

/// Enumerate all connected HID devices (useful for discovery/debugging).
#[tauri::command]
pub fn list_hid_devices() -> Result<Vec<HidDeviceInfo>, String> {
    let api = HidApi::new().map_err(|e| format!("Failed to init HID API: {e}"))?;

    let devices: Vec<HidDeviceInfo> = api
        .device_list()
        .map(|d| HidDeviceInfo {
            vendor_id: d.vendor_id(),
            product_id: d.product_id(),
            usage_page: d.usage_page(),
            usage: d.usage(),
            path: d.path().to_string_lossy().to_string(),
            product_name: d.product_string().unwrap_or("").to_string(),
            manufacturer: d.manufacturer_string().unwrap_or("").to_string(),
        })
        .collect();

    Ok(devices)
}

/// Clear all buzzer pairings and reset index counter.
#[tauri::command]
pub fn clear_buzzer_pairings(
    state: tauri::State<'_, BuzzerState>,
) -> Result<(), String> {
    let mut pairing_state = state.0.lock().map_err(|e| format!("Lock error: {e}"))?;
    pairing_state.pairings.clear();
    pairing_state.paired_count = 0;
    Ok(())
}

/// Auto-start monitoring from the setup hook (no invoke needed).
/// Uses the known LinTx buzzer VID/PID.
pub fn auto_start_monitoring(app: AppHandle) {
    const BUZZER_VID: u16 = 0x8088;
    const BUZZER_PID: u16 = 0x0015;

    let state: tauri::State<'_, BuzzerState> = app.state();
    let mut pairing_state = match state.0.lock() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to lock buzzer state: {e}");
            return;
        }
    };

    if pairing_state.is_monitoring {
        return;
    }

    pairing_state.shutdown.store(false, Ordering::Relaxed);
    pairing_state.is_monitoring = true;
    let shutdown = pairing_state.shutdown.clone();
    drop(pairing_state);

    let app_handle = app.clone();
    std::thread::spawn(move || {
        println!("Buzzer monitoring started (VID:{BUZZER_VID:#06x} PID:{BUZZER_PID:#06x})");
        monitor_loop(app_handle, BUZZER_VID, BUZZER_PID, shutdown);
    });
}

/// Background thread: opens HID devices and polls for input reports.
fn monitor_loop(
    app: AppHandle,
    vendor_id: u16,
    product_id: u16,
    shutdown: Arc<AtomicBool>,
) {
    let mut last_enumerate = Instant::now();
    let mut open_devices: HashMap<String, hidapi::HidDevice> = HashMap::new();
    let mut read_buf = [0u8; 64];

    // Initial enumeration
    enumerate_and_open(vendor_id, product_id, &mut open_devices);

    while !shutdown.load(Ordering::Relaxed) {
        // Re-enumerate every 2 seconds to detect hot-plugged devices
        if last_enumerate.elapsed() >= Duration::from_secs(2) {
            enumerate_and_open(vendor_id, product_id, &mut open_devices);
            last_enumerate = Instant::now();
        }

        // Poll each open device
        let mut disconnected: Vec<String> = Vec::new();
        for (path, device) in open_devices.iter() {
            match device.read_timeout(&mut read_buf, 10) {
                Ok(len) if len > 0 => {
                    // Keyboard HID reports: [modifier, reserved, key1..key6]
                    // A key-release report has all key slots as 0x00.
                    // Only fire on press (at least one non-zero key byte).
                    let has_keypress = read_buf[2..len.min(8)].iter().any(|&b| b != 0);
                    if has_keypress {
                        handle_input(&app, path);
                    }
                }
                Ok(_) => {
                    // No data (timeout), normal
                }
                Err(_) => {
                    // Device disconnected or read error
                    disconnected.push(path.clone());
                }
            }
        }

        // Remove disconnected devices
        for path in disconnected {
            open_devices.remove(&path);
        }

        // Small sleep to avoid busy-looping when no data
        std::thread::sleep(Duration::from_millis(5));
    }

    // Cleanup: mark monitoring as stopped
    if let Some(state) = app.try_state::<BuzzerState>() {
        if let Ok(mut pairing_state) = state.0.lock() {
            pairing_state.is_monitoring = false;
        }
    }
}

/// Enumerate HID devices matching VID/PID and open any new ones.
fn enumerate_and_open(
    vendor_id: u16,
    product_id: u16,
    open_devices: &mut HashMap<String, hidapi::HidDevice>,
) {
    let api = match HidApi::new() {
        Ok(api) => api,
        Err(e) => {
            eprintln!("HID enumerate error: {e}");
            return;
        }
    };

    // Only open the keyboard HID interface (usage_page 0x01, usage 0x06).
    // Each physical buzzer exposes multiple interfaces; this avoids duplicates.
    for device_info in api.device_list() {
        if device_info.vendor_id() != vendor_id || device_info.product_id() != product_id {
            continue;
        }
        if device_info.usage_page() != 0x0001 || device_info.usage() != 0x0006 {
            continue;
        }

        let path = device_info.path().to_string_lossy().to_string();
        if open_devices.contains_key(&path) {
            continue;
        }

        match api.open_path(device_info.path()) {
            Ok(device) => {
                // Set non-blocking mode for polling
                let _ = device.set_blocking_mode(false);
                println!("Opened HID buzzer: {path}");
                open_devices.insert(path, device);
            }
            Err(e) => {
                eprintln!("Failed to open HID device {path}: {e}");
            }
        }
    }
}

/// Handle an input report from a buzzer device.
fn handle_input(app: &AppHandle, device_path: &str) {
    let state = match app.try_state::<BuzzerState>() {
        Some(s) => s,
        None => return,
    };

    let mut pairing_state = match state.0.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    let buzzer_index = if let Some(&index) = pairing_state.pairings.get(device_path) {
        index
    } else {
        // Auto-pair: assign next team index from pairing_order
        if pairing_state.paired_count >= pairing_state.pairing_order.len() {
            return;
        }
        let index = pairing_state.pairing_order[pairing_state.paired_count];
        pairing_state.paired_count += 1;
        pairing_state
            .pairings
            .insert(device_path.to_string(), index);

        let _ = app.emit(
            "buzzer:paired",
            BuzzerPairedEvent {
                device_path: device_path.to_string(),
                buzzer_index: index,
            },
        );
        println!("Paired buzzer {device_path} as index {index}");
        index
    };

    // Drop lock before emitting to avoid potential deadlocks
    drop(pairing_state);

    let _ = app.emit(
        "buzzer:press",
        BuzzerPressEvent {
            device_path: device_path.to_string(),
            buzzer_index,
        },
    );
}
