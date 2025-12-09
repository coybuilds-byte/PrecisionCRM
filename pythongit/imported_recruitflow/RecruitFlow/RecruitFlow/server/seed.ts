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

    // Create the admin user for jesse@precisionsourcemanagement.com
    if (recruiter && recruiter.id) {
      const passwordHash = await hashPassword("Staffpass1");
      const [adminUser] = await db
        .insert(users)
        .values({
          username: "jesse",
          email: "jesse@precisionsourcemanagement.com",
          passwordHash,
          recruiterId: recruiter.id,
          isAdmin: true
        })
        .onConflictDoNothing()
        .returning();

      if (adminUser) {
        console.log("Seeded admin user:", {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email
        });
        console.log("Login credentials:");
        console.log("  Email: jesse@precisionsourcemanagement.com");
        console.log("  Password: Staffpass1");
      } else {
        console.log("Admin user already exists");
      }
    }
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();