import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { Calendar } from '../../src/components/alertas/Calendar';
import { NotificationItem } from '../../src/components/alertas/NotificationItem';

export default function AlertasScreen() {
  const router = useRouter();
  
  const datasComAlerta = [10, 15, 22];
  const alertas = [
    { id: '1', tipo: 'prazo' as const, titulo: 'Fim do prazo: Edital 2024-05', descricao: 'Envie sua proposta para a Prefeitura de Recife até as 18h.', data: 'Hoje' },
    { id: '2', tipo: 'preferencia' as const, titulo: 'Cota Reservada MEI', descricao: 'Nova oportunidade com 25% de cota exclusiva para pequenos negócios.', data: 'Ontem' },
    { id: '3', tipo: 'documento' as const, titulo: 'Certidão Vencendo', descricao: 'Sua Certidão Municipal vence em 7 dias. Atualize agora.', data: 'Há 2 dias' },
  ];

  return (
    <SafeAreaView style={estilos.recipiente}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <AuthHeader 
        titulo="Alertas & Calendário" 
        subtitulo="Prazos de propostas e oportunidades para MEIs" 
        exibirVoltar={true}
      />

      <ScrollView 
        style={estilos.rolagem} 
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.areaInterna}>
          <View style={estilos.secaoCalendario}>
            <Calendar datasComAlerta={datasComAlerta} />
          </View>

          <View style={estilos.secaoNotificacoes}>
            <Text style={estilos.tituloSecao}>Notificações</Text>
            {alertas.map((alerta) => (
              <NotificationItem 
                key={alerta.id}
                {...alerta}
                onPress={() => alerta.tipo === 'prazo' && router.push('/edital/1')}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipiente: { flex: 1, backgroundColor: '#0F172A'},
  rolagem: { flex: 1, backgroundColor: '#F8FAFC' },
  conteudoRolagem: { paddingBottom: 120 },
  areaInterna: { paddingHorizontal: 20 },
  secaoCalendario: { marginTop: 10 },
  secaoNotificacoes: { marginTop: 24, marginBottom: -100 },
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 }
});