const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function createMissingTables() {
  let connection;
  
  try {
    console.log('🚀 Creating 3 missing tables...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray_task_management',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });
    
    const sql = fs.readFileSync('database/CREATE_MISSING_3_TABLES.sql', 'utf8');
    await connection.query(sql);
    
    console.log('✅ chat_sessions');
    console.log('✅ project_workflow_stages');
    console.log('✅ project_workflow_history\n');
    
    // Verify
    const [tables] = await connection.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ?
    `, [process.env.DB_NAME || 'ray_task_management']);
    
    console.log(`📊 Total tables: ${tables[0].count}\n`);
    console.log('🎉 Done!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createMissingTables();
