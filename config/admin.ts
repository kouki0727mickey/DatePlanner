// config/admin.ts
export const ADMIN_EMAILS: string[] = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim())
  .filter((email) => email.length > 0)
