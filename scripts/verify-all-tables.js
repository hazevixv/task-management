const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray_task_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    const [tables] = await connection.query(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      ORDER BY table_name
    `, [process.env.DB_NAME || 'ray_task_management']);
    
    console.log('\n📊 ALL TABLES IN DATABASE:');
    console.log('═══════════════════════════════════════════════════════');
    tables.forEach((table, index) => {
      const num = (index + 1).toString().padStart(2, ' ');
      const name = table.table_name || table.TABLE_NAME;
      const rows = table.table_rows || table.TABLE_ROWS || 0;
      console.log(`${num}. ${name.padEnd(40, ' ')} ${rows} rows`);
    });
    console.log('═══════════════════════════════════════════════════════');
    console.log(`\n✅ TOTAL: ${tables.length} tables\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

verifyTables();
