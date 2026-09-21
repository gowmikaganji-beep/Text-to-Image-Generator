import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\n🚀 Starting Lumina AI (Backend & Frontend)...\n");

const server = spawn("npm", ["run", "dev"], {
  cwd: path.join(__dirname, "lumina-ai", "server"),
  stdio: "inherit",
  shell: true,
});

const client = spawn("npm", ["run", "dev"], {
  cwd: path.join(__dirname, "lumina-ai", "client"),
  stdio: "inherit",
  shell: true,
});

function cleanup() {
  console.log("\nShutting down Lumina services...");
  try {
    server.kill();
  } catch {}
  try {
    client.kill();
  } catch {}
  process.exit();
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
