import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

import { eq } from "drizzle-orm";

import { user } from "@/db-schemas";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/server";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function prompt(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function main() {
  const rl = readline.createInterface({ input, output });

  console.log("\n🔧 Admin User Setup\n");

  const email = await prompt(rl, "Email: ");
  if (!email) {
    console.error("Email is required.");
    rl.close();
    process.exit(1);
  }
  if (!validateEmail(email)) {
    console.error("Invalid email format.");
    rl.close();
    process.exit(1);
  }

  const name = await prompt(rl, "Name: ");
  if (!name) {
    console.error("Name is required.");
    rl.close();
    process.exit(1);
  }

  const password = await prompt(rl, "Password (min 8 chars): ");
  if (!password) {
    console.error("Password is required.");
    rl.close();
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    rl.close();
    process.exit(1);
  }

  const phoneNumber = await prompt(
    rl,
    "Phone number (optional, press Enter to skip): ",
  );

  rl.close();

  const result = await auth.api.createUser({
    body: {
      data: { permissions: null },
      email,
      name,
      password,
      role: "admin",
    },
  });
  // biome-ignore lint/suspicious/noExplicitAny: better-auth createUser return type doesn't expose user field
  const createdId = (result as any).user?.id ?? "unknown";
  if (phoneNumber) {
    await db.update(user).set({ phoneNumber }).where(eq(user.id, createdId));
  }

  console.log(`\n✅ Admin user created: ${email} (${createdId})`);
  if (phoneNumber) {
    console.log(`   Phone: ${phoneNumber}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
