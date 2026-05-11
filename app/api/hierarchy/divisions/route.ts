import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/hierarchy/divisions
 * Get all divisions with their managers and staff count
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const divisions = await query<any[]>(`
      SELECT 
        d.*,
        m.full_name as manager_name,
        m.avatar as manager_avatar,
        dir.full_name as direksi_name,
        dir.avatar as direksi_avatar,
        COUNT(DISTINCT u.username) as staff_count
      FROM divisions d
      LEFT JOIN users m ON m.username = d.manager_username
      LEFT JOIN users dir ON dir.username = d.direksi_username
      LEFT JOIN users u ON u.division = d.division_code AND u.is_active = 1 AND u.hierarchy_level = 'staff'
      WHERE d.is_active = 1
      GROUP BY d.id
      ORDER BY d.division_name ASC
    `);

    return NextResponse.json({ success: true, divisions });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/hierarchy/divisions
 * Create new division
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner', 'direksi'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { division_code, division_name, division_type, manager_username, direksi_username, description } = await req.json();

    if (!division_code || !division_name) {
      return NextResponse.json({ success: false, error: 'division_code and division_name required' }, { status: 400 });
    }

    await query(
      `INSERT INTO divisions (division_code, division_name, division_type, manager_username, direksi_username, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [division_code, division_name, division_type || 'division', manager_username || null, direksi_username || null, description || null]
    );

    return NextResponse.json({ success: true, message: 'Division created successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

/**
 * PUT /api/hierarchy/divisions
 * Update division
 */
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || !['admin', 'owner', 'direksi'].includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { id, division_name, division_type, manager_username, direksi_username, description, is_active } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }

    await query(
      `UPDATE divisions SET
        division_name = COALESCE(?, division_name),
        division_type = COALESCE(?, division_type),
        manager_username = ?,
        direksi_username = ?,
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active),
        updated_at = NOW()
       WHERE id = ?`,
      [division_name, division_type, manager_username, direksi_username, description, is_active, id]
    );

    return NextResponse.json({ success: true, message: 'Division updated successfully' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
