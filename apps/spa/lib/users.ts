import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hashPassword } from "./auth";

type UserEntry = {
  username: string;
  role: string;
};

type StoredUser = {
  username: string;
  passwordHash: string;
  role: string;
};

let cachedUsers: StoredUser[] | null = null;

function getUsersPath(): string {
  return process.env.USERS_JSON_PATH || join(process.cwd(), "data", "users.json");
}

function getPasswordFromEnv(username: string): string | undefined {
  const envKey = `USER_${username.toUpperCase()}_PASSWORD`;
  return process.env[envKey];
}

export async function loadUsers(): Promise<StoredUser[]> {
  if (cachedUsers) return cachedUsers;
  try {
    const raw = await readFile(getUsersPath(), "utf-8");
    const entries = JSON.parse(raw) as UserEntry[];
    const users: StoredUser[] = [];
    for (const entry of entries) {
      const password = getPasswordFromEnv(entry.username);
      if (!password) {
        console.warn(`[warn] No password env var for user "${entry.username}" (expected USER_${entry.username.toUpperCase()}_PASSWORD)`);
        continue;
      }
      users.push({
        username: entry.username,
        passwordHash: await hashPassword(password),
        role: entry.role,
      });
    }
    cachedUsers = users;
    return cachedUsers;
  } catch {
    return [];
  }
}

export async function findUser(username: string): Promise<StoredUser | undefined> {
  const users = await loadUsers();
  return users.find((u) => u.username === username);
}
