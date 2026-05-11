const required = (key: string): string => {
  const value = process.env[key]
  if (!value) throw new Error(`Variável de ambiente obrigatória não encontrada: ${key}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  mongo: {
    uri: required('MONGO_URI'),
    dbName: required('MONGO_DB_NAME'),
    collection: required('MONGO_COLLECTION'),
  },

  mcp: {
    url: process.env.MCP_URL ?? 'http://localhost:8000',
  },
}
