#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                println!("[pscomixx-desktop] starting in dev mode");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PSCoMiXX desktop application");
}
