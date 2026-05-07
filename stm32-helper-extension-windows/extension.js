const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

function getBoardsConfig() {
  const config = vscode.workspace.getConfiguration("stm32Helper");
  const boards = config.get("boards", []);
  const activeBoard = config.get("activeBoard", "");
  return { boards, activeBoard, config };
}

function getWorkspaceFolder() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function readTextIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf8");
    }
  } catch (error) {
    // Ignore and fall back to defaults.
  }
  return "";
}

function detectProjectName(workspaceFolder) {
  const cmakeListsPath = path.join(workspaceFolder, "CMakeLists.txt");
  const cmakeLists = readTextIfExists(cmakeListsPath);
  if (!cmakeLists) {
    return "firmware";
  }

  const explicitName = cmakeLists.match(/set\s*\(\s*CMAKE_PROJECT_NAME\s+([A-Za-z0-9_\-]+)\s*\)/i);
  if (explicitName && explicitName[1]) {
    return explicitName[1];
  }

  const projectName = cmakeLists.match(/project\s*\(\s*([A-Za-z0-9_\-]+)\s*\)/i);
  if (projectName && projectName[1]) {
    return projectName[1];
  }

  return "firmware";
}

function detectIocMcu(workspaceFolder) {
  const entries = fs.readdirSync(workspaceFolder);
  const iocFile = entries.find((name) => name.toLowerCase().endsWith(".ioc"));
  if (!iocFile) {
    return "";
  }
  const content = readTextIfExists(path.join(workspaceFolder, iocFile));
  if (!content) {
    return "";
  }

  const mcuLine = content.match(/Mcu\.Name=(.+)/);
  if (mcuLine && mcuLine[1]) {
    return mcuLine[1].trim();
  }
  return "";
}

function inferTargetCfg(mcuName) {
  const upper = String(mcuName || "").toUpperCase();
  if (upper.includes("STM32F1")) {
    return "target/stm32f1x.cfg";
  }
  if (upper.includes("STM32F4")) {
    return "target/stm32f4x.cfg";
  }
  return "target/stm32f4x.cfg";
}

function substituteWorkspaceFolder(value) {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder || typeof value !== "string") {
    return value;
  }
  return value.replaceAll("${workspaceFolder}", folder.uri.fsPath);
}

function findActiveBoard() {
  const { boards, activeBoard } = getBoardsConfig();
  if (!Array.isArray(boards) || boards.length === 0) {
    return null;
  }
  return boards.find((b) => b.name === activeBoard) || boards[0];
}

async function autoConfigureProject() {
  return autoConfigureProjectInternal({ silent: false });
}

async function autoConfigureProjectInternal(options = {}) {
  const { silent = false } = options;
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    if (!silent) {
      vscode.window.showErrorMessage("STM32 Helper: open a workspace first.");
    }
    return;
  }

  const { config } = getBoardsConfig();
  const projectName = detectProjectName(workspaceFolder);
  const mcuName = detectIocMcu(workspaceFolder);
  const elfPath = `build/Debug/${projectName}.elf`;
  const localOpenOcdCfg = path.join(workspaceFolder, "openocd.cfg");

  const autoBoard = {
    name: "auto-detected",
    cwd: "${workspaceFolder}",
    buildCommand: "cmake --preset Debug && cmake --build --preset Debug",
    cleanCommand: "cmake --build --preset Debug --target clean",
    flashCommand: fs.existsSync(localOpenOcdCfg)
      ? `openocd -f openocd.cfg -c "program ${elfPath} verify reset exit"`
      : `openocd -f interface/stlink.cfg -f ${inferTargetCfg(mcuName)} -c "program ${elfPath} verify reset exit"`
  };

  const f103Board = {
    name: "f103-stlink",
    cwd: "${workspaceFolder}",
    buildCommand: "cmake --preset Debug && cmake --build --preset Debug",
    cleanCommand: "cmake --build --preset Debug --target clean",
    flashCommand: `openocd -f interface/stlink.cfg -f target/stm32f1x.cfg -c "program ${elfPath} verify reset exit"`
  };

  await config.update(
    "boards",
    [autoBoard, f103Board],
    vscode.ConfigurationTarget.Workspace
  );
  await config.update(
    "activeBoard",
    "auto-detected",
    vscode.ConfigurationTarget.Workspace
  );

  if (!silent) {
    vscode.window.showInformationMessage(
      `STM32 Helper: Auto configured. Active board=auto-detected, ELF=${elfPath}${mcuName ? `, MCU=${mcuName}` : ""}`
    );
  }
}

