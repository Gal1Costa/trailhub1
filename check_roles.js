const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  try {
    const users = await prisma.user.findMany({ 
      select: { role: true, name: true, email: true } 
    });
    
    console.log('Users and their roles:');
    users.forEach(u => console.log(`- ${u.email}: role='${u.role}'`));
    
    console.log('\nRole statistics:');
    const roleCount = {};
    users.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    });
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
