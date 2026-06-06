// @ts-ignore - Elysia types/module resolution handled externally
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { swagger } from '@elysiajs/swagger'
import { rateLimit } from 'elysia-rate-limit'

import { config } from './config'
import { closeDb } from './db/mongo'

import { healthRoutes } from './routes/health'
import { editaisRoutes } from './routes/editais'
import { oportunidadesRoutes } from './routes/oportunidades'
import { perfilRoutes } from './routes/perfil'
import { participacoesRoutes } from './routes/participacoes'
import { alertasRoutes } from './routes/alertas'
import { chatRoutes } from './routes/chat'
import { savedSearchesRoutes } from './routes/savedSearches'
import { documentosRoutes } from './routes/documentos'

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Licitei API',
          version: '1.0.0',
          description: 'API REST do Licitei — plataforma de licitações para MEIs',
        },
        tags: [
          { name: 'health', description: 'Status do servidor' },
          { name: 'editais', description: 'Licitações públicas do PNCP' },
          { name: 'oportunidades', description: 'Editais filtrados por CNAE do MEI' },
          { name: 'participacoes', description: 'Acompanhamento de editais pelo usuário' },
          { name: 'documentos', description: 'Gerenciamento de certidões e documentos' },
          { name: 'alertas', description: 'Alertas de prazo, teto MEI e novos editais' },
          { name: 'perfil', description: 'Perfil do MEI' },
          { name: 'chat', description: 'Assistente de IA via MCP (SSE)' },
          { name: 'saved-searches', description: 'Buscas salvas pelo usuário' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT gerado pelo Supabase Auth',
            },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      path: '/docs',
    })
  )
  // CORS — permite apenas origens explicitamente configuradas
  .use(
    cors({
      origin: ({ headers }) => {
        const origin = headers.get('origin')
        return origin ? config.allowedOrigins.includes(origin) : false
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
    })
  )
  .use(
    rateLimit({
      duration: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      errorResponse: new Response(
        JSON.stringify({ error: 'Muitas requisições. Tente novamente mais tarde.' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    })
  )

  // Tratamento global de erros
  .onError(({ code, error, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404
      return { error: 'Rota não encontrada' }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Dados inválidos', details: error.message }
    }

    const msg = error instanceof Error ? error.message : 'Erro interno do servidor'
    console.error(`[ERROR] ${code}: ${msg}`)

    if (set.status === 401) return { error: msg }

    set.status = 500
    return { error: 'Erro interno do servidor' }
  })

  // Rotas públicas
  .use(healthRoutes)

  // Rotas protegidas (auth via Supabase JWT)
  .use(editaisRoutes)
  .use(oportunidadesRoutes)
  .use(perfilRoutes)
  .use(participacoesRoutes)
  .use(alertasRoutes)
  .use(chatRoutes)
  .use(savedSearchesRoutes)
  .use(documentosRoutes)

  .listen(config.port)

console.log(`🚀 Licitei Backend rodando em http://localhost:${config.port}`)
console.log(`   Ambiente: ${config.nodeEnv}`)

// Fecha conexão MongoDB ao encerrar o processo
process.on('SIGINT', async () => {
  console.log('\n[Shutdown] Encerrando servidor...')
  await closeDb()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDb()
  process.exit(0)
})

export type App = typeof app
