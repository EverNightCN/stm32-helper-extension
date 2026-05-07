# STM32 Helper v0.0.4

This release ships **two VSIX packages** on the same page so you can pick the one that matches your environment. **Do not install both at once** (they share the same command IDs: `stm32Helper.*`).

## Standard build — `stm32-helper-extension-0.0.4.vsix`

For **macOS / Linux / Windows** when the editor’s task shell already supports your scripts (e.g. `bash`, **PowerShell 7+**, or a user environment where `&&` works as expected).

**Features in v0.0.4**

| Area | What it does |
|------|----------------|
| **Build / Flash / Clean / Build+Flash** | Runs your configured shell commands as VS Code tasks (`stm32Helper.boards`). |
| **Select Board / Auto Configure Project** | Writes workspace settings for OpenOCD + ELF paths from `CMakeLists.txt`, prefers `openocd.cfg`, falls back to ST-Link + `stm32f1x` / `stm32f4x` using `.ioc`. |
| **Startup auto-config** | Optional (`stm32Helper.autoConfigureOnStartup`, default `true`): fills board profiles when the folder opens if profiles are empty or still `auto-detected`. |
| **Sync CMake User Sources** | For CubeMX CMake layouts: scans globs (default `Core/**`), skips paths already listed in `cmake/stm32cubemx/CMakeLists.txt`, merges new files into root `CMakeLists.txt` after `# Add user sources here`. |
| **Packaging** | `.vscodeignore` excludes the Windows subfolder so this VSIX stays a single clean extension package. |

## Windows-focused build — `stm32-helper-extension-windows-0.0.4-win.1.vsix`

Same commands and settings as the standard build.

On **Windows** (`win32`), Build / Flash / Clean / Build+Flash run through **`cmd.exe /d /c`** so that:

- **`&&`** behaves like **CMD** (older **PowerShell 5.x** does not support `&&` in scripts the same way).
- **OpenOCD** `-c "program …"` quoting matches common **batch** examples.

Source folder in repo: **`stm32-helper-extension-windows/`**.

## Install

From **Assets**, download **one** `.vsix`, then in VS Code / Cursor: **Extensions → … → Install from VSIX…**

```bash
code --install-extension stm32-helper-extension-0.0.4.vsix --force
# or
code --install-extension stm32-helper-extension-windows-0.0.4-win.1.vsix --force
```

## Repository

https://github.com/EverNightCN/stm32-helper-extension
