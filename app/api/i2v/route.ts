import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'Image-to-Video todavía no está disponible. Se habilitará después de exportar el workflow Wan2.1 desde ComfyUI.' },
    { status: 501 },
  );
}
