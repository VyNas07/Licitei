import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { Calendar } from '../../src/components/alertas/Calendar';
import { NotificationItem } from '../../src/components/alertas/NotificationItem';
import api from '../../src/services/api';

type TipoAlerta = 'prazo' | 'preferencia' | 'documento';

interface AlertaUI {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  descricao: string;
  data: string;
  licitacao_id?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAlerta(alerta: any, index: number): AlertaUI {
  if (alerta.tipo === 'prazo_curto') {
    return {
      id: String(index),
      tipo: 'prazo',
      titulo: `Prazo curto: ${alerta.dias_restantes} dia(s)`,
      descricao: alerta.mensagem,
      data: `${alerta.dias_restantes}d restantes`,
      licitacao_id: alerta.licitacao_id,
    };
  }
  if (alerta.tipo === 'teto_mei') {
    return {
      id: String(index),
      tipo: 'documento',
      titulo: alerta.urgente ? 'Teto MEI atingido!' : 'Atenção: teto MEI próximo',
      descricao: alerta.mensagem,
      data: 'Agora',
    };
  }
  return {
    id: String(index),
    tipo: 'preferencia',
    titulo: 'Novo edital compatível',
    descricao: alerta.mensagem ?? alerta.edital?.objeto_compra ?? '',
    data: 'Recente',
    licitacao_id: alerta.edital?.numero_controle_pncp,
  };
}

export default function AlertasScreen() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<AlertaUI[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/alertas')
      .then(({ data }) => setAlertas((data.data ?? []).map(mapAlerta)))
      .catch(() => setAlertas([]))
      .finally(() => setCarregando(false));
  }, []);

  const datasComAlerta: number[] = alertas
    .filter(a => a.tipo === 'prazo')
    .map(() => new Date().getDate());

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