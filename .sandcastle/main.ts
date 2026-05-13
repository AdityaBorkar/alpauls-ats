import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

import { ralphLoop } from "./utils";

// ---------------------------------------------------------------------------

import { resolve } from "node:path";

import { config } from "dotenv";

config({ path: resolve(import.meta.dirname, ".env") });

const sandboxProvider = docker();
// const sandcastle.opencode("wafer.ai/glm-5.1") = sandcastle.opencode("wafer.ai/glm-5.1");
const OPENCODE_AUTH = JSON.stringify({
  "wafer.ai": {
    key: process.env.WAFERAI_API_KEY,
    type: "api",
  },
});
const OPENCODE_CONFIG = JSON.stringify({
  $schema: "https://opencode.ai/config.json",
  autoshare: false,
  autoupdate: true,
  experimental: {
    disable_paste_summary: true,
    openTelemetry: true,
  },
  mcp: {
    codedb: {
      command: ["codedb", "mcp"],
      enabled: true,
      type: "local",
    },
    context7: {
      command: [
        "context7-mcp",
        "--api-key",
        "ctx7sk-f0fc43c5-f73d-42c2-b72e-5333c42ca915",
      ],
      enabled: true,
      type: "local",
    },
    expect: {
      command: ["expect-cli", "mcp"],
      enabled: false,
      type: "local",
    },
    tavily: {
      command: ["tavily-mcp"],
      enabled: true,
      environment: {
        DEFAULT_PARAMETERS:
          '{"include_images": true, "max_results": 15, "search_depth": "advanced"}',
        TAVILY_API_KEY:
          "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",
      },
      type: "local",
    },
  },
});

const hooks = {
  sandbox: {
    onSandboxReady: [
      { command: "npm install" },
      {
        command: `mkdir -p /home/agent/.local/share/opencode && printf '%s' '${OPENCODE_AUTH}' > /home/agent/.local/share/opencode/auth.json`,
      },
      {
        command: `mkdir -p /home/agent/.config/opencode && printf '%s' '${OPENCODE_CONFIG}' > /home/agent/.config/opencode/opencode.json`,
      },
    ],
  },
};
const copyToWorktree = ["node_modules"];

// ---------------------------------------------------------------------------

async function Workflow() {
  // Phase 1: Plan
  const plan = await sandcastle.run({
    agent: sandcastle.opencode("wafer.ai/glm-5.1"),
    hooks,
    maxIterations: 1,
    name: "planner",
    promptFile: "./.sandcastle/prompts/plan.md",
    sandbox: sandboxProvider,
  });

  // Extract the <plan>…</plan> block from the agent's stdout.
  const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
  if (!planMatch) {
    throw new Error(
      `Planning agent did not produce a <plan> tag.\nOutput Length: ${plan.stdout.length}\n${plan.stdout}`,
    );
  }

  // The plan JSON contains an array of issues, each with id, title, branch.
  const { issues } = JSON.parse(planMatch[1]!) as {
    issues: { id: string; title: string; branch: string }[];
  };
  if (issues.length === 0) {
    return { reason: "No unblocked issues to work on.", type: "exit" };
  }
  console.log(
    `Planning complete. ${issues.length} issue(s) to work in parallel:`,
  );
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // Phase 2: Execute + Review
  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        copyToWorktree,
        hooks,
        sandbox: sandboxProvider,
      });

      try {
        // Run the implementer
        const implement = await sandbox.run({
          agent: sandcastle.opencode("wafer.ai/glm-5.1"),
          maxIterations: 100,
          name: "implementer",
          promptArgs: {
            BRANCH: issue.branch,
            ISSUE_TITLE: issue.title,
            TASK_ID: issue.id,
          },
          promptFile: "./.sandcastle/prompts/implement.md",
        });

        // Only review if the implementer produced commits
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            agent: sandcastle.opencode("wafer.ai/glm-5.1"),
            maxIterations: 1,
            name: "reviewer",
            promptArgs: {
              BRANCH: issue.branch,
            },
            promptFile: "./.sandcastle/prompts/review.md",
          });

          // Merge commits from both runs so the merge phase sees all of them.
          // Each sandbox.run() only returns commits from its own run.
          return {
            ...review,
            commits: [...implement.commits, ...review.commits],
          };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  // Log any agents that threw (network error, sandbox crash, etc.).
  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only pass branches that actually produced commits to the merge phase.
  // An agent that ran successfully but made no commits has nothing to merge.
  const completedIssues = settled
    .map((outcome, i) => ({ issue: issues[i]!, outcome }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  console.log(`\nExecution complete. Branch(es) with commits:`);
  const completedBranches = completedIssues.map((i) => {
    console.log(`  ${i.branch}`);
    return i.branch;
  });
  console.log(`  Total Count = ${completedBranches.length}`);

  if (completedBranches.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    return;
  }

  // Phase 3: Merge
  await sandcastle.run({
    agent: sandcastle.opencode("wafer.ai/glm-5.1"),
    hooks,
    maxIterations: 1,
    name: "merger",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues.map((i) => `- ${i.id}: ${i.title}`).join("\n"),
    },
    promptFile: "./.sandcastle/prompts/merge.md",
    sandbox: sandboxProvider,
  });

  console.log("Branches merged.");
  return;
}

ralphLoop({ fn: Workflow, maxIterations: 50 });
