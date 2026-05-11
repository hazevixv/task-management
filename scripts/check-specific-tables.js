const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray_task_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    const tablesToCheck = ['chat_sessions', 'project_workflow_stages', 'project_workflow_history'];
    
    console.log('\n🔍 Checking specific tables:\n');
    
    for (const table of tablesToCheck) {
      try {
        const [result] = await connection.query(`SHOW TABLES LIKE '${table}'`);
        if (result.length > 0) {
          console.log(`✅ ${table} EXISTS`);
        } else {
          console.log(`❌ ${table} NOT FOUND`);
        }
      } catch (error) {
        console.log(`❌ ${table} ERROR: ${error.message}`);
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkTables();
