import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CalendarProps {
  datasComAlerta: number[];
}

export function Calendar({ datasComAlerta }: CalendarProps) {
  const hoje = new Date();
  const [dataExibida, setDataExibida] = useState(new Date());

  const ano = dataExibida.getFullYear();
  const mes = dataExibida.getMonth();
  
  const nomeMes = dataExibida.toLocaleDateString("pt-BR", { month: "long" });
  const tituloFormatado = `${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}/${ano}`;
  
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasComAlertaSet = new Set(datasComAlerta);

  const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];

  const alterarMes = (direcao: number) => {
    const novaData = new Date(ano, mes + direcao, 1);
    setDataExibida(novaData);
  };

  return (
    <View style={estilos.cartao}>
      <View style={estilos.cabecalho}>
        <TouchableOpacity onPress={() => alterarMes(-1)} style={estilos.botaoNavegacao}>
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
        </TouchableOpacity>

        <View style={estilos.linhaInfo}>
          <Ionicons name="calendar-outline" size={16} color="#0F172A" />
          <Text style={estilos.tituloMes}>{tituloFormatado}</Text>
        </View>

        <TouchableOpacity onPress={() => alterarMes(1)} style={estilos.botaoNavegacao}>
          <Ionicons name="chevron-forward" size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={estilos.gradeDiasSemana}>
        {diasSemana.map((d, i) => (
          <Text key={i} style={estilos.textoDiaSemana}>{d}</Text>
        ))}
      </View>

      <View style={estilos.gradeDias}>
        {Array.from({ length: primeiroDia }).map((_, i) => (
          <View key={`vazio-${i}`} style={estilos.caixaDia} />
        ))}
        {Array.from({ length: diasNoMes }).map((_, i) => {
          const dia = i + 1;
          const temAlerta = diasComAlertaSet.has(dia);
          const ehHoje = hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano;

          return (
            <View key={dia} style={estilos.caixaDia}>
              <View style={[
                estilos.circuloDia,
                temAlerta && estilos.diaComAlerta,
                ehHoje && !temAlerta && estilos.diaHoje
              ]}>
                <Text style={[
                  estilos.textoDia,
                  temAlerta && estilos.textoDiaAtivo,
                  ehHoje && !temAlerta && estilos.textoDiaHoje
                ]}>
                  {dia}
                </Text>
                {temAlerta && <View style={estilos.pontoAlerta} />}
              </View>
            </View>
          );
        })}
      </View>

      <View style={estilos.legenda}>
        <View style={estilos.itemLegenda}>
          <View style={[estilos.pontoLegenda, { backgroundColor: '#0F172A' }]} />
          <Text style={estilos.textoLegenda}>Com prazo</Text>
        </View>
        <View style={estilos.itemLegenda}>
          <View style={[estilos.pontoLegenda, { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#0F172A20' }]} />
          <Text style={estilos.textoLegenda}>Hoje</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  cabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  botaoNavegacao: { padding: 4 },
  linhaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tituloMes: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  textoPrazos: { fontSize: 11, color: '#64748B' },
  gradeDiasSemana: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  textoDiaSemana: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: '#94A3B8' },
  gradeDias: { flexDirection: 'row', flexWrap: 'wrap' },
  caixaDia: { width: '14.28%', aspectSquare: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  circuloDia: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  diaComAlerta: { backgroundColor: '#0F172A' },
  diaHoje: { backgroundColor: '#F1F5F9' },
  textoDia: { fontSize: 12, color: '#0F172A' },
  textoDiaAtivo: { color: '#FFF', fontWeight: 'bold' },
  textoDiaHoje: { color: '#0F172A', fontWeight: 'bold' },
  pontoAlerta: { position: 'absolute', bottom: 4, width: 3, height: 3, borderRadius: 2, backgroundColor: '#F59E0B' },
  legenda: { flexDirection: 'row', gap: 16, pt: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  itemLegenda: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pontoLegenda: { width: 8, height: 8, borderRadius: 4 },
  textoLegenda: { fontSize: 10, color: '#64748B' }
});