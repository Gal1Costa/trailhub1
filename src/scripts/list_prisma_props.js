const { prisma } = require('../shared/prisma');
const keys = Object.keys(prisma).filter(k => !k.startsWith('_')).sort();
console.log(keys);
