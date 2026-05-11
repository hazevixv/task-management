/**
 * Run final missing tables migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function runFinalMigration() {
  let connection;
  
  try {
    console.log('🚀 Running final missing tables migration...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray_task_management',
      port: parseInt(process.env.DB_PORT || '3306'),
      multipleStatements: true
    });
    
    console.log('✅ Connected to database\n');
    
    // Read and execute SQL file
    const sql = fs.readFileSync('database/FINAL_MISSING_TABLES.sql', 'utf8');
    await connection.query(sql);
    
    console.log('✅ chat_sessions table created');
    console.log('✅ project_workflow_stages table created');
    console.log('✅ project_workflow_history table created');
    console.log('✅ session_id column added to chat_messages\n');
    
    // Verify tables
    const [tables] = await connection.query(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      ORDER BY table_name
    `, [process.env.DB_NAME || 'ray_task_management']);
    
    console.log('📊 All tables in database:');
    console.log('─────────────────────────────────────────');
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${table.table_name.padEnd(35, ' ')} (${table.table_rows} rows)`);
    });
    console.log('─────────────────────────────────────────');
    console.log(`\n✅ Total: ${tables.length} tables\n`);
    
    console.log('🎉 Final migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed');
    }
  }
}

runFinalMigration();
