import React, { useState, useRef } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StyleSheet, 
  StatusBar,
  Modal,
  Animated
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { 
  ArrowLeft, 
  AlertTriangle, 
  Calendar, 
  FileCheck2, 
  Building2, 
  Target, 
  CheckCircle2, 
  Circle,
  Lock
} from "lucide-react-native";
import { 
  getEdital, 
  formatBRL, 
  formatDate, 
  MEI_TETO, 
  MEI_EXCLUSIVO_TETO, 
  PERFIL_MOCK,
  participarEdital,
  MEUS_DOCUMENTOS_CADASTRADOS 
} from "../../src/lib/mock-data";

export default function EditalDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const edital = getEdital(id as string);
  
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  if (!edital) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Edital não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Etapas reais de um certame para exibição em disputas
  const ETAPAS_CERTAME = [
    "Proposta enviada", 
    "Análise de documentos", 
    "Fase de lances", 
    "Habilitação", 
    "Adjudicado"
  ];

  const total = edital.documentos.length;
  const done = edital.documentos.filter((d) => checked[d.id]).length;
  const podeParticipar = done === total && total > 0 && !edital.participando;

  const handleParticipar = () => {
    participarEdital(edital.id);
    setShowSuccess(true);
    
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowSuccess(false);
      router.replace("/disputas");
    }, 2000);
  };

  const projetadoAno = PERFIL_MOCK.faturamentoAcumulado + edital.valor;
  const excedeTeto = projetadoAno > MEI_TETO;
  const proximoTeto = !excedeTeto && projetadoAno > MEI_TETO * 0.8;
  const exclusivoMEI = edital.valor <= MEI_EXCLUSIVO_TETO;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#FFFFFF" size={16} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          
          <Text style={styles.metaText}>
            {edital.modalidade.toUpperCase()} • {edital.uf}
          </Text>
          <Text style={styles.title}>{edital.objeto}</Text>
          <Text style={styles.subTitle}>{edital.orgao}</Text>
          
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>
               {edital.participando ? "STATUS: EM DISPUTA" : `MATCH ${edital.match.toUpperCase()}`}
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.alertCard, exclusivoMEI ? styles.successCard : styles.mutedCard]}>
            <View style={[styles.meiIcon, exclusivoMEI ? styles.successIconBg : styles.cardIconBg]}>
              <Text style={styles.meiIconText}>MEI</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.alertTitle, exclusivoMEI ? styles.successText : styles.mutedText]}>
                {exclusivoMEI ? "Benefício MEI ativo" : "Ampla concorrência"}
              </Text>
              <Text style={styles.alertDescription}>
                {exclusivoMEI 
                  ? `Licitação exclusiva para MEI/ME até ${formatBRL(MEI_EXCLUSIVO_TETO)}.` 
                  : `Acima de ${formatBRL(MEI_EXCLUSIVO_TETO)}: aberta a todos.`}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTag}>RESUMO INTELIGENTE</Text>
            <SummaryRow icon={Target} label="Objeto da licitação" value={edital.descricao} />
            <SummaryRow icon={Building2} label="Órgão" value={edital.orgao} />
            <SummaryRow icon={FileCheck2} label="Valor estimado" value={formatBRL(edital.valor)} highlight />
            <SummaryRow icon={Calendar} label="Data limite" value={formatDate(edital.dataLimite)} />
          </View>

          {/* HISTÓRICO DE ETAPAS (Só aparece em Disputas) */}
          {edital.participando ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico de Etapas</Text>
              <View style={styles.timelineContainer}>
                {ETAPAS_CERTAME.map((etapa, index) => {
                  const isConcluida = ETAPAS_CERTAME.indexOf(edital.status || "Proposta enviada") >= index;
                  return (
                    <View key={index} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View style={[styles.timelineDot, isConcluida && styles.dotActive]}>
                          {isConcluida && <CheckCircle2 size={12} color="#FFF" />}
                        </View>
                        {index < ETAPAS_CERTAME.length - 1 && (
                          <View style={[styles.timelineLine, isConcluida && styles.lineActive]} />
                        )}
                      </View>
                      <Text style={[styles.timelineText, isConcluida && styles.textActive]}>
                        {etapa}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Checklist de habilitação</Text>
                <Text style={styles.progressText}>{done}/{total}</Text>
              </View>
              
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(done / (total || 1)) * 100}%` }]} />
              </View>

              <View style={styles.docList}>
                {edital.documentos.map((d) => {
                  // TRAVA: verifica se o documento consta no perfil[cite: 5]
                  const possuiDocumento = MEUS_DOCUMENTOS_CADASTRADOS.includes(d.nome);
                  const ok = !!checked[d.id];
                  return (
                    <TouchableOpacity 
                      key={d.id} 
                      onPress={() => possuiDocumento && setChecked(s => ({ ...s, [d.id]: !s[d.id] }))}
                      style={[styles.docItem, !possuiDocumento && styles.docItemDisabled]}
                      activeOpacity={possuiDocumento ? 0.7 : 1}
                    >
                      {ok ? <CheckCircle2 size={20} color="#10B981" /> : <Circle size={20} color="#94A3B8" />}
                      <Text style={[styles.docName, ok && styles.docNameDone]}>{d.nome}</Text>
                      {!possuiDocumento && <Lock size={14} color="#EF4444" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {done < total && (
                <Text style={styles.lockAviso}>
                  * Itens com <Lock size={10} color="#EF4444" /> não podem ser marcados pois não constam em seus Documentos.
                </Text>
              )}
            </View>
          )}

          {!edital.participando && (
            <TouchableOpacity 
              style={[styles.actionButton, !podeParticipar && styles.actionButtonDisabled]}
              onPress={handleParticipar}
              disabled={!podeParticipar}
            >
              <Text style={styles.actionButtonText}>
                {podeParticipar ? "Quero participar desta disputa" : "Complete os documentos"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <CheckCircle2 size={100} color="#10B981" />
            </Animated.View>
            <Text style={styles.successTitle}>Sucesso!</Text>
            <Text style={styles.successSub}>Participando do certame</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryRow({ icon: Icon, label, value, highlight }: any) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIconBox}><Icon color="#0F172A" size={18} /></View>
      <View style={styles.flex1}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, highlight && styles.highlightText]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { color: "#64748B", marginBottom: 10 },
  backLink: { color: "#0F172A", fontWeight: "bold" },
  flex1: { flex: 1 },
  bold: { fontWeight: "bold" },
  header: { backgroundColor: "#0F172A", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: -25 },
  backButtonText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginLeft: 6 },
  metaText: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "bold", letterSpacing: 1 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold", marginTop: 8, lineHeight: 28 },
  subTitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  matchBadge: { marginTop: 16, alignSelf: "flex-start", backgroundColor: "rgba(34,197,94,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: "#4ADE80", fontSize: 10, fontWeight: "bold" },
  content: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 40 },
  alertCard: { padding: 16, borderRadius: 20, flexDirection: "row", gap: 12, borderWidth: 1, marginBottom: 12, alignItems: "center" },
  successCard: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" },
  mutedCard: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  dangerCard: { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
  warningCard: { backgroundColor: "#FFFBEB", borderColor: "#FEF3C7" },
  meiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  meiIconText: { fontSize: 10, fontWeight: "bold", color: "#1E293B" },
  successIconBg: { backgroundColor: "#DCFCE7" },
  cardIconBg: { backgroundColor: "#FFFFFF" },
  alertTitle: { fontSize: 14, fontWeight: "bold" },
  alertDescription: { fontSize: 11, color: "#475569", marginTop: 2 },
  successText: { color: "#166534" },
  mutedText: { color: "#475569" },
  dangerText: { color: "#991B1B" },
  warningText: { color: "#92400E" },
  section: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 16 },
  sectionTag: { fontSize: 10, fontWeight: "bold", color: "#0F172A", backgroundColor: "#F1F5F9", alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 16 },
  summaryRow: { flexDirection: "row", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  summaryIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F8FAFC", alignItems: "center", justifyContent: "center" },
  summaryLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "bold", textTransform: "uppercase" },
  summaryValue: { fontSize: 14, color: "#334155", marginTop: 2 },
  highlightText: { color: "#0F172A", fontWeight: "bold" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#0F172A" },
  progressText: { fontSize: 12, fontWeight: "bold", color: "#0F172A" },
  progressBarBg: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, marginBottom: 20, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#0F172A" },
  docList: { gap: 8 },
  docItem: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#F8FAFC", gap: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  docItemDisabled: { backgroundColor: "#F1F5F9", opacity: 0.6 },
  docName: { flex: 1, fontSize: 13, color: "#334155" },
  docNameDone: { textDecorationLine: "line-through", color: "#94A3B8" },
  lockAviso: { fontSize: 10, color: "#EF4444", marginTop: 10, textAlign: 'center' },
  actionButton: { backgroundColor: "#0F172A", paddingVertical: 18, borderRadius: 20, alignItems: "center", marginTop: 8, elevation: 5 },
  actionButtonDisabled: { backgroundColor: "#94A3B8", elevation: 0 },
  actionButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  timelineContainer: { marginTop: 15 },
  timelineItem: { flexDirection: "row", gap: 12, minHeight: 50 },
  timelineLeft: { alignItems: "center", width: 24 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#E2E8F0", zIndex: 2, alignItems: "center", justifyContent: "center" },
  dotActive: { backgroundColor: "#10B981" },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#E2E8F0", marginVertical: -2 },
  lineActive: { backgroundColor: "#10B981" },
  timelineText: { fontSize: 14, color: "#94A3B8" },
  textActive: { color: "#0F172A", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.9)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFF", padding: 50, borderRadius: 40, alignItems: "center", width: "80%" },
  successTitle: { fontSize: 24, fontWeight: "bold", color: "#0F172A", marginTop: 20 },
  successSub: { fontSize: 16, color: "#64748B", marginTop: 5 }
});