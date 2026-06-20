const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 12);
  const managerPassword = await bcrypt.hash('manager123', 12);
  const staffPassword = await bcrypt.hash('staff123', 12);

  // Upsert Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@flexstock.com' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@flexstock.com',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log(`Seeded admin user: ${admin.email}`);

  // Upsert Manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@flexstock.com' },
    update: {},
    create: {
      name: 'Store Manager',
      email: 'manager@flexstock.com',
      password: managerPassword,
      role: 'MANAGER',
      isActive: true
    }
  });
  console.log(`Seeded manager user: ${manager.email}`);

  // Upsert Staff user
  const staff = await prisma.user.upsert({
    where: { email: 'staff@flexstock.com' },
    update: {},
    create: {
      name: 'Sales Staff',
      email: 'staff@flexstock.com',
      password: staffPassword,
      role: 'STAFF',
      isActive: true
    }
  });
  console.log(`Seeded staff user: ${staff.email}`);

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
