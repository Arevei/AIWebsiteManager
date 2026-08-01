import { Codex } from "@openai/codex-sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const prompt = process.env.PROMPT || "";
const workspaceRoot = process.env.WORKSPACE_ROOT || "/home/daytona";
const workspaceId = (process.env.WORKSPACE_ID || "default").replace(/[^a-zA-Z0-9_.-]/g, "_");
const model = process.env.CODEX_MODEL || undefined;
const effort = process.env.CODEX_EFFORT || "medium";
const threadIdPath = path.join("/tmp", `arevei-codex-thread-${workspaceId}`);

function emit(type, payload = {}) {
  process.stdout.write(`${JSON.stringify({ type, ...payload })}\n`);
}

async function readExisting(file) {
  try {
    return (await readFile(file, "utf8")).trim();
  } catch {
    return "";
  }
}

if (!prompt.trim()) {
  emit("error", { detail: "Prompt is required" });
  process.exit(2);
}

await mkdir(workspaceRoot, { recursive: true });

const codex = new Codex();
const previousThreadId = await readExisting(threadIdPath);
const options = {
  workingDirectory: workspaceRoot,
  skipGitRepoCheck: true,
  sandboxMode: "danger-full-access",
  effort,
  ...(model ? { model } : {}),
};

emit("agent_event", {
  event: {
    kind: "codex_started",
    item_type: "codex_sdk",
    message: "Codex SDK started inside Daytona.",
    model: model || null,
  },
});

try {
  const thread = previousThreadId
    ? codex.resumeThread(previousThreadId, options)
    : codex.startThread(options);

  emit("agent_event", {
    event: {
      kind: "codex_turn_started",
      item_type: "codex_turn",
      message: "Running Codex against the sandbox checkout.",
    },
  });

  const result = await thread.run(prompt);
  const threadId = result.threadId || result.thread_id || thread.id || previousThreadId || null;
  if (threadId) await writeFile(threadIdPath, threadId, "utf8");

  emit("agent_event", {
    event: {
      kind: "codex_turn_finished",
      item_type: "codex_turn",
      message: "Codex turn finished inside Daytona.",
    },
  });
  emit("result", {
    finalResponse: result.finalResponse || result.final_response || "",
    threadId,
    usage: result.usage || null,
  });
} catch (error) {
  emit("error", {
    detail: `Codex SDK failed inside Daytona. ${String(error?.message || error).split("\n")[0].slice(0, 700)}`,
  });
  process.exit(1);
}
