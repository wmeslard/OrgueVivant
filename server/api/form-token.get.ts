import { issueFormToken } from '~/server/utils/formToken'

/** Jeton anti-robot commun aux formulaires publics ; voir server/utils/formToken.ts. */
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { token: issueFormToken() }
})
