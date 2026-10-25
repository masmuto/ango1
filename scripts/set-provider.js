/* eslint-disable */
/**
 * Auto-detect Prisma provider from DATABASE_URL.
 *
 * Runs before `prisma generate` (via npm postinstall) to rewrite the
 * datasource provider in schema.prisma:
 *   - DATABASE_URL starts with "file:"      → provider = "sqlite"
 *   - DATABASE_URL starts with "postgres"   → provider = "postgresql"
 *
 * This lets us use SQLite in local dev and Postgres on Vercel without
 * manually editing the schema or maintaining two copies.
 */
const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");
const dbUrl = process.env.DATABASE_URL || "file:/tmp/dev.db";

let provider = "sqlite";
if (dbUrl.startsWith("postgres")) {
  provider = "postgresql";
} else if (dbUrl.startsWith("file:")) {
  provider = "sqlite";
} else {
  // Default to postgresql for safety (Vercel production case)
  provider = "postgresql";
}

console.log(`[set-provider] DATABASE_URL prefix detected → provider = "${provider}"`);

let schema = fs.readFileSync(SCHEMA_PATH, "utf8");

// Replace the provider line. Match: provider = "..."  (with or without comment after)
const newProviderLine = `provider = "${provider}"`;
const providerRegex = /provider\s*=\s*"(sqlite|postgresql|mysql)"/;

if (providerRegex.test(schema)) {
  schema = schema.replace(providerRegex, newProviderLine);
} else {
  console.error("[set-provider] ERROR: Could not find provider line in schema.prisma");
  process.exit(1);
}

fs.writeFileSync(SCHEMA_PATH, schema);
console.log(`[set-provider] schema.prisma updated`);
