import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

export interface Participacao {
  id: string;
  licitacao_id: string;
  status: 'acompanhando' | 'proposta_enviada' | 'venceu' | 'perdeu' | 'desistiu';
  objeto_compra: string;
  orgao_nome: string;
  valor_estimado: number;
  data_encerramento: string;
}

export function useParticipacoes() {
  const [participacoes, setParticipacoes] = useState<Participacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    api.get('/participacoes')
      .then(({ data }) => setParticipacoes(data.data ?? []))
      .catch(() => setParticipacoes([]))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resumo = useMemo(() => ({
    acompanhando: participacoes.filter(p => p.status === 'acompanhando').length,
    proposta_enviada: participacoes.filter(p => p.status === 'proposta_enviada').length,
    finalizadas: participacoes.filter(p => ['venceu', 'perdeu', 'desistiu'].includes(p.status)).length,
  }), [participacoes]);

  return { participacoes, carregando, carregar, resumo };
}
