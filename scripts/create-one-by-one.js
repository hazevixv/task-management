const mysql = require('mysql2/promise');
require('dotenv').config();

async function createOneByOne() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ray_task_management',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    console.log('\n🚀 Creating tables one by one...\n');
    
    // Table 1: chat_sessions
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          session_id VARCHAR(50) PRIMARY KEY,
          conv_id VARCHAR(50) NOT NULL,
          title VARCHAR(255) DEFAULT 'New Chat',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          last_message_at TIMESTAMP NULL,
          message_count INT DEFAULT 0,
          folder VARCHAR(100) DEFAULT 'general',
          is_archived BOOLEAN DEFAULT FALSE,
          is_pinned BOOLEAN DEFAULT FALSE,
          FOREIGN KEY (conv_id) REFERENCES chat_conversations(conv_id) ON DELETE CASCADE,
          INDEX idx_conv_id (conv_id),
          INDEX idx_updated_at (updated_at DESC),
          INDEX idx_folder (folder),
          INDEX idx_archived (is_archived)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ chat_sessions created');
    } catch (error) {
      console.log(`❌ chat_sessions failed: ${error.message}`);
    }
    
    // Table 2: project_workflow_stages
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS project_workflow_stages (
          stage_id VARCHAR(50) PRIMARY KEY,
          project_id VARCHAR(50) NOT NULL,
          stage_name VARCHAR(100) NOT NULL,
          stage_order INT NOT NULL,
          assigned_unit_id INT,
          assigned_division VARCHAR(100),
          status ENUM('waiting', 'in_progress', 'completed', 'blocked') DEFAULT 'waiting',
          started_at TIMESTAMP NULL,
          completed_at TIMESTAMP NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
          INDEX idx_project (project_id),
          INDEX idx_status (status),
          INDEX idx_order (stage_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ project_workflow_stages created');
    } catch (error) {
      console.log(`❌ project_workflow_stages failed: ${error.message}`);
    }
    
    // Table 3: project_workflow_history
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS project_workflow_history (
          history_id INT AUTO_INCREMENT PRIMARY KEY,
          stage_id VARCHAR(50) NOT NULL,
          project_id VARCHAR(50) NOT NULL,
          old_status VARCHAR(50),
          new_status VARCHAR(50),
          changed_by VARCHAR(100),
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          duration_minutes INT,
          FOREIGN KEY (stage_id) REFERENCES project_workflow_stages(stage_id) ON DELETE CASCADE,
          FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
          FOREIGN KEY (changed_by) REFERENCES users(username) ON DELETE SET NULL,
          INDEX idx_project (project_id),
          INDEX idx_stage (stage_id),
          INDEX idx_changed_at (changed_at DESC)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ project_workflow_history created');
    } catch (error) {
      console.log(`❌ project_workflow_history failed: ${error.message}`);
    }
    
    console.log('\n🎉 Done!\n');
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

createOneByOne();
