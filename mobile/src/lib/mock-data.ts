// src/lib/mock-data.ts

export const MEI_TETO = 81000;
export const MEI_EXCLUSIVO_TETO = 80000;

export const PERFIL_MOCK = {
  nome: "Ylson dos Santos Queiroz Filho",
  faturamentoAcumulado: 45000, // Exemplo de faturamento já registrado no ano
  cnaes: [
    { codigo: "4321-5/00", descricao: "Instalação e manutenção elétrica" },
    { codigo: "6201-5/00", descricao: "Desenvolvimento de programas de computador" }
  ]
};

export interface Edital {
  id: string;
  catId: string;
  objeto: string;
  descricao: string;
  orgao: string;
  valor: number;
  uf: string;
  modalidade: string;
  dataLimite: string;
  match: "alto" | "medio" | "baixo";
  cnaeAlvo: string;
  requisitos: string[];
  documentos: { id: string; nome: string; obrigatorio: boolean }[];
}

export const MOCK_EDITAIS: Edital[] = [
  {
    id: "1",
    catId: "5",
    objeto: "Manutenção de Servidores e Rede Local",
    descricao: "Contratação de empresa especializada para serviços de manutenção preventiva e corretiva da infraestrutura de TI.",
    orgao: "Prefeitura de Recife",
    valor: 15000,
    uf: "PE",
    modalidade: "Dispensa de Licitação",
    dataLimite: "2026-05-20T14:00:00Z",
    match: "alto",
    cnaeAlvo: "6201-5/00",
    requisitos: [
      "Comprovação de regularidade fiscal",
      "Qualificação técnica em redes",
      "Atendimento presencial em até 4h"
    ],
    documentos: [
      { id: "d1", nome: "Certidão Negativa de Débitos", obrigatorio: true },
      { id: "d2", nome: "Atestado de Capacidade Técnica", obrigatorio: true },
      { id: "d3", nome: "Cartão CNPJ atualizado", obrigatorio: true },
      { id: "d4", nome: "RG/CPF do Sócio Administrador", obrigatorio: false }
    ]
  },
  {
    id: "2",
    catId: "3",
    objeto: "Reforma Elétrica da Unidade Básica de Saúde",
    descricao: "Substituição de fiação, quadros de energia e luminárias conforme projeto elétrico anexo.",
    orgao: "Câmara Municipal",
    valor: 42000,
    uf: "SP",
    modalidade: "Pregão Eletrônico",
    dataLimite: "2026-06-10T10:00:00Z",
    match: "medio",
    cnaeAlvo: "4321-5/00",
    requisitos: [
      "Registro no CREA/CAU",
      "Certidão de regularidade do FGTS",
      "Vistoria técnica no local"
    ],
    documentos: [
      { id: "d5", nome: "Certidão de FGTS", obrigatorio: true },
      { id: "d6", nome: "Registro Profissional (CREA)", obrigatorio: true },
      { id: "d7", nome: "Declaração de Vistoria", obrigatorio: true }
    ]
  }
];

export function getEdital(id: string): Edital | undefined {
  return MOCK_EDITAIS.find((e) => e.id === id);
}

export function formatBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}