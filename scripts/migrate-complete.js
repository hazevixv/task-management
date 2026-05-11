const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

async function migrate() {
  let connection;
  
  try {
    console.log('🚀 Starting COMPLETE migration to Aiven...\n');
    
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to Aiven MySQL\n');

    // Run all SQL files in order
    const migrations = [
      'chat_sessions',
      'organizational_tree',
      'employees',
      'project_workflow',
      'team_members',
      'divisions',
      'notifications'
    ];

    for (const migration of migrations) {
      console.log(`📋 Running: ${migration}...`);
      
      let sql = '';
      
      if (migration === 'chat_sessions') {
        sql = `
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
  INDEX idx_conv_id (conv_id),
  INDEX idx_updated_at (updated_at DESC),
  INDEX idx_folder (folder),
  INDEX idx_archived (is_archived)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      }
      
      else if (migration === 'organizational_tree') {
        sql = `
CREATE TABLE IF NOT EXISTS organizational_units (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_code VARCHAR(50) UNIQUE NOT NULL,
  unit_name VARCHAR(200) NOT NULL,
  unit_type ENUM('company', 'brand', 'product', 'division', 'department', 'team', 'unit') NOT NULL,
  parent_id INT DEFAULT NULL,
  level INT DEFAULT 0,
  path VARCHAR(500) DEFAULT NULL,
  sort_order INT DEFAULT 0,
  owner_username VARCHAR(50) DEFAULT NULL,
  direksi_username VARCHAR(50) DEFAULT NULL,
  manager_username VARCHAR(50) DEFAULT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#7c3aed',
  icon VARCHAR(50) DEFAULT 'building',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50) DEFAULT NULL,
  INDEX idx_parent (parent_id),
  INDEX idx_path (path),
  INDEX idx_type (unit_type),
  INDEX idx_level (level),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO organizational_units (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon) VALUES
('RAYMATING', 'Raymating', 'company', NULL, 0, '/RAYMATING', 1, '#7c3aed', 'building-2'),
('BRAND_A', 'Brand A', 'brand', 1, 1, '/RAYMATING/BRAND_A', 1, '#3b82f6', 'award'),
('BRAND_B', 'Brand B', 'brand', 1, 1, '/RAYMATING/BRAND_B', 2, '#10b981', 'award'),
('PRODUCT_A1', 'Product A1', 'product', 2, 2, '/RAYMATING/BRAND_A/PRODUCT_A1', 1, '#f59e0b', 'package'),
('PRODUCT_A2', 'Product A2', 'product', 2, 2, '/RAYMATING/BRAND_A/PRODUCT_A2', 2, '#f59e0b', 'package'),
('CREATIVE', 'Creative Division', 'division', 1, 1, '/RAYMATING/CREATIVE', 3, '#ec4899', 'palette'),
('IT_SUPPORT', 'IT Support', 'division', 1, 1, '/RAYMATING/IT_SUPPORT', 4, '#8b5cf6', 'code'),
('GA_SUPPORT', 'GA & Support', 'division', 1, 1, '/RAYMATING/GA_SUPPORT', 5, '#06b6d4', 'users'),
('CREATIVE_CONTENT', 'Content Team', 'department', 6, 2, '/RAYMATING/CREATIVE/CREATIVE_CONTENT', 1, '#ec4899', 'file-text'),
('CREATIVE_DESIGN', 'Design Team', 'department', 6, 2, '/RAYMATING/CREATIVE/CREATIVE_DESIGN', 2, '#ec4899', 'pen-tool'),
('IT_DEV', 'Development Team', 'team', 7, 2, '/RAYMATING/IT_SUPPORT/IT_DEV', 1, '#8b5cf6', 'code-2'),
('IT_INFRA', 'Infrastructure Team', 'team', 7, 2, '/RAYMATING/IT_SUPPORT/IT_INFRA', 2, '#8b5cf6', 'server');`;
      }
      
      else if (migration === 'employees') {
        sql = `
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  job_position VARCHAR(255),
  email VARCHAR(255),
  avatar_path VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      }
      
      else if (migration === 'project_workflow') {
        sql = `
CREATE TABLE IF NOT EXISTS project_workflow_templates (
  template_id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  stages JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_project (project_id),
  INDEX idx_status (status),
  INDEX idx_order (stage_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
  INDEX idx_project (project_id),
  INDEX idx_stage (stage_id),
  INDEX idx_changed_at (changed_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      }
      
      else if (migration === 'team_members') {
        sql = `
CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(100),
  department VARCHAR(100),
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      }
      
      else if (migration === 'divisions') {
        sql = `
CREATE TABLE IF NOT EXISTS divisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  division_code VARCHAR(50) UNIQUE NOT NULL,
  division_name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#7c3aed',
  icon VARCHAR(50) DEFAULT 'building',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO divisions (division_code, division_name, description, color, icon) VALUES
('CREATIVE', 'Creative Division', 'Design and content creation', '#ec4899', 'palette'),
('IT', 'IT Support', 'Technology and infrastructure', '#8b5cf6', 'code'),
('GA', 'GA & Support', 'General affairs and support', '#06b6d4', 'users'),
('MARKETING', 'Marketing', 'Marketing and sales', '#10b981', 'megaphone'),
('PRODUCTION', 'Production', 'Manufacturing and production', '#f59e0b', 'factory');`;
      }
      
      else if (migration === 'notifications') {
        sql = `
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_read (is_read),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      }
      
      await connection.query(sql);
      console.log(`   ✅ ${migration} completed\n`);
    }

    // Verify tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n📊 Total tables: ${tables.length}`);
    console.log('✅ ALL MIGRATIONS COMPLETED!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
