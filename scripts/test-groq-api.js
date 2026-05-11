#!/usr/bin/env node

/**
 * Test Groq API Connection
 */

require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

console.log('\n🔍 Testing Groq API Connection\n');
console.log('='.repeat(60));
console.log(`\nAPI Key: ${GROQ_API_KEY ? GROQ_API_KEY.substring(0, 10) + '...' + GROQ_API_KEY.substring(GROQ_API_KEY.length - 4) : 'NOT SET'}`);
console.log(`Model: ${GROQ_MODEL}`);
console.log('\n' + '='.repeat(60));

if (!GROQ_API_KEY) {
  console.log('\n❌ GROQ_API_KEY not set in .env file!');
  process.exit(1);
}

async function testGroqAPI() {
  try {
    console.log('\n📡 Sending test request to Groq API...\n');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{
          role: 'user',
          content: 'Say "Hello from Groq!" in one sentence.'
        }],
        temperature: 0.7,
        max_tokens: 50
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('\n❌ Groq API Error:');
      console.log(errorText);
      
      if (response.status === 401) {
        console.log('\n⚠️  Error 401: Unauthorized');
        console.log('   Possible causes:');
        console.log('   1. API key is invalid or expired');
        console.log('   2. API key format is incorrect');
        console.log('   3. API key doesn\'t have permission for this model');
        console.log('\n💡 Solution:');
        console.log('   1. Go to https://console.groq.com/keys');
        console.log('   2. Create a new API key');
        console.log('   3. Update GROQ_API_KEY in .env file');
      }
      
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('\n✅ Groq API is working!');
    console.log('\n📝 Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.choices && data.choices[0]) {
      console.log('\n💬 AI Response:');
      console.log(`   "${data.choices[0].message.content}"`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 All tests passed! Groq API is ready to use.\n');
    
  } catch (error) {
    console.log('\n❌ Error testing Groq API:');
    console.log(error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n⚠️  Network error. Check your internet connection.');
    }
    
    process.exit(1);
  }
}

testGroqAPI();
