import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { config } from '../config'

const encoder = new TextEncoder()

function sseEvent(event: string, data: Record<string, unknown>): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function sseErrorResponse(data: Record<string, unknown>): Response {
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(sseEvent('error', data))
      controller.close()
    },
  })

  return sseResponse(stream)
}

export const chatRoutes = new Elysia({ prefix: '/chat' })
  .use(authPlugin)

  // POST /chat — proxy para o servidor MCP (Track 3)
  .post(
    '/',
    async ({ body, set }) => {
      try {
        const res = await fetch(`${config.mcp.url}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: body.query }),
          signal: AbortSignal.timeout(30_000), // timeout de 30s
        })

        if (!res.ok) {
          set.status = 502
          return {
            error: 'Assistente de IA indisponível no momento. Tente novamente.',
          }
        }

        const data = await res.json()
        return data
      } catch (err) {
        // MCP offline — retorna mensagem amigável em vez de 500
        set.status = 503
        return {
          error: 'Assistente temporariamente indisponível',
          details: String(err),
        }
      }
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    },
  )

  // POST /chat/stream — proxy SSE real para o servidor MCP
  .post(
    '/stream',
    async ({ body }) => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      try {
        const res = await fetch(`${config.mcp.url}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({ query: body.query }),
          signal: controller.signal,
        })
        clearTimeout(timeout)

        if (!res.ok || !res.body) {
          return sseErrorResponse({
            error: 'Assistente de IA indisponível no momento. Tente novamente.',
            status: res.status,
          })
        }

        return sseResponse(res.body)
      } catch (err) {
        clearTimeout(timeout)
        return sseErrorResponse({
          error: 'Assistente temporariamente indisponível',
          details: String(err),
        })
      }
    },
    {
      body: t.Object({
        query: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    },
  )
