/**
 * One-time data migration from legacy app folders into Pi Code's userData.
 *
 * When `productName` changes, Electron's `app.getPath("userData")` moves (e.g.
 * `…/Application Support/Harnss/` → `…/Application Support/Pi Code/`).
 * These migrations copy sessions, settings, agents, OAuth tokens, and binaries
 * from older locations so users keep data after updating.
 *
 * Order: **Harnss first** (newer), then **OpenACP UI** (older) — so the most
 * recent tree wins when both exist.
 *
 * Old data is NOT deleted (users can clean up manually).
 */

import path from "path";
import fs from "fs";
import { app } from "electron";
import { log } from "./logger";
import { reportError } from "./error-utils";

/** Construct the old "OpenACP UI" userData path for each platform. */
function getOpenAcpUiUserDataPath(): string {
  switch (process.platform) {
    case "darwin":
    case "win32":
      return path.join(app.getPath("appData"), "OpenACP UI");
    case "linux":
      return path.join(app.getPath("home"), ".config", "OpenACP UI");
    default:
      return path.join(app.getPath("appData"), "OpenACP UI");
  }
}

/** Previous productName before Pi Code — same layout as current app. */
function getHarnssUserDataPath(): string {
  switch (process.platform) {
    case "darwin":
    case "win32":
      return path.join(app.getPath("appData"), "Harnss");
    case "linux":
      return path.join(app.getPath("home"), ".config", "Harnss");
    default:
      return path.join(app.getPath("appData"), "Harnss");
  }
}

function copyOpenAcpUiDataTree(oldUserDataRoot: string, newUserData: string, context: string): void {
  const oldDataDir = path.join(oldUserDataRoot, "openacpui-data");
  if (!fs.existsSync(oldDataDir)) return;

  log("MIGRATION", `${context}: ${oldDataDir} → ${newUserData}`);

  const newDataDir = path.join(newUserData, "openacpui-data");
  fs.mkdirSync(newDataDir, { recursive: true });

  const dirs = ["sessions", "mcp-oauth", "bin"];
  for (const dir of dirs) {
    const src = path.join(oldDataDir, dir);
    const dst = path.join(newDataDir, dir);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      try {
        fs.cpSync(src, dst, { recursive: true });
        log("MIGRATION", `${context}: copied directory ${dir}`);
      } catch (err) {
        reportError("MIGRATION_ERR", err, { context: `${context}-copy-directory`, dir });
      }
    }
  }

  const files = ["settings.json", "agents.json", "spaces.json", "projects.json"];
  for (const file of files) {
    const src = path.join(oldDataDir, file);
    const dst = path.join(newDataDir, file);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      try {
        fs.copyFileSync(src, dst);
        log("MIGRATION", `${context}: copied file ${file}`);
      } catch (err) {
        reportError("MIGRATION_ERR", err, { context: `${context}-copy-file`, file });
      }
    }
  }

  const oldLogs = path.join(oldUserDataRoot, "logs");
  const newLogs = path.join(newUserData, "logs");
  if (fs.existsSync(oldLogs) && !fs.existsSync(newLogs)) {
    try {
      fs.cpSync(oldLogs, newLogs, { recursive: true });
      log("MIGRATION", `${context}: copied logs directory`);
    } catch {
      // Non-critical
    }
  }
}

/** Clean up orphaned updater caches from older app names. */
function cleanLegacyUpdaterCaches(): void {
  if (process.platform !== "darwin") return;

  const base = path.join(path.dirname(app.getPath("appData")), "Caches");
  const dirs = ["open-acp-ui-updater", "harnss-updater"];
  for (const name of dirs) {
    const dir = path.join(base, name);
    if (!fs.existsSync(dir)) continue;
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      log("MIGRATION", `Cleaned old updater cache: ${name}`);
    } catch (err) {
      reportError("MIGRATION_WARN", err, { context: "clean-old-updater-cache", name });
    }
  }
}

const FLAG_FROM_HARNSS = ".pi-code-from-harnss-migrated";
const FLAG_FROM_OPENACP = ".pi-code-openacp-migrated";

/**
 * Copy user data from the previous "Harnss" app folder (same `openacpui-data` layout).
 */
export function migrateFromHarnss(): void {
  const newUserData = app.getPath("userData");
  const flagPath = path.join(newUserData, FLAG_FROM_HARNSS);

  if (fs.existsSync(flagPath)) return;

  const oldUserData = getHarnssUserDataPath();
  const oldDataDir = path.join(oldUserData, "openacpui-data");

  if (!fs.existsSync(oldDataDir)) {
    log("MIGRATION", "No prior Harnss data found, skipping Harnss → Pi Code migration");
    fs.mkdirSync(newUserData, { recursive: true });
    fs.writeFileSync(flagPath, new Date().toISOString());
    return;
  }

  copyOpenAcpUiDataTree(oldUserData, newUserData, "Harnss → Pi Code");
  cleanLegacyUpdaterCaches();
  fs.writeFileSync(flagPath, new Date().toISOString());
  log("MIGRATION", "Harnss → Pi Code migration complete");
}

/**
 * Copy user data from the legacy "OpenACP UI" app folder.
 */
export function migrateFromOpenAcpUi(): void {
  const newUserData = app.getPath("userData");
  const flagPath = path.join(newUserData, FLAG_FROM_OPENACP);

  if (fs.existsSync(flagPath)) return;

  const oldUserData = getOpenAcpUiUserDataPath();
  const oldDataDir = path.join(oldUserData, "openacpui-data");

  if (!fs.existsSync(oldDataDir)) {
    log("MIGRATION", "No old OpenACP UI data found, skipping OpenACP migration");
    fs.mkdirSync(newUserData, { recursive: true });
    fs.writeFileSync(flagPath, new Date().toISOString());
    return;
  }

  copyOpenAcpUiDataTree(oldUserData, newUserData, "OpenACP UI → Pi Code");
  cleanLegacyUpdaterCaches();
  fs.writeFileSync(flagPath, new Date().toISOString());
  log("MIGRATION", "OpenACP UI migration complete");
}
