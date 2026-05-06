export async function GET() {
  const body = `User-agent: *
Allow: /

Sitemap: https://marlin.dev/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
