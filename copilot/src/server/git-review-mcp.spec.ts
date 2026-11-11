import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import ts from "typescript";
import { createReviewServer } from "./git-review-mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { expect, it, onTestFinished } from "vitest";

const executeFile = promisify(execFile);
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

async function compileEntrypoints() {
  const outputDirectory = await mkdtemp(join(projectRoot, ".vitest-review-"));
  onTestFinished(() =>
    rm(outputDirectory, { recursive: true, force: true }),
  );
  const serverDirectory = join(outputDirectory, "server");
  await mkdir(serverDirectory);
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
  };
  for (const [source, output] of [
    ["git-review-mcp.ts", "git-review-mcp.js"],
    ["review.ts", "review.js"],
  ] as const) {
    const sourcePath = join(projectRoot, "src/server", source);
    const outputPath = join(serverDirectory, output);
    const { outputText } = ts.transpileModule(await readFile(sourcePath, "utf8"), {
      compilerOptions,
      fileName: sourcePath,
    });
    await writeFile(outputPath, outputText);
  }
  return {
    serverPath: join(serverDirectory, "git-review-mcp.js"),
    reviewPath: join(serverDirectory, "review.js"),
  };
}

function responseText(result: unknown) {
  if (
    typeof result !== "object" ||
    result === null ||
    !("content" in result) ||
    !Array.isArray(result.content)
  ) {
    throw new Error(`Expected text response, got ${JSON.stringify(result)}`);
  }
  const content: unknown = result.content[0];
  if (
    typeof content !== "object" ||
    content === null ||
    !("type" in content) ||
    content.type !== "text" ||
    !("text" in content) ||
    typeof content.text !== "string"
  ) {
    throw new Error(`Expected text response, got ${JSON.stringify(result)}`);
  }
  return content.text;
}

async function fixture() {
  const repository = await mkdtemp(join(tmpdir(), "git-review-"));
  const client = new Client({ name: "review-test", version: "1.0.0" });
  let server: McpServer | undefined;
  onTestFinished(async () => {
    await client.close();
    await server?.close();
    await rm(repository, { recursive: true, force: true });
  });
  const git = async (...args: string[]) =>
    (
      await executeFile("git", args, {
        cwd: repository,
        env: {
          ...process.env,
          GIT_CONFIG_GLOBAL: "/dev/null",
          GIT_CONFIG_NOSYSTEM: "1",
        },
      })
    ).stdout;
  await git("init", "-q", "-b", "main");
  await git("config", "user.name", "Review Test");
  await git("config", "user.email", "review@example.invalid");
  for (const path of ["source.ts", "source.spec.ts", "source.test.ts"]) {
    await writeFile(join(repository, path), "original\n");
  }
  await git("add", ".");
  await git("commit", "-qm", "base");
  const baseCommit = (await git("rev-parse", "HEAD")).trim();
  await git("checkout", "-qb", "feature");
  server = await createReviewServer(repository);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const call = (name: string, args: Record<string, unknown> = {}) =>
    client.callTool({ name, arguments: args });
  const data = async (name: string, args: Record<string, unknown> = {}) => {
    const result = await call(name, args);
    expect(result.isError).toBeFalsy();
    return JSON.parse(responseText(result));
  };
  return { repository, client, git, call, data, baseCommit };
}

it("reviews committed, staged, unstaged, deleted, and untracked paths without writes", async () => {
  const { repository, git, data, baseCommit } = await fixture();
  await writeFile(join(repository, "source.ts"), "committed\n");
  await git("add", "source.ts");
  await git("commit", "-qm", "feature change");
  await writeFile(join(repository, "source.spec.ts"), "staged\n");
  await git("add", "source.spec.ts");
  await writeFile(join(repository, "source.test.ts"), "unstaged\n");
  await writeFile(join(repository, "new file.test.ts"), "untracked\n");
  await rm(join(repository, "source.ts"));
  const indexBefore = await readFile(join(repository, ".git/index"));
  const headBefore = await git("rev-parse", "HEAD");
  const statusBefore = await git("status", "--porcelain");
  const scope = await data("review_scope");
  expect(scope.baseRef).toBe("refs/heads/main");
  expect(scope.mergeBase).toBe(baseCommit);
  expect(scope.trackedFiles).toEqual([
    "source.spec.ts",
    "source.test.ts",
    "source.ts",
  ]);
  expect(scope.untrackedFiles).toEqual(["new file.test.ts"]);
  for (const [path, expected] of [
    ["source.spec.ts", "+staged"],
    ["source.test.ts", "+unstaged"],
    ["source.ts", "deleted file"],
  ]) {
    expect((await data("review_diff", { path })).lines.join("\n")).toContain(expected);
  }
  expect(await readFile(join(repository, ".git/index"))).toEqual(indexBefore);
  expect(await git("rev-parse", "HEAD")).toBe(headBefore);
  expect(await git("status", "--porcelain")).toBe(statusBefore);
});

it("uses the merge base instead of reporting unrelated changes on main", async () => {
  const { repository, git, data, baseCommit } = await fixture();
  await git("checkout", "-q", "main");
  await writeFile(join(repository, "main-only.ts"), "main change\n");
  await git("add", ".");
  await git("commit", "-qm", "advance main");
  await git("checkout", "-q", "feature");
  await writeFile(join(repository, "source.ts"), "feature\n");
  await git("add", ".");
  await git("commit", "-qm", "advance feature");
  const scope = await data("review_scope");
  expect(scope.mergeBase).toBe(baseCommit);
  expect(scope.trackedFiles).toEqual(["source.ts"]);
  expect((await data("review_diff", { path: "source.ts" })).lines).toContain(
    "+feature",
  );
});

