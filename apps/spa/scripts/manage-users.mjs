#!/usr/bin/env node
// Usage:
//   node scripts/manage-users.mjs add <username> <role>
//   node scripts/manage-users.mjs remove <username>
//   node scripts/manage-users.mjs list
//
// Passwords are now managed via env vars: USER_<USERNAME>_PASSWORD

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const USERS_PATH = join(process.cwd(), "data", "spa", "users.json");

async function loadUsers() {
  try {
    const raw = await readFile(USERS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveUsers(users) {
  await mkdir(dirname(USERS_PATH), { recursive: true });
  await writeFile(USERS_PATH, JSON.stringify(users, null, 2) + "\n");
}

const [command, ...args] = process.argv.slice(2);

if (command === "add") {
  const [username, role] = args;
  if (!username || !role) {
    console.error("Usage: manage-users.mjs add <username> <role>");
    process.exit(1);
  }
  if (role !== "admin" && role !== "operador" && role !== "servicoop") {
    console.error("Role must be 'admin', 'operador', or 'servicoop'");
    process.exit(1);
  }

  const users = await loadUsers();
  const existing = users.findIndex((u) => u.username === username);

  if (existing >= 0) {
    users[existing] = { username, role };
    console.log(`Updated user '${username}' with role '${role}'`);
  } else {
    users.push({ username, role });
    console.log(`Added user '${username}' with role '${role}'`);
  }

  await saveUsers(users);
  console.log(`Saved to ${USERS_PATH}`);
  console.log(`Remember to set USER_${username.toUpperCase()}_PASSWORD in .env`);
} else if (command === "remove") {
  const [username] = args;
  if (!username) {
    console.error("Usage: manage-users.mjs remove <username>");
    process.exit(1);
  }

  const users = await loadUsers();
  const filtered = users.filter((u) => u.username !== username);

  if (filtered.length === users.length) {
    console.log(`User '${username}' not found.`);
  } else {
    await saveUsers(filtered);
    console.log(`Removed user '${username}'`);
    console.log(`Remember to remove USER_${username.toUpperCase()}_PASSWORD from .env`);
  }
} else if (command === "list") {
  const users = await loadUsers();
  if (users.length === 0) {
    console.log("No users found.");
  } else {
    for (const u of users) {
      const envKey = `USER_${u.username.toUpperCase()}_PASSWORD`;
      console.log(`  ${u.username} (${u.role}) — password via ${envKey}`);
    }
  }
} else {
  console.error("Usage:");
  console.error("  manage-users.mjs add <username> <role>");
  console.error("  manage-users.mjs remove <username>");
  console.error("  manage-users.mjs list");
  process.exit(1);
}
