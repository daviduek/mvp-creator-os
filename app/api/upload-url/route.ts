import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { generateKey } from '../../lib/r2';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { contentType, ext, kind } = await req.json();
    if (!contentType || !ext) return NextResponse.json({ error: 'contentType y ext requeridos' }, { status: 400 });

    const accountId = process.env.R2_ACCOUNT_ID!;
    const accessKey = process.env.R2_ACCESS_KEY_ID!;
    const secretKey = process.env.R2_SECRET_ACCESS_KEY!;
    const bucket = process.env.R2_BUCKET || 'mvp-creator-os';
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!accountId || !accessKey || !secretKey) {
      return NextResponse.json({ error: 'R2 no configurado' }, { status: 500 });
    }

    const folder = kind === 'video' ? 'uploads/video' : 'uploads/image';
    const key = generateKey(folder, ext.replace(/^\./, ''));

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: 600 },
    );

    const publicUrl = publicBase ? `${publicBase}/${key}` : null;
    return NextResponse.json({ uploadUrl, key, publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
