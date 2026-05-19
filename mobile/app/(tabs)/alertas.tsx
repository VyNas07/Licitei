import React from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { Calendar } from '../../src/components/alertas/Calendar';
import { NotificationItem } from '../../src/components/alertas/NotificationItem';
import { useAlertas } from '../../src/hooks/useAlertas';

export default function AlertasScreen() {
  const router = useRouter();
  const { alertas, carregando, datasComAlerta } = useAlertas();

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
            {carregando ? (
              <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 20 }} />
            ) : alertas.length === 0 ? (
              <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 20 }}>Nenhum alerta no momento.</Text>
            ) : alertas.map((alerta) => (
              <NotificationItem
                key={alerta.id}
                tipo={alerta.tipo}
                titulo={alerta.titulo}
                descricao={alerta.descricao}
                data={alerta.data}
                onPress={alerta.licitacao_id ? () => router.push(`/edital/${alerta.licitacao_id}`) : undefined}
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