import { query } from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { normalizeText, replaceInCsvList } from '@/lib/normalizers';

export interface BrainConfig extends RowDataPacket {
  id: number;
  config_type: 'team' | 'status' | 'priority' | 'progress' | 'category';
  config_value: string;
  category_tag?: string | null; // Tag for categories: Perusahaan, Unit Bisnis, Brand, Produk, Lainnya
  display_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface BrainDefault extends RowDataPacket {
  id: number;
  default_key: string;
  default_value: string;
  updated_at: Date;
}

export class BrainModel {
  static readonly defaultTypeMap = {
    default_category: 'category',
    default_status: 'status',
    default_priority: 'priority',
    default_progress: 'progress'
  } as const;

  static isValidType(type: string): type is 'team' | 'status' | 'priority' | 'progress' | 'category' {
    return ['team', 'status', 'priority', 'progress', 'category'].includes(type);
  }

  // Get all config by type (with tags for categories, with job_position for team)
  // For team type, optionally filter by username to get only their organizational team members
  static async getConfigByType(type: string, username?: string): Promise<any[]> {
    if (type === 'category') {
      // Return full objects with tags for categories
      const results = await query<BrainConfig[]>(
        'SELECT config_value, category_tag FROM brain_config WHERE config_type = ? AND is_active = TRUE ORDER BY display_order',
        [type]
      );
      return results.map(r => ({ value: r.config_value, tag: r.category_tag || 'Lainnya' }));
    } else if (type === 'team') {
      // If username is provided, get team members from user's organizational units
      if (username) {
        console.log(`[BrainModel] Getting team members for user: ${username}`);
        
        // Get all organizational units where this user is assigned
        const userUnits = await query<any[]>(`
          SELECT ous.org_unit_id, ou.unit_name, ou.unit_type, ou.color
          FROM org_unit_staff ous
          JOIN organizational_units ou ON ous.org_unit_id = ou.id
          WHERE ous.username = ? AND ou.is_active = 1
          ORDER BY ous.is_primary DESC, ou.unit_name ASC
        `, [username]);

        console.log(`[BrainModel] User ${username} is in ${userUnits.length} organizational units`);

        if (userUnits.length === 0) {
          console.log(`[BrainModel] User ${username} has no organizational assignments, returning empty team list`);
          return [];
        }

        const unitIds = userUnits.map(u => u.org_unit_id);

        // Get all team members from these units (excluding the current user), with their unit info
        const results = await query<any[]>(`
          SELECT 
            ous.username,
            ous.role as team_role,
            ous.org_unit_id,
            u.full_name,
            u.job_position,
            u.avatar,
            ou.unit_name,
            ou.unit_type,
            ou.color
          FROM org_unit_staff ous
          JOIN users u ON ous.username = u.username
          JOIN organizational_units ou ON ous.org_unit_id = ou.id
          WHERE ous.org_unit_id IN (${unitIds.map(() => '?').join(',')})
            AND u.is_active = 1
            AND ous.username != ?
          ORDER BY ou.unit_name ASC, u.full_name ASC
        `, [...unitIds, username]);

        console.log(`[BrainModel] Found ${results.length} team member rows for user ${username}`);

        // Group by unit for display, but also return flat list for compatibility
        // Each member gets a 'unit_name' field showing which unit they're from
        // If a member is in multiple shared units, they appear once per unit
        const seen = new Set<string>();
        const flatMembers = results.map(r => ({
          value: r.username,
          full_name: r.full_name,
          job_position: r.unit_name, // Show unit name as job position label
          avatar: r.avatar,
          unit_name: r.unit_name,
          unit_type: r.unit_type,
          unit_color: r.color,
          team_role: r.team_role,
          org_unit_id: r.org_unit_id
        }));

        // Also build grouped structure
        const grouped: Record<number, { unit_name: string; unit_type: string; color: string; members: any[] }> = {};
        for (const r of results) {
          if (!grouped[r.org_unit_id]) {
            grouped[r.org_unit_id] = {
              unit_name: r.unit_name,
              unit_type: r.unit_type,
              color: r.color,
              members: []
            };
          }
          grouped[r.org_unit_id].members.push({
            value: r.username,
            full_name: r.full_name,
            job_position: r.job_position,
            avatar: r.avatar,
            team_role: r.team_role
          });
        }

        // Return flat list but with unit info attached
        return flatMembers;
      } else {
        console.log(`[BrainModel] Getting all team members from brain_config (admin mode)`);
        
        // Return all team members from brain_config (admin view)
        const results = await query<any[]>(
          `SELECT bc.config_value as username, u.full_name, u.job_position, u.avatar
           FROM brain_config bc
           LEFT JOIN users u ON u.username = bc.config_value
           WHERE bc.config_type = ? AND bc.is_active = TRUE
           ORDER BY bc.display_order`,
          [type]
        );
        
        console.log(`[BrainModel] Found ${results.length} team members from brain_config`);
        
        return results.map(r => ({
          value: r.username,
          full_name: r.full_name,
          job_position: r.job_position,
          avatar: r.avatar
        }));
      }
    } else {
      // Return simple strings for other types
      const results = await query<BrainConfig[]>(
        'SELECT config_value FROM brain_config WHERE config_type = ? AND is_active = TRUE ORDER BY display_order',
        [type]
      );
      return results.map(r => r.config_value);
    }
  }

