import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  titulo: string;
  subtitulo: string;
  exibirVoltar?: boolean;
}

export function AuthHeader({ titulo, subtitulo, exibirVoltar = true }: Props) {
  const router = useRouter();

  return (
    <View style={estilos.cabecalho}>
      {exibirVoltar ? (
        <TouchableOpacity onPress={() => router.back()} style={estilos.botaoVoltar}>
          <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={estilos.textoVoltar}>Voltar</Text>
        </TouchableOpacity>
      ) : (
        <View style={estilos.espacadorSemVoltar} />
      )}

      <View style={estilos.containerLogo}>
        <View style={estilos.fundoIconeLogo}>
          <Ionicons name="sparkles" size={16} color="#FFF" />
        </View>
        <Text style={estilos.textoLogo}>Licitei</Text>
      </View>

      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.subtitulo}>{subtitulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 20, 
    paddingTop: 20, 
    paddingBottom: 35, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24 
  },
  botaoVoltar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 24 },
  espacadorSemVoltar: { height: 0, marginBottom: 8 },
  textoVoltar: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  containerLogo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fundoIconeLogo: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  textoLogo: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  titulo: { color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5 },
  subtitulo: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
});