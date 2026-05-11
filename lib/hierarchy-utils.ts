import { query } from './db';

export interface User {
  username: string;
  full_name: string;
  role: string;
  hierarchy_level: 'owner' | 'direksi' | 'manager' | 'staff';
  division?: string;
  manager_username?: string;
  direksi_username?: string;
}

/**
 * Get all users that the current user can see based on hierarchy
 */
export async function getVisibleUsers(currentUser: User): Promise<string[]> {
  // Owner can see everyone
  if (currentUser.hierarchy_level === 'owner') {
    const allUsers = await query<any[]>('SELECT username FROM users WHERE is_active = 1');
    return allUsers.map(u => u.username);
  }

  // Direksi can see all managers and staff
  if (currentUser.hierarchy_level === 'direksi') {
    const users = await query<any[]>(
      `SELECT username FROM users 
       WHERE is_active = 1 
       AND (hierarchy_level IN ('manager', 'staff') OR direksi_username = ?)`,
      [currentUser.username]
    );
    return users.map(u => u.username);
  }

  // Manager can see all staff in their divisions
  if (currentUser.hierarchy_level === 'manager') {
    const users = await query<any[]>(
      `SELECT username FROM users 
       WHERE is_active = 1 
       AND (manager_username = ? OR username = ?)`,
      [currentUser.username, currentUser.username]
    );
    return users.map(u => u.username);
  }

  // Staff can only see team members in same division
  if (currentUser.hierarchy_level === 'staff' && currentUser.division) {
    const users = await query<any[]>(
      `SELECT username FROM users 
       WHERE is_active = 1 
       AND division = ?`,
      [currentUser.division]
    );
    return users.map(u => u.username);
  }

  // Default: only see self
  return [currentUser.username];
}

/**
 * Check if user can view a specific project/task
 */
export async function canViewItem(
  currentUser: User,
  itemType: 'project' | 'task',
  itemId: string
): Promise<boolean> {
  // Owner can see everything
  if (currentUser.hierarchy_level === 'owner') {
    return true;
  }

  // Get item details
  const table = itemType === 'project' ? 'projects' : 'tasks';
  const items = await query<any[]>(
    `SELECT owner, created_by, division, visibility FROM ${table} WHERE ${itemType === 'project' ? 'project_id' : 'task_id'} = ?`,
    [itemId]
  );

  if (items.length === 0) return false;
  const item = items[0];

  // Check if user is owner or creator
  if (item.owner === currentUser.username || item.created_by === currentUser.username) {
    return true;
  }

  // Check if user is in team members
  const teamMembers = await query<any[]>(
    'SELECT username FROM team_members WHERE item_type = ? AND item_id = ? AND username = ?',
    [itemType, itemId, currentUser.username]
  );
  if (teamMembers.length > 0) {
    return true;
  }

  // Check visibility based on hierarchy
  if (item.visibility === 'public') {
    return true;
  }

  if (item.visibility === 'direksi' && ['direksi', 'owner'].includes(currentUser.hierarchy_level)) {
    return true;
  }

  if (item.visibility === 'manager' && ['manager', 'direksi', 'owner'].includes(currentUser.hierarchy_level)) {
    return true;
  }

  if (item.visibility === 'division') {
    // Check if same division
    if (item.division === currentUser.division) {
      return true;
    }

    // Manager can see all divisions under them
    if (currentUser.hierarchy_level === 'manager') {
      const divisions = await query<any[]>(
        'SELECT division_code FROM divisions WHERE manager_username = ?',
        [currentUser.username]
      );
      if (divisions.some(d => d.division_code === item.division)) {
        return true;
      }
    }

    // Direksi can see all divisions under them
    if (currentUser.hierarchy_level === 'direksi') {
      const divisions = await query<any[]>(
        'SELECT division_code FROM divisions WHERE direksi_username = ?',
        [currentUser.username]
      );
      if (divisions.some(d => d.division_code === item.division)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get filter SQL for projects/tasks based on user hierarchy
 */
export function getHierarchyFilterSQL(currentUser: User, tableAlias: string = ''): string {
  const prefix = tableAlias ? `${tableAlias}.` : '';

  // Owner sees everything
  if (currentUser.hierarchy_level === 'owner') {
    return '1=1';
  }

  // Direksi sees everything except private items they don't own
  if (currentUser.hierarchy_level === 'direksi') {
    return `(
      ${prefix}visibility IN ('public', 'direksi', 'manager', 'division')
      OR ${prefix}owner = '${currentUser.username}'
      OR ${prefix}created_by = '${currentUser.username}'
    )`;
  }

  // Manager sees their divisions and public items
  if (currentUser.hierarchy_level === 'manager') {
    return `(
      ${prefix}visibility IN ('public', 'manager', 'division')
      OR ${prefix}owner = '${currentUser.username}'
      OR ${prefix}created_by = '${currentUser.username}'
      OR ${prefix}division IN (SELECT division_code FROM divisions WHERE manager_username = '${currentUser.username}')
    )`;
  }

  // Staff sees only their division and public items
  if (currentUser.hierarchy_level === 'staff') {
    return `(
      ${prefix}visibility = 'public'
      OR ${prefix}owner = '${currentUser.username}'
      OR ${prefix}created_by = '${currentUser.username}'
      OR (${prefix}visibility = 'division' AND ${prefix}division = '${currentUser.division || ''}')
    )`;
  }

  return '1=0'; // Default: see nothing
}

/**
 * Auto-assign team members based on division
 */
export async function autoAssignTeamMembers(
  itemType: 'project' | 'task',
  itemId: string,
  division: string,
  createdBy: string
): Promise<void> {
  if (!division) return;

  // Get all staff in the same division
  const staffMembers = await query<any[]>(
    `SELECT username FROM users 
     WHERE is_active = 1 
     AND division = ? 
     AND hierarchy_level = 'staff'
     AND username != ?`,
    [division, createdBy]
  );

  // Get division manager
  const divisionInfo = await query<any[]>(
    'SELECT manager_username FROM divisions WHERE division_code = ?',
    [division]
  );

  // Add creator as owner
  await query(
    `INSERT IGNORE INTO team_members (item_type, item_id, username, role, added_by)
     VALUES (?, ?, ?, 'owner', ?)`,
    [itemType, itemId, createdBy, createdBy]
  );

  // Add manager as PIC if exists
  if (divisionInfo.length > 0 && divisionInfo[0].manager_username) {
    await query(
      `INSERT IGNORE INTO team_members (item_type, item_id, username, role, added_by)
       VALUES (?, ?, ?, 'pic', ?)`,
      [itemType, itemId, divisionInfo[0].manager_username, createdBy]
    );
  }

  // Add all division staff as members
  for (const staff of staffMembers) {
    await query(
      `INSERT IGNORE INTO team_members (item_type, item_id, username, role, added_by)
       VALUES (?, ?, ?, 'member', ?)`,
      [itemType, itemId, staff.username, createdBy]
    );
  }
}
