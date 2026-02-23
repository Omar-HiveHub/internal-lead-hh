import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      message: 'CSV export scaffold endpoint ready. Feature logic pending.',
    },
    { status: 501 },
  );
}
