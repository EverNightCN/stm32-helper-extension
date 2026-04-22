# STM32 Helper (VSCode Extension)

A lightweight VSCode extension that provides one-click STM32 workflow commands for CMake/OpenOCD based projects.

## Purpose

`STM32 Helper` is designed to reduce repetitive setup work across STM32 projects by standardizing:

- Build
- Flash
- Build + Flash
- Clean
- Board profile switching
- Project auto-configuration

It is especially useful when switching between different boards and programmers (for example, STM32F4 + CMSIS-DAP and STM32F1 + ST-Link).

## Commands

Open Command Palette (`Cmd/Ctrl + Shift + P`) and run:

- `STM32 Helper: Build`
- `STM32 Helper: Flash`
- `STM32 Helper: Build + Flash`
- `STM32 Helper: Clean`
- `STM32 Helper: Select Board`
- `STM32 Helper: Auto Configure Project`

## Configuration

The extension reads workspace-level settings from `.vscode/settings.json`.

### Main settings

- `stm32Helper.activeBoard`: active board profile name
- `stm32Helper.boards`: board profile list
- `stm32Helper.autoConfigureOnStartup`: auto configure on workspace startup (`true` by default)

### Example

```json
{
  "stm32Helper.autoConfigureOnStartup": true,
  "stm32Helper.activeBoard": "f407-cmsis-dap",
  "stm32Helper.boards": [
    {
      "name": "f407-cmsis-dap",
      "cwd": "${workspaceFolder}",
      "buildCommand": "cmake --preset Debug && cmake --build --preset Debug",
      "flashCommand": "openocd -f openocd.cfg -c \"program build/Debug/LED.elf verify reset exit\"",
      "cleanCommand": "cmake --build --preset Debug --target clean"
    },
    {
      "name": "f103-stlink",
      "cwd": "${workspaceFolder}",
      "buildCommand": "cmake --preset Debug && cmake --build --preset Debug",
      "flashCommand": "openocd -f interface/stlink.cfg -f target/stm32f1x.cfg -c \"program build/Debug/firmware.elf verify reset exit\"",
      "cleanCommand": "cmake --build --preset Debug --target clean"
    }
  ]
}
```

## Auto Configure

`STM32 Helper: Auto Configure Project` scans the current workspace and writes ready-to-use board profiles.

Detection logic:

- Reads `CMakeLists.txt` to infer target/ELF name
- Uses workspace `openocd.cfg` when available
- Falls back to ST-Link + inferred target (`stm32f1x` / `stm32f4x`) from `.ioc`
- Updates `stm32Helper.boards` and `stm32Helper.activeBoard`

## Local development

1. Open `tools/stm32-helper-extension` in VSCode
2. Press `F5` to launch Extension Development Host
3. Open an STM32 project in the new window
4. Run commands from Command Palette

## Packaging

```bash
npx @vscode/vsce package
```

This generates a `.vsix` file in the extension root directory.
