'use client'

import { useEffect, useRef } from 'react'

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Load Swagger UI CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css'
    document.head.appendChild(link)

    // Load Swagger UI Bundle JS
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js'
    script.async = true

    script.onload = () => {
      // @ts-expect-error - SwaggerUIBundle loaded via CDN
      window.SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          // @ts-expect-error - SwaggerUIBundle loaded via CDN
          window.SwaggerUIBundle.presets.apis,
        ],
        layout: 'BaseLayout',
        tryItOutEnabled: true,
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
        displayRequestDuration: true,
      })
    }

    document.body.appendChild(script)

    return () => {
      script.remove()
      link.remove()
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div
        style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <a
          href="/"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: '#0066FF',
            textDecoration: 'none',
          }}
        >
          Marlin
        </a>
        <span style={{ color: '#888' }}>API Documentation</span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>
          OpenAPI 3.1 &middot; Live on devnet
        </span>
      </div>
      <div id="swagger-ui" ref={containerRef} />
    </div>
  )
}
