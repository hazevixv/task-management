import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/admin/user-roles?username=xxx
 * Get roles for a specific user (or all users)
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (username) {
    const roles = await query<any[]>(
      'SELECT role_name, assigned_by, created_at FROM user_roles WHERE username = ? ORDER BY role_name',
      [username]
    );
    return NextResponse.json({ success: true, roles });
  }

  // Return all user-role mappings with user info
  const roles = await query<any[]>(`
    SELECT ur.username, ur.role_name, ur.assigned_by, ur.created_at,
           u.full_name, u.avatar, u.job_position
    FROM user_roles ur
    JOIN users u ON u.username = ur.username
    ORDER BY ur.username, ur.role_name
  `);

  return NextResponse.json({ success: true, roles });
}

/**
 * POST /api/admin/user-roles
 * Add a role to a user (supports multiple roles per user)
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { username, role_name } = await req.json();
  if (!username || !role_name) {
    return NextResponse.json({ success: false, error: 'username and role_name required' }, { status: 400 });
  }

  await query(
    'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
    [username, role_name, user.username]
  );

  return NextResponse.json({ success: true });
}

/**
 * PUT /api/admin/user-roles
 * Sync all users' job_position to user_roles table
 * Also supports bulk assign: { job_position, role_name } to add extra role to all users with that job_position
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === 'sync_job_positions') {
    // Sync all users' job_position into user_roles table
    // This ensures every user has at least their job_position as a role
    const users = await query<any[]>(
      'SELECT username, job_position FROM users WHERE job_position IS NOT NULL AND job_position != \'\' AND is_active = 1'
    );

    let synced = 0;
    for (const u of users) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [u.username, u.job_position, 'system']
      );
      synced++;
    }

    return NextResponse.json({ success: true, synced, message: `Synced ${synced} users` });
  }

  if (action === 'bulk_assign') {
    // Assign an extra role to all users with a specific job_position
    const { job_position, role_name } = body;
    if (!job_position || !role_name) {
      return NextResponse.json({ success: false, error: 'job_position and role_name required' }, { status: 400 });
    }

    const users = await query<any[]>(
      'SELECT username FROM users WHERE job_position = ? AND is_active = 1',
      [job_position]
    );

    let assigned = 0;
    for (const u of users) {
      await query(
        'INSERT IGNORE INTO user_roles (username, role_name, assigned_by) VALUES (?, ?, ?)',
        [u.username, role_name, user.username]
      );
      assigned++;
    }

    return NextResponse.json({ success: true, assigned, message: `Assigned role to ${assigned} users` });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
}

/**
 * DELETE /api/admin/user-roles
 * Remove a role from a user
 */
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  const role_name = searchParams.get('role_name');

  if (!username || !role_name) {
    return NextResponse.json({ success: false, error: 'username and role_name required' }, { status: 400 });
  }

  await query(
    'DELETE FROM user_roles WHERE username = ? AND role_name = ?',
    [username, role_name]
  );

  return NextResponse.json({ success: true });
}
