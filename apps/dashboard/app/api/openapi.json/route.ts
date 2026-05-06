import { NextResponse } from 'next/server'
import { generateOpenApiSpec } from '@/lib/openapi'

export async function GET() {
  const spec = generateOpenApiSpec()
  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  })
}
