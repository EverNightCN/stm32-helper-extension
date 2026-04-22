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

async function runShellTask(taskName, command, cwd) {
  const shellExecution = new vscode.ShellExecution(command, {
    cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
  });
  const task = new vscode.Task(
    { type: "shell" },
    vscode.TaskScope.Workspace,
    taskName,
    "STM32 Helper",
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
    vscode.commands.registerCommand("stm32Helper.autoConfigureProject", autoConfigureProject)
  );

  void maybeAutoConfigureOnStartup();
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
