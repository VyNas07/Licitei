import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PropriedadesFaturamento {
  valorAtual: number;
  valorTeto: number;
}

export function RevenueCard({ valorAtual, valorTeto }: PropriedadesFaturamento) {
  const percentual = Math.min(100, (valorAtual / valorTeto) * 100);
  
  // Lógica de cores baseada na proximidade do teto
  const corProgresso = percentual > 80 ? '#EF4444' : percentual > 60 ? '#F59E0B' : '#22C55E';

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <View style={estilos.cartaoFaturamento}>
      <View style={estilos.linhaInformacao}>
        <Text style={estilos.tituloFaturamento}>Faturamento MEI</Text>
        <Text style={estilos.textoPorcentagem}>{percentual.toFixed(0)}%</Text>
      </View>
      
      <Text style={estilos.legendaFaturamento}>
        {formatarMoeda(valorAtual)} de {formatarMoeda(valorTeto)} no ano
      </Text>

      <View style={estilos.trilhoBarra}>
        <View 
          style={[
            estilos.preenchimentoBarra, 
            { width: `${percentual}%`, backgroundColor: corProgresso }
          ]} 
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartaoFaturamento: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
  },
  linhaInformacao: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  tituloFaturamento: { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  textoPorcentagem: { fontSize: 12, fontWeight: 'bold', color: '#0F172A' },
  legendaFaturamento: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 12 },
  trilhoBarra: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  preenchimentoBarra: { height: '100%', borderRadius: 4 },
});