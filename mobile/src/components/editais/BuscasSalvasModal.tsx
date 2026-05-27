import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BuscaSalva, FiltrosBusca } from '../../hooks/useBuscasSalvas';

interface Props {
  visivel: boolean;
  fechar: () => void;
  termoBusca: string;
  filtrosAtivos: FiltrosBusca;
  temFiltrosAtivos: boolean;
  buscas: BuscaSalva[];
  carregando: boolean;
  erro: boolean;
  onRecarregar: () => void;
  onSalvarAtual: () => Promise<void>;
  onAplicar: (busca: BuscaSalva) => void;
  onRemover: (id: string) => void;
}

function resumoFiltros(f?: FiltrosBusca): string[] {
  const chips: string[] = [];
  if (f?.uf) chips.push(f.uf);
  if (f?.municipio) chips.push(f.municipio);
  if (f?.cnae) chips.push(`CNAE: ${f.cnae}`);
  if (f?.valor_max && !f.valor_min) chips.push(`Até R$ ${(f.valor_max / 1000).toFixed(0)}k`);
  if (f?.valor_min && f?.valor_max) chips.push(`R$ ${f.valor_min / 1000}k–${f.valor_max / 1000}k`);
  if (f?.valor_min && !f.valor_max) chips.push(`+R$ ${(f.valor_min / 1000).toFixed(0)}k`);
  if (f?.categorias?.length) chips.push(...f.categorias);
  return chips;
}

export function BuscasSalvasModal({
  visivel, fechar, termoBusca, filtrosAtivos, temFiltrosAtivos,
  buscas, carregando, erro, onRecarregar, onSalvarAtual, onAplicar, onRemover,
}: Props) {
  const chipsAtivos = resumoFiltros(filtrosAtivos);
  const mostrarSalvarAtual = termoBusca !== '' || temFiltrosAtivos;

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="slide"
      onRequestClose={fechar}
    >
      <Pressable style={estilos.backdrop} onPress={fechar} />

      <View style={estilos.folha}>
        <View style={estilos.indicador} />

        <View style={estilos.cabecalho}>
          <Text style={estilos.titulo}>Buscas Salvas</Text>
          <TouchableOpacity onPress={fechar} style={estilos.botaoFechar}>
            <Ionicons name="close" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.scroll}>
          {mostrarSalvarAtual && (
            <View style={estilos.cardSalvar}>
              <View style={estilos.cardSalvarInfo}>
                <Text style={estilos.cardSalvarTermo} numberOfLines={1}>
                  {termoBusca || 'Filtros ativos'}
                </Text>
                {chipsAtivos.length > 0 && (
                  <View style={estilos.chips}>
                    {chipsAtivos.map((chip) => (
                      <View key={chip} style={estilos.chip}>
                        <Text style={estilos.chipTexto}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity style={estilos.botaoSalvar} onPress={onSalvarAtual}>
                <Ionicons name="bookmark" size={14} color="#FFF" />
                <Text style={estilos.botaoSalvarTexto}>Salvar</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={estilos.secaoTitulo}>Buscas salvas</Text>

          {carregando && (
            <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 32 }} />
          )}

          {!carregando && erro && (
            <View style={estilos.estadoVazio}>
              <Ionicons name="cloud-offline-outline" size={40} color="#CBD5E1" />
              <Text style={estilos.estadoVazioTexto}>Erro ao carregar buscas</Text>
              <TouchableOpacity style={estilos.botaoTentar} onPress={onRecarregar}>
                <Text style={estilos.botaoTentarTexto}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          )}

          {!carregando && !erro && buscas.length === 0 && (
            <View style={estilos.estadoVazio}>
              <Ionicons name="bookmark-outline" size={40} color="#CBD5E1" />
              <Text style={estilos.estadoVazioTexto}>Nenhuma busca salva ainda</Text>
              <Text style={estilos.estadoVazioSub}>
                Faça uma busca e toque em "Salvar" para guardar aqui
              </Text>
            </View>
          )}

          {!carregando && !erro && buscas.map((busca) => {
            const chips = resumoFiltros(busca.filtros);
            return (
              <TouchableOpacity
                key={busca.id}
                style={estilos.item}
                onPress={() => onAplicar(busca)}
                activeOpacity={0.7}
              >
                <View style={estilos.itemIcone}>
                  <Ionicons name="search-outline" size={18} color="#0F172A" />
                </View>
                <View style={estilos.itemConteudo}>
                  <Text style={estilos.itemTermo} numberOfLines={1}>{busca.termo_busca}</Text>
                  {chips.length > 0 && (
                    <View style={estilos.chips}>
                      {chips.map((chip) => (
                        <View key={chip} style={estilos.chip}>
                          <Text style={estilos.chipTexto}>{chip}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => onRemover(busca.id)}
                  style={estilos.botaoRemover}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  folha: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 32,
  },
  indicador: {
    width: 40,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titulo: { fontSize: 17, fontWeight: 'bold', color: '#0F172A' },
  botaoFechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  cardSalvar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 12,
  },
  cardSalvarInfo: { flex: 1 },
  cardSalvarTermo: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  botaoSalvar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  botaoSalvarTexto: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  secaoTitulo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  estadoVazio: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  estadoVazioTexto: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  estadoVazioSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },
  botaoTentar: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0F172A',
    borderRadius: 10,
  },
  botaoTentarTexto: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  itemIcone: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemConteudo: { flex: 1 },
  itemTermo: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  botaoRemover: { padding: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipTexto: { fontSize: 11, color: '#475569', fontWeight: '500' },
});
