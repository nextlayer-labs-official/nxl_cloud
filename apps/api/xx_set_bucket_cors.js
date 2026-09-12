/**
 * One-off script to fix production file uploads: sets the storage bucket's
 * CORS policy so the browser is allowed to PUT directly to presigned upload
 * URLs from the production origin. Run this ONCE on the VPS (where the real
 * ZATA_* production credentials are loaded), then delete it.
 *
 * Usage (on the VPS, from the repo root or apps/api):
 *   node apps/api/xx_set_bucket_cors.js
 *
 * It reads the same env vars apps/api itself uses (ZATA_ENDPOINT,
 * ZATA_REGION, ZATA_BUCKET, ZATA_ACCESS_KEY_ID,
 * ZATA_SECRET_ACCESS_KEY, WEB_ORIGIN) — make sure the shell has your
 * production .env loaded (e.g. `set -a; source /path/to/.env; set +a`)
 * before running.
 */
const { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } = require("@aws-sdk/client-s3");

async function main() {
  const endpoint = process.env.ZATA_ENDPOINT;
  const region = process.env.ZATA_REGION ?? "us-east-1";
  const bucket = process.env.ZATA_BUCKET;
  const accessKeyId = process.env.ZATA_ACCESS_KEY_ID;
  const secretAccessKey = process.env.ZATA_SECRET_ACCESS_KEY;
  const origin = process.env.WEB_ORIGIN ?? "https://skylyer.cloud";

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    console.error("Missing one of ZATA_ENDPOINT / ZATA_BUCKET / ZATA_ACCESS_KEY_ID / ZATA_SECRET_ACCESS_KEY in env. Aborting.");
    process.exit(1);
  }

  console.log(`Setting CORS on bucket "${bucket}" at ${endpoint} (region ${region}) to allow origin ${origin}...`);

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [origin],
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  );

  console.log("CORS policy applied. Verifying...");
  const result = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log(JSON.stringify(result.CORSRules, null, 2));
}

main().catch((err) => {
  console.error("Failed to set bucket CORS:", err);
  process.exit(1);
});
