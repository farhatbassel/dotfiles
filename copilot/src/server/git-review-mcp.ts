import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { z } from "zod";

const executeFile = promisify(execFile);
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const environment = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

async function git(repository: string, ...args: string[]) {
  const { stdout } = await executeFile(
    "git",
    [
      "--no-pager",
      "--literal-pathspecs",
      "-c",
      "core.fsmonitor=false",
      ...args,
    ],
    {
      cwd: repository,
      env: {
        ...environment,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      },
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  return stdout;
}

const reply = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data) }],
});

export async function resolveRepository(directory: string) {
  return (await git(directory, "rev-parse", "--show-toplevel")).trim();
}

export async function createReviewServer(directory: string) {
  const repository = await resolveRepository(directory);
  const server = new McpServer({ name: "git-review", version: "1.0.0" });

  async function comparison() {
    const refs = (
      await git(
        repository,
        "for-each-ref",
        "--format=%(refname)",
        "refs/heads/main",
        "refs/remotes/origin/main",
      )
    )
      .trim()
      .split("\n");
    const baseRef = ["refs/heads/main", "refs/remotes/origin/main"].find(
      (ref) => refs.includes(ref),
    );
    if (!baseRef) {
      throw new Error(
        "Cannot review: neither local main nor origin/main exists.",
      );
    }
    return {
      baseRef,
      mergeBase: (await git(repository, "merge-base", baseRef, "HEAD")).trim(),
    };
  }

  const diffOptions = [
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--no-color",
  ];
  const splitPaths = (output: string) => output.split("\0").filter(Boolean);

  async function changedFiles(mergeBase: string) {
    return splitPaths(
      await git(
        repository,
        "diff",
        ...diffOptions,
        "--name-only",
        "-z",
        mergeBase,
        "--",
      ),
    );
  }

  server.registerTool(
    "review_scope",
    {
      description:
        "List changes from the merge base with local main (or origin/main) to the working tree, including staged, unstaged, and untracked paths. Never fetches or writes.",
      inputSchema: z.object({}).strict(),
      annotations,
    },
    async () => {
      const { baseRef, mergeBase } = await comparison();
      return reply({
        repository,
        baseRef,
        mergeBase,
        branch: (
          await git(repository, "rev-parse", "--abbrev-ref", "HEAD")
        ).trim(),
        trackedFiles: await changedFiles(mergeBase),
        untrackedFiles: splitPaths(
          await git(
            repository,
            "ls-files",
            "--others",
            "--exclude-standard",
            "-z",
          ),
        ),
        limitations:
          "Local refs may be stale. Renames appear as deletion/addition. Untracked contents require read tools. Refresh scope if the checkout changes.",
      });
    },
  );

  server.registerTool(
    "review_diff",
    {
      description:
        "Read a paginated diff for one exact tracked path returned by review_scope. No repository path, revision, or Git options can be supplied.",
      inputSchema: z
        .object({
          path: z.string().min(1),
          offset: z.number().int().min(0).default(0),
          limit: z.number().int().min(1).max(400).default(200),
        })
        .strict(),
      annotations,
    },
    async ({ path, offset, limit }) => {
      const { baseRef, mergeBase } = await comparison();
      if (!(await changedFiles(mergeBase)).includes(path)) {
        throw new Error(
          "Path must exactly match a tracked path from review_scope.",
        );
      }
      const diff = await git(
        repository,
        "diff",
        ...diffOptions,
        mergeBase,
        "--",
        path,
      );
      const lines = diff === "" ? [] : diff.replace(/\n$/, "").split("\n");
      if (offset > lines.length) {
        throw new Error("Offset exceeds the diff line count.");
      }
      return reply({
        baseRef,
        mergeBase,
        path,
        offset,
        totalLines: lines.length,
        lines: lines.slice(offset, offset + limit),
        nextOffset: offset + limit < lines.length ? offset + limit : null,
      });
    },
  );

  return server;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = await createReviewServer(process.argv[2] ?? process.cwd());
  await server.connect(new StdioServerTransport());
}
