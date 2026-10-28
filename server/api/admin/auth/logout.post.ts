export default defineEventHandler(async (event) => {
  await destroySession(event)
  // Clear client-side cookie by setting it to expired
  setCookie(event, 'amir_admin_session', '', {
    httpOnly: true,
    secure: false, // Allow clearing on HTTP in dev; production uses Secure via sessionConfig
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    expires: new Date(0), // Thu, 01 Jan 1970 00:00:00 GMT
  })
  return { ok: true }
})
