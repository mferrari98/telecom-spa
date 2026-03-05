import { readFile } from "node:fs/promises";
import { join } from "node:path";

type StoredUser = {
  username: string;
  passwordHash: string;
  role: string;
};

let cachedUsers: StoredUser[] | null = null;

function getUsersPath(): string {
  return process.env.USERS_JSON_PATH || join(process.cwd(), "data", "users.json");
}

export async function loadUsers(): Promise<StoredUser[]> {
  if (cachedUsers) return cachedUsers;
  try {
    const raw = await readFile(getUsersPath(), "utf-8");
    cachedUsers = JSON.parse(raw) as StoredUser[];
    return cachedUsers;
  } catch {
    return [];
  }
}

export async function findUser(username: string): Promise<StoredUser | undefined> {
  const users = await loadUsers();
  return users.find((u) => u.username === username);
}
