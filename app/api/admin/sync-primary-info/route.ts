import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/api-auth';
import { query } from '@/lib/db';

/**
 * POST /api/admin/sync-primary-info
 * Sync job_position and organization for ALL users based on their primary assignments
 * Run this once to fix existing users
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }

  try {
    // Get all users with primary assignments
    const usersWithPrimary = await query<any[]>(`
      SELECT DISTINCT
        ous.username,
        ou.unit_name,
        ou.path,
        ou.unit_type
      FROM org_unit_staff ous
      JOIN organizational_units ou ON ous.org_unit_id = ou.id
      WHERE ous.is_primary = TRUE AND ou.is_active = 1
    `);

    console.log(`[SYNC] Found ${usersWithPrimary.length} users with primary assignments`);

    // Get all company units for lookup
    const companyUnits = await query<any[]>(`
      SELECT id, unit_name FROM organizational_units 
      WHERE unit_type = 'company' AND is_active = 1
    `);
    
    // Fallback company name
    const fallbackCompany = companyUnits.length > 0 ? companyUnits[0].unit_name : 'Unknown Company';

    let successCount = 0;
    const results: any[] = [];

    for (const u of usersWithPrimary) {
      try {
        // Find company from path
        let companyName = fallbackCompany;
        const pathParts = u.path.split('/').filter((p: string) => p.trim() !== '');
        
        if (pathParts.length > 0) {
          const rootId = parseInt(pathParts[0]);
          if (!isNaN(rootId)) {
            const rootUnit = companyUnits.find(c => c.id === rootId);
            if (rootUnit) {
              companyName = rootUnit.unit_name;
            } else {
              // Query directly if not in our list
              const found = await query<any[]>(
                'SELECT unit_name FROM organizational_units WHERE id = ? AND is_active = 1 LIMIT 1',
                [rootId]
              );
              if (found.length > 0) companyName = found[0].unit_name;
            }
          }
        }

        await query(
          'UPDATE users SET job_position = ?, organization = ? WHERE username = ?',
          [u.unit_name, companyName, u.username]
        );

        results.push({ username: u.username, job_position: u.unit_name, organization: companyName });
        successCount++;
        console.log(`[SYNC] ✅ ${u.username}: job_position="${u.unit_name}", organization="${companyName}"`);
      } catch (err) {
        console.error(`[SYNC] ❌ Error for ${u.username}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} users successfully`,
      results
    });
  } catch (e: any) {
    console.error('[SYNC] Error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
