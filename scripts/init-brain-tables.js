/**
 * Initialize brain_config and brain_defaults tables
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initBrainTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'raymaizing_task'
  });

  console.log('✓ Connected to database');

  try {
    // Check if brain_config table exists
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'brain_config'"
    );

    if (tables.length === 0) {
      console.log('Creating brain_config table...');
      
      await connection.query(`
        CREATE TABLE brain_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          config_type ENUM('team', 'status', 'priority', 'progress', 'category') NOT NULL,
          config_value VARCHAR(100) NOT NULL,
          display_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_config (config_type, config_value),
          INDEX idx_type (config_type),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✓ brain_config table created');

      // Insert default values
      console.log('Inserting default config values...');
      
      const defaultConfigs = [
        // Team
        ['team', 'taufik', 1],
        ['team', 'riky', 2],
        ['team', 'taufik', 3],
        
        // Status
        ['status', 'Backlog', 1],
        ['status', 'Minggu Ini', 2],
        ['status', 'In Progress', 3],
        ['status', 'Done', 4],
        ['status', 'On Hold', 5],
        ['status', 'Closed', 6],
        
        // Priority
        ['priority', 'Urgent', 1],
        ['priority', 'High', 2],
        ['priority', 'Normal', 3],
        ['priority', 'Low', 4],
        ['priority', 'Recurring', 5],
        
        // Progress
        ['progress', '0%', 1],
        ['progress', '25%', 2],
        ['progress', '50%', 3],
        ['progress', '75%', 4],
        ['progress', '100%', 5],
        
        // Category
        ['category', 'raymaizing', 1],
        ['category', 'Internal', 2],
        ['category', 'Client Project', 3],
      ];

      for (const [type, value, order] of defaultConfigs) {
        await connection.query(
          'INSERT IGNORE INTO brain_config (config_type, config_value, display_order) VALUES (?, ?, ?)',
          [type, value, order]
        );
      }
      
      console.log('✓ Default config values inserted');
    } else {
      console.log('✓ brain_config table already exists');
    }

    // Check if brain_defaults table exists
    const [defaultsTables] = await connection.query(
      "SHOW TABLES LIKE 'brain_defaults'"
    );

    if (defaultsTables.length === 0) {
      console.log('Creating brain_defaults table...');
      
      await connection.query(`
        CREATE TABLE brain_defaults (
          id INT AUTO_INCREMENT PRIMARY KEY,
          default_key VARCHAR(50) NOT NULL UNIQUE,
          default_value VARCHAR(100) NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_key (default_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✓ brain_defaults table created');

      // Insert default values
      console.log('Inserting default values...');
      
      const defaults = [
        ['default_category', 'raymaizing'],
        ['default_status', 'Backlog'],
        ['default_priority', 'Normal'],
        ['default_progress', '0%'],
      ];

      for (const [key, value] of defaults) {
        await connection.query(
          'INSERT IGNORE INTO brain_defaults (default_key, default_value) VALUES (?, ?)',
          [key, value]
        );
      }
      
      console.log('✓ Default values inserted');
    } else {
      console.log('✓ brain_defaults table already exists');
    }

    // Verify data
    const [configCount] = await connection.query(
      'SELECT COUNT(*) as count FROM brain_config'
    );
    const [defaultsCount] = await connection.query(
      'SELECT COUNT(*) as count FROM brain_defaults'
    );

    console.log(`\n✅ Initialization complete!`);
    console.log(`   - brain_config: ${configCount[0].count} entries`);
    console.log(`   - brain_defaults: ${defaultsCount[0].count} entries`);

  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await connection.end();
    console.log('✓ Database connection closed');
  }
}

initBrainTables().catch(console.error);
