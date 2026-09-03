#!/usr/bin/env node
// rotate-jwt-secret.js
// Usage: node scripts/rotate-jwt-secret.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

async function rotateJwtSecret() {
  console.log('🔐 Rotating JWT_SECRET...');
  
  const oldSecret = process.env.JWT_SECRET;
  const newSecret = await generateSecret(64);
  
  // Update .env file
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  if (envContent.includes('JWT_SECRET=')) {
    envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${newSecret}`);
  } else {
    envContent += `\nJWT_SECRET=${newSecret}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  // Store old secret in database for token validation during transition
  await prisma.systemSetting.upsert({
    where: { key: 'JWT_SECRET_PREVIOUS' },
    update: { value: oldSecret },
    create: { key: 'JWT_SECRET_PREVIOUS', value: oldSecret },
  });
  
  console.log('✅ JWT_SECRET rotated successfully');
  console.log('⚠️  IMPORTANT: Restart all application instances to pick up the new secret');
  console.log('⚠️  Old secret stored as JWT_SECRET_PREVIOUS for transition period');
  
  return newSecret;
}

async function rotateDbPassword() {
  console.log('🔐 Rotating DATABASE_PASSWORD...');
  
  const newPassword = await generateSecret(32);
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  if (envContent.includes('DATABASE_PASSWORD=')) {
    envContent = envContent.replace(/DATABASE_PASSWORD=.*/g, `DATABASE_PASSWORD=${newPassword}`);
  } else {
    envContent += `\nDATABASE_PASSWORD=${newPassword}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ DATABASE_PASSWORD rotated in .env');
  console.log('⚠️  IMPORTANT: Update PostgreSQL user password and restart application');
  console.log(`   New password: ${newPassword}`);
  
  return newPassword;
}

async function rotateSmtpCredentials() {
  console.log('🔐 Rotating SMTP credentials...');
  
  const newSmtpPassword = await generateSecret(32);
  const envPath = path.join(process.cwd(), '.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  
  if (envContent.includes('SMTP_PASSWORD=')) {
    envContent = envContent.replace(/SMTP_PASSWORD=.*/g, `SMTP_PASSWORD=${newSmtpPassword}`);
  } else {
    envContent += `\nSMTP_PASSWORD=${newSmtpPassword}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ SMTP_PASSWORD rotated in .env');
  console.log('⚠️  IMPORTANT: Update SMTP provider with new password');
  
  return newSmtpPassword;
}

async function rotateAll() {
  await rotateJwtSecret();
  await rotateDbPassword();
  await rotateSmtpCredentials();
  
  console.log('\n✅ All secrets rotated!');
  console.log('📋 Next steps:');
  console.log('   1. Update PostgreSQL user password to match new DATABASE_PASSWORD');
  console.log('   2. Update SMTP provider with new SMTP_PASSWORD');
  console.log('   3. Restart all application instances');
  console.log('   4. Verify token validation works with new JWT_SECRET');
}

const args = process.argv.slice(2);

if (args.includes('--all') || args.length === 0) {
  rotateAll().catch(console.error).finally(() => prisma.$disconnect());
} else if (args.includes('--jwt')) {
  rotateJwtSecret().catch(console.error).finally(() => prisma.$disconnect());
} else if (args.includes('--db')) {
  rotateDbPassword().catch(console.error).finally(() => prisma.$disconnect());
} else if (args.includes('--smtp')) {
  rotateSmtpCredentials().catch(console.error).finally(() => prisma.$disconnect());
} else {
  console.log('Usage: node rotate-secrets.js [--all|--jwt|--db|--smtp]');
  process.exit(1);
}