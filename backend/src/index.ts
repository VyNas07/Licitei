import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

import { config } from './config'
import { closeDb } from './db/mongo'

import { healthRoutes } from './routes/health'
import { editaisRoutes } from './routes/editais'
import { oportunidadesRoutes } from './routes/oportunidades'
import { perfilRoutes } from './routes/perfil'
import { favoritosRoutes } from './routes/favoritos'
import { alertasRoutes } from './routes/alertas'
import { chatRoutes } from './routes/chat'

const app = new Elysia()
  // CORS — permite requisições do app mobile (Expo)
  .use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
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
  .use(favoritosRoutes)
  .use(alertasRoutes)
  .use(chatRoutes)

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
