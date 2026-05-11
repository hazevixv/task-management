/**
 * COMPLETE DATABASE MIGRATION
 * Runs all migrations in correct order
 */

const { execSync } = require('child_process');

const migrations = [
  { name: 'Base Tables (projects, tasks)', script: 'scripts/migrate.js' },
  { name: 'Auth & Users', script: 'scripts/migrate-auth.js' },
  { name: 'Chat System & AI Agents', script: 'scripts/setup-chat-system.js' },
  { name: 'Reset Passwords', script: 'scripts/reset-passwords.js' }
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🚀 COMPLETE DATABASE MIGRATION');
console.log('═══════════════════════════════════════════════════════════════\n');

let success = 0;
let failed = 0;

for (let i = 0; i < migrations.length; i++) {
  const migration = migrations[i];
  console.log(`\n📋 Step ${i + 1}/${migrations.length}: ${migration.name}`);
  console.log('─────────────────────────────────────────────────────────────\n');
  
  try {
    execSync(`node ${migration.script}`, { stdio: 'inherit' });
    success++;
  } catch (error) {
    console.error(`\n❌ Failed: ${migration.name}`);
    failed++;
  }
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  📊 MIGRATION SUMMARY');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(`✅ Successful: ${success}/${migrations.length}`);
console.log(`❌ Failed: ${failed}/${migrations.length}\n`);

if (failed === 0) {
  console.log('🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!\n');
  console.log('📝 Default Login Credentials:');
  console.log('   Username: admin   | Password: raytask123');
  console.log('   Username: taufik  | Password: raytask123');
  console.log('   Username: wendra  | Password: raytask123\n');
  console.log('🚀 Start the app:');
  console.log('   npm run dev\n');
  console.log('🌐 Open browser:');
  console.log('   http://localhost:3005/login\n');
} else {
  console.log('⚠️  Some migrations failed. Please check the errors above.\n');
  process.exit(1);
}
