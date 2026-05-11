import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * GET /api/chat/contacts
 * Returns contacts for the current user based on their organizational assignments.
 * Grouped by organizational unit - like WhatsApp contacts from your organization.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // Get all org units this user belongs to
    const userUnits = await query<any[]>(`
      SELECT ous.org_unit_id, ou.unit_name, ou.unit_type, ou.color, ous.is_primary
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.username = ? AND ou.is_active = 1
      ORDER BY ous.is_primary DESC, ou.unit_name ASC
    `, [user.username]);

    if (userUnits.length === 0) {
      return NextResponse.json({ success: true, contacts: [], groups: [] });
    }

    const unitIds = userUnits.map(u => u.org_unit_id);

    // Get all members from those units (excluding current user)
    const members = await query<any[]>(`
      SELECT 
        ous.username,
        ous.role as team_role,
        ous.org_unit_id,
        u.full_name,
        u.avatar,
        u.job_position,
        u.email,
        ou.unit_name,
        ou.unit_type,
        ou.color as unit_color
      FROM org_unit_staff ous
      JOIN users u ON ous.username = u.username
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.org_unit_id IN (${unitIds.map(() => '?').join(',')})
        AND u.is_active = 1
        AND ous.username != ?
      ORDER BY ou.unit_name ASC, u.full_name ASC
    `, [...unitIds, user.username]);

    // Group contacts by unit
    const unitMap: Record<number, {
      org_unit_id: number;
      unit_name: string;
      unit_type: string;
      unit_color: string;
      is_primary: boolean;
      members: any[];
    }> = {};

    for (const unit of userUnits) {
      unitMap[unit.org_unit_id] = {
        org_unit_id: unit.org_unit_id,
        unit_name: unit.unit_name,
        unit_type: unit.unit_type,
        unit_color: unit.color || '#7c3aed',
        is_primary: !!unit.is_primary,
        members: []
      };
    }

    for (const m of members) {
      if (unitMap[m.org_unit_id]) {
        unitMap[m.org_unit_id].members.push({
          username: m.username,
          full_name: m.full_name,
          avatar: m.avatar,
          job_position: m.job_position,
          email: m.email,
          team_role: m.team_role
        });
      }
    }

    // Flat unique contacts list (for direct message)
    const seen = new Set<string>();
    const flatContacts: any[] = [];
    for (const m of members) {
      if (!seen.has(m.username)) {
        seen.add(m.username);
        flatContacts.push({
          username: m.username,
          full_name: m.full_name,
          avatar: m.avatar,
          job_position: m.job_position,
          email: m.email,
          units: members
            .filter(x => x.username === m.username)
            .map(x => x.unit_name)
            .join(', ')
        });
      }
    }

    // Group chats info (existing group conversations for user's units)
    const groupChats = await query<any[]>(`
      SELECT c.conv_id, c.name, c.avatar, c.last_message, c.last_msg_at,
        (SELECT COUNT(*) FROM chat_members WHERE conv_id = c.conv_id) as member_count
      FROM chat_conversations c
      WHERE c.type = 'group'
        AND c.name IN (${unitIds.map(() => '?').join(',')})
        AND c.conv_id IN (SELECT conv_id FROM chat_members WHERE username = ?)
        AND c.is_archived = 0
    `, [...userUnits.map(u => u.unit_name), user.username]);

    return NextResponse.json({
      success: true,
      contacts: flatContacts,
      groups: Object.values(unitMap),
      groupChats
    });
  } catch (e: any) {
    console.error('[chat/contacts]', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
