import "dotenv/config";
import { db } from "./db";
import { recruiters, users } from "@shared/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

async function addUsers() {
  try {
    // Get the existing recruiter
    const [recruiter] = await db
      .select()
      .from(recruiters)
      .where(eq(recruiters.email, "john.smith@precisionsource.com"));
    
    if (!recruiter) {
      console.error("Recruiter not found. Please run seed.ts first.");
      process.exit(1);
    }

    console.log("Using recruiter:", recruiter.name);

    // Create 2 new users
    const newUsers = [
      {
        username: "dianeb",
        email: "dianeb@precisionsourcemanagement.com",
        password: "Staffpass1!",
        isAdmin: false,
        name: "Diane B"
      },
      {
        username: "kassandra",
        email: "Kassandra@precisionsourcemanagement.com",
        password: "Staffpass1!",
        isAdmin: false,
        name: "Kassandra"
      }
    ];

    console.log("\n=== Adding New Users ===\n");
    
    for (const userData of newUsers) {
      const passwordHash = await hashPassword(userData.password);
      const [user] = await db
        .insert(users)
        .values({
          username: userData.username,
          email: userData.email,
          passwordHash,
          recruiterId: recruiter.id,
          isAdmin: userData.isAdmin
        })
        .onConflictDoNothing()
        .returning();

      if (user) {
        console.log(`✓ Created ${userData.name}:`);
        console.log(`  Email: ${userData.email}`);
        console.log(`  Password: ${userData.password}`);
        console.log(`  Admin: ${userData.isAdmin}`);
        console.log();
      } else {
        console.log(`- User ${userData.email} already exists`);
      }
    }
    
    console.log("=== User Addition Complete ===");
    process.exit(0);
  } catch (error) {
    console.error("Adding users failed:", error);
    process.exit(1);
  }
}

addUsers();
