import { clearSessionCookie } from '@/lib/auth'
import { apiSuccess } from '@/lib/api-response'

export async function POST() {
  clearSessionCookie()
  return apiSuccess({ success: true })
}
