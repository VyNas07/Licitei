import { supabase } from './src/db/supabase'

console.log('Verificando tabelas no Supabase...\n')

// Testa perfis_mei
const { data: perfis, error: errPerfis, status: statusPerfis } = await supabase
  .from('perfis_mei')
  .select('id')
  .limit(1)

if (errPerfis) {
  console.log(`❌ perfis_mei: ${errPerfis.message} (status ${statusPerfis})`)
} else {
  console.log(`✅ perfis_mei: existe (${perfis?.length ?? 0} registros encontrados na amostra)`)
}

// Testa favoritos
const { data: favs, error: errFavs, status: statusFavs } = await supabase
  .from('favoritos')
  .select('id')
  .limit(1)

if (errFavs) {
  console.log(`❌ favoritos: ${errFavs.message} (status ${statusFavs})`)
} else {
  console.log(`✅ favoritos: existe (${favs?.length ?? 0} registros encontrados na amostra)`)
}

process.exit(0)
