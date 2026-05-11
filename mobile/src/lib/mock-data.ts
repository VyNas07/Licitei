export const MEI_TETO = 81000;
export const MEI_EXCLUSIVO_TETO = 80000;

export type EtapaStatus = 
  | "Proposta enviada" 
  | "Análise de documentos" 
  | "Fase de lances" 
  | "Habilitação" 
  | "Adjudicado" 
  | "Finalizado";

export interface Edital {
  id: string;
  objeto: string;
  orgao: string;
  descricao: string;
  valor: number;
  dataLimite: string;
  modalidade: string;
  uf: string;
  municipio?: string;
  match: "Alta" | "Média" | "Baixa";
  cnaeAlvo: string;
  requisitos: string[];
  documentos: { id: string; nome: string; obrigatorio: boolean }[];
  participando?: boolean;
  status?: EtapaStatus;
  atualizado?: string;
}

// LISTA SINCRONIZADA COM A TELA DE DOCUMENTOS[cite: 5, 7]
export const MEUS_DOCUMENTOS_CADASTRADOS = [
  "Certidão Negativa Federal",
  "Certidão Negativa Estadual",
  "Certidão Negativa Municipal",
  "Certidão FGTS",
  "Declaração de ME/EPP",
  "Cartão CNPJ",
  "Certidão Negativa de Débitos Trabalhistas",
  "Contrato Social/CCMEI",
  "Certificado AWS"
];

export const PERFIL_MOCK = {
  nome: "Ylson dos Santos Queiroz Filho",
  empresa: "Ylson Dev & Bio Solutions",
  faturamentoAcumulado: 32500,
  cnaes: [
    { codigo: "6201-5/00", nome: "Desenvolvimento de softwares sob encomenda" },
    { codigo: "6202-3/00", nome: "Consultoria em tecnologia da informação" },
    { codigo: "8650-0/99", nome: "Atividades de profissionais da área de saúde" }
  ]
};

export const RESUMO_PARTICIPACOES = {
  preparacao: 3,
  submetidas: 5,
  finalizadas: 42
};

