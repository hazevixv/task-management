#!/usr/bin/env node

/**
 * Check Environment Variables for Vercel Deployment
 * This script helps you verify all required environment variables are set
 */

require('dotenv').config();

const REQUIRED_VARS = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'GROQ_API_KEY',
  'GROQ_MODEL',
  'AI_PROVIDER',
  'NEXT_PUBLIC_APP_NAME',
  'NEXT_PUBLIC_APP_VERSION'
];

const OPTIONAL_VARS = [
  'DISABLE_CONSOLE_LOGS',
  'ENABLE_DEBUG_LOGS'
];

console.log('\n🔍 Checking Environment Variables for Vercel Deployment\n');
console.log('=' .repeat(60));

let allPresent = true;
let warnings = [];

// Check required variables
console.log('\n✅ Required Variables:\n');
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    let displayValue = value;
    if (varName.includes('PASSWORD') || varName.includes('KEY')) {
      displayValue = value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }
    console.log(`  ✓ ${varName.padEnd(30)} = ${displayValue}`);
  } else {
    console.log(`  ✗ ${varName.padEnd(30)} = MISSING!`);
    allPresent = false;
  }
});

// Check optional variables
console.log('\n📋 Optional Variables:\n');
OPTIONAL_VARS.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✓ ${varName.padEnd(30)} = ${value}`);
  } else {
    console.log(`  - ${varName.padEnd(30)} = Not set (using default)`);
    warnings.push(varName);
  }
});

console.log('\n' + '='.repeat(60));

// Summary
if (allPresent) {
  console.log('\n✅ All required environment variables are set!');
  console.log('\n📋 Copy these to Vercel:');
  console.log('   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
  console.log('   2. Add each variable with its value from your .env file');
  console.log('   3. Make sure to add for Production, Preview, and Development environments');
  console.log('\n💡 Tip: You can copy values directly from your .env file');
} else {
  console.log('\n❌ Some required variables are missing!');
  console.log('   Please check your .env file and add the missing variables.');
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} optional variable(s) not set (will use defaults)`);
}

// Verify database connection format
console.log('\n🔍 Database Configuration Check:\n');
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;
const dbName = process.env.DB_NAME;

if (dbHost && dbHost.includes('aivencloud.com')) {
  console.log('  ✓ Using Aiven MySQL (Free tier)');
} else if (dbHost) {
  console.log(`  ⚠️  Database host: ${dbHost}`);
  console.log('     Make sure this is accessible from Vercel servers');
}

if (dbPort && dbPort !== '3306') {
  console.log(`  ℹ️  Using custom port: ${dbPort}`);
}

if (dbName) {
  console.log(`  ✓ Database name: ${dbName}`);
}

// Verify AI configuration
console.log('\n🤖 AI Configuration Check:\n');
const aiProvider = process.env.AI_PROVIDER;
const groqKey = process.env.GROQ_API_KEY;
const groqModel = process.env.GROQ_MODEL;

if (aiProvider === 'groq') {
  console.log('  ✓ Using Groq AI (Fast & Free)');
  if (groqKey) {
    console.log(`  ✓ Groq API Key: ${groqKey.substring(0, 8)}...${groqKey.substring(groqKey.length - 4)}`);
  }
  if (groqModel) {
    console.log(`  ✓ Model: ${groqModel}`);
    if (groqModel === 'openai/gpt-oss-20b') {
      console.log('    (1000 tokens/sec - Excellent choice!)');
    }
  }
} else {
  console.log(`  ⚠️  AI Provider: ${aiProvider || 'Not set'}`);
}

console.log('\n' + '='.repeat(60));
console.log('\n🚀 Ready to deploy to Vercel!');
console.log('\nNext steps:');
console.log('  1. Push to GitHub: git push origin main');
console.log('  2. Vercel will auto-deploy');
console.log('  3. Add environment variables in Vercel dashboard');
console.log('  4. Redeploy if needed\n');
