import { readdir } from "node:fs/promises";
import { execSync } from "child_process";
import path from "node:path";

export async function minifyAll(stdio: "inherit" | "ignore" = "inherit") {
  const distPath = path.resolve("dist");
  const files = await readdir(distPath);

  for (const file of files) {
    if (file.endsWith(".aux")) {
      const filePath = path.resolve(distPath, file);
      console.log(`Minifying: ${filePath}`);
      execSync(`casualos minify-aux "${filePath}"`, { stdio });
    }
  }
}