async function maybeAutoConfigureOnStartup() {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    return;
  }

  const config = vscode.workspace.getConfiguration("stm32Helper");
  const enabled = config.get("autoConfigureOnStartup", true);
  if (!enabled) {
    return;
  }

  const boards = config.get("boards", []);
  const activeBoard = config.get("activeBoard", "");
  const shouldAutoConfigure =
    !Array.isArray(boards) ||
    boards.length === 0 ||
    activeBoard === "" ||
    activeBoard === "auto-detected";

  if (shouldAutoConfigure) {
    await autoConfigureProjectInternal({ silent: true });
  }
}

/**
 * On Windows, Cursor/VS Code may use PowerShell as the default automation shell.
 * PowerShell 5.x does not support `&&`, while CMD does. We always run user
 * commands through `cmd.exe /d /c ...` so `&&`, quoting, and OpenOCD `-c "..."`
 * behave like CMD (and match typical batch tutorials).
 */
async function runShellTask(taskName, command, cwd) {
  const cwdPath = cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  let shellExecution;
  if (process.platform === "win32") {
    shellExecution = new vscode.ShellExecution("cmd.exe", ["/d", "/c", command], {
      cwd: cwdPath
    });
  } else {
    shellExecution = new vscode.ShellExecution(command, {
      cwd: cwdPath
    });
  }
  const task = new vscode.Task(
    { type: "shell" },
    vscode.TaskScope.Workspace,
    taskName,
    "STM32 Helper (Windows)",
    shellExecution
  );
  await vscode.tasks.executeTask(task);
}

async function runForActiveBoard(action) {
  const board = findActiveBoard();
  if (!board) {
    vscode.window.showErrorMessage(
      "STM32 Helper: No board profiles found in stm32Helper.boards."
    );
    return;
  }

  const cwd = substituteWorkspaceFolder(board.cwd || "${workspaceFolder}");
  const buildCmd = substituteWorkspaceFolder(board.buildCommand || "");
  const flashCmd = substituteWorkspaceFolder(board.flashCommand || "");
  const cleanCmd = substituteWorkspaceFolder(board.cleanCommand || "");

  if (action === "build") {
    if (!buildCmd) {
      vscode.window.showErrorMessage("STM32 Helper: buildCommand is empty.");
      return;
    }
    await runShellTask(`Build (${board.name})`, buildCmd, cwd);
    return;
  }

  if (action === "flash") {
    if (!flashCmd) {
      vscode.window.showErrorMessage("STM32 Helper: flashCommand is empty.");
      return;
    }
    await runShellTask(`Flash (${board.name})`, flashCmd, cwd);
    return;
  }

  if (action === "clean") {
    if (!cleanCmd) {
      vscode.window.showErrorMessage(
        "STM32 Helper: cleanCommand is empty for this board."
      );
      return;
    }
    await runShellTask(`Clean (${board.name})`, cleanCmd, cwd);
    return;
  }

  if (action === "buildFlash") {
    if (!buildCmd || !flashCmd) {
      vscode.window.showErrorMessage(
        "STM32 Helper: buildCommand or flashCommand is empty."
      );
      return;
    }
    await runShellTask(`Build+Flash (${board.name})`, `${buildCmd} && ${flashCmd}`, cwd);
  }
}

