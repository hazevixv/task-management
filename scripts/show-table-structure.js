const mysql = require('mysql2/promise');
require('dotenv').config();

async function showStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  📊 DATABASE STRUCTURE - inyourhaze-db');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      // Get table structure
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      
      // Count rows
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;
      
      console.log(`\n📋 TABLE: ${tableName} (${rowCount} rows)`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log('   COLUMNS:');
      
      columns.forEach(col => {
        const key = col.Key === 'PRI' ? '🔑' : col.Key === 'MUL' ? '🔗' : '  ';
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const extra = col.Extra ? `(${col.Extra})` : '';
        console.log(`   ${key} ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${nullable.padEnd(10)} ${extra}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Total: ${tables.length} tables`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n  Legend:');
    console.log('  🔑 = Primary Key');
    console.log('  🔗 = Foreign Key / Index');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

showStructure();
