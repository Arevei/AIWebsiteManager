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

function todoMarkdown(items = []) {
  const lines = items.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`);
  return lines.length ? `## Implementation Plan\n\n${lines.join("\n")}` : "";
}

function describeItem(item = {}, eventType = "") {
  const status = item.status || (eventType.endsWith("completed") ? "completed" : "in_progress");
  if (item.type === "command_execution") {
    return {
      kind: `command_${status}`,
      item_type: item.type,
      message: status === "completed" ? `Command finished: ${item.command}` : `Running command: ${item.command}`,
      command: item.command,
      output: item.aggregated_output || "",
      status,
    };
  }
  if (item.type === "file_change") {
    const paths = (item.changes || []).map((change) => change.path).filter(Boolean);
    return {
      kind: item.status === "failed" ? "file_change_failed" : "file_change_completed",
      item_type: item.type,
      message: paths.length ? `Updated ${paths.length} file${paths.length === 1 ? "" : "s"}.` : "Updated files.",
      path: paths[0] || "",
      paths,
      status: item.status || status,
    };
  }
  if (item.type === "todo_list") {
    return {
      kind: "plan_updated",
      item_type: item.type,
      message: "Implementation plan updated.",
      plan_markdown: todoMarkdown(item.items || []),
      status,
    };
  }
  if (item.type === "mcp_tool_call") {
    return {
      kind: `tool_${item.status || status}`,
      item_type: item.type,
      message: `${item.tool || "Tool"} ${item.status || status}.`,
      name: item.tool || item.server || "tool",
      status: item.status || status,
    };
  }
  if (item.type === "web_search") {
    return {
      kind: "web_search",
      item_type: item.type,
      message: `Searching: ${item.query}`,
      status,
    };
  }
  if (item.type === "reasoning") {
    return {
      kind: "reasoning",
      item_type: item.type,
      message: item.text ? item.text.slice(0, 220) : "Reasoning update.",
      status,
    };
  }
  if (item.type === "agent_message") {
    return {
      kind: "agent_message",
      item_type: item.type,
      message: "Codex is responding.",
      status,
    };
  }
  if (item.type === "error") {
    return {
      kind: "error",
      item_type: item.type,
      message: item.message || "Codex reported an error.",
      status: "failed",
    };
  }
  return {
    kind: item.type || "codex_item",
    item_type: item.type || "codex_item",
    message: item.type ? `Codex ${item.type} ${status}.` : "Codex event.",
    status,
  };
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

  const streamed = typeof thread.runStreamed === "function"
    ? await thread.runStreamed(prompt)
    : null;
  const agentTextById = new Map();
  const completedItems = [];
  let finalResponse = "";
  let usage = null;

  if (streamed?.events) {
    for await (const event of streamed.events) {
      emit("codex_event", { event });
      if (event.type === "thread.started") {
        emit("agent_event", {
          event: {
            kind: "thread_started",
            item_type: "codex_thread",
            message: "Codex thread connected.",
            thread_id: event.thread_id,
          },
        });
      } else if (event.type === "turn.started") {
        emit("agent_event", {
          event: {
            kind: "turn_started",
            item_type: "codex_turn",
            message: "Codex turn started.",
          },
        });
      } else if (event.type === "item.started" || event.type === "item.updated" || event.type === "item.completed") {
        const item = event.item || {};
        if (item.type === "agent_message") {
          const prior = agentTextById.get(item.id) || "";
          const next = item.text || "";
          if (next.length > prior.length) {
            emit("delta", { text: next.slice(prior.length) });
          }
          agentTextById.set(item.id, next);
          if (event.type === "item.completed") finalResponse = next;
        }
        const summary = describeItem(item, event.type);
        emit("agent_event", { event: summary });
        if (event.type === "item.completed") completedItems.push(item);
      } else if (event.type === "turn.completed") {
        usage = event.usage || null;
        emit("agent_event", {
          event: {
            kind: "turn_completed",
            item_type: "codex_turn",
            message: "Codex turn completed.",
            status: "completed",
          },
        });
      } else if (event.type === "turn.failed") {
        throw new Error(event.error?.message || "Codex turn failed");
      } else if (event.type === "error") {
        throw new Error(event.message || "Codex stream failed");
      }
    }
  } else {
    const result = await thread.run(prompt);
    finalResponse = result.finalResponse || result.final_response || "";
    usage = result.usage || null;
    completedItems.push(...(result.items || []));
  }

  const threadId = thread.id || previousThreadId || null;
  if (threadId) await writeFile(threadIdPath, threadId, "utf8");

  emit("agent_event", {
    event: {
      kind: "codex_turn_finished",
      item_type: "codex_turn",
      message: "Codex turn finished inside Daytona.",
    },
  });
  emit("result", {
    finalResponse,
    threadId,
    usage,
    items: completedItems,
  });
} catch (error) {
  emit("error", {
    detail: `Codex SDK failed inside Daytona. ${String(error?.message || error).split("\n")[0].slice(0, 700)}`,
  });
  process.exit(1);
}
