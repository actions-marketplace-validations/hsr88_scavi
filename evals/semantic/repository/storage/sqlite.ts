import Database from "better-sqlite3";

const database = new Database("settings.sqlite");
export function saveConfiguration(key: string, value: string): void {
  database.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}
