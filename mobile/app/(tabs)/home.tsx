import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectorCard } from '../../src/components/editais/SectorCard';
import { EditalCard } from '../../src/components/editais/EditalCard';
import { CategoryModal } from '../../src/components/editais/CategoryModal';
import { FilterModal } from '../../src/components/editais/FilterModal';
import { BuscasSalvasModal } from '../../src/components/editais/BuscasSalvasModal';
import { useBuscasSalvas } from '../../src/hooks/useBuscasSalvas';
import type { FiltrosBusca, BuscaSalva } from '../../src/hooks/useBuscasSalvas';
import api from '../../src/services/api';

interface EditalAPI {
  numero_controle_pncp: string;
  objeto_compra: string;
  orgao_razao_social: string;
  valor_total_estimado: number;
  modalidade_nome: string;
  uf: string;
  municipio?: string;
  data_encerramento_proposta: string;
}

interface EditalCard {
  id: string;
  objeto: string;
  orgao: string;
  valor: number;
  dataLimite: string;
  modalidade: string;
  uf: string;
  municipio?: string;
  match: 'Alta' | 'Média' | 'Baixa';
}

function mapEdital(e: EditalAPI): EditalCard {
  let match: 'Alta' | 'Média' | 'Baixa';
  if (e.valor_total_estimado <= 40000) match = 'Alta';
  else if (e.valor_total_estimado <= 80000) match = 'Média';
  else match = 'Baixa';
  return {
    id: e.numero_controle_pncp,
    objeto: e.objeto_compra,
    orgao: e.orgao_razao_social,
    valor: e.valor_total_estimado,
    dataLimite: e.data_encerramento_proposta,
    modalidade: e.modalidade_nome,
    uf: e.uf,
    municipio: e.municipio,
    match,
  };
}

const TODAS_CATEGORIAS = [
  { id: '1', icone: 'construct' as const, nome: 'Tecnologia',
    keywords: ['software', 'sistema', 'tecnologia', 'informática', 'aplicativo', 'desenvolvimento', 'licença', 'servidor', 'computador', 'web', 'suporte técnico', 'hardware'] },
  { id: '2', icone: 'restaurant' as const, nome: 'Consultoria',
    keywords: ['consultoria', 'assessoria', 'auditoria', 'análise', 'diagnóstico'] },
  { id: '3', icone: 'medkit' as const, nome: 'Saúde',
    keywords: ['médic', 'hospitalar', 'hospital', 'clínica', 'medicamento', 'farmác', 'enfermagem', 'odontológ', 'fisioterapia', 'ambulatorial', 'material médico', 'equipamento médico'] },
  { id: '4', icone: 'hammer' as const, nome: 'Obras',
    keywords: ['construção', 'reforma', 'obra', 'engenharia', 'pavimentação', 'elétrica', 'hidráulica', 'edificação', 'manutenção predial'] },
  { id: '5', icone: 'desktop' as const, nome: 'Treinamento',
    keywords: ['treinamento', 'capacitação', 'curso', 'formação', 'qualificação', 'workshop', 'palestra'] },
  { id: '6', icone: 'car' as const, nome: 'Segurança',
    keywords: ['vigilância', 'monitoramento', 'câmera', 'cftv', 'alarme', 'porteiro', 'controle de acesso', 'segurança patrimonial', 'segurança armada', 'serviço de segurança'] },
];

const KEYWORDS_BY_CATEGORY: Record<string, string[]> = Object.fromEntries(
  TODAS_CATEGORIAS.map(c => [c.id, c.keywords])
);