export let EDITAS_MOCK: Edital[] = [
  {
    id: "1",
    objeto: "Desenvolvimento de App Mobile",
    orgao: "Prefeitura de Recife",
    municipio: "Recife",
    descricao: "Criação de aplicativo para gestão de resíduos sólidos com integração de mapas.",
    valor: 15000,
    dataLimite: "2026-06-15",
    modalidade: "Dispensa Eletrônica",
    uf: "PE",
    match: "Alta",
    cnaeAlvo: "6201-5/00",
    requisitos: ["React Native"],
    documentos: [
      { id: "d1", nome: "Cartão CNPJ", obrigatorio: true },
      { id: "d2", nome: "Certidão Negativa de Débitos Trabalhistas", obrigatorio: true },
      { id: "d3", nome: "Portfólio de Apps", obrigatorio: false } // USUÁRIO NÃO POSSUI ESTE DOCUMENTO[cite: 5]
    ],
    participando: false
  },
  {
    id: "2",
    objeto: "Manutenção de Infraestrutura de Rede",
    orgao: "Câmara Municipal de Olinda",
    municipio: "Olinda",
    descricao: "Suporte técnico e configuração de switches corporativos.",
    valor: 75000,
    dataLimite: "2026-05-20",
    modalidade: "Pregão Eletrônico",
    uf: "PE",
    match: "Média",
    cnaeAlvo: "6209-1/00",
    requisitos: ["CCNA"],
    documentos: [{ id: "d1", nome: "Certidão FGTS", obrigatorio: true }, { id: "d2", nome: "Contrato Social/CCMEI", obrigatorio: true }],
    participando: false
  },
  { id: "3", objeto: "Consultoria em Segurança de Dados", orgao: "UFPE", municipio: "Recife", valor: 32000, dataLimite: "2026-07-10", modalidade: "Dispensa", uf: "PE", match: "Alta", cnaeAlvo: "6202-3/00", requisitos: ["LGPD"], documentos: [{ id: "d1", nome: "Certidão Negativa Federal", obrigatorio: true }], participando: false, descricao: "Auditoria de sistemas internos." },
  { id: "4", objeto: "Licenciamento de Software ERP", orgao: "Governo de Pernambuco", municipio: "Recife", valor: 95000, dataLimite: "2026-05-25", modalidade: "Pregão", uf: "PE", match: "Baixa", cnaeAlvo: "6203-1/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Licenças de gestão de RH." },
  { id: "5", objeto: "Treinamento em Agilidade", orgao: "Porto Digital", municipio: "Recife", valor: 8500, dataLimite: "2026-06-02", modalidade: "Inexigibilidade", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: ["Scrum"], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Workshop Kanban." },
  { id: "6", objeto: "Migração para Cloud AWS", orgao: "SAD-PE", municipio: "Recife", valor: 55000, dataLimite: "2026-08-12", modalidade: "Pregão", uf: "PE", match: "Média", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Certificado AWS", obrigatorio: true }], participando: false, descricao: "Nuvem AWS." },
  { id: "7", objeto: "Suporte Microinformática", orgao: "TRT 6ª Região", municipio: "Recife", valor: 12000, dataLimite: "2026-06-18", modalidade: "Dispensa", uf: "PE", match: "Média", cnaeAlvo: "6209-1/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Manutenção de desktops." },
  { id: "8", objeto: "Desenvolvimento Site Institucional", orgao: "Prefeitura de Caruaru", municipio: "Caruaru", valor: 28000, dataLimite: "2026-07-05", modalidade: "Dispensa", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Portal responsivo." },
  { id: "9", objeto: "Sistema de Controle de Estoque", orgao: "HEMOPE", municipio: "Recife", valor: 42000, dataLimite: "2026-09-01", modalidade: "Pregão", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Software hospitalar." },
  { id: "10", objeto: "Hospedagem de Sistemas", orgao: "DETRAN-PE", municipio: "Recife", valor: 82000, dataLimite: "2026-05-30", modalidade: "Concorrência", uf: "PE", match: "Baixa", cnaeAlvo: "6209-1/00", requisitos: [], documentos: [{ id: "d1", nome: "Declaração de ME/EPP", obrigatorio: true }], participando: false, descricao: "Serviço de datacenter." },
  { id: "11", objeto: "E-commerce de Artesanato", orgao: "ADEPE", municipio: "Recife", valor: 19000, dataLimite: "2026-07-22", modalidade: "Dispensa", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Plataforma de vendas." },
  { id: "12", objeto: "App de Turismo", orgao: "EMPETUR", municipio: "Olinda", valor: 25000, dataLimite: "2026-10-10", modalidade: "Dispensa", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Portfólio de Apps", obrigatorio: true }], participando: false, descricao: "Guia digital." },
  { id: "13", objeto: "Cabeamento Estruturado", orgao: "IFPE", municipio: "Jaboatão", valor: 48000, dataLimite: "2026-06-30", modalidade: "Pregão", uf: "PE", match: "Média", cnaeAlvo: "6209-1/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Pontos de rede Cat6." },
  { id: "14", objeto: "Consultoria UI/UX", orgao: "ATI-PE", municipio: "Recife", valor: 35000, dataLimite: "2026-07-15", modalidade: "Pregão", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Redesign do portal." },
  { id: "15", objeto: "Gestão de Redes Sociais", orgao: "Prefeitura de Ipojuca", municipio: "Ipojuca", valor: 45000, dataLimite: "2026-05-28", modalidade: "Pregão", uf: "PE", match: "Baixa", cnaeAlvo: "7311-4/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Criação de conteúdo." },
  { id: "16", objeto: "Saneamento de Dados", orgao: "COMPESA", municipio: "Recife", valor: 62000, dataLimite: "2026-11-05", modalidade: "Pregão", uf: "PE", match: "Média", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Padronização de base." },
  { id: "17", objeto: "Software Gestão Escolar", orgao: "Prefeitura de Jaboatão", municipio: "Jaboatão", valor: 78000, dataLimite: "2026-06-12", modalidade: "Pregão", uf: "PE", match: "Média", cnaeAlvo: "6203-1/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Licença de uso." },
  { id: "18", objeto: "Treinamento em PowerBI", orgao: "SEFAZ-PE", municipio: "Recife", valor: 14000, dataLimite: "2026-06-25", modalidade: "Dispensa", uf: "PE", match: "Alta", cnaeAlvo: "6202-3/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Capacitação auditores." },
  { id: "19", objeto: "Suporte Banco de Dados", orgao: "IPA-PE", municipio: "Recife", valor: 58000, dataLimite: "2026-08-20", modalidade: "Pregão", uf: "PE", match: "Média", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Oracle e Postgres." },
  { id: "20", objeto: "Chatbot de Atendimento", orgao: "Copergás", municipio: "Recife", valor: 39000, dataLimite: "2026-07-30", modalidade: "Pregão", uf: "PE", match: "Alta", cnaeAlvo: "6201-5/00", requisitos: [], documentos: [{ id: "d1", nome: "Cartão CNPJ", obrigatorio: true }], participando: false, descricao: "Implementação IA." },
];

export function getEdital(id: string) {
  return EDITAS_MOCK.find(e => e.id === id);
}

export function participarEdital(id: string) {
  const index = EDITAS_MOCK.findIndex(e => e.id === id);
  if (index !== -1) {
    EDITAS_MOCK[index] = { 
      ...EDITAS_MOCK[index], 
      participando: true,
      status: "Proposta enviada",
      atualizado: "agora mesmo"
    };
  }
}

export function formatBRL(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}