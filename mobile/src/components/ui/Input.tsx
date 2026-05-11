import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props extends TextInputProps {
  label: string;
  icone: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, icone, ...resto }: Props) {
  return (
    <View style={estilos.grupo}>
      <Text style={estilos.label}>{label}</Text>
      <View style={estilos.wrapper}>
        <Ionicons name={icone} size={18} color="#94A3B8" style={estilos.icone} />
        <TextInput 
          style={estilos.input}
          placeholderTextColor="#94A3B8"
          {...resto}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#0F172A', marginBottom: 6},
  wrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#FFF', height: 48 },
  icone: { marginLeft: 14, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', height: '100%' },
});