import { spawn } from "node:child_process";
import { once } from "node:events";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { resolveRepository } from "./git-review-mcp.js";

const repository = await resolveRepository(process.cwd());
const pluginRoot = fileURLToPath(new URL("../../", import.meta.url));
const mcpConfig = {
  mcpServers: {
    "git-review": {
      type: "local",
      command: process.execPath,
      args: [
        fileURLToPath(new URL("./git-review-mcp.js", import.meta.url)),
        repository,
      ],
      tools: ["review_scope", "review_diff"],
    },
  },
};

const child = spawn(
  "copilot",
  [
    "--trust-folder",
    "--plugin-dir",
    pluginRoot,
    "--agent=git-review:review-main",
    "--additional-mcp-config",
    JSON.stringify(mcpConfig),
    "--allow-tool=git-review",
    "--deny-tool=shell",
    "--deny-tool=write",
    "-p",
    "Review my latest changes against main.",
  ],
  { cwd: repository, stdio: "inherit" },
);
const [code, signal] = await once(child, "exit");
if (signal) {
  throw new Error(`Copilot exited due to signal ${signal}.`);
}
process.exitCode = code ?? 1;
