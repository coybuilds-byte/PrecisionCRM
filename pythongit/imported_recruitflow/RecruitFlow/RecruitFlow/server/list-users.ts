import { db } from "./db";
import { users } from "@shared/schema";

/**
 * List all users in the database
 * Usage: npx tsx server/list-users.ts
 */
async function listUsers() {
  try {
    const allUsers = await db.select().from(users);

    if (allUsers.length === 0) {
      console.log("No users found in the database.");
      process.exit(0);
    }

    console.log(`\nFound ${allUsers.length} user(s):\n`);
    console.log("─".repeat(90));

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (ID: ${user.id})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Recruiter ID: ${user.recruiterId}`);
      console.log(`   Admin: ${user.isAdmin ? "Yes" : "No"}`);
      console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : "Unknown"}`);
      console.log("─".repeat(90));
    });

    console.log("\nTo reset a password for any user, run:");
    console.log("  npx tsx server/reset-password.ts <email> <newPassword>");
    console.log("\nExample:");
    console.log("  npx tsx server/reset-password.ts john@example.com NewPassword123");

    process.exit(0);
  } catch (error) {
    console.error("Failed to list users:", error);
    process.exit(1);
  }
}

listUsers();
