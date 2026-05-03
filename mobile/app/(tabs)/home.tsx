import React, { useState, useMemo } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectorCard } from '../../src/components/editais/SectorCard';
import { EditalCard } from '../../src/components/editais/EditalCard';
import { CategoryModal } from '../../src/components/editais/CategoryModal';
import { FilterModal } from '../../src/components/editais/FilterModal';
import { EDITAS_MOCK, PERFIL_MOCK } from '../../src/lib/mock-data'; // Fontes de dados[cite: 1, 2]

const TODAS_CATEGORIAS = [
  { id: '1', icone: 'construct' as const, nome: 'Tecnologia', cnae: '6201-5/00', descricao: 'Softwares e serviços de TI' },
  { id: '2', icone: 'restaurant' as const, nome: 'Consultoria', cnae: '6202-3/00', descricao: 'Consultoria em tecnologia' },
  { id: '3', icone: 'medkit' as const, nome: 'Saúde', cnae: '8650-0/99', descricao: 'Atividades na área de saúde' },
  { id: '4', icone: 'hammer' as const, nome: 'Obras', cnae: '4321-5/00', descricao: 'Construção e reformas' },
  { id: '5', icone: 'desktop' as const, nome: 'Treinamento', cnae: '8599-6/04', descricao: 'Cursos e capacitação' },
  { id: '6', icone: 'car' as const, nome: 'Segurança', cnae: '8020-0/01', descricao: 'Monitoramento e sistemas' },
];

