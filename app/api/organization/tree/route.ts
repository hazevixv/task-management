import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/organization/tree
 * Get full organizational tree structure or staff for a specific unit
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const unitId = searchParams.get('unit_id');

    // Get staff for specific unit
    if (action === 'get_staff' && unitId) {
      const staff = await query<any[]>(`
        SELECT 
          s.username,
          s.role,
          s.assigned_at,
          u.full_name,
          u.avatar,
          u.job_position,
          u.email
        FROM org_unit_staff s
        JOIN users u ON s.username = u.username
        WHERE s.unit_id = ? AND u.is_active = 1
        ORDER BY u.full_name ASC
      `, [unitId]);

      return NextResponse.json({ success: true, staff });
    }

    // Get ALL members across all units in one query (for leaf node display)
    if (action === 'all_members') {
      try {
        const members = await query<any[]>(`
          SELECT 
            ous.org_unit_id as unit_id,
            ous.username,
            ous.role as team_role,
            ous.assigned_at,
            ous.assigned_by,
            u.full_name,
            u.avatar,
            u.job_position,
            u.email,
            u.employee_id,
            u.organization as primary_organization
          FROM org_unit_staff ous
          JOIN users u ON ous.username = u.username
          WHERE u.is_active = 1
          ORDER BY 
            ous.org_unit_id, 
            CASE ous.role 
              WHEN 'owner' THEN 1
              WHEN 'direktur' THEN 2  
              WHEN 'manager' THEN 3
              WHEN 'leader' THEN 4
              WHEN 'staff' THEN 5
              ELSE 6
            END,
            u.full_name ASC
        `);
        
        console.log(`[API] all_members: Found ${members.length} total assignments across all units`);
        console.log(`[API] Role distribution:`, members.reduce((acc: any, m) => {
          acc[m.team_role] = (acc[m.team_role] || 0) + 1;
          return acc;
        }, {}));
        
        return NextResponse.json({ success: true, members });
      } catch (error) {
        console.error('[API] Error fetching all_members:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch members', members: [] });
      }
    }

    // Get all organizational units with their relationships
    const units = await query<any[]>(`
      SELECT * FROM v_org_hierarchy
      WHERE is_active = 1
      ORDER BY level ASC, sort_order ASC, unit_name ASC
    `);

    // Build tree structure
    const tree = buildTree(units);

    return NextResponse.json({ success: true, tree, flatList: units });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/organization/tree
 * Create new organizational unit or assign staff
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner', 'direksi'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // Handle staff assignment
    if (action === 'assign_staff') {
      const { unit_id, username, role = 'member' } = body;

      if (!unit_id || !username) {
        return NextResponse.json({ 
          success: false, 
          error: 'unit_id and username required' 
        }, { status: 400 });
      }

      // Check if already assigned
      const existing = await query<any[]>(
        'SELECT id FROM org_unit_staff WHERE unit_id = ? AND username = ?',
        [unit_id, username]
      );

      if (existing.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Staff already assigned to this unit' 
        }, { status: 400 });
      }

      // Assign staff
      await query(
        'INSERT INTO org_unit_staff (unit_id, username, role, assigned_by) VALUES (?, ?, ?, ?)',
        [unit_id, username, role, user.username]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Staff assigned successfully' 
      });
    }

    // Handle unit creation
    const {
      unit_code,
      unit_name,
      unit_type,
      parent_id,
      owner_username,
      direksi_username,
      manager_username,
      description,
      color,
      icon,
      office_type
    } = body;

    if (!unit_code || !unit_name || !unit_type) {
      return NextResponse.json({ 
        success: false, 
        error: 'unit_code, unit_name, and unit_type required' 
      }, { status: 400 });
    }

    // Calculate level and path
    let level = 0;
    let path = `/${unit_code}`;
    let sort_order = 0;

    if (parent_id) {
      const parent = await query<any[]>(
        'SELECT level, path, (SELECT MAX(sort_order) FROM organizational_units WHERE parent_id = ?) as max_sort FROM organizational_units WHERE id = ?',
        [parent_id, parent_id]
      );

      if (parent.length > 0) {
        level = parent[0].level + 1;
        path = `${parent[0].path}/${unit_code}`;
        sort_order = (parent[0].max_sort || 0) + 1;
      }
    }

    const result = await query(
      `INSERT INTO organizational_units 
       (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, 
        owner_username, direksi_username, manager_username, description, color, icon, office_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unit_code, unit_name, unit_type, parent_id, level, path, sort_order,
        owner_username || null, direksi_username || null, manager_username || null,
        description || null, color || '#7c3aed', icon || 'building', office_type || 'none', user.username
      ]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Organizational unit created',
      id: (result as any).insertId
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * PUT /api/organization/tree
 * Update organizational unit or reorder (drag & drop)
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner', 'direksi'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { action, ...data } = await req.json();

    if (action === 'reorder') {
      // Handle drag & drop reordering
      const { id, new_parent_id, new_sort_order } = data;

      if (!id) {
        return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      }

      // Get current unit
      const current = await query<any[]>('SELECT * FROM organizational_units WHERE id = ?', [id]);
      if (current.length === 0) {
        return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });
      }

      // Calculate new level and path
      let new_level = 0;
      let new_path = `/${current[0].unit_code}`;

      if (new_parent_id) {
        const parent = await query<any[]>(
          'SELECT level, path FROM organizational_units WHERE id = ?',
          [new_parent_id]
        );

        if (parent.length > 0) {
          new_level = parent[0].level + 1;
          new_path = `${parent[0].path}/${current[0].unit_code}`;
        }
      }

      // Update unit
      await query(
        `UPDATE organizational_units 
         SET parent_id = ?, level = ?, path = ?, sort_order = ?
         WHERE id = ?`,
        [new_parent_id, new_level, new_path, new_sort_order || 0, id]
      );

      // Update all children paths recursively
      await updateChildrenPaths(id, new_path, new_level);

      return NextResponse.json({ success: true, message: 'Unit reordered successfully' });

    } else {
      // Handle regular update - FIXED: avoid undefined params
      const {
        id,
        unit_name,
        unit_type,
        office_type,
        description,
        color,
        icon,
        is_active
      } = data;

      if (!id) {
        return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
      }

      // Build dynamic update to avoid undefined params
      const updates: string[] = [];
      const values: any[] = [];

      if (unit_name !== undefined) { updates.push('unit_name = ?'); values.push(unit_name); }
      if (unit_type !== undefined) { updates.push('unit_type = ?'); values.push(unit_type); }
      if (office_type !== undefined) { updates.push('office_type = ?'); values.push(office_type); }
      if (description !== undefined) { updates.push('description = ?'); values.push(description || null); }
      if (color !== undefined) { updates.push('color = ?'); values.push(color); }
      if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }
      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }

      updates.push('updated_at = NOW()');
      values.push(id);

      if (updates.length <= 1) {
        return NextResponse.json({ success: true, message: 'Nothing to update' });
      }

      await query(
        `UPDATE organizational_units SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      return NextResponse.json({ success: true, message: 'Unit updated successfully' });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/organization/tree?id=xxx
 * Delete organizational unit (and all children) or remove staff
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id');

  try {
    // Handle staff removal
    if (action === 'remove_staff') {
      const body = await req.json();
      const { unit_id, username } = body;

      if (!unit_id || !username) {
        return NextResponse.json({ 
          success: false, 
          error: 'unit_id and username required' 
        }, { status: 400 });
      }

      await query(
        'DELETE FROM org_unit_staff WHERE unit_id = ? AND username = ?',
        [unit_id, username]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Staff removed successfully' 
      });
    }

    // Handle unit deletion
    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    // Check if unit has children
    const children = await query<any[]>(
      'SELECT COUNT(*) as count FROM organizational_units WHERE parent_id = ?',
      [id]
    );

    if (children[0].count > 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot delete unit with children. Delete children first or move them to another parent.' 
      }, { status: 400 });
    }

    // Check if unit has members
    const members = await query<any[]>(
      'SELECT COUNT(*) as count FROM users WHERE org_unit_id = ? AND is_active = 1',
      [id]
    );

    if (members[0].count > 0) {
      return NextResponse.json({ 
        success: false, 
        error: `Cannot delete unit with ${members[0].count} active member(s). Reassign them first.` 
      }, { status: 400 });
    }

    await query('DELETE FROM organizational_units WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Unit deleted successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// Helper function to build tree structure
function buildTree(units: any[], parentId: number | null = null): any[] {
  return units
    .filter(unit => unit.parent_id === parentId)
    .map(unit => ({
      ...unit,
      children: buildTree(units, unit.id)
    }));
}

// Helper function to update children paths recursively
async function updateChildrenPaths(parentId: number, parentPath: string, parentLevel: number) {
  const children = await query<any[]>(
    'SELECT id, unit_code FROM organizational_units WHERE parent_id = ?',
    [parentId]
  );

  for (const child of children) {
    const newPath = `${parentPath}/${child.unit_code}`;
    const newLevel = parentLevel + 1;

    await query(
      'UPDATE organizational_units SET path = ?, level = ? WHERE id = ?',
      [newPath, newLevel, child.id]
    );

    // Recursively update grandchildren
    await updateChildrenPaths(child.id, newPath, newLevel);
  }
}
