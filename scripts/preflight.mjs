import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const skipDocker = args.has("--no-docker");

const commands = [
  ["pnpm", ["install", "--frozen-lockfile"]],
  ["pnpm", ["--filter", "nubbi-client", "lint"]],
  ["pnpm", ["--filter", "nubbi-client", "build"]],
  ["pnpm", ["--filter", "nubbi-server", "typecheck"]],
];

if (!skipDocker) {
  commands.push(
    [
      "docker",
      [
        "build",
        "-f",
        "client/Dockerfile",
        "-t",
        "nubbi-client:preflight",
        ".",
      ],
    ],
    [
      "docker",
      [
        "build",
        "-f",
        "server/Dockerfile",
        "-t",
        "nubbi-server:preflight",
        ".",
      ],
    ]
  );
}

for (const [command, commandArgs] of commands) {
  console.log(`\n[preflight] ${command} ${commandArgs.join(" ")}`);
  const isWindows = process.platform === "win32";
  const executable = isWindows ? "cmd" : command;
  const args = isWindows
    ? ["/d", "/s", "/c", command, ...commandArgs]
    : commandArgs;
  const result = spawnSync(executable, args, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\n[preflight] ok");