export default function HomeUsuario() {
  const router = useRouter();
  
  const [busca, setBusca] = useState(''); 
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [filtrosAvancados, setFiltrosAvancados] = useState({ 
    uf: 'Todas', 
    municipio: '', 
    valor: 'Todos', 
    cnae: '' 
  });
  const [modalCategorias, setModalCategorias] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  
  const [pagina, setPagina] = useState(1);
  const ITENS_POR_PAGINA = 5;

  // Função auxiliar para validar faixas de valor[cite: 2]
  const validaFaixaValor = (valorEdital: number, faixaSelecionada: string) => {
    if (faixaSelecionada === 'Todos') return true;
    if (faixaSelecionada === 'Até R$ 80 mil (exclusivo MEI)') return valorEdital <= 80000;
    if (faixaSelecionada === 'R$ 80 mil – R$ 200 mil') return valorEdital > 80000 && valorEdital <= 200000;
    if (faixaSelecionada === 'Acima de R$ 200 mil') return valorEdital > 200000;
    return true;
  };

  // 1. Contagens dinâmicas para os Setores[cite: 2]
  const contagensDinamicas = useMemo(() => {
    const stats: Record<string, number> = {};
    TODAS_CATEGORIAS.forEach(cat => stats[cat.id] = 0);

    EDITAS_MOCK.forEach(edital => {
      const termo = busca.toLowerCase();
      const matchBusca = busca === '' || edital.objeto.toLowerCase().includes(termo) || edital.orgao.toLowerCase().includes(termo);
      const matchUF = filtrosAvancados.uf === 'Todas' || edital.uf === filtrosAvancados.uf;
      const matchMun = filtrosAvancados.municipio === '' || (edital.municipio?.toLowerCase().includes(filtrosAvancados.municipio.toLowerCase()));
      const matchValor = validaFaixaValor(edital.valor, filtrosAvancados.valor);
      const matchCnaeFiltro = filtrosAvancados.cnae === '' || edital.cnaeAlvo === filtrosAvancados.cnae;

      if (matchBusca && matchUF && matchMun && matchValor && matchCnaeFiltro) {
        const catRelacionada = TODAS_CATEGORIAS.find(cat => cat.cnae === edital.cnaeAlvo);
        if (catRelacionada) stats[catRelacionada.id] += 1;
      }
    });
    return stats;
  }, [busca, filtrosAvancados]);

  // 2. Filtragem da lista principal de cards[cite: 2]
  const editaisFiltrados = useMemo(() => {
    return EDITAS_MOCK.filter(e => {
      const termo = busca.toLowerCase();
      const matchBusca = busca === '' || e.objeto.toLowerCase().includes(termo) || e.orgao.toLowerCase().includes(termo);
      const matchUF = filtrosAvancados.uf === 'Todas' || e.uf === filtrosAvancados.uf;
      const matchMun = filtrosAvancados.municipio === '' || (e.municipio?.toLowerCase().includes(filtrosAvancados.municipio.toLowerCase()));
      const matchValor = validaFaixaValor(e.valor, filtrosAvancados.valor);
      const matchCnaeFiltro = filtrosAvancados.cnae === '' || e.cnaeAlvo === filtrosAvancados.cnae;
      
      // Filtro por categoria (Setores)[cite: 2]
      const cnaesDasCategorias = TODAS_CATEGORIAS
        .filter(cat => selecionadas.includes(cat.id))
        .map(cat => cat.cnae);
      const matchCategoria = selecionadas.length === 0 || cnaesDasCategorias.includes(e.cnaeAlvo);

      return matchBusca && matchUF && matchMun && matchValor && matchCnaeFiltro && matchCategoria;
    });
  }, [selecionadas, filtrosAvancados, busca]);

  const totalPaginas = Math.ceil(editaisFiltrados.length / ITENS_POR_PAGINA);
  const editaisExibidos = editaisFiltrados.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA);

  const limparTudo = () => {
    setSelecionadas([]);
    setPagina(1);
    setBusca('');
    setFiltrosAvancados({ uf: 'Todas', municipio: '', valor: 'Todos', cnae: '' });
  };

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={estilos.cabecalho}>
        <View style={estilos.linhaTopo}>
          <View>
            <Text style={estilos.saudacao}>Olá, Ylson</Text>
            <Text style={estilos.tituloPagina}>Boas oportunidades hoje</Text>
          </View>
          <TouchableOpacity style={estilos.botaoNotificacao} onPress={() => router.push('/alertas')}>
            <Ionicons name="notifications-outline" size={22} color="#FFF" />
            <View style={estilos.pontoNotificacao} />
          </TouchableOpacity>
        </View>

        <View style={estilos.containerBusca}>
          <View style={estilos.barraBusca}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput 
              style={estilos.inputReal}
              placeholder="Buscar editais..."
              placeholderTextColor="#94A3B8"
              value={busca}
              onChangeText={(t) => { setBusca(t); setPagina(1); }}
            />
          </View>
          <TouchableOpacity style={estilos.botaoFiltroAvancado} onPress={() => setModalFiltros(true)}>
            <Ionicons name="options-outline" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={estilos.rolagem} contentContainerStyle={estilos.conteudoRolagem} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={estilos.bannerPro} activeOpacity={0.9} onPress={() => router.push('/planos')}>
          <View style={estilos.proConteudoEsquerda}>
            <View style={estilos.proIconeContainer}><Ionicons name="ribbon-outline" size={20} color="#FFF" /></View>
            <View>
              <Text style={estilos.proTitulo}>Upgrade para PRO</Text>
              <Text style={estilos.proSubtitulo}>Editais ilimitados + checklist automático</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={estilos.secao}>
          <View style={estilos.cabecalhoSecao}><Text style={estilos.tituloSecao}>Setores</Text></View>
          <View style={estilos.gradeBotoesAcao}>
            <TouchableOpacity style={estilos.btnAcaoSelecionar} onPress={() => setModalCategorias(true)}>
              <Text style={estilos.textoBtnAcao}>Selecionar categorias</Text>
            </TouchableOpacity>
            {(selecionadas.length > 0 || busca !== '' || filtrosAvancados.uf !== 'Todas' || filtrosAvancados.cnae !== '' || filtrosAvancados.valor !== 'Todos') && (
              <TouchableOpacity style={estilos.btnAcaoLimpar} onPress={limparTudo}>
                <Text style={estilos.textoBtnAcao}>Limpar Filtros</Text>
              </TouchableOpacity>
            )}
          </View>

          {selecionadas.length > 0 && (
            <View style={estilos.listaSelecionados}>
              {TODAS_CATEGORIAS.filter(c => selecionadas.includes(c.id)).map(s => (
                <SectorCard key={s.id} icone={s.icone} nome={s.nome} qtd={contagensDinamicas[s.id]} />
              ))}
            </View>
          )}
        </View>

        <View style={estilos.secao}>
          <View style={estilos.cabecalhoSecao}>
            <Text style={estilos.tituloSecao}>Resultados Recentes</Text>
            <Text style={estilos.contador}>{editaisFiltrados.length} encontrados</Text>
          </View>
          {editaisExibidos.map(edital => (
            <EditalCard key={edital.id} onPress={() => router.push(`/edital/${edital.id}`)} item={edital} />
          ))}
          {totalPaginas > 1 && (
            <View style={estilos.paginacaoContainer}>
              <TouchableOpacity disabled={pagina === 1} onPress={() => setPagina(p => p - 1)} style={[estilos.btnPag, pagina === 1 && { opacity: 0.3 }]}><Ionicons name="chevron-back" size={20} color="#0F172A" /></TouchableOpacity>
              <Text style={estilos.textoPagina}>Página {pagina} de {totalPaginas}</Text>
              <TouchableOpacity disabled={pagina === totalPaginas} onPress={() => setPagina(p => p + 1)} style={[estilos.btnPag, pagina === totalPaginas && { opacity: 0.3 }]}><Ionicons name="chevron-forward" size={20} color="#0F172A" /></TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <CategoryModal 
        visivel={modalCategorias} 
        fechar={() => setModalCategorias(false)} 
        categorias={TODAS_CATEGORIAS} 
        selecionadas={selecionadas} 
        alternarSelecao={(id) => { setPagina(1); setSelecionadas(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); }}
        contagens={contagensDinamicas}
      />
      
      <FilterModal 
        visivel={modalFiltros} 
        fechar={() => setModalFiltros(false)} 
        filtrosAtuais={filtrosAvancados} 
        aplicar={(f) => { setFiltrosAvancados(f); setPagina(1); }} 
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  areaSegura: { flex: 1, backgroundColor: '#0F172A' },
  cabecalho: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 25, backgroundColor: '#0F172A', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saudacao: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  tituloPagina: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  botaoNotificacao: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pontoNotificacao: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800', borderWidth: 2, borderColor: '#0F172A' },
  containerBusca: { flexDirection: 'row', gap: 10 },
  barraBusca: { flex: 1, height: 48, backgroundColor: '#FFF', borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
  inputReal: { flex: 1, marginLeft: 10, fontSize: 14, color: '#0F172A', height: '100%' },
  botaoFiltroAvancado: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 40, paddingTop: 10 },
  bannerPro: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#0F172A', borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  proConteudoEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  proIconeContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  proTitulo: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  proSubtitulo: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  secao: { marginTop: 24, paddingHorizontal: 20 },
  cabecalhoSecao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  gradeBotoesAcao: { gap: 10, marginBottom: 10 },
  btnAcaoSelecionar: { height: 48, backgroundColor: '#0F172A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnAcaoLimpar: { height: 48, backgroundColor: '#EF4444', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textoBtnAcao: { fontSize: 14, fontWeight: 'bold', color: '#FFF' },
  listaSelecionados: { marginTop: 10 },
  contador: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  paginacaoContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginTop: 25 },
  btnPag: { padding: 10, backgroundColor: '#FFF', borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  textoPagina: { fontWeight: 'bold', color: '#0F172A', fontSize: 13 }
});