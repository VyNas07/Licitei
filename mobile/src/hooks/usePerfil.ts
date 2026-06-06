import { useState, useEffect } from 'react';
import api from '../services/api';

export interface Perfil {
  id: string;
  user_id: string;
  nome_fantasia: string;
  cnpj: string;
  cnae: string | null;
  ramo_atuacao: string | null;
  uf: string;
}

export function usePerfil() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const { data } = await api.get<Perfil>('/perfil');
      setPerfil(data);
    } catch {
      setErro('Não foi possível carregar o perfil.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return { perfil, loading, erro, recarregar: carregar };
}
