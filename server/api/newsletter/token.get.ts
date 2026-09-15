import { issueFormToken } from '~/server/utils/formToken'

/** Jeton à joindre à l'inscription ; voir server/utils/formToken.ts. */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { token: issueFormToken() }
})
