import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

type JsonObject = Record<string, unknown>

type SmokeResponse = {
  status: number
  body: unknown
  text: string
  durationMs: number
}

type Check = {
  name: string
  run: () => Promise<void>
}

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
let passedChecks = 0

function parseEnvValue(value: string): string {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }

  return trimmed
}

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return

  const env = readFileSync(path, 'utf8')

  for (const line of env.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key] === undefined) {
      process.env[key] = parseEnvValue(rawValue)
    }
  }
}

loadEnvFile(resolve(SCRIPT_DIR, '..', '.env'))

function requiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env: ${key}`)
  }
  return value
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function assertStatus(response: SmokeResponse, expected: number | number[], path: string): void {
  const allowed = Array.isArray(expected) ? expected : [expected]
  assert(
    allowed.includes(response.status),
    `${path}: expected status ${allowed.join(' or ')}, got ${response.status}. Body: ${response.text}`,
  )
}

function assertArrayField(body: unknown, field: string, path: string): void {
  assert(isObject(body), `${path}: expected JSON object response`)
  assert(Array.isArray(body[field]), `${path}: expected "${field}" to be an array`)
}

function assertNumberField(body: unknown, field: string, path: string): void {
  assert(isObject(body), `${path}: expected JSON object response`)
  assert(typeof body[field] === 'number', `${path}: expected "${field}" to be a number`)
}

function assertStringField(body: unknown, field: string, path: string): string {
  assert(isObject(body), `${path}: expected JSON object response`)
  assert(typeof body[field] === 'string', `${path}: expected "${field}" to be a string`)
  return body[field]
}

async function request(baseUrl: string, path: string, token?: string): Promise<SmokeResponse> {
  const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000)
  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  })

  const text = await response.text()
  let body: unknown = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return {
    status: response.status,
    body,
    text,
    durationMs: Date.now() - startedAt,
  }
}

async function getAccessToken(): Promise<string> {
  const supabaseUrl = requiredEnv('SMOKE_SUPABASE_URL')
  const supabaseAnonKey = requiredEnv('SMOKE_SUPABASE_ANON_KEY')
  const email = requiredEnv('SMOKE_TEST_EMAIL')
  const password = requiredEnv('SMOKE_TEST_PASSWORD')

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.session?.access_token) {
    throw new Error(`Supabase Auth sign in failed: ${error?.message ?? 'missing access token'}`)
  }

  return data.session.access_token
}

function logPass(name: string, response?: SmokeResponse): void {
  const suffix = response ? ` (${response.status}, ${response.durationMs}ms)` : ''
  passedChecks += 1
  console.log(`[PASS] ${name}${suffix}`)
}

async function main(): Promise<void> {
  const baseUrl = normalizeBaseUrl(requiredEnv('SMOKE_BASE_URL'))
  console.log(`[INFO] Running backend smoke tests against ${baseUrl}`)

  const healthPath = '/health'
  const health = await request(baseUrl, healthPath)
  assertStatus(health, 200, healthPath)
  assert(isObject(health.body), `${healthPath}: expected JSON object response`)
  assert(health.body.status === 'ok', `${healthPath}: expected status "ok", got ${String(health.body.status)}`)
  assert(health.body.mongo === 'connected', `${healthPath}: expected mongo connected, got ${String(health.body.mongo)}`)
  assert(
    health.body.supabase === 'connected',
    `${healthPath}: expected supabase connected, got ${String(health.body.supabase)}`,
  )
  logPass(healthPath, health)

  const token = await getAccessToken()
  logPass('Supabase Auth sign in')

  const checks: Check[] = [
    {
      name: '/perfil',
      run: async () => {
        const response = await request(baseUrl, '/perfil', token)
        assertStatus(response, [200, 404], '/perfil')
        assert(isObject(response.body), '/perfil: expected JSON object response')
        if (response.status === 404) {
          assert(typeof response.body.error === 'string', '/perfil: expected error message on 404')
        }
        logPass('/perfil', response)
      },
    },
    {
      name: '/editais?limit=1',
      run: async () => {
        const path = '/editais?limit=1'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        assertNumberField(response.body, 'total', path)
        assertNumberField(response.body, 'page', path)
        assertNumberField(response.body, 'pages', path)

        const body = response.body as JsonObject
        if (Array.isArray(body.data) && body.data.length > 0) {
          const edital = body.data[0]
          const editalId = assertStringField(edital, 'numero_controle_pncp', `${path}: first item`)
          const detailPath = `/editais/${encodeURIComponent(editalId)}`
          const detail = await request(baseUrl, detailPath, token)
          assertStatus(detail, 200, detailPath)
          const detailId = assertStringField(detail.body, 'numero_controle_pncp', detailPath)
          assert(detailId === editalId, `${detailPath}: expected numero_controle_pncp to match list item`)
          logPass(detailPath, detail)
        }

        logPass(path, response)
      },
    },
    {
      name: '/oportunidades?limit=1',
      run: async () => {
        const path = '/oportunidades?limit=1'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        assertNumberField(response.body, 'total', path)
        assertNumberField(response.body, 'page', path)
        assertNumberField(response.body, 'pages', path)
        logPass(path, response)
      },
    },
    {
      name: '/participacoes',
      run: async () => {
        const path = '/participacoes'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        logPass(path, response)
      },
    },
    {
      name: '/alertas',
      run: async () => {
        const path = '/alertas'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        assertNumberField(response.body, 'total', path)
        logPass(path, response)
      },
    },
    {
      name: '/saved-searches',
      run: async () => {
        const path = '/saved-searches'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        logPass(path, response)
      },
    },
    {
      name: '/documentos',
      run: async () => {
        const path = '/documentos'
        const response = await request(baseUrl, path, token)
        assertStatus(response, 200, path)
        assertArrayField(response.body, 'data', path)
        logPass(path, response)
      },
    },
  ]

  for (const check of checks) {
    await check.run()
  }

  console.log(`[PASS] ${passedChecks} smoke checks completed`)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[FAIL] ${message}`)
  process.exit(1)
})
