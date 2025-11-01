import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