function getCmakeSyncSettings() {
  const ws = vscode.workspace.getConfiguration();
  const rootCMakeLists = substituteWorkspaceFolder(
    ws.get("stm32Helper.cmakeSync.rootCMakeLists", "${workspaceFolder}/CMakeLists.txt")
  );
  const cubeMxCMakeLists = substituteWorkspaceFolder(
    ws.get(
      "stm32Helper.cmakeSync.cubeMxCMakeLists",
      "${workspaceFolder}/cmake/stm32cubemx/CMakeLists.txt"
    )
  );
  const markerLine = ws.get("stm32Helper.cmakeSync.markerLine", "# Add user sources here");
  const scanGlobs = ws.get("stm32Helper.cmakeSync.scanGlobs", [
    "Core/**/*.c",
    "Core/**/*.cpp",
    "Core/**/*.cxx",
    "Core/**/*.s",
    "Core/**/*.S"
  ]);
  const excludeGlobs = ws.get("stm32Helper.cmakeSync.excludeGlobs", [
    "**/build/**",
    "**/build-gcc/**",
    "**/.git/**",
    "**/tools/stm32-helper-extension/**",
    "**/tools/stm32-helper-extension-windows/**",
    "**/stm32-helper-extension-windows/**"
  ]);
  return { rootCMakeLists, cubeMxCMakeLists, markerLine, scanGlobs, excludeGlobs };
}

function parseCubeMxSourcePaths(cubeContent) {
  const set = new Set();
  const re =
    /\$\{CMAKE_CURRENT_SOURCE_DIR\}\/\.\.\/\.\.\/([^)\s]+\.(?:c|cpp|cxx|s|S))/gi;
  let match = re.exec(cubeContent);
  while (match) {
    set.add(match[1].replace(/\\/g, "/"));
    match = re.exec(cubeContent);
  }
  return set;
}