function matchesKeywords(objeto: string, keywords: string[]): boolean {
  const lower = objeto.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

export default function HomeUsuario() {
  const router = useRouter();

  const [editais, setEditais] = useState<EditalCard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    uf: 'Todas',
    municipio: '',
    valor: 'Todos',
    cnae: '',
  });
  const [modalCategorias, setModalCategorias] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [modalBuscasSalvas, setModalBuscasSalvas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const ITENS_POR_PAGINA = 5;

  const { buscas, carregando: carregandoBuscas, erro: erroBuscas, carregar: recarregarBuscas, salvar, remover } = useBuscasSalvas();

  const buscarOportunidades = useCallback(async () => {
    setCarregando(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (filtrosAvancados.uf !== 'Todas') params.uf = filtrosAvancados.uf;
      if (filtrosAvancados.valor === 'Até R$ 80 mil (exclusivo MEI)') params.valor_max = '80000';
      if (filtrosAvancados.cnae) params.cnae = filtrosAvancados.cnae;
      const { data } = await api.get('/oportunidades', { params });
      setEditais((data.data ?? []).map(mapEdital));
    } catch {
      setEditais([]);
    } finally {
      setCarregando(false);
    }
  }, [filtrosAvancados.uf, filtrosAvancados.valor, filtrosAvancados.cnae]);

  useEffect(() => { buscarOportunidades(); }, [buscarOportunidades]);

  useEffect(() => {
    api.get('/perfil')
      .then(({ data }) => setNomeUsuario(data.nome_fantasia ?? ''))
      .catch(() => {}); // silent fail — mantém string vazia
  }, []);

  const validaFaixaValor = (valor: number, faixa: string) => {
    if (faixa === 'Todos') return true;
    if (faixa === 'Até R$ 80 mil (exclusivo MEI)') return valor <= 80000;
    if (faixa === 'R$ 80 mil – R$ 200 mil') return valor > 80000 && valor <= 200000;
    if (faixa === 'Acima de R$ 200 mil') return valor > 200000;
    return true;
  };

  const contagensDinamicas = useMemo(() => {
    const stats: Record<string, number> = {};
    TODAS_CATEGORIAS.forEach(cat => { stats[cat.id] = 0; });
    editais.forEach(e => {
      const termo = busca.toLowerCase();
      if (busca !== '' && !e.objeto.toLowerCase().includes(termo) && !e.orgao.toLowerCase().includes(termo)) return;
      TODAS_CATEGORIAS.forEach(cat => {
        if (matchesKeywords(e.objeto, cat.keywords)) stats[cat.id] += 1;
      });
    });
    return stats;
  }, [editais, busca]);

  const editaisFiltrados = useMemo(() => {
    return editais.filter(e => {
      const termo = busca.toLowerCase();
      const matchBusca = busca === '' || e.objeto.toLowerCase().includes(termo) || e.orgao.toLowerCase().includes(termo);
      const matchMun = filtrosAvancados.municipio === '' || (e.municipio?.toLowerCase().includes(filtrosAvancados.municipio.toLowerCase()));
      const matchValor = validaFaixaValor(e.valor, filtrosAvancados.valor);
      const matchCategoria = selecionadas.length === 0 ||
        selecionadas.some(id => matchesKeywords(e.objeto, KEYWORDS_BY_CATEGORY[id] ?? []));
      return matchBusca && matchMun && matchValor && matchCategoria;
    });
  }, [editais, selecionadas, filtrosAvancados, busca]);

  const totalPaginas = Math.ceil(editaisFiltrados.length / ITENS_POR_PAGINA);
  const editaisExibidos = editaisFiltrados.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA);

  const limparTudo = () => {
    setSelecionadas([]);
    setPagina(1);
    setBusca('');
    setFiltrosAvancados({ uf: 'Todas', municipio: '', valor: 'Todos', cnae: '' });
  };

  const filtrosParaSalvar = (): FiltrosBusca => {
    const f: FiltrosBusca = {};
    if (filtrosAvancados.uf !== 'Todas') f.uf = filtrosAvancados.uf;
    if (filtrosAvancados.municipio) f.municipio = filtrosAvancados.municipio;
    if (filtrosAvancados.cnae) f.cnae = filtrosAvancados.cnae;
    if (filtrosAvancados.valor === 'Até R$ 80 mil (exclusivo MEI)') f.valor_max = 80000;
    if (filtrosAvancados.valor === 'R$ 80 mil – R$ 200 mil') { f.valor_min = 80000; f.valor_max = 200000; }
    if (filtrosAvancados.valor === 'Acima de R$ 200 mil') f.valor_min = 200000;
    if (selecionadas.length) f.categorias = selecionadas.map(id => TODAS_CATEGORIAS.find(c => c.id === id)?.nome ?? id);
    return f;
  };

  const aplicarBuscaSalva = (b: BuscaSalva) => {
    setBusca(b.termo_busca);
    const f = b.filtros;
    let valorFaixa = 'Todos';
    if (f?.valor_max === 80000 && !f.valor_min) valorFaixa = 'Até R$ 80 mil (exclusivo MEI)';
    else if (f?.valor_min === 80000) valorFaixa = 'R$ 80 mil – R$ 200 mil';
    else if (f?.valor_min === 200000) valorFaixa = 'Acima de R$ 200 mil';
    setFiltrosAvancados({
      uf: f?.uf ?? 'Todas',
      municipio: f?.municipio ?? '',
      valor: valorFaixa,
      cnae: f?.cnae ?? '',
    });
    if (f?.categorias?.length) {
      const ids = f.categorias.map(nome => TODAS_CATEGORIAS.find(c => c.nome === nome)?.id).filter(Boolean) as string[];
      setSelecionadas(ids);
    } else {
      setSelecionadas([]);
    }
    setPagina(1);
  };

  const temFiltrosAtivos =
    busca !== '' ||
    filtrosAvancados.uf !== 'Todas' ||
    filtrosAvancados.municipio !== '' ||
    filtrosAvancados.cnae !== '' ||
    filtrosAvancados.valor !== 'Todos' ||
    selecionadas.length > 0;

  return (
    <SafeAreaView style={estilos.areaSegura}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <View style={estilos.cabecalho}>
        <View style={estilos.linhaTopo}>
          <View>
            <Text style={estilos.saudacao}>Olá{nomeUsuario ? `, ${nomeUsuario}` : ''}</Text>
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
          <TouchableOpacity style={estilos.botaoBookmark} onPress={() => setModalBuscasSalvas(true)}>
            <Ionicons name="bookmark-outline" size={22} color="#0F172A" />
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
            <Text style={estilos.tituloSecao}>Oportunidades para você</Text>
            {!carregando && <Text style={estilos.contador}>{editaisFiltrados.length} encontrados</Text>}
          </View>
          {carregando ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 40 }} />
          ) : editaisExibidos.map(edital => (
            <EditalCard key={edital.id} onPress={() => router.push({ pathname: '/edital/[id]', params: { id: edital.id } })} item={edital} />
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

      <BuscasSalvasModal
        visivel={modalBuscasSalvas}
        fechar={() => setModalBuscasSalvas(false)}
        termoBusca={busca}
        filtrosAtivos={filtrosParaSalvar()}
        temFiltrosAtivos={temFiltrosAtivos}
        buscas={buscas}
        carregando={carregandoBuscas}
        erro={erroBuscas}
        onRecarregar={recarregarBuscas}
        onSalvarAtual={async () => {
          try {
            await salvar(busca || 'Busca sem termo', filtrosParaSalvar());
            setModalBuscasSalvas(false);
          } catch (e: unknown) {
            const status = (e as { response?: { status?: number } })?.response?.status;
            if (status === 409) {
              Alert.alert('Busca já salva', 'Esta busca já foi salva anteriormente.');
              setModalBuscasSalvas(false);
            }
          }
        }}
        onAplicar={(b) => {
          aplicarBuscaSalva(b);
          setModalBuscasSalvas(false);
        }}
        onRemover={remover}
      />

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
  botaoBookmark: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
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