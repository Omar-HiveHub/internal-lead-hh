import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json(
    {
      message: `Single-row enrichment scaffold endpoint ready for id ${params.id}.`,
    },
    { status: 501 },
  );
}
