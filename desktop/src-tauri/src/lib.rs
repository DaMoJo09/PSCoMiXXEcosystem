use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                println!("[pscomixx-desktop] starting in dev mode");
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = check_for_updates(handle).await {
                    eprintln!("[pscomixx-desktop] update check failed: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PSCoMiXX desktop application");
}

async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let updater = app.updater()?;
    if let Some(update) = updater.check().await? {
        println!(
            "[pscomixx-desktop] update available: {} -> {}",
            update.current_version, update.version
        );

        let mut downloaded: usize = 0;
        update
            .download_and_install(
                |chunk_length, content_length| {
                    downloaded += chunk_length;
                    if let Some(total) = content_length {
                        println!(
                            "[pscomixx-desktop] downloading update: {}/{} bytes",
                            downloaded, total
                        );
                    }
                },
                || {
                    println!("[pscomixx-desktop] update download complete, installing...");
                },
            )
            .await?;

        println!("[pscomixx-desktop] update installed, restarting app");
        app.restart();
    } else {
        println!("[pscomixx-desktop] no updates available");
    }
    Ok(())
}
