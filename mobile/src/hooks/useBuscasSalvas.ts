import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export interface FiltrosBusca {
  uf?: string;
  valor_min?: number;
  valor_max?: number;
  municipio?: string;
  cnae?: string;
  categorias?: string[];
}

export interface BuscaSalva {
  id: string;
  termo_busca: string;
  filtros?: FiltrosBusca;
  created_at: string;
}

export function useBuscasSalvas() {
  const [buscas, setBuscas] = useState<BuscaSalva[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get('/saved-searches');
      setBuscas(data.data ?? []);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  const salvar = useCallback(async (termo_busca: string, filtros?: FiltrosBusca) => {
    await api.post('/saved-searches', { termo_busca, filtros });
    await carregar();
  }, [carregar]);

  const remover = useCallback(async (id: string) => {
    await api.delete(`/saved-searches/${id}`);
    setBuscas(prev => prev.filter(b => b.id !== id));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return { buscas, carregando, erro, carregar, salvar, remover };
}
