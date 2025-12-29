import 'dotenv/config';
import { db } from './server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function disable2FA() {
  try {
    console.log('Disabling 2FA for all users...');
    
    const result = await db
      .update(users)
      .set({ twoFactorEnabled: false })
      .returning({ email: users.email });
    
    console.log(`✓ 2FA disabled for ${result.length} user(s):`);
    result.forEach(user => console.log(`  - ${user.email}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    process.exit(1);
  }
}

disable2FA();
