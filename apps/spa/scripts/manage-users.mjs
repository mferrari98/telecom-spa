#!/usr/bin/env node
// Usage:
//   node scripts/manage-users.mjs add <username> <password> <role>
//   node scripts/manage-users.mjs list

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 32;

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    PBKDF2_HASH_BYTES * 8
  );
  return `${PBKDF2_ITERATIONS}:${base64urlEncode(salt)}:${base64urlEncode(derived)}`;
}

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
  const [username, password, role] = args;
  if (!username || !password || !role) {
    console.error("Usage: manage-users.mjs add <username> <password> <role>");
    process.exit(1);
  }
  if (role !== "admin" && role !== "operador" && role !== "servicoop") {
    console.error("Role must be 'admin', 'operador', or 'servicoop'");
    process.exit(1);
  }

  const users = await loadUsers();
  const existing = users.findIndex((u) => u.username === username);
  const passwordHash = await hashPassword(password);

  if (existing >= 0) {
    users[existing] = { username, passwordHash, role };
    console.log(`Updated user '${username}' with role '${role}'`);
  } else {
    users.push({ username, passwordHash, role });
    console.log(`Added user '${username}' with role '${role}'`);
  }

  await saveUsers(users);
  console.log(`Saved to ${USERS_PATH}`);
} else if (command === "list") {
  const users = await loadUsers();
  if (users.length === 0) {
    console.log("No users found.");
  } else {
    for (const u of users) {
      console.log(`  ${u.username} (${u.role})`);
    }
  }
} else {
  console.error("Usage:");
  console.error("  manage-users.mjs add <username> <password> <role>");
  console.error("  manage-users.mjs list");
  process.exit(1);
}
