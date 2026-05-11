import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * POST /api/admin/bulk-assignments
 * Bulk assign users to multiple organizational units
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { assignments } = await req.json();
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'assignments array is required' 
      }, { status: 400 });
    }

    // Validate each assignment
    for (const assignment of assignments) {
      const { org_unit_id, username, role = 'staff' } = assignment;
      
      if (!org_unit_id || !username) {
        return NextResponse.json({ 
          success: false, 
          error: 'Each assignment must have org_unit_id and username' 
        }, { status: 400 });
      }

      const validRoles = ['staff', 'support', 'leader', 'manager', 'owner', 'direktur'];
      if (!validRoles.includes(role.toLowerCase())) {
        return NextResponse.json({ 
          success: false, 
          error: `Invalid role: ${role}. Must be: staff, support, leader, manager, owner, or direktur` 
        }, { status: 400 });
      }
    }

    // Process bulk assignments
    const results = [];
    for (const assignment of assignments) {
      const { org_unit_id, username, role = 'staff' } = assignment;
      
      try {
        // Check if user exists
        const userExists = await query(
          'SELECT username FROM users WHERE username = ? AND is_active = 1', 
          [username]
        );
        
        if ((userExists as any[]).length === 0) {
          results.push({ 
            username, 
            org_unit_id, 
            success: false, 
            error: 'User not found or inactive' 
          });
          continue;
        }

        // Check if organizational unit exists
        const unitExists = await query(
          'SELECT id FROM organizational_units WHERE id = ? AND is_active = 1', 
          [org_unit_id]
        );
        
        if ((unitExists as any[]).length === 0) {
          results.push({ 
            username, 
            org_unit_id, 
            success: false, 
            error: 'Organizational unit not found or inactive' 
          });
          continue;
        }

        // Upsert assignment
        await query(`
          INSERT INTO org_unit_staff (org_unit_id, username, role, assigned_by, assigned_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE 
            role = VALUES(role),
            assigned_by = VALUES(assigned_by),
            assigned_at = CURRENT_TIMESTAMP
        `, [org_unit_id, username, role.toLowerCase(), user.username]);

        results.push({ 
          username, 
          org_unit_id, 
          role: role.toLowerCase(),
          success: true 
        });

      } catch (error: any) {
        results.push({ 
          username, 
          org_unit_id, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`[bulk-assignments] Processed ${assignments.length} assignments: ${successCount} success, ${failureCount} failed`);

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${assignments.length} assignments: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: assignments.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (e: any) {
    console.error('[bulk-assignments POST]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * GET /api/admin/bulk-assignments
 * Get assignment statistics and overview
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    // Get assignment statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as total_assignments,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT org_unit_id) as units_with_assignments,
        role,
        COUNT(*) as role_count
      FROM org_unit_staff ous
      JOIN users u ON ous.username = u.username
      WHERE u.is_active = 1
      GROUP BY role
      ORDER BY role_count DESC
    `);

    // Get multi-membership users
    const multiMembership = await query(`
      SELECT 
        ous.username,
        u.full_name,
        COUNT(*) as assignment_count,
        GROUP_CONCAT(
          CONCAT(ou.unit_name, ' (', ous.role, ')')
          ORDER BY ou.unit_name
          SEPARATOR ', '
        ) as assignments
      FROM org_unit_staff ous
      JOIN users u ON ous.username = u.username
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE u.is_active = 1
      GROUP BY ous.username, u.full_name
      HAVING assignment_count > 1
      ORDER BY assignment_count DESC, u.full_name
    `);

    return NextResponse.json({ 
      success: true, 
      stats,
      multiMembership
    });

  } catch (e: any) {
    console.error('[bulk-assignments GET]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}