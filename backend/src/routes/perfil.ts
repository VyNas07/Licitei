import { Elysia, t } from 'elysia'
import { authPlugin } from '../middleware/auth'
import { supabase } from '../db/supabase'
import { getCnaesFromCnpj } from '../services/brasilapi'

const USER_OWNED_TABLES = ['saved_searches', 'documentos', 'participacoes', 'mei_profile'] as const

export const perfilRoutes = new Elysia({ prefix: '/perfil' })
  .use(authPlugin)

  // GET /perfil — retorna o perfil do usuário autenticado
  .get('/', async ({ userId, set }) => {
    const { data, error } = await supabase
      .from('mei_profile')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      set.status = 404
      return { error: 'Perfil não encontrado' }
    }

    return data
  })

  // PUT /perfil — cria ou atualiza nome, CNPJ, UF e/ou ramo de atuação
  .put(
    '/',
    async ({ userId, body, set }) => {
      const updates: Record<string, unknown> = { user_id: userId }

      if (body.nome_fantasia) updates['nome_fantasia'] = body.nome_fantasia
      if (body.uf) updates['uf'] = body.uf.toUpperCase()
      if (body.ramo_atuacao) updates['ramo_atuacao'] = body.ramo_atuacao
      if (body.cnae) updates['cnae'] = body.cnae

      if (body.cnpj) {
        const cnpjLimpo = body.cnpj.replaceAll(/\D/g, '')

        if (cnpjLimpo.length !== 14) {
          set.status = 400
          return { error: 'CNPJ inválido: informe os 14 dígitos numéricos' }
        }

        updates['cnpj'] = cnpjLimpo

        // Busca CNAEs na BrasilAPI e armazena código + descrição para uso offline
        const cnaes = await getCnaesFromCnpj(cnpjLimpo)
        if (cnaes.length > 0) {
          updates['cnae'] = cnaes[0].codigo
          // Popula ramo_atuacao com a descrição do CNAE principal (salvo uma vez,
          // evita chamar BrasilAPI em cada GET /oportunidades e /alertas).
          // Só sobrescreve se o usuário não enviou um valor manual nesta requisição.
          if (!body.ramo_atuacao) {
            updates['ramo_atuacao'] = cnaes[0].descricao
          }
        }
      }

      // Upsert apenas quando os campos obrigatórios estão presentes (criação completa).
      // Atualizações parciais (ex: só cnae/ramo) usam update para evitar violação NOT NULL
      // nos campos obrigatórios que não foram enviados no body.
      const isFullCreate = Boolean(updates['nome_fantasia'] && updates['cnpj'] && updates['uf'])

      let data, error

      if (isFullCreate) {
        ;({ data, error } = await supabase
          .from('mei_profile')
          .upsert(updates, { onConflict: 'user_id' })
          .select()
          .single())
      } else {
        const { user_id: _uid, ...fields } = updates
        ;({ data, error } = await supabase
          .from('mei_profile')
          .update(fields)
          .eq('user_id', userId)
          .select()
          .single())
      }

      if (error) {
        if (error.code === '23502') {
          set.status = 400
          return { error: 'Campo obrigatório ausente no perfil' }
        }

        set.status = 500
        return { error: 'Erro ao atualizar perfil' }
      }

      return data
    },
    {
      body: t.Object({
        nome_fantasia: t.Optional(t.String()),
        cnpj: t.Optional(t.String()),
        uf: t.Optional(t.String({ minLength: 2, maxLength: 2 })),
        ramo_atuacao: t.Optional(t.String()),
        cnae: t.Optional(t.String()),
      }),
    }
  )

  // DELETE /perfil/account — remove a conta autenticada e dados pessoais associados (LGPD)
  .delete('/account', async ({ userId, set }) => {
    const { data: documentos, error: documentosError } = await supabase
      .from('documentos')
      .select('url')
      .eq('user_id', userId)

    if (documentosError) {
      set.status = 500
      return { error: 'Erro ao buscar documentos da conta' }
    }

    const storagePaths = (documentos ?? [])
      .map((documento) => documento.url)
      .filter((url): url is string => Boolean(url))

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove(storagePaths)

      if (storageError) {
        set.status = 500
        return { error: 'Erro ao remover arquivos da conta' }
      }
    }

    const tabelasComErro: string[] = []
    for (const table of USER_OWNED_TABLES) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId)

      if (error) tabelasComErro.push(table)
    }

    if (tabelasComErro.length > 0) {
      set.status = 500
      return { error: `Erro ao remover dados em: ${tabelasComErro.join(', ')}. Conta de autenticação mantida para nova tentativa.` }
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId)

    if (authError) {
      set.status = 500
      return { error: 'Dados removidos, mas erro ao encerrar sessão de autenticação. Contate o suporte.' }
    }

    return { message: 'Conta removida com sucesso' }
  })
