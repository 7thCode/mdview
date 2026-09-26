use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::menu::{Menu, MenuItemBuilder, PredefinedMenuItem, Submenu, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, State, Wry};

const MAX_RECENT: usize = 10;
const RECENT_PREFIX: &str = "recent:";

struct RecentFiles(Mutex<Vec<String>>);

fn recent_store_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join("recent.json"))
}

fn load_recent(app: &AppHandle) -> Vec<String> {
    recent_store_path(app)
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn save_recent(app: &AppHandle, files: &[String]) {
    let Some(path) = recent_store_path(app) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(text) = serde_json::to_string(files) {
        let _ = fs::write(path, text);
    }
}

fn item(
    app: &AppHandle,
    id: &str,
    label: &str,
    accelerator: Option<&str>,
) -> tauri::Result<tauri::menu::MenuItem<Wry>> {
    let mut builder = MenuItemBuilder::with_id(id, label);
    if let Some(accelerator) = accelerator {
        builder = builder.accelerator(accelerator);
    }
    builder.build(app)
}

fn build_recent_menu(app: &AppHandle, files: &[String]) -> tauri::Result<Submenu<Wry>> {
    let mut menu = SubmenuBuilder::new(app, "Open Recent");
    if files.is_empty() {
        let empty = MenuItemBuilder::with_id("recent-empty", "(なし)")
            .enabled(false)
            .build(app)?;
        menu = menu.item(&empty);
    } else {
        for path in files {
            let label = PathBuf::from(path)
                .file_name()
                .map(|name| name.to_string_lossy().into_owned())
                .unwrap_or_else(|| path.clone());
            let entry = item(app, &format!("{RECENT_PREFIX}{path}"), &label, None)?;
            menu = menu.item(&entry);
        }
        menu = menu
            .separator()
            .item(&item(app, "clear-recent", "履歴を消去", None)?);
    }
    menu.build()
}

fn build_menu(app: &AppHandle, recent: &[String]) -> tauri::Result<Menu<Wry>> {
    let file = SubmenuBuilder::new(app, "File")
        .item(&item(app, "new", "New", Some("CmdOrCtrl+N"))?)
        .item(&item(app, "open", "Open…", Some("CmdOrCtrl+O"))?)
        .item(&build_recent_menu(app, recent)?)
        .separator()
        .item(&item(app, "save", "Save", Some("CmdOrCtrl+S"))?)
        .item(&item(app, "save-as", "Save As…", Some("CmdOrCtrl+Shift+S"))?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit = SubmenuBuilder::new(app, "Edit")
        .item(&item(app, "undo", "Undo", Some("CmdOrCtrl+Z"))?)
        .item(&item(app, "redo", "Redo", Some("CmdOrCtrl+Shift+Z"))?)
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .separator()
        .item(&item(app, "find", "Find…", Some("CmdOrCtrl+F"))?)
        .item(&item(app, "replace", "Replace…", Some("CmdOrCtrl+Alt+F"))?)
        .build()?;

    let view = SubmenuBuilder::new(app, "View")
        .item(&item(app, "toggle-mode", "編集/参照 モード切り替え", Some("CmdOrCtrl+E"))?)
        .build()?;

    let menu = Menu::new(app)?;

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, "MDView")
            .about(None)
            .separator()
            .services()
            .separator()
            .hide()
            .hide_others()
            .show_all()
            .separator()
            .item(&item(app, "quit", "Quit MDView", Some("CmdOrCtrl+Q"))?)
            .build()?;
        menu.append(&app_menu)?;
    }

    menu.append(&file)?;
    menu.append(&edit)?;
    menu.append(&view)?;

    #[cfg(not(target_os = "macos"))]
    {
        // Windows/Linux には App メニューが無いため Quit は File 末尾に置く
        file.append(&PredefinedMenuItem::separator(app)?)?;
        file.append(&item(app, "quit", "Quit", Some("CmdOrCtrl+Q"))?)?;
    }

    Ok(menu)
}

fn refresh_menu(app: &AppHandle, recent: &[String]) -> tauri::Result<()> {
    app.set_menu(build_menu(app, recent)?)?;
    Ok(())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    String::from_utf8(bytes).map_err(|_| format!("{path}: UTF-8 として読み込めません"))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("{path}: {e}"))
}

#[tauri::command]
fn add_recent(app: AppHandle, state: State<RecentFiles>, path: String) -> Result<(), String> {
    let snapshot = {
        let mut files = state.0.lock().map_err(|e| e.to_string())?;
        files.retain(|existing| existing != &path);
        files.insert(0, path);
        files.truncate(MAX_RECENT);
        files.clone()
    };
    save_recent(&app, &snapshot);
    refresh_menu(&app, &snapshot).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(RecentFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![read_file, write_file, add_recent])
        .setup(|app| {
            let handle = app.handle();
            let recent = load_recent(handle);
            *app.state::<RecentFiles>().0.lock().unwrap() = recent.clone();
            refresh_menu(handle, &recent)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == "clear-recent" {
                let state = app.state::<RecentFiles>();
                state.0.lock().unwrap().clear();
                save_recent(app, &[]);
                let _ = refresh_menu(app, &[]);
            } else {
                let _ = app.emit("menu", id);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
