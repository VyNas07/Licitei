import { useState, useRef, useEffect } from "react";
import type { ComponentType } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  FileCheck2,
  Building2,
  Target,
  CheckCircle2,
} from "lucide-react-native";
import api from "../../src/services/api";

const MEI_EXCLUSIVO_TETO = 80000;

function formatBRL(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
}

interface EditalAPI {
  numero_controle_pncp: string;
  objeto_compra: string;
  valor_total_estimado: number;
  modalidade_nome: string;
  situacao_compra_nome: string;
  data_encerramento_proposta: string;
  orgao_razao_social: string;
  uf: string;
  municipio?: string;
}

export default function EditalDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [edital, setEdital] = useState<EditalAPI | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [jaParticipando, setJaParticipando] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api
      .get(`/editais/${encodeURIComponent(id as string)}`)
      .then(({ data }) => setEdital(data))
      .catch(() => setEdital(null))
      .finally(() => setCarregando(false));
  }, [id]);

  const handleParticipar = async () => {
    setSalvando(true);
    try {
      await api.post("/participacoes", { licitacao_id: id });
      setJaParticipando(true);
      setShowSuccess(true);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setShowSuccess(false);
        router.replace("/(tabs)/disputas");
      }, 2000);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setJaParticipando(true);
        Alert.alert("Aviso", "Você já está acompanhando este edital.");
      } else {
        Alert.alert("Erro", "Não foi possível registrar sua participação. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

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

  const exclusivoMEI = edital.valor_total_estimado <= MEI_EXCLUSIVO_TETO;
  const match =
    edital.valor_total_estimado <= 40000
      ? "Alta"
      : edital.valor_total_estimado <= 80000
      ? "Média"
      : "Baixa";

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
            {edital.modalidade_nome.toUpperCase()} • {edital.uf}
          </Text>
          <Text style={styles.title}>{edital.objeto_compra}</Text>
          <Text style={styles.subTitle}>{edital.orgao_razao_social}</Text>

          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>
              {jaParticipando ? "STATUS: EM DISPUTA" : `MATCH ${match.toUpperCase()}`}
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
            <Text style={styles.sectionTag}>RESUMO</Text>
            <SummaryRow icon={Target} label="Objeto da licitação" value={edital.objeto_compra} />
            <SummaryRow icon={Building2} label="Órgão" value={edital.orgao_razao_social} />
            <SummaryRow
              icon={FileCheck2}
              label="Valor estimado"
              value={formatBRL(edital.valor_total_estimado)}
              highlight
            />
            <SummaryRow
              icon={Calendar}
              label="Data limite"
              value={formatDate(edital.data_encerramento_proposta)}
            />
          </View>

          {!jaParticipando && (
            <TouchableOpacity
              style={[styles.actionButton, salvando && styles.actionButtonDisabled]}
              onPress={handleParticipar}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Acompanhar edital</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.checklistButton}
            onPress={() => router.push(`/checklist/${encodeURIComponent(id as string)}`)}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={16} color="#0F172A" />
            <Text style={styles.checklistButtonText}>Ver Checklist de Habilitação</Text>
          </TouchableOpacity>
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

function SummaryRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ComponentType<{ color: string; size: number }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.summaryIconBox}>
        <Icon color="#0F172A" size={18} />
      </View>
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
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: -25 },
  backButtonText: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginLeft: 6 },
  metaText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "bold", marginTop: 8, lineHeight: 28 },
  subTitle: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 4 },
  matchBadge: {
    marginTop: 16,
    alignSelf: "flex-start",
    backgroundColor: "rgba(34,197,94,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: { color: "#4ADE80", fontSize: 10, fontWeight: "bold" },
  content: { paddingHorizontal: 20, marginTop: 10, paddingBottom: 40 },
  alertCard: {
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: "center",
  },
  successCard: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" },
  mutedCard: { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" },
  meiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  meiIconText: { fontSize: 10, fontWeight: "bold", color: "#1E293B" },
  successIconBg: { backgroundColor: "#DCFCE7" },
  cardIconBg: { backgroundColor: "#FFFFFF" },
  alertTitle: { fontSize: 14, fontWeight: "bold" },
  alertDescription: { fontSize: 11, color: "#475569", marginTop: 2 },
  successText: { color: "#166534" },
  mutedText: { color: "#475569" },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 16,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0F172A",
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: { fontSize: 9, color: "#94A3B8", fontWeight: "bold", textTransform: "uppercase" },
  summaryValue: { fontSize: 14, color: "#334155", marginTop: 2 },
  highlightText: { color: "#0F172A", fontWeight: "bold" },
  actionButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 8,
    elevation: 5,
  },
  actionButtonDisabled: { backgroundColor: "#94A3B8", elevation: 0 },
  actionButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  checklistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#0F172A",
    backgroundColor: "#FFF",
  },
  checklistButtonText: { color: "#0F172A", fontWeight: "bold", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFF",
    padding: 50,
    borderRadius: 40,
    alignItems: "center",
    width: "80%",
  },
  successTitle: { fontSize: 24, fontWeight: "bold", color: "#0F172A", marginTop: 20 },
  successSub: { fontSize: 16, color: "#64748B", marginTop: 5 },
});
