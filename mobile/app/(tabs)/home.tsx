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

const LOTE = 25;

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

function buildValorParams(valor: string): Record<string, string> {
  if (valor === 'Até R$ 80 mil (exclusivo MEI)') return { valor_max: '80000' };
  if (valor === 'R$ 80 mil – R$ 200 mil') return { valor_min: '80000', valor_max: '200000' };
  if (valor === 'Acima de R$ 200 mil') return { valor_min: '200000' };
  return {};
}

export default function HomeUsuario() {
  const router = useRouter();

  const [editais, setEditais] = useState<EditalCard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [totalBackend, setTotalBackend] = useState(0);
  const [paginasBackend, setPaginasBackend] = useState(1);
  const [paginaBackend, setPaginaBackend] = useState(1);
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    uf: 'Todas',
    municipio: '',
    valor: 'Todos',
    cnae: '',
  });
  const [mostrarVencidos, setMostrarVencidos] = useState(false);
  const [modoExibicao, setModoExibicao] = useState<'todos' | 'para_voce'>('todos');
  const [modalCategorias, setModalCategorias] = useState(false);
  const [modalFiltros, setModalFiltros] = useState(false);
  const [modalBuscasSalvas, setModalBuscasSalvas] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');
  const [cnaesDoPerfil, setCnaesDoPerfil] = useState<string[]>([]);

  const { buscas, carregando: carregandoBuscas, erro: erroBuscas, carregar: recarregarBuscas, salvar, remover } = useBuscasSalvas();

  useEffect(() => {
    const timer = setTimeout(() => setBuscaDebounced(busca), 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const buscarEditais = useCallback(async (pagina = 1, append = false) => {
    if (append) setCarregandoMais(true);
    else setCarregando(true);

    const params: Record<string, string> = { limit: String(LOTE), page: String(pagina) };

    if (filtrosAvancados.uf !== 'Todas') params.uf = filtrosAvancados.uf;
    if (filtrosAvancados.municipio) params.municipio = filtrosAvancados.municipio;
    if (buscaDebounced) params.q = buscaDebounced;
    params.incluir_vencidos = String(mostrarVencidos);

    Object.assign(params, buildValorParams(filtrosAvancados.valor));

    if (selecionadas.length > 0) {
      const kws = selecionadas.flatMap(id => KEYWORDS_BY_CATEGORY[id] ?? []);
      params.keywords = [...new Set(kws)].slice(0, 30).join('|');
    }

    const endpoint = modoExibicao === 'para_voce' ? '/oportunidades' : '/editais';
    if (modoExibicao === 'para_voce' && filtrosAvancados.cnae) params.cnae = filtrosAvancados.cnae;

    try {
      const { data } = await api.get(endpoint, { params });
      const mapped = (data.data ?? []).map(mapEdital);
      setEditais(prev => append ? [...prev, ...mapped] : mapped);
      setTotalBackend(data.total ?? 0);
      setPaginasBackend(data.pages ?? 1);
      setPaginaBackend(pagina);
    } catch {
      if (!append) setEditais([]);
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  }, [filtrosAvancados, buscaDebounced, mostrarVencidos, modoExibicao, selecionadas]);

  useEffect(() => { buscarEditais(1, false); }, [buscarEditais]);

  useEffect(() => {
    api.get('/perfil')
      .then(({ data }) => {
        setNomeUsuario(data.nome_fantasia ?? '');
        if (data.cnae) setCnaesDoPerfil([data.cnae]);
      })
      .catch(() => {});
  }, []);

  const contagensDinamicas = useMemo(() => {
    const stats: Record<string, number> = {};
    TODAS_CATEGORIAS.forEach(cat => { stats[cat.id] = 0; });
    editais.forEach(e => {
      TODAS_CATEGORIAS.forEach(cat => {
        if (matchesKeywords(e.objeto, cat.keywords)) stats[cat.id] += 1;
      });
    });
    return stats;
  }, [editais]);

  const limparTudo = () => {
    setSelecionadas([]);
    setBusca('');
    setMostrarVencidos(false);
    setPaginaBackend(1);
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
              onChangeText={(t) => setBusca(t)}
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
            <Text style={estilos.tituloSecao}>
              {modoExibicao === 'todos' ? 'Todos os editais' : 'Para você'}
            </Text>
            {!carregando && (
              <Text style={estilos.contador}>{editais.length} de {totalBackend}</Text>
            )}
          </View>
          <View style={estilos.pillsContainer}>
            <TouchableOpacity
              style={[estilos.pill, modoExibicao === 'todos' && estilos.pillAtivo]}
              onPress={() => setModoExibicao('todos')}
            >
              <Text style={[estilos.pillTexto, modoExibicao === 'todos' && estilos.pillTextoAtivo]}>Todos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.pill, modoExibicao === 'para_voce' && estilos.pillAtivo]}
              onPress={() => setModoExibicao('para_voce')}
            >
              <Ionicons name="star" size={12} color={modoExibicao === 'para_voce' ? '#FFF' : '#64748B'} />
              <Text style={[estilos.pillTexto, modoExibicao === 'para_voce' && estilos.pillTextoAtivo]}>Para você</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[estilos.chipVencidos, mostrarVencidos && estilos.chipVencidosAtivo]}
            onPress={() => setMostrarVencidos(v => !v)}
          >
            <Ionicons
              name={mostrarVencidos ? 'eye' : 'eye-off-outline'}
              size={13}
              color={mostrarVencidos ? '#FFF' : '#64748B'}
            />
            <Text style={[estilos.chipVencidosTexto, mostrarVencidos && estilos.chipVencidosTextoAtivo]}>
              {mostrarVencidos ? 'Ocultar vencidos' : 'Mostrar vencidos'}
            </Text>
          </TouchableOpacity>

          {carregando ? (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 40 }} />
          ) : editais.map(edital => (
            <EditalCard key={edital.id} onPress={() => router.push({ pathname: '/edital/[id]', params: { id: edital.id } })} item={edital} />
          ))}

          {paginaBackend < paginasBackend && !carregando && (
            <TouchableOpacity
              style={estilos.btnCarregarMais}
              onPress={() => buscarEditais(paginaBackend + 1, true)}
              disabled={carregandoMais}
            >
              {carregandoMais
                ? <ActivityIndicator size="small" color="#0F172A" />
                : <Text style={estilos.textoBtnCarregarMais}>Carregar mais</Text>}
            </TouchableOpacity>
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
        alternarSelecao={(id) => setSelecionadas(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        contagens={contagensDinamicas}
      />

      <FilterModal
        visivel={modalFiltros}
        fechar={() => setModalFiltros(false)}
        filtrosAtuais={filtrosAvancados}
        aplicar={(f) => setFiltrosAvancados(f)}
        cnaesDoPerfil={cnaesDoPerfil}
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
  pillsContainer: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  pillAtivo: { backgroundColor: '#0F172A' },
  pillTexto: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  pillTextoAtivo: { color: '#FFF' },
  chipVencidos: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  chipVencidosAtivo: { backgroundColor: '#0F172A' },
  chipVencidosTexto: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  chipVencidosTextoAtivo: { color: '#FFF' },
  btnCarregarMais: { height: 48, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  textoBtnCarregarMais: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
});