function parseUserSourcesBetweenMarker(content, markerLine) {
  const lines = content.split(/\r?\n/);
  let markerIdx = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].includes(markerLine)) {
      markerIdx = i;
      break;
    }
  }
  if (markerIdx === -1) {
    return { error: `Marker not found: ${markerLine}` };
  }

  let closeIdx = -1;
  for (let i = markerIdx + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === ")") {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) {
    return { error: "Could not find closing ) for target_sources block." };
  }

  const existing = new Set();
  for (let i = markerIdx + 1; i < closeIdx; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const pathMatch = trimmed.match(/^([^\s#]+\.(?:c|cpp|cxx|s|S))\s*$/);
    if (pathMatch) {
      existing.add(pathMatch[1].replace(/\\/g, "/"));
    }
  }

  return { lines, markerIdx, closeIdx, existing };
}

function shouldExcludeRelativePath(relPath, excludeGlobs) {
  const rel = relPath.replace(/\\/g, "/");
  const segments = rel.split("/").filter(Boolean);
  if (segments.includes("build") || segments.includes("build-gcc") || segments.includes(".git")) {
    return true;
  }
  if (
    rel.startsWith("tools/stm32-helper-extension/") ||
    rel.startsWith("tools/stm32-helper-extension-windows/") ||
    rel.startsWith("stm32-helper-extension-windows/")
  ) {
    return true;
  }
  if (!Array.isArray(excludeGlobs)) {
    return false;
  }
  return excludeGlobs.some((pattern) => {
    const glob = String(pattern).replace(/\\/g, "/").replace(/^\*\*\//, "");
    if (glob.endsWith("/**")) {
      const prefix = glob.slice(0, -3);
      return rel === prefix || rel.startsWith(`${prefix}/`);
    }
    return rel === glob || rel.startsWith(`${glob}/`);
  });
}

async function collectScannedSourcePaths(workspaceFolder, wfUri, scanGlobs, excludeGlobs) {
  const uriSet = new Map();
  const globs = Array.isArray(scanGlobs) && scanGlobs.length > 0 ? scanGlobs : ["Core/**/*.c"];

  await Promise.all(
    globs.map(async (globPattern) => {
      const pattern = new vscode.RelativePattern(wfUri, globPattern);
      const found = await vscode.workspace.findFiles(pattern, null, 5000);
      found.forEach((uri) => uriSet.set(uri.fsPath, uri));
    })
  );

  return [...uriSet.values()]
    .map((uri) => path.relative(workspaceFolder, uri.fsPath).replace(/\\/g, "/"))
    .filter((rel) => !shouldExcludeRelativePath(rel, excludeGlobs));
}

async function syncCMakeSources() {
  const workspaceFolder = getWorkspaceFolder();
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("STM32 Helper: open a workspace first.");
    return;
  }

  const { rootCMakeLists, cubeMxCMakeLists, markerLine, scanGlobs, excludeGlobs } =
    getCmakeSyncSettings();

  const cubeContent = readTextIfExists(cubeMxCMakeLists);
  if (!cubeContent) {
    vscode.window.showErrorMessage(
      `STM32 Helper: CubeMX CMake not found: ${cubeMxCMakeLists}`
    );
    return;
  }

  const cubeOwned = parseCubeMxSourcePaths(cubeContent);
  let rootContent = readTextIfExists(rootCMakeLists);
  if (!rootContent) {
    vscode.window.showErrorMessage(`STM32 Helper: Root CMakeLists.txt not found: ${rootCMakeLists}`);
    return;
  }

  const parsed = parseUserSourcesBetweenMarker(rootContent, markerLine);
  if (parsed.error) {
    vscode.window.showErrorMessage(`STM32 Helper: ${parsed.error}`);
    return;
  }

  const wfUri = vscode.workspace.workspaceFolders[0].uri;
  const scanned = await collectScannedSourcePaths(
    workspaceFolder,
    wfUri,
    scanGlobs,
    excludeGlobs
  );

  const manualAndNew = new Set(parsed.existing);
  scanned.forEach((rel) => {
    if (!cubeOwned.has(rel)) {
      manualAndNew.add(rel);
    }
  });

  const sorted = [...manualAndNew].sort((a, b) => a.localeCompare(b));
  const newLines = [...parsed.lines.slice(0, parsed.markerIdx + 1)];
  sorted.forEach((p) => {
    newLines.push(`    ${p}`);
  });
  newLines.push(...parsed.lines.slice(parsed.closeIdx));

  const nextContent = newLines.join("\n");
  if (nextContent === rootContent) {
    vscode.window.showInformationMessage(
      "STM32 Helper: CMake user sources already up to date."
    );
    return;
  }

  fs.writeFileSync(rootCMakeLists, nextContent, "utf8");
  vscode.window.showInformationMessage(
    `STM32 Helper: Updated ${sorted.length} user source path(s) in CMakeLists.txt.`
  );
}

async function selectBoard() {
  const { boards, config } = getBoardsConfig();
  if (!Array.isArray(boards) || boards.length === 0) {
    vscode.window.showErrorMessage(
      "STM32 Helper: No board profiles found in stm32Helper.boards."
    );
    return;
  }

  const pick = await vscode.window.showQuickPick(
    boards.map((b) => ({
      label: b.name,
      description: b.cwd || "${workspaceFolder}"
    })),
    { placeHolder: "Select active STM32 board profile" }
  );

  if (!pick) {
    return;
  }

  await config.update("activeBoard", pick.label, vscode.ConfigurationTarget.Workspace);
  vscode.window.showInformationMessage(`STM32 Helper: active board set to ${pick.label}`);
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("stm32Helper.build", () => runForActiveBoard("build")),
    vscode.commands.registerCommand("stm32Helper.flash", () => runForActiveBoard("flash")),
    vscode.commands.registerCommand("stm32Helper.buildFlash", () =>
      runForActiveBoard("buildFlash")
    ),
    vscode.commands.registerCommand("stm32Helper.clean", () => runForActiveBoard("clean")),
    vscode.commands.registerCommand("stm32Helper.selectBoard", selectBoard),
    vscode.commands.registerCommand("stm32Helper.autoConfigureProject", autoConfigureProject),
    vscode.commands.registerCommand("stm32Helper.syncCMakeSources", syncCMakeSources)
  );

  void maybeAutoConfigureOnStartup();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
