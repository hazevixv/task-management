import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if ('response' in auth) return auth.response;
    
    // Only admin can sync
    if (auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get all unique job positions from users
    const jobPositions = await query<any[]>(`
      SELECT DISTINCT job_position 
      FROM users 
      WHERE job_position IS NOT NULL 
        AND job_position != '' 
        AND is_active = 1
      ORDER BY job_position
    `);

    if (jobPositions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        created: 0, 
        message: 'No job positions found' 
      });
    }

    // Get root company unit (assuming it exists)
    const rootUnits = await query<any[]>(`
      SELECT id FROM organizational_units 
      WHERE parent_id IS NULL 
      ORDER BY id ASC 
      LIMIT 1
    `);

    if (rootUnits.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No root company unit found. Please create a company unit first.' 
      }, { status: 400 });
    }

    const rootId = rootUnits[0].id;
    let created = 0;

    // Create organizational units for each job position
    for (const jp of jobPositions) {
      const jobPosition = jp.job_position;
      
      // Generate unit code from job position (uppercase, replace spaces with underscores)
      const unitCode = jobPosition.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      
      // Check if unit already exists
      const existing = await query<any[]>(
        'SELECT id FROM organizational_units WHERE unit_code = ?',
        [unitCode]
      );

      if (existing.length === 0) {
        // Create new unit
        await query(`
          INSERT INTO organizational_units 
          (unit_code, unit_name, unit_type, parent_id, level, path, sort_order, color, icon, description)
          VALUES (?, ?, 'division', ?, 1, ?, ?, '#6366f1', 'briefcase', ?)
        `, [
          unitCode,
          jobPosition,
          rootId,
          `/RAYMATING/${unitCode}`,
          created + 1,
          `Division for ${jobPosition} employees`
        ]);

        created++;

        // Update users with this job position to link to the new unit
        const newUnit = await query<any[]>(
          'SELECT id FROM organizational_units WHERE unit_code = ?',
          [unitCode]
        );

        if (newUnit.length > 0) {
          await query(`
            UPDATE users 
            SET org_unit_id = ? 
            WHERE job_position = ? AND is_active = 1
          `, [newUnit[0].id, jobPosition]);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      created,
      total: jobPositions.length,
      message: `Created ${created} new organizational units from job positions`
    });

  } catch (error: any) {
    console.error('[Sync Job Positions] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}