it("falls back to origin/main and reports a missing base explicitly", async () => {
  const { git, data, call, baseCommit } = await fixture();
  await git("update-ref", "refs/remotes/origin/main", baseCommit);
  await git("branch", "-D", "main");
  expect((await data("review_scope")).baseRef).toBe("refs/remotes/origin/main");
  await git("update-ref", "-d", "refs/remotes/origin/main");
  const result = await call("review_scope");
  expect(result.isError).toBe(true);
  expect(responseText(result)).toMatch(/neither local main nor origin\/main/);
});

it("exposes only fixed read tools, rejects injected arguments, and paginates diffs", async () => {
  const { repository, client, call, data } = await fixture();
  const tools = await client.listTools();
  expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
    "review_diff",
    "review_scope",
  ]);
  await writeFile(join(repository, "source.ts"), "changed\n".repeat(20));
  const first = await data("review_diff", { path: "source.ts", limit: 3 });
  expect(first.lines.length).toBe(3);
  expect(first.nextOffset).toBe(3);
  const second = await data("review_diff", {
    path: "source.ts",
    offset: first.nextOffset,
    limit: 400,
  });
  expect(second.nextOffset).toBeNull();
  expect(first.lines.length + second.lines.length).toBe(first.totalLines);
  for (const args of [
    { path: "../outside" },
    { path: "--output=source.ts" },
    { path: ":(glob)*" },
    { path: "source.ts", repo_path: "../outside" },
    { path: "source.ts", offset: -1 },
    { path: "source.ts", limit: 401 },
  ]) {
    expect((await call("review_diff", args)).isError).toBe(true);
  }
  expect((await call("review_scope", { command: "reset --hard" })).isError).toBe(true);
  expect((await call("git_reset")).isError).toBe(true);
});

it("does not execute repository-configured diff helpers", async () => {
  const { repository, git, data } = await fixture();
  await writeFile(join(repository, "source.ts"), "changed\n");
  await writeFile(join(repository, ".gitattributes"), "*.ts diff=unsafe\n");
  await git("config", "diff.external", "false");
  await git("config", "diff.unsafe.command", "false");
  await git("config", "diff.unsafe.textconv", "false");
  expect((await data("review_diff", { path: "source.ts" })).lines).toContain(
    "+changed",
  );
});

it("standalone server locks to the caller's repository even from a subdirectory", async () => {
  const { repository } = await fixture();
  const { serverPath } = await compileEntrypoints();
  const nested = join(repository, "nested");
  await mkdir(nested);
  await writeFile(join(repository, "source.ts"), "outside-subdirectory\n");
  const client = new Client({ name: "stdio-test", version: "1.0.0" });
  onTestFinished(() => client.close());
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [serverPath],
      cwd: nested,
    }),
  );
  const scope = JSON.parse(
    responseText(await client.callTool({ name: "review_scope", arguments: {} })),
  );
  expect(await realpath(scope.repository)).toBe(await realpath(repository));
  expect(scope.trackedFiles).toEqual(["source.ts"]);
  const diff = await client.callTool({
    name: "review_diff",
    arguments: { path: "source.ts" },
  });
  expect(diff.isError).toBeFalsy();
  expect(JSON.parse(responseText(diff)).lines).toContain(
    "+outside-subdirectory",
  );
});

it("review launcher passes the caller's repository explicitly and denies shell and writes", async () => {
  const { repository } = await fixture();
  const { reviewPath, serverPath } = await compileEntrypoints();
  const bin = join(repository, "bin");
  const nested = join(repository, "nested");
  await mkdir(bin);
  await mkdir(nested);
  await writeFile(
    join(bin, "copilot"),
    `#!${process.execPath}\nconsole.log(JSON.stringify({args: process.argv.slice(2), cwd: process.cwd()}));\n`,
    { mode: 0o755 },
  );
  const { stdout } = await executeFile(
    process.execPath,
    [reviewPath],
    {
      cwd: nested,
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    },
  );
  const { args, cwd } = JSON.parse(stdout);
  expect(await realpath(cwd)).toBe(await realpath(repository));
  expect(args).toContain("--deny-tool=shell");
  expect(args).toContain("--deny-tool=write");
  expect(args).toContain("--agent=git-review:review-main");
  const pluginDirectory = args[args.indexOf("--plugin-dir") + 1];
  expect(await realpath(pluginDirectory)).toBe(await realpath(projectRoot));
  const plugin = JSON.parse(
    await readFile(join(pluginDirectory, "plugin.json"), "utf8"),
  );
  expect(plugin.name).toBe("git-review");
  expect(
    await readFile(
      join(pluginDirectory, plugin.agents, "review-main.agent.md"),
      "utf8",
    ),
  ).toContain("name: review-main");
  const config = JSON.parse(args[args.indexOf("--additional-mcp-config") + 1]);
  const mcp = config.mcpServers["git-review"];
  expect(await realpath(mcp.args[0])).toBe(await realpath(serverPath));
  expect(await realpath(mcp.args[1])).toBe(await realpath(repository));
  expect(mcp.tools).toEqual(["review_scope", "review_diff"]);
});
