const mysql = require('mysql2/promise');
require('dotenv').config();

async function showContent() {
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
    console.log('  📊 DATABASE CONTENT - AIVEN MYSQL');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    
    for (const tableRow of tables) {
      const tableName = Object.values(tableRow)[0];
      
      // Count rows
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const rowCount = countResult[0].count;
      
      console.log(`\n📋 TABLE: ${tableName}`);
      console.log('─────────────────────────────────────────────────────────────');
      console.log(`   Rows: ${rowCount}`);
      
      if (rowCount > 0 && rowCount <= 10) {
        // Show data for small tables
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 5`);
        console.log('   Sample data:');
        rows.forEach((row, i) => {
          console.log(`   ${i + 1}.`, JSON.stringify(row, null, 2).substring(0, 200));
        });
      } else if (rowCount > 10) {
        // Show first 3 rows for large tables
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\` LIMIT 3`);
        console.log('   First 3 rows:');
        rows.forEach((row, i) => {
          const keys = Object.keys(row).slice(0, 5); // Show first 5 columns
          const preview = {};
          keys.forEach(k => preview[k] = row[k]);
          console.log(`   ${i + 1}.`, JSON.stringify(preview));
        });
      } else {
        console.log('   (empty)');
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  ✅ Total: ${tables.length} tables`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

showContent();
