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

### v0.0.4 release highlights

GitHub [Releases](https://github.com/EverNightCN/stm32-helper-extension/releases) attach **two VSIX files** for this line — pick **one** (same `stm32Helper.*` command IDs; do not enable both).

| Package | When to use |
|--------|-------------|
| **`stm32-helper-extension-0.0.4.vsix`** | Default build: **macOS / Linux / Windows** when your environment already runs the configured commands as expected. |
| **`stm32-helper-extension-windows-0.0.4-win.1.vsix`** | **Windows** when the editor’s automation shell is **PowerShell 5.x** (or you want **CMD**-style `&&` and OpenOCD quoting). Tasks are run via **`cmd.exe /d /c`**. |

**Standard package (0.0.4)** includes: one-click **Build / Flash / Build+Flash / Clean**; **board profiles** and **Select Board**; **Auto Configure Project** (OpenOCD + ELF from CMake, optional `.ioc`); optional **startup auto-config** (`stm32Helper.autoConfigureOnStartup`); **Sync CMake User Sources** for CubeMX CMake (merge user sources into root `CMakeLists.txt`, skip Cube-owned paths in `cmake/stm32cubemx/CMakeLists.txt`); **`.vscodeignore`** so the Windows subfolder is not bundled into this VSIX.

**Windows package** — same features; only the **task runner** differs on `win32` (see table above). Sources live under `stm32-helper-extension-windows/` in this repo.

### Windows variant

If you use **Cursor / VS Code on Windows** and the integrated terminal defaults to **PowerShell 5.x**, automation tasks may fail because **`&&` is not supported** there. Install **STM32 Helper (Windows)** instead (folder `stm32-helper-extension-windows/` in this repo): it runs commands through **`cmd.exe /d /c`**, matching **CMD** semantics for `&&` and OpenOCD quoting.

Only enable **one** of the two extensions at a time (same command IDs).

## Commands

Open Command Palette (`Cmd/Ctrl + Shift + P`) and run:

- `STM32 Helper: Build`
- `STM32 Helper: Flash`
- `STM32 Helper: Build + Flash`
- `STM32 Helper: Clean`
- `STM32 Helper: Select Board`
- `STM32 Helper: Auto Configure Project`
- `STM32 Helper: Sync CMake User Sources`

## Sync CMake user sources (STM32CubeMX CMake)

For STM32CubeMX CMake projects, Cube-generated sources live under `cmake/stm32cubemx/CMakeLists.txt`, while **extra user sources** should be listed in the root `CMakeLists.txt` inside:

```cmake
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    # Add user sources here
)
```

Run **`STM32 Helper: Sync CMake User Sources`** to:

- Scan workspace files matching `stm32Helper.cmakeSync.scanGlobs` (defaults to `Core/**/*.{c,cpp,...}`)
- Parse `${CMAKE_CURRENT_SOURCE_DIR}/../../...` entries from `cmake/stm32cubemx/CMakeLists.txt` and **skip** those paths (Cube-owned)
- Merge remaining sources into the root `CMakeLists.txt` block after `# Add user sources here`
- Preserve any paths you already listed manually in that block

Optional settings:

- `stm32Helper.cmakeSync.rootCMakeLists`
- `stm32Helper.cmakeSync.cubeMxCMakeLists`
- `stm32Helper.cmakeSync.markerLine`
- `stm32Helper.cmakeSync.scanGlobs`
- `stm32Helper.cmakeSync.excludeGlobs`

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

### v0.0.4 版本要点

GitHub [Releases](https://github.com/EverNightCN/stm32-helper-extension/releases) 在同一页面提供 **两个 VSIX**，任选其一安装（命令 ID 均为 `stm32Helper.*`，**勿同时启用两个扩展**）。

| 安装包 | 适用场景 |
|--------|----------|
| **`stm32-helper-extension-0.0.4.vsix`** | 通用默认包：**macOS / Linux / Windows**，当你的环境已能正确执行配置的命令（如 `bash`、**PowerShell 7+** 等）。 |
| **`stm32-helper-extension-windows-0.0.4-win.1.vsix`** | **Windows** 专用：默认自动化终端为 **PowerShell 5.x**，或你希望 **`&&` / OpenOCD 引号**与 **CMD** 一致时；任务通过 **`cmd.exe /d /c`** 执行。 |

**通用版（0.0.4）** 包含：一键 **编译 / 烧录 / 编译并烧录 / 清理**；**板卡配置**与 **Select Board**；**Auto Configure Project**（根据 CMake 推断 ELF、优先 `openocd.cfg`、可用 `.ioc` 推断目标）；可选 **打开工程自动配置**（`stm32Helper.autoConfigureOnStartup`）；**Sync CMake User Sources**（CubeMX CMake：把用户源合并进根目录 `CMakeLists.txt`，跳过 `cmake/stm32cubemx` 中已由 Cube 列出的路径）；**`.vscodeignore`** 避免把 Windows 子目录打进本 VSIX。

**Windows 版** — 功能与通用版相同，仅在 Windows 上 **任务执行方式** 不同（见上表）。源码目录：`stm32-helper-extension-windows/`。

### Windows 专用版

在 **Windows** 上若默认自动化终端为 **PowerShell 5.x**，任务里的 **`&&`** 可能报错。请安装仓库内 **`stm32-helper-extension-windows`** 打包的 VSIX：通过 **`cmd.exe /d /c`** 执行命令，与 **CMD** 的 `&&` 及 OpenOCD 引号习惯一致。

请勿同时启用普通版与 Windows 专用版（命令 ID 相同）。

## 命令

打开命令面板（`Cmd/Ctrl + Shift + P`）并输入：

- `STM32 Helper: Build`
- `STM32 Helper: Flash`
- `STM32 Helper: Build + Flash`
- `STM32 Helper: Clean`
- `STM32 Helper: Select Board`
- `STM32 Helper: Auto Configure Project`
- `STM32 Helper: Sync CMake User Sources`

## 同步 CMake 用户源文件（CubeMX CMake）

STM32CubeMX 生成的源文件列表在 `cmake/stm32cubemx/CMakeLists.txt`；**你自己新增的源文件**应写在工程根目录 `CMakeLists.txt` 的：

```cmake
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    # Add user sources here
)
```

执行 **`STM32 Helper: Sync CMake User Sources`** 会：

- 按 `stm32Helper.cmakeSync.scanGlobs`（默认扫描 `Core/` 下源码）查找文件
- 解析 `cmake/stm32cubemx/CMakeLists.txt` 里 `${CMAKE_CURRENT_SOURCE_DIR}/../../...` 列出的路径并**跳过**（视为 Cube 已收录）
- 将其余文件路径合并进根目录 `CMakeLists.txt` 中 `# Add user sources here` 之后
- 保留你在该区域内已手写添加的路径

可选配置项：

- `stm32Helper.cmakeSync.rootCMakeLists`
- `stm32Helper.cmakeSync.cubeMxCMakeLists`
- `stm32Helper.cmakeSync.markerLine`
- `stm32Helper.cmakeSync.scanGlobs`
- `stm32Helper.cmakeSync.excludeGlobs`

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
