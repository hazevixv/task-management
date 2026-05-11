const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAiven() {
  let connection;
  
  try {
    console.log('🔍 Checking Aiven connection...\n');
    console.log('Host:', process.env.DB_HOST);
    console.log('Port:', process.env.DB_PORT);
    console.log('User:', process.env.DB_USER);
    console.log('Database:', process.env.DB_NAME);
    console.log('');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Connected to Aiven!\n');
    
    // Check tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`📊 Total tables: ${tables.length}\n`);
    
    // Check users
    const [users] = await connection.query('SELECT username, full_name FROM users');
    console.log('👥 Users:');
    users.forEach(u => console.log(`   - ${u.username} (${u.full_name})`));
    console.log('');
    
    // Check organizational units
    const [orgs] = await connection.query('SELECT COUNT(*) as count FROM organizational_units');
    console.log(`🏢 Organizational units: ${orgs[0].count}`);
    
    // Check AI agents
    const [agents] = await connection.query('SELECT COUNT(*) as count FROM ai_agents');
    console.log(`🤖 AI agents: ${agents[0].count}`);
    
    console.log('\n✅ Database is working perfectly!');
    console.log('\n🚀 Ready to deploy to Vercel!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkAiven();
