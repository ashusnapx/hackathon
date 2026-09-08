/**
 * Create the shared demo account, once, against a real Supabase project.
 *
 * The landing page's demo button fills the sign-in form with these credentials.
 * There is no demo mode inside Kavach — the account is an ordinary user, signs
 * in through the ordinary form, and passes the ordinary gate — so it has to
 * actually exist before that button does anything.
 *
 * Run it once per environment:
 *
 *   node scripts/seed-demo.mjs            # create or repair the account
 *   node scripts/seed-demo.mjs --check    # say whether it is usable, change nothing
 *
 * `email_confirm: true` is the whole reason this is a script and not a sign-up:
 * the admin API can mark the address confirmed without anybody opening an
 * inbox, which is what stops a judge from being bounced to a "check your email"
 * screen thirty seconds into evaluating the product.
 *
 * Re-running is safe. An account that already exists has its password reset to
 * the committed one and is re-confirmed, which is also the fix when somebody
 * has changed it mid-event.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = resolve(ROOT, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const URL = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SECRET = process.env.SUPABASE_SECRET_KEY?.trim();

/**
 * Kept in step with `src/lib/demo/account.ts` by hand, because this script runs
 * outside the bundler and cannot import a TypeScript module. The check below
 * fails loudly if the two ever drift.
 */
const SOURCE = resolve(ROOT, "src/lib/demo/account.ts");
const source = readFileSync(SOURCE, "utf8");
const EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL?.trim() || read("DEFAULT_EMAIL");
const PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD?.trim() || read("DEFAULT_PASSWORD");

function read(name) {
  const match = source.match(new RegExp(`const ${name} = "([^"]+)"`));
  if (!match) {
    console.error(`Could not read ${name} from src/lib/demo/account.ts.`);
    console.error("The app and this script would then disagree about the demo account.");
    process.exit(1);
  }
  return match[1];
}

if (!URL || !SECRET) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY.");
  console.error("Both live in .env.local. The secret key is the service-role key,");
  console.error("which is what lets this confirm an address without an inbox.");
  process.exit(1);
}

const admin = `${URL.replace(/\/$/, "")}/auth/v1`;
const headers = {
  "Content-Type": "application/json",
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
};

async function findUser(email) {
  // The admin list endpoint filters server-side, so this stays one request even
  // on a project with a lot of users.
  const response = await fetch(
    `${admin}/admin/users?page=1&per_page=200&filter=${encodeURIComponent(email)}`,
    { headers },
  );
  if (!response.ok) throw new Error(`list-users failed: ${response.status} ${await response.text()}`);
  const body = await response.json();
  const users = body.users ?? body ?? [];
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function createUser() {
  const response = await fetch(`${admin}/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { demo: true, note: "Shared Build What Moves India demo account" },
    }),
  });
  if (!response.ok) throw new Error(`create-user failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function repairUser(id) {
  const response = await fetch(`${admin}/admin/users/${id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });
  if (!response.ok) throw new Error(`update-user failed: ${response.status} ${await response.text()}`);
  return response.json();
}

/** Signing in for real is the only check that proves a judge can. */
async function verifySignIn() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) return "skipped (no NEXT_PUBLIC_SUPABASE_ANON_KEY to sign in with)";
  const response = await fetch(`${admin}/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  return response.ok ? "ok" : `FAILED (${response.status} ${await response.text()})`;
}

const checkOnly = process.argv.includes("--check");

try {
  const existing = await findUser(EMAIL);

  if (checkOnly) {
    console.log(`demo account: ${EMAIL}`);
    console.log(`  exists:    ${existing ? "yes" : "no"}`);
    console.log(`  confirmed: ${existing?.email_confirmed_at ? "yes" : "no"}`);
    console.log(`  sign-in:   ${await verifySignIn()}`);
    process.exit(existing ? 0 : 1);
  }

  if (existing) {
    await repairUser(existing.id);
    console.log(`Reset the existing demo account: ${EMAIL}`);
  } else {
    await createUser();
    console.log(`Created the demo account: ${EMAIL}`);
  }

  console.log(`  password:  ${PASSWORD}`);
  console.log(`  sign-in:   ${await verifySignIn()}`);
  console.log("");
  console.log("The landing page's demo button now fills this in for judges.");
  console.log("Everyone trying the demo shares it, so keep nothing real in it.");
} catch (error) {
  console.error(String(error.message || error));
  process.exit(1);
}
