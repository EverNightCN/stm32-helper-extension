## STM32 Helper (Windows) v0.0.4-win.1

### What is this

A Windows-focused build of STM32 Helper. On Windows (`win32`), build / flash / clean tasks run through **cmd.exe /d /c**, so:

- **`&&` chaining behaves like CMD** (PowerShell 5.x does not support `&&` in older versions).
- **OpenOCD** `-c "program ..."` quoting matches common **batch** examples.

### Install

Download **stm32-helper-extension-windows-0.0.4-win.1.vsix** from Assets. Use **Install from VSIX** in VS Code / Cursor:

```
code --install-extension stm32-helper-extension-windows-0.0.4-win.1.vsix --force
```

### Important

Do **not** enable both **STM32 Helper** and **STM32 Helper (Windows)** at once (same command IDs). Disable or uninstall the other extension.

### Source

See folder **stm32-helper-extension-windows/** on branch `main`.
