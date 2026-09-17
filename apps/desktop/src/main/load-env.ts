import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

// A plain KEY=VALUE file, not the npm `dotenv` package — this app only ever
// needs one variable, so a tiny hand-rolled parser avoids a dependency for
// it. Ships next to the installed app (see electron-builder.yml's
// extraResources) so SKYLYER_API_URL can be changed by editing a text file
// and relaunching, no rebuild needed; in dev it's just this workspace's own
// .env. Must be imported before anything that reads process.env at module
// scope (api-client.ts's API_URL) — hence it's the very first import in
// index.ts.
const envPath = app.isPackaged ? join(process.resourcesPath, ".env") : join(__dirname, "../../.env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    // A real OS-level env var (e.g. set by whoever launches the app) wins
    // over the file, matching standard dotenv behavior.
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
