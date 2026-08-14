import { randomUUID } from 'node:crypto'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    event.context.requestId = getHeader(event, 'x-request-id') || randomUUID()
    event.context.requestStartedAt = Date.now()
  })

  nitroApp.hooks.hook('afterResponse', (event) => {
    const startedAt = event.context.requestStartedAt as number | undefined
    console.info(JSON.stringify({
      level: 'info',
      event: 'http_request',
      requestId: event.context.requestId,
      method: getMethod(event),
      path: getRequestURL(event).pathname,
      statusCode: event.node.res.statusCode,
      durationMs: startedAt ? Date.now() - startedAt : undefined
    }))
  })
})
