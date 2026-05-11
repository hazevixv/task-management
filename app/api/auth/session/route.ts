import { NextRequest, NextResponse } from 'next/server';
import { AuthModel } from '@/models/AuthModel';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    const result = await AuthModel.verifySession(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
