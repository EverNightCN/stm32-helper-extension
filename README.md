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

---

# STM32 Helper（中文说明）

一个轻量级 VSCode 扩展，用于为基于 CMake/OpenOCD 的 STM32 工程提供一键命令。

## 用途

`STM32 Helper` 用于减少 STM32 项目中的重复配置工作，统一以下流程：

- 编译（Build）
- 烧录（Flash）
- 编译并烧录（Build + Flash）
- 清理（Clean）
- 板卡配置切换（Board Profile）
- 工程自动配置（Auto Configure）

适合在不同芯片/下载器之间切换，例如 STM32F4 + CMSIS-DAP、STM32F1 + ST-Link。

## 命令

打开命令面板（`Cmd/Ctrl + Shift + P`）并输入：

- `STM32 Helper: Build`
- `STM32 Helper: Flash`
- `STM32 Helper: Build + Flash`
- `STM32 Helper: Clean`
- `STM32 Helper: Select Board`
- `STM32 Helper: Auto Configure Project`

## 配置方式

扩展读取工作区 `.vscode/settings.json` 中的配置。

### 关键配置项

- `stm32Helper.activeBoard`：当前激活的板卡配置名
- `stm32Helper.boards`：板卡配置列表
- `stm32Helper.autoConfigureOnStartup`：工程打开时是否自动配置（默认 `true`）

### 配置示例

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

## 自动配置说明

执行 `STM32 Helper: Auto Configure Project` 后，扩展会自动扫描当前工程并生成可用配置：

- 读取 `CMakeLists.txt` 推断目标名与 ELF 路径
- 若存在工作区 `openocd.cfg`，优先使用
- 若不存在，则根据 `.ioc` 推断芯片族并回退到 `stlink + target cfg`
- 自动写入 `stm32Helper.boards` 与 `stm32Helper.activeBoard`

## 本地开发

1. 在 VSCode 中打开 `tools/stm32-helper-extension`
2. 按 `F5` 启动 Extension Development Host
3. 在新窗口中打开 STM32 工程
4. 在命令面板里执行上述命令

## 打包

```bash
npx @vscode/vsce package
```

会在扩展目录生成 `.vsix` 安装包。
