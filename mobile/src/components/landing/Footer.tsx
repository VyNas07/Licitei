import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function Footer() {
  return (
    <View style={estilos.areaRodape}>
      {/* Logo e Breve Descrição */}
      <View style={estilos.containerLogo}>
        <View style={estilos.fundoIconeLogo}>
          <Ionicons name="sparkles" size={14} color="#FFF" />
        </View>
        <Text style={estilos.textoLogo}>Licitei</Text>
      </View>

      <Text style={estilos.descricao}>
        Simplificando o acesso de MEIs ao mercado de compras públicas brasileiras.
      </Text>

      <View style={estilos.redesSociais}>
        <TouchableOpacity style={estilos.botaoSocial}>
          <Ionicons name="logo-instagram" size={20} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={estilos.botaoSocial}>
          <Ionicons name="logo-linkedin" size={20} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={estilos.botaoSocial}>
          <Ionicons name="logo-github" size={20} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View style={estilos.divisor} />

      <Text style={estilos.textoCopyright}>
        © {new Date().getFullYear()} Licitei. Todos os direitos reservados.
      </Text>
      <Text style={estilos.textoFonte}>
        Dados públicos processados via portal PNCP.
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  areaRodape: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  containerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fundoIconeLogo: {
    width: 24,
    height: 24,
    backgroundColor: '#0F172A',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLogo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  descricao: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  redesSociais: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  botaoSocial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  divisor: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 24,
  },
  textoCopyright: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  textoFonte: {
    fontSize: 10,
    color: '#94A3B8',
  },
});