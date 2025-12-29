import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";

/**
 * Reset password for a user by email
 * Usage: npx tsx server/reset-password.ts <email> <newPassword>
 */
async function resetPassword() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: npx tsx server/reset-password.ts <email> <newPassword>");
    console.error("Example: npx tsx server/reset-password.ts user@example.com NewPassword123");
    process.exit(1);
  }

  const [email, newPassword] = args;

  if (newPassword.length < 8) {
    console.error("Password must be at least 8 characters long");
    process.exit(1);
  }

  try {
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update user's password
    const [updatedUser] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id))
      .returning();

    console.log("✓ Password reset successfully");
    console.log("User:", {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email
    });
    console.log("New password:", newPassword);
    console.log("\nThe user can now log in with these credentials.");
    process.exit(0);
  } catch (error) {
    console.error("Password reset failed:", error);
    process.exit(1);
  }
}

resetPassword();
