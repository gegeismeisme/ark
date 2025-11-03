#!/usr/bin/env node
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ATTACHMENTS_BUCKET = process.env.STORAGE_ATTACHMENTS_BUCKET ?? 'attachments';
const EXPECTED_MAX_SIZE = process.env.STORAGE_MAX_ATTACHMENT_SIZE ?? '20971520';

const fail = (message) => {
  console.error(`[attachment-qa] ✖ ${message}`);
  process.exit(1);
};

const succeed = (message) => {
  console.log(`[attachment-qa] ✔ ${message}`);
};

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  fail('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. Aborting.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function verifyBucketExists() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    fail(`Unable to list storage buckets: ${error.message ?? error}`);
  }
  const bucket = (data ?? []).find((item) => item.id === ATTACHMENTS_BUCKET);
  if (!bucket) {
    fail(`Bucket "${ATTACHMENTS_BUCKET}" not found. Please create it before running QA.`);
  }
  succeed(`Bucket "${ATTACHMENTS_BUCKET}" reachable.`);
}

async function verifySignedUpload() {
  const objectPath = `qa/${new Date().toISOString()}/${randomUUID()}.txt`;
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUploadUrl(objectPath);
  if (error || !data?.url || !data?.token) {
    fail(`Failed to create signed upload URL: ${error?.message ?? 'unknown error'}`);
  }
  succeed('Signed upload URL generated successfully.');
  return { path: objectPath };
}

async function verifyPolicy(path) {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('id')
    .limit(1);
  if (error) {
    fail(`Unable to query task_attachments table: ${error.message ?? error}`);
  }
  console.log(
    `[attachment-qa] ℹ sample record count ${
      (data ?? []).length
    } · verified read access to task_attachments`
  );

  const maxSize = Number(EXPECTED_MAX_SIZE);
  if (!Number.isFinite(maxSize)) {
    fail(
      `Invalid STORAGE_MAX_ATTACHMENT_SIZE value "${EXPECTED_MAX_SIZE}". Expected number in bytes.`
    );
  }
  succeed(`Configured max attachment size ${maxSize.toLocaleString('en-US')} bytes.`);
  console.log(
    `[attachment-qa] ℹ placeholder object path "${path}" ready for upload test if needed.`
  );
}

async function run() {
  console.log('[attachment-qa] Starting attachment workflow verification…');
  await verifyBucketExists();
  const { path } = await verifySignedUpload();
  await verifyPolicy(path);
  console.log('[attachment-qa] QA checks completed.');
}

run().catch((err) => {
  fail(err instanceof Error ? err.message : String(err));
});
