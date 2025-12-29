import "dotenv/config";
import { db } from "./db";
import { recruiters, users } from "@shared/schema";
import { hashPassword } from "./auth";

async function seed() {
  try {
    // Create a default recruiter
    const [recruiter] = await db
      .insert(recruiters)
      .values({
        name: "John Smith",
        email: "john.smith@precisionsource.com",
        phone: "(555) 123-4567"
      })
      .onConflictDoNothing()
      .returning();
    
    console.log("Seeded recruiter:", recruiter);

    if (recruiter && recruiter.id) {
      // Create 3 test users
      const testUsers = [
        {
          username: "jesse",
          email: "jesse@precisionsourcemanagement.com",
          password: "Staffpass1",
          isAdmin: true,
          name: "Jesse (Admin)"
        },
        {
          username: "john",
          email: "john.smith@precisionsource.com",
          password: "Staffpass1",
          isAdmin: false,
          name: "John Smith"
        },
        {
          username: "sarah",
          email: "sarah.jones@precisionsource.com",
          password: "Staffpass1",
          isAdmin: false,
          name: "Sarah Jones"
        }
      ];

      console.log("\n=== Creating Test Users ===\n");
      
      for (const userData of testUsers) {
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
      
      console.log("=== Seed Complete ===");
    }
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();