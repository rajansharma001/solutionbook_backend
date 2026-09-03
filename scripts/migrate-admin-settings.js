#!/usr/bin/env node
// migrate-admin-settings.js
// Moves admin settings from JSON file to database SystemSetting table

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateAdminSettings() {
  console.log('📦 Migrating admin settings from JSON to database...');
  
  const settingsFilePath = path.join(process.cwd(), 'settings.json');
  
  if (!fs.existsSync(settingsFilePath)) {
    console.log('⚠️  No settings.json found, skipping migration');
    return;
  }
  
  const fileContent = fs.readFileSync(settingsFilePath, 'utf8');
  let settings;
  
  try {
    settings = JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Failed to parse settings.json:', error.message);
    process.exit(1);
  }
  
  console.log('📋 Found settings:', Object.keys(settings).join(', '));
  
  // Migrate each setting to SystemSetting table
  for (const [key, value] of Object.entries(settings)) {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    
    await prisma.systemSetting.upsert({
      where: { key: `ADMIN_${key.toUpperCase()}` },
      update: { value: valueStr },
      create: { key: `ADMIN_${key.toUpperCase()}`, value: valueStr },
    });
    
    console.log(`  ✅ Migrated: ${key}`);
  }
  
  // Backup original file
  const backupPath = `${settingsFilePath}.backup.${Date.now()}`;
  fs.copyFileSync(settingsFilePath, backupPath);
  console.log(`📁 Backed up original to: ${backupPath}`);
  
  // Remove original file
  fs.unlinkSync(settingsFilePath);
  console.log('🗑️  Removed settings.json');
  
  console.log('✅ Admin settings migration complete!');
  console.log('💡 Settings now managed via SettingsService and /admin/settings endpoints');
}

migrateAdminSettings()
  .catch(console.error)
  .finally(() => prisma.$disconnect());