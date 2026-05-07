# STM32 Helper (Windows)

Windows-focused build of **STM32 Helper**. Behavior matches the main extension, except task execution:

- On **Windows** (`win32`), Build / Flash / Clean / Build+Flash run through **`cmd.exe /d /c`** so:
  - **`&&` chaining** behaves like **CMD** (PowerShell 5.x does not support `&&`).
  - **OpenOCD** `-c "program ..."` quoting follows **CMD** rules used in typical batch scripts.

On non-Windows platforms this package falls back to the normal shell line (useful only for development).

## Install

Use **Install from VSIX** in VS Code / Cursor, or:

```bat
code --install-extension stm32-helper-extension-windows-0.0.4-win.1.vsix --force
```

## Important

Do **not** enable the standard **STM32 Helper** and **STM32 Helper (Windows)** extensions at the same time (same command IDs). Keep only one enabled.

## Packaging

```bash
cd stm32-helper-extension-windows
npx @vscode/vsce package
```

---

## 中文说明（Windows 专用版）

本扩展与主版本功能一致；在 **Windows** 上执行任务时统一走 **`cmd.exe /d /c`**，避免默认自动化终端为 **PowerShell 5.x** 时 **`&&` 不可用** 的问题，并与常见 **CMD/OpenOCD** 教程中的引号写法一致。

请勿同时启用普通版与 Windows 专用版（命令 ID 相同）。
