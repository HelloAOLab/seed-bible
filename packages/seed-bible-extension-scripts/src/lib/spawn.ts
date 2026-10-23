import { spawn } from "node:child_process";

export interface RunOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
}

/** Runs a JS file with the current Node binary, inheriting stdio, resolving to its exit code. */
export function runNodeScript(
  scriptPath: string,
  args: string[],
  options: RunOptions
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

/** Runs an arbitrary command, inheriting stdio, resolving to its exit code. */
export function runCommand(
  command: string,
  args: string[],
  options: RunOptions
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