  // Get all configs grouped
  // For non-admin users, pass username to filter team members by organizational assignments
  static async getAllConfigs(username?: string) {
    const [team, status, priority, progress, categories] = await Promise.all([
      this.getConfigByType('team', username),
      this.getConfigByType('status'),
      this.getConfigByType('priority'),
      this.getConfigByType('progress'),
      this.getConfigByType('category'),
    ]);

    return { team, status, priority, progress, categories };
  }

  // Get all defaults
  static async getDefaults() {
    const results = await query<BrainDefault[]>(
      'SELECT default_key, default_value FROM brain_defaults'
    );
    
    const defaults: Record<string, string> = {};
    results.forEach(r => {
      defaults[r.default_key] = r.default_value;
    });
    
    return defaults;
  }

  // Add new config item (with tag for categories)
  static async addConfig(type: string, value: string, tag?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Value is required' };
      }

      // Validate tag for categories
      const validTags = ['Perusahaan', 'Unit Bisnis', 'Brand', 'Produk', 'Lainnya'];
      const categoryTag = type === 'category' && tag ? (validTags.includes(tag) ? tag : 'Lainnya') : null;

      // Check if already exists
      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ?',
        [type, normalizedValue]
      );

      if (existing.length > 0) {
        return { success: false, error: 'Item already exists' };
      }

      // Get next display order
      const maxOrder = await query<any[]>(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM brain_config WHERE config_type = ?',
        [type]
      );

