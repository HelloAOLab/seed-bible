import { execSync } from "child_process";
import { readdir } from "fs/promises";
import path from "path";

export async function checkAll(stdio: "inherit" | "ignore" = "inherit") {
  const distPath = path.resolve("dist");
  const files = await readdir(distPath);

  for (const file of files) {
    if (file.endsWith(".aux")) {
      const filePath = path.resolve(distPath, file);
      console.log(`Checking: ${filePath}`);
      execSync(`casualos check-aux "${filePath}"`, { stdio });
    }
  }
}

checkAll();
