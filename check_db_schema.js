require('dotenv').config({ path: './prisma/.env' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSchema() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'User' AND column_name = 'status'
    `;
    console.log('Status column schema:', JSON.stringify(result, null, 2));
    
    // Also check the enum type
    const enumResult = await prisma.$queryRaw`
      SELECT t.typname, e.enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE t.typname = 'UserStatus'
      ORDER BY e.enumsortorder
    `;
    console.log('UserStatus enum values:', JSON.stringify(enumResult, null, 2));
    
    // Check a sample user
    const user = await prisma.user.findFirst();
    if (user) {
      console.log('Sample user status value:', user.status);
      console.log('Sample user status type:', typeof user.status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();
