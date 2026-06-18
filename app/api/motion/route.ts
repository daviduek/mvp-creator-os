import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'Motion Copy todavía no está disponible. Se habilitará después de exportar el workflow MimicMotion desde ComfyUI.' },
    { status: 501 },
  );
}
