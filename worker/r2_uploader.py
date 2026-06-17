"""Upload bytes to Cloudflare R2 via S3 API."""
import os

import boto3
from botocore.config import Config


def _client():
    account_id = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )


def upload_bytes(key: str, data: bytes, content_type: str) -> str:
    bucket = os.environ.get("R2_BUCKET", "mvp-creator-os")
    public_base = os.environ.get("R2_PUBLIC_URL", "")
    s3 = _client()
    s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    if public_base:
        return f"{public_base.rstrip('/')}/{key}"
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=3600 * 24 * 7,
    )
