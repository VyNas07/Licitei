import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export type TipoAlerta = 'prazo' | 'preferencia' | 'documento';

export interface AlertaUI {
  id: string;
  tipo: TipoAlerta;
  titulo: string;
  descricao: string;
  data: string;
  prazo_iso?: string;
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
      prazo_iso: alerta.data_encerramento ?? undefined,
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

export function useAlertas() {
  const [alertas, setAlertas] = useState<AlertaUI[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/alertas')
      .then(({ data }) => setAlertas((data.data ?? []).map(mapAlerta)))
      .catch(() => setAlertas([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const datasComAlerta: number[] = alertas
    .filter(a => a.tipo === 'prazo' && !!a.prazo_iso)
    .map(a => Number.parseInt(a.prazo_iso!.slice(8, 10), 10));

  return { alertas, carregando, carregar, datasComAlerta };
}
