import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      message: 'CSV import scaffold endpoint ready. Feature logic pending.',
    },
    { status: 501 },
  );
}
