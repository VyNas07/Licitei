import React from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthHeader } from '../../src/components/auth/AuthHeader';
import { ResumoCard } from '../../src/components/auth/ResumoCard'; 
import { EditalCard } from '../../src/components/editais/EditalCard';

export default function TelaDisputas() {
  const navegador = useRouter();

  const resumo = [
    { 
      icone: 'create-outline' as const, 
      rotulo: 'Em preparação', 
      valor: 3, 
      estilo: { backgroundColor: '#F1F5F9', color: '#0F172A' } 
    },
    { 
      icone: 'send-outline' as const, 
      rotulo: 'Submetidas', 
      valor: 12, 
      estilo: { backgroundColor: '#FEF3C7', color: '#D97706' } 
    },
    { 
      icone: 'checkmark-circle-outline' as const, 
      rotulo: 'Finalizadas', 
      valor: 45, 
      estilo: { backgroundColor: '#DCFCE7', color: '#16A34A' } 
    },
  ];

  return (
    <SafeAreaView style={estilos.recipiente}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      <AuthHeader 
        titulo="Histórico de Participações" 
        subtitulo="Acompanhe o andamento dos seus editais" 
      />

      <ScrollView 
        style={estilos.rolagem} 
        contentContainerStyle={estilos.conteudoRolagem}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.secaoResumo}>
          {resumo.map((item) => (
            <ResumoCard 
              key={item.rotulo}
              icone={item.icone}
              rotulo={item.rotulo}
              valor={item.valor}
              estiloIcone={item.estilo}
            />
          ))}
        </View>

        <View style={estilos.secaoLista}>
          <View style={estilos.cabecalhoLista}>
            <Text style={estilos.tituloSecao}>Minhas participações</Text>
            <TouchableOpacity>
               <Ionicons name="filter-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <EditalCard 
            onPress={() => navegador.push('/edital/2024-05')}
            item={{
              numero_controle_pncp: '2024-05',
              objeto_compra: 'Serviço de buffet para eventos corporativos e coquetéis',
              orgao_razao_social: 'Câmara Municipal de Recife',
              valor_total_estimado: 15200.00,
              uf: 'PE',
              municipio: 'Recife',
              data_encerramento_proposta: 'Finalizado em 12/04'
            }}
          />
        </View>

        <View style={estilos.cartaoIncentivo}>
          <Text style={estilos.tituloIncentivo}>Quer ver mais oportunidades?</Text>
          <Text style={estilos.descIncentivo}>
            Volte ao painel inicial para descobrir novos editais publicados no PNCP.
          </Text>
          <TouchableOpacity 
            style={estilos.botaoExplorar}
            onPress={() => navegador.replace('/(tabs)')}
          >
            <Text style={estilos.textoBotaoExplorar}>Explorar editais</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  recipiente: { 
    flex: 1, 
    backgroundColor: '#0F172A' 
  },
  rolagem: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  conteudoRolagem: { 
    paddingBottom: 110 
  },
  secaoResumo: { 
    flexDirection: 'row', 
    gap: 10, 
    paddingHorizontal: 20, 
    marginTop: 10,
  },
  secaoLista: { 
    marginTop: 32, 
    paddingHorizontal: 20 
  },
  cabecalhoLista: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  tituloSecao: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0F172A' 
  },
  cartaoIncentivo: { 
    marginHorizontal: 20, 
    marginTop: 24, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.1)'
  },
  tituloIncentivo: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#0F172A', 
    textAlign: 'center' 
  },
  descIncentivo: { 
    fontSize: 12, 
    color: '#64748B', 
    textAlign: 'center', 
    marginTop: 6, 
    marginBottom: 16,
    lineHeight: 18 
  },
  botaoExplorar: { 
    backgroundColor: '#0F172A', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 16 
  },
  textoBotaoExplorar: { 
    color: '#FFF', 
    fontSize: 14, 
    fontWeight: 'bold' 
  }
});