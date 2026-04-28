import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  nomeUsuario: string;
  onOpenFilters: () => void;
}

export function FeedHeader({ nomeUsuario, onOpenFilters }: Props) {
  const router = useRouter();

  return (
    <View style={estilos.cabecalhoFixo}>
      <View style={estilos.linhaTopo}>
        <View>
          <Text style={estilos.saudacao}>Olá, {nomeUsuario}</Text>
          <Text style={estilos.tituloPrincipal}>Boas oportunidades hoje</Text>
        </View>
        <TouchableOpacity 
          style={estilos.botaoNotificacao} 
          onPress={() => router.push('/alertas')}
        >
          <Ionicons name="notifications-outline" size={22} color="#FFF" />
          <View style={estilos.pontoNotificacao} />
        </TouchableOpacity>
      </View>

      <View style={estilos.barraBusca}>
        <View style={estilos.campoBusca}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput 
            placeholder="Buscar editais, órgãos..." 
            style={estilos.input}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity style={estilos.botaoFiltro} onPress={onOpenFilters}>
          <Ionicons name="options-outline" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalhoFixo: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 10,
    elevation: 5,
  },
  linhaTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  saudacao: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  tituloPrincipal: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  botaoNotificacao: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  pontoNotificacao: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB800', borderWidth: 2, borderColor: '#0F172A' },
  barraBusca: { flexDirection: 'row', gap: 10 },
  campoBusca: { flex: 1, height: 48, backgroundColor: '#FFF', borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  input: { flex: 1, marginLeft: 10, fontSize: 14, color: '#0F172A' },
  botaoFiltro: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 15, alignItems: 'center', justifyContent: 'center', elevation: 3 }
});