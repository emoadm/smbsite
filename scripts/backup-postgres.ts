import { spawn } from 'node:child_process';
import { createReadStream, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ZONE = process.env.BUNNY_STORAGE_ZONE!;
const PASSWORD = process.env.BUNNY_STORAGE_PASSWORD!;
const DIRECT_URL = process.env.DIRECT_URL!;

if (!ZONE || !PASSWORD || !DIRECT_URL) {
  console.error('Required env: BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, DIRECT_URL');
  process.exit(1);
}

async function dumpToFile(): Promise<string> {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const out = path.join(tmpdir(), `backup-${stamp}.dump.gz`);

  await new Promise<void>((resolve, reject) => {
    const dump = spawn('pg_dump', [DIRECT_URL, '--format=custom']);
    const gzip = spawn('gzip');
    const fs   = require('node:fs').createWriteStream(out);
    dump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(fs);
    dump.stderr.on('data', (d) => process.stderr.write(d));
    gzip.stderr.on('data', (d) => process.stderr.write(d));
    gzip.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`gzip exit ${code}`)));
    dump.on('error', reject);
    gzip.on('error', reject);
  });

  const size = statSync(out).size;
  if (size < 1024) throw new Error(`backup file too small (${size}B) — likely empty dump`);
  console.log(`pg_dump complete: ${out} (${size} bytes)`);
  return out;
}

async function uploadToBunny(filePath: string): Promise<void> {
  const filename = path.basename(filePath);
  const url = `https://storage.bunnycdn.com/${ZONE}/${filename}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { AccessKey: PASSWORD, 'content-type': 'application/octet-stream' },
    body: createReadStream(filePath) as any,
    // @ts-expect-error — duplex required for streaming uploads
    duplex: 'half',
  });
  if (!res.ok) throw new Error(`Bunny upload failed: ${res.status} ${await res.text()}`);
  console.log(`uploaded to ${url}`);
}

(async () => {
  const file = await dumpToFile();
  await uploadToBunny(file);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
