import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visivel: boolean;
  fechar: () => void;
  filtrosAtuais: any;
  aplicar: (filtros: any) => void;
}

const CIDADES_POR_UF: Record<string, string[]> = {
  PE: ['Recife', 'Olinda', 'Jaboatão dos Guararapes', 'Caruaru', 'Petrolina', 'Paulista'],
  SP: ['São Paulo', 'Campinas', 'Santos', 'Osasco', 'Sertãozinho', 'Guarulhos'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Búzios', 'Petrópolis', 'Duque de Caxias'],
  MG: ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora'],
  BA: ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari'],
};

export function FilterModal({ visivel, fechar, filtrosAtuais, aplicar }: Props) {
  const [uf, setUf] = useState(filtrosAtuais?.uf || 'Todas');
  const [municipio, setMunicipio] = useState(filtrosAtuais?.municipio || '');
  const [valor, setValor] = useState(filtrosAtuais?.valor || 'Todos');
  const [cnae, setCnae] = useState(filtrosAtuais?.cnae || '');

  const [sugestoesCidades, setSugestoesCidades] = useState<string[]>([]);
  const [exibirTodosEstados, setExibirTodosEstados] = useState(false);

  const ufsPrincipais = ['Todas', 'PE', 'SP', 'RJ', 'MG', 'BA'];
  const todosEstados = ['AC', 'AL', 'AP', 'AM', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'PA', 'PB', 'PR', 'PI', 'RN', 'RS', 'RO', 'RR', 'SC', 'SE', 'TO'];
  const cnaesSugeridos = ['4321-5/00', '9529-1/99', '8121-4/00'];

  useEffect(() => {
    if (uf !== 'Todas' && municipio.length >= 1) {
      const filtradas = CIDADES_POR_UF[uf]?.filter(c =>
        c.toLowerCase().includes(municipio.toLowerCase())
      );
      setSugestoesCidades(filtradas || []);
    } else {
      setSugestoesCidades([]);
    }
  }, [municipio, uf]);

  const handleAplicar = () => {
    let modalidadeSugerida = 'Todas';
    if (valor === 'Até R$ 80 mil (exclusivo MEI)') {
      modalidadeSugerida = 'Dispensa';
    }
    aplicar({ uf, municipio, valor, cnae, modalidadeSugerida });
    fechar();
  };

  return (
    <Modal visible={visivel} transparent animationType="slide" onRequestClose={fechar}>
      <View style={estilos.fundo}>
        <Pressable style={StyleSheet.absoluteFill} onPress={fechar} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={estilos.wrapper}
        >
          <View style={estilos.conteudo}>
            <View style={estilos.indicadorModal} />

            <View style={estilos.cabecalho}>
              <Text style={estilos.titulo}>Filtros</Text>
              <TouchableOpacity onPress={fechar} style={estilos.botaoFechar}>
                <Ionicons name="close" size={20} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
            >
              <View style={estilos.secao}>
                <Text style={estilos.rotulo}>Região (UF)</Text>
                <View style={estilos.gradeUf}>
                  {ufsPrincipais.map(item => (
                    <TouchableOpacity
                      key={item}
                      style={[estilos.chip, uf === item && estilos.chipAtivo]}
                      onPress={() => { setUf(item); setMunicipio(''); setExibirTodosEstados(false); }}
                    >
                      <Text style={[estilos.textoChip, uf === item && estilos.textoChipAtivo]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[estilos.chip, exibirTodosEstados && estilos.chipAtivo]}
                    onPress={() => setExibirTodosEstados(!exibirTodosEstados)}
                  >
                    <Ionicons name="add" size={18} color={exibirTodosEstados ? "#FFF" : "#0F172A"} />
                  </TouchableOpacity>
                </View>

                {exibirTodosEstados && (
                  <View style={estilos.listaEstadosExtras}>
                    {todosEstados.map(estado => (
                      <TouchableOpacity
                        key={estado}
                        style={[estilos.miniChip, uf === estado && estilos.miniChipAtivo]}
                        onPress={() => { setUf(estado); setMunicipio(''); }}
                      >
                        <Text style={[estilos.textoMiniChip, uf === estado && estilos.textoMiniChipAtivo]}>
                          {estado}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={estilos.secao}>
                <Text style={estilos.rotulo}>Município</Text>
                <View style={estilos.containerInput}>
                  <TextInput
                    style={estilos.input}
                    placeholder={uf === 'Todas' ? "Selecione uma UF primeiro" : "Digite para buscar..."}
                    placeholderTextColor="#94A3B8"
                    value={municipio}
                    onChangeText={setMunicipio}
                    editable={uf !== 'Todas'}
                  />
                </View>

                {sugestoesCidades.length > 0 && (
                  <View style={estilos.containerSugestoes}>
                    {sugestoesCidades.map(item => (
                      <TouchableOpacity
                        key={item}
                        style={estilos.itemSugestao}
                        onPress={() => { setMunicipio(item); setSugestoesCidades([]); }}
                      >
                        <Text style={estilos.textoSugestao}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={estilos.secao}>
                <Text style={estilos.rotulo}>Valor Estimado</Text>
                {['Todos', 'Até R$ 80 mil (exclusivo MEI)', 'R$ 80 mil – R$ 200 mil', 'Acima de R$ 200 mil'].map(item => (
                  <TouchableOpacity
                    key={item}
                    style={[estilos.opcaoValor, valor === item && estilos.opcaoValorAtiva]}
                    onPress={() => setValor(item)}
                  >
                    <Text style={[estilos.textoOpcao, valor === item && estilos.textoOpcaoAtiva]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={estilos.secao}>
                <Text style={estilos.rotulo}>CNAE</Text>
                <View style={estilos.containerInput}>
                  <TextInput
                    style={estilos.inputCnae}
                    placeholder="Ex: 4321-5/00"
                    placeholderTextColor="#94A3B8"
                    value={cnae}
                    onChangeText={setCnae}
                    keyboardType="default"
                  />
                </View>

                <View style={estilos.gradeSugestoes}>
                  {cnaesSugeridos.map(item => (
                    <TouchableOpacity
                      key={item}
                      style={estilos.chipSugestao}
                      onPress={() => setCnae(item)}
                    >
                      <Text style={estilos.textoCnaeSugestao}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={estilos.botaoAplicar} onPress={handleAplicar}>
              <Text style={estilos.textoBotao}>Ver Resultados</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  wrapper: { justifyContent: 'flex-end' },
  conteudo: { backgroundColor: '#FFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '90%' },
  indicadorModal: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  botaoFechar: { backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 },
  secao: { marginBottom: 24 },
  rotulo: { fontSize: 11, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', marginBottom: 12 },
  gradeUf: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipAtivo: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  textoChip: { fontSize: 13, fontWeight: 'bold', color: '#0F172A' },
  textoChipAtivo: { color: '#FFF' },
  listaEstadosExtras: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 16 },
  miniChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  miniChipAtivo: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  textoMiniChip: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
  textoMiniChipAtivo: { color: '#FFF' },
  containerInput: { backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  input: { fontSize: 15, color: '#0F172A', fontWeight: '500', height: '100%' },
  containerSugestoes: { backgroundColor: '#FFF', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  itemSugestao: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  textoSugestao: { fontSize: 14, color: '#0F172A' },
  inputCnae: { fontSize: 15, color: '#0F172A', fontWeight: 'bold', height: '100%' },
  gradeSugestoes: { flexDirection: 'row', gap: 8, marginTop: 10 },
  chipSugestao: { backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  textoCnaeSugestao: { fontSize: 11, fontWeight: 'bold', color: '#0369A1' },
  opcaoValor: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
  opcaoValorAtiva: { backgroundColor: '#E0F2FE', borderColor: '#0369A1' },
  textoOpcao: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  textoOpcaoAtiva: { color: '#0369A1' },
  botaoAplicar: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  textoBotao: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});