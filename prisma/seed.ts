import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({ log: ['info'] });

async function main() {
  const adminEmail = 'admin@local';
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    console.log('Creating initial local administrator account...');
    const hashedPassword = await bcrypt.hash('admin', 10);
    
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Local Administrator',
        passwordHash: hashedPassword,
        isLocalAdmin: true,
        settings: {
          create: {}
        }
      }
    });
    console.log(`Local admin created. Email: ${adminEmail} | Password: admin`);
    console.log('IMPORTANT: Please change this password upon first login!');
  } else {
    console.log('Local admin account already exists.');
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
