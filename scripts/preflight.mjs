import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const skipDocker = args.has("--no-docker");

const commands = [
  ["pnpm", ["--dir", "client", "install", "--frozen-lockfile"]],
  ["pnpm", ["--dir", "client", "lint"]],
  ["pnpm", ["--dir", "client", "build"]],
  ["pnpm", ["--dir", "server", "install", "--frozen-lockfile"]],
  ["pnpm", ["--dir", "server", "typecheck"]],
];

if (!skipDocker) {
  commands.push(
    [
      "docker",
      [
        "build",
        "-f",
        "client/Dockerfile.runtime",
        "-t",
        "d-note-client:preflight",
        "./client",
      ],
    ],
    ["docker", ["build", "-t", "d-note-server:preflight", "./server"]]
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