      await query<ResultSetHeader>(
        'INSERT INTO brain_config (config_type, config_value, category_tag, display_order) VALUES (?, ?, ?, ?)',
        [type, normalizedValue, categoryTag, maxOrder[0].max_order + 1]
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update config item (with tag for categories)
  static async updateConfig(type: string, oldValue: string, newValue: string, tag?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedOldValue = normalizeText(oldValue);
      const normalizedNewValue = normalizeText(newValue);

      if (!normalizedOldValue || !normalizedNewValue) {
        return { success: false, error: 'Value is required' };
      }

      // Validate tag for categories
      const validTags = ['Perusahaan', 'Unit Bisnis', 'Brand', 'Produk', 'Lainnya'];
      const categoryTag = type === 'category' && tag ? (validTags.includes(tag) ? tag : 'Lainnya') : null;

      if (normalizedOldValue === normalizedNewValue && (!tag || type !== 'category')) {
        return { success: true };
      }

      // Check if new value already exists (excluding current)
      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ? AND config_value != ?',
        [type, normalizedNewValue, normalizedOldValue]
      );

      if (existing.length > 0) {
        return { success: false, error: 'Item already exists' };
      }

      // Update with tag if category
      if (type === 'category') {
        await query<ResultSetHeader>(
          'UPDATE brain_config SET config_value = ?, category_tag = ? WHERE config_type = ? AND config_value = ?',
          [normalizedNewValue, categoryTag, type, normalizedOldValue]
        );
      } else {
        await query<ResultSetHeader>(
          'UPDATE brain_config SET config_value = ? WHERE config_type = ? AND config_value = ?',
          [normalizedNewValue, type, normalizedOldValue]
        );
      }

      if (type === 'category') {
        await query<ResultSetHeader>(
          'UPDATE projects SET category = ? WHERE category = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'status') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET status = ? WHERE status = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'priority') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET priority = ? WHERE priority = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'progress') {
        await query<ResultSetHeader>(
          'UPDATE tasks SET progress = ? WHERE progress = ?',
          [normalizedNewValue, normalizedOldValue]
        );
      }

      if (type === 'team') {
        await query<ResultSetHeader>(
          'UPDATE projects SET owner = ? WHERE owner = ?',
          [normalizedNewValue, normalizedOldValue]
        );

        const projects = await query<Array<{ project_id: string; assignees: string | null }>>(
          'SELECT project_id, assignees FROM projects WHERE assignees LIKE ?',
          [`%${normalizedOldValue}%`]
        );

        for (const project of projects) {
          await query<ResultSetHeader>(
            'UPDATE projects SET assignees = ? WHERE project_id = ?',
            [replaceInCsvList(project.assignees, normalizedOldValue, normalizedNewValue), project.project_id]
          );
        }

        const tasks = await query<Array<{ task_id: string; assignees: string | null }>>(
          'SELECT task_id, assignees FROM tasks WHERE assignees LIKE ?',
          [`%${normalizedOldValue}%`]
        );

        for (const task of tasks) {
          await query<ResultSetHeader>(
            'UPDATE tasks SET assignees = ? WHERE task_id = ?',
            [replaceInCsvList(task.assignees, normalizedOldValue, normalizedNewValue), task.task_id]
          );
        }
      }

      const defaults = await query<BrainDefault[]>(
        'SELECT default_key, default_value FROM brain_defaults WHERE default_value = ?',
        [normalizedOldValue]
      );

      for (const entry of defaults) {
        await this.updateDefault(entry.default_key, normalizedNewValue);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Delete config item (with usage check)
  static async deleteConfig(type: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isValidType(type)) {
        return { success: false, error: 'Invalid config type' };
      }

      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Value is required' };
      }

      // Check usage in projects
      if (type === 'category') {
        const usedInProjects = await query<any[]>(
          'SELECT COUNT(*) as count FROM projects WHERE category = ?',
          [normalizedValue]
        );
        if (usedInProjects[0].count > 0) {
          return { success: false, error: `Used in ${usedInProjects[0].count} project(s)` };
        }
      }

      if (type === 'team') {
        const [usedInOwners, usedInProjectAssignees, usedInTaskAssignees] = await Promise.all([
          query<any[]>('SELECT COUNT(*) as count FROM projects WHERE owner = ?', [normalizedValue]),
          query<any[]>('SELECT COUNT(*) as count FROM projects WHERE assignees LIKE ?', [`%${normalizedValue}%`]),
          query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE assignees LIKE ?', [`%${normalizedValue}%`])
        ]);
        const total = usedInOwners[0].count + usedInProjectAssignees[0].count + usedInTaskAssignees[0].count;
        if (total > 0) {
          return { success: false, error: `Assigned to ${total} item(s)` };
        }
      }

      if (type === 'status') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE status = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      if (type === 'priority') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE priority = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      if (type === 'progress') {
        const usedInTasks = await query<any[]>('SELECT COUNT(*) as count FROM tasks WHERE progress = ?', [normalizedValue]);
        if (usedInTasks[0].count > 0) {
          return { success: false, error: `Used in ${usedInTasks[0].count} task(s)` };
        }
      }

      const usedInDefaults = await query<any[]>(
        'SELECT COUNT(*) as count FROM brain_defaults WHERE default_value = ?',
        [normalizedValue]
      );
      if (usedInDefaults[0].count > 0) {
        return { success: false, error: 'Used in default configuration' };
      }

      await query<ResultSetHeader>(
        'DELETE FROM brain_config WHERE config_type = ? AND config_value = ?',
        [type, normalizedValue]
      );

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Update default value
  static async updateDefault(key: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const mappedType = this.defaultTypeMap[key as keyof typeof this.defaultTypeMap];
      if (!mappedType) {
        return { success: false, error: 'Invalid default key' };
      }

      const normalizedValue = normalizeText(value);
      if (!normalizedValue) {
        return { success: false, error: 'Default value is required' };
      }

      const existing = await query<BrainConfig[]>(
        'SELECT id FROM brain_config WHERE config_type = ? AND config_value = ? AND is_active = TRUE LIMIT 1',
        [mappedType, normalizedValue]
      );

      if (existing.length === 0) {
        return { success: false, error: 'Default value must exist in configuration list' };
      }

      await query<ResultSetHeader>(
        'INSERT INTO brain_defaults (default_key, default_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE default_value = ?',
        [key, normalizedValue, normalizedValue]
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
