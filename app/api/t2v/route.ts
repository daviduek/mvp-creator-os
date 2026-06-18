import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json(
    { error: 'Text-to-Video todavía no está disponible. Se habilitará después de exportar el workflow HunyuanVideo desde ComfyUI.' },
    { status: 501 },
  );
}
