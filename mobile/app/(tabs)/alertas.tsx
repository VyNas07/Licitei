import React from 'react';
import { ScrollView, View, Text, StyleSheet, StatusBar, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { Calendar } from '../../src/components/alertas/Calendar';
import { NotificationItem } from '../../src/components/alertas/NotificationItem';
import { useAlertas } from '../../src/hooks/useAlertas';

export default function AlertasScreen() {
  const router = useRouter();
  const { alertas, carregando, erro, carregar, datasComAlerta } = useAlertas();

  function renderNotificacoes() {
    if (carregando) {
      return <ActivityIndicator size="large" color="#0F172A" style={{ marginTop: 20 }} />;
    }
    if (erro) {
      return (
        <View style={estilos.emptyState}>
          <Text style={estilos.erroText}>Não foi possível carregar os alertas.</Text>
          <TouchableOpacity onPress={carregar} style={{ marginTop: 12 }}>
            <Text style={estilos.tentarNovamente}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (alertas.length === 0) {
      return <Text style={estilos.textoVazio}>Nenhum alerta no momento.</Text>;
    }
    return alertas.map((alerta) => (
      <NotificationItem
        key={alerta.id}
        tipo={alerta.tipo}
        titulo={alerta.titulo}
        descricao={alerta.descricao}
        data={alerta.data}
        onPress={alerta.licitacao_id ? () => router.push(`/edital/${alerta.licitacao_id}`) : undefined}
      />
    ));
  }

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
            {renderNotificacoes()}
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
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  textoVazio: { color: '#64748B', textAlign: 'center', marginTop: 20 },
  erroText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  tentarNovamente: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
});