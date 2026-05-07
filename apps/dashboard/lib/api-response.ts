import { NextResponse } from 'next/server'

/**
 * Stripe-style API response helpers.
 *
 * Single object: { data: T }
 * List: { data: T[], has_more: boolean, cursor: string | null }
 * Error: { error: { code: string, message: string, details?: unknown } }
 */

export interface ApiListResponse<T> {
  data: T[]
  has_more: boolean
  cursor: string | null
}

export interface ApiDataResponse<T> {
  data: T
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Return a single resource response.
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

/**
 * Return a paginated list response.
 * Uses cursor-based pagination (id of last item).
 */
export function apiList<T extends { id: string }>(
  items: T[],
  limit: number,
): NextResponse {
  const has_more = items.length > limit
  const data = has_more ? items.slice(0, limit) : items
  const cursor = data.length > 0 ? data[data.length - 1].id : null

  return NextResponse.json({ data, has_more, cursor })
}

/**
 * Return an error response.
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: ApiErrorResponse = { error: { code, message } }
  if (details !== undefined) body.error.details = details
  return NextResponse.json(body, { status })
}

/**
 * Parse cursor and limit from search params.
 * Defaults: limit=25, cursor=undefined.
 */
export function parsePagination(searchParams: URLSearchParams): {
  limit: number
  cursor: string | undefined
} {
  const limitParam = searchParams.get('limit')
  const cursorParam = searchParams.get('cursor')

  let limit = 25
  if (limitParam) {
    const parsed = parseInt(limitParam, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
      limit = parsed
    }
  }

  return {
    limit,
    cursor: cursorParam || undefined,
  }
}
