import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visivel: boolean;
  fechar: () => void;
  categorias: any[];
  selecionadas: string[];
  alternarSelecao: (id: string) => void;
}

export function CategoryModal({ visivel, fechar, categorias, selecionadas, alternarSelecao }: Props) {
  return (
    <Modal visible={visivel} transparent animationType="fade">
      <Pressable style={estilos.fundo} onPress={fechar}>
        <View style={estilos.conteudo}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>Todas as Categorias</Text>
            <TouchableOpacity onPress={fechar}>
              <Ionicons name="close" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {categorias.map((cat) => {
              const estaAtivo = selecionadas.includes(cat.id);
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[estilos.item, estaAtivo && estilos.itemAtivo]}
                  onPress={() => alternarSelecao(cat.id)}
                >
                  <View style={[estilos.iconeArea, estaAtivo && estilos.iconeAreaAtiva]}>
                    <Ionicons name={cat.icone} size={20} color={estaAtivo ? "#FFF" : "#0F172A"} />
                  </View>
                  <Text style={[estilos.itemNome, estaAtivo && estilos.textoAtivo]}>{cat.nome}</Text>
                  <Text style={estilos.itemQtd}>{cat.qtd} editais</Text>
                  <Ionicons name={estaAtivo ? "checkbox" : "square-outline"} size={20} color={estaAtivo ? "#0F172A" : "#CBD5E1"} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={estilos.botaoAplicar} onPress={fechar}>
            <Text style={estilos.textoAplicar}>Aplicar Filtros</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
  conteudo: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  itemAtivo: { backgroundColor: '#F8FAFC' },
  iconeArea: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  iconeAreaAtiva: { backgroundColor: '#0F172A' },
  itemNome: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500' },
  textoAtivo: { fontWeight: '700' },
  itemQtd: { fontSize: 12, color: '#64748B', marginRight: 10 },
  botaoAplicar: { backgroundColor: '#0F172A', padding: 16, borderRadius: 15, marginTop: 20, alignItems: 'center' },
  textoAplicar: { color: '#FFF', fontWeight: 'bold' }
});