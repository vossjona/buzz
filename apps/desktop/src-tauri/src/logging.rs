// ABOUTME: Session error log module for Buzz.
// ABOUTME: Receives log entries from the JS layer and appends JSONL to a per-session file.

use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub source: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stack: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub context: Option<serde_json::Value>,
    pub session_id: String,
}

const MAX_SESSION_FILES: usize = 10;

pub struct LoggingState {
    pub active_file: Mutex<Option<PathBuf>>,
}

impl LoggingState {
    pub fn new() -> Self {
        Self {
            active_file: Mutex::new(None),
        }
    }
}

const SESSION_PREFIX: &str = "session-";
const SESSION_SUFFIX: &str = ".log";

/// Returns the names of session-*.log files that should be deleted to keep
/// the newest `keep` files. Input order does not matter; output preserves the
/// oldest-first order so callers can delete deterministically.
pub fn select_files_to_prune<S: AsRef<str>>(names: &[S], keep: usize) -> Vec<String> {
    let mut sessions: Vec<&str> = names
        .iter()
        .map(|s| s.as_ref())
        .filter(|n| n.starts_with(SESSION_PREFIX) && n.ends_with(SESSION_SUFFIX))
        .collect();
    sessions.sort();
    if sessions.len() <= keep {
        return Vec::new();
    }
    let cutoff = sessions.len() - keep;
    sessions[..cutoff].iter().map(|s| s.to_string()).collect()
}

#[tauri::command]
pub fn log_event(
    app: AppHandle,
    state: tauri::State<'_, LoggingState>,
    entry: LogEntry,
) -> Result<(), String> {
    let mut active = state
        .active_file
        .lock()
        .map_err(|e| format!("logging mutex poisoned: {e}"))?;

    let path = if let Some(existing) = active.as_ref() {
        existing.clone()
    } else {
        let logs_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("app_data_dir: {e}"))?
            .join("logs");
        fs::create_dir_all(&logs_dir)
            .map_err(|e| format!("create logs dir: {e}"))?;

        let new_path = logs_dir.join(format!(
            "{}{}{}",
            SESSION_PREFIX, entry.session_id, SESSION_SUFFIX
        ));
        *active = Some(new_path.clone());

        if let Ok(read_dir) = fs::read_dir(&logs_dir) {
            let names: Vec<String> = read_dir
                .filter_map(|e| e.ok())
                .filter_map(|e| e.file_name().into_string().ok())
                .collect();
            for name in select_files_to_prune(&names, MAX_SESSION_FILES) {
                let _ = fs::remove_file(logs_dir.join(name));
            }
        }

        new_path
    };

    let mut line =
        serde_json::to_string(&entry).map_err(|e| format!("serialize entry: {e}"))?;
    line.push('\n');

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| format!("open log file: {e}"))?;
    file.write_all(line.as_bytes())
        .map_err(|e| format!("write log line: {e}"))?;
    file.flush()
        .map_err(|e| format!("flush log file: {e}"))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn entry_serializes_required_fields_as_camel_case() {
        let entry = LogEntry {
            timestamp: "2026-04-18T14:03:22.451Z".into(),
            level: "error".into(),
            source: "spotify.player".into(),
            message: "Playback failed".into(),
            stack: None,
            context: None,
            session_id: "2026-04-18T14-03-22".into(),
        };

        let json = serde_json::to_string(&entry).unwrap();

        assert!(json.contains("\"sessionId\":\"2026-04-18T14-03-22\""));
        assert!(!json.contains("stack"));
        assert!(!json.contains("context"));
    }

    #[test]
    fn entry_includes_optional_fields_when_present() {
        let entry = LogEntry {
            timestamp: "2026-04-18T14:03:22.451Z".into(),
            level: "warn".into(),
            source: "spotify.api".into(),
            message: "Rate limited".into(),
            stack: Some("Error: …".into()),
            context: Some(serde_json::json!({"status": 429})),
            session_id: "2026-04-18T14-03-22".into(),
        };

        let json = serde_json::to_string(&entry).unwrap();

        assert!(json.contains("\"stack\":\"Error: …\""));
        assert!(json.contains("\"status\":429"));
    }

    #[test]
    fn prune_keeps_newest_n_files_by_name() {
        let names = vec![
            "session-2026-04-01T10-00-00.log",
            "session-2026-04-10T10-00-00.log",
            "session-2026-04-15T10-00-00.log",
            "session-2026-04-18T10-00-00.log",
            "session-2026-04-18T12-00-00.log",
            "other-file.txt",
        ];

        let to_delete = select_files_to_prune(&names, 3);

        assert_eq!(
            to_delete,
            vec![
                "session-2026-04-01T10-00-00.log".to_string(),
                "session-2026-04-10T10-00-00.log".to_string(),
            ]
        );
    }

    #[test]
    fn prune_returns_empty_when_below_limit() {
        let names = vec![
            "session-2026-04-18T10-00-00.log",
            "session-2026-04-18T12-00-00.log",
        ];
        let to_delete = select_files_to_prune(&names, 10);
        assert!(to_delete.is_empty());
    }
}
