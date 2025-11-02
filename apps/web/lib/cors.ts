import { NextResponse, type NextRequest } from 'next/server';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19000',
  'http://localhost:19006',
  process.env.NEXT_PUBLIC_WEB_BASE_URL ?? '',
  process.env.CORS_DEFAULT_ORIGIN ?? '',
];

const envOrigins =
  process.env.CORS_ALLOWED_ORIGINS?.split(',').map((value) => value.trim()) ?? [];

const normalizeOrigin = (value: string | null | undefined) =>
  value ? value.trim().replace(/\/$/, '') : '';

const allowedOrigins = new Set(
  [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]
    .map((value) => normalizeOrigin(value))
    .filter((value) => Boolean(value))
);

const BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '600',
  Vary: 'Origin',
};

const getAllowedOrigin = (request: NextRequest): string | null => {
  const origin = normalizeOrigin(request.headers.get('origin'));
  if (!origin) {
    return null;
  }

  if (allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
    return origin;
  }

  return null;
};

const applyBaseHeaders = (headers: Headers) => {
  Object.entries(BASE_HEADERS).forEach(([key, value]) => headers.set(key, value));
};

export const createCorsHeaders = (request: NextRequest): Headers => {
  const headers = new Headers();
  applyBaseHeaders(headers);

  const allowOrigin = getAllowedOrigin(request);
  if (allowOrigin) {
    headers.set('Access-Control-Allow-Origin', allowOrigin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return headers;
};

export const withCors = (request: NextRequest, response: NextResponse) => {
  const headers = createCorsHeaders(request);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
};

export const handleCorsOptions = (request: NextRequest) => {
  const headers = createCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers,
  });
};

export const jsonWithCors = (
  request: NextRequest,
  body: unknown,
  init?: ResponseInit
) => {
  const response = NextResponse.json(body, init);
  return withCors(request, response);
};
