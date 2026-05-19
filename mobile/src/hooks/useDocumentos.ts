import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import api from '../services/api';

export interface Documento {
  id: string;
  nome: string;
  status: 'valido' | 'pendente' | 'vencido';
  validade: string | null;
}

export function useDocumentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    api.get('/documentos')
      .then(({ data }) => setDocumentos(data.data ?? []))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const remover = useCallback((id: string, nome: string) => {
    Alert.alert(
      'Remover documento',
      `Deseja remover "${nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/documentos/${id}`);
              setDocumentos(prev => prev.filter(d => d.id !== id));
            } catch {
              Alert.alert('Erro', 'Não foi possível remover o documento.');
            }
          },
        },
      ]
    );
  }, []);

  const atualizar = useCallback(async (id: string, campos: Partial<Pick<Documento, 'status' | 'validade'>>) => {
    try {
      const { data } = await api.patch(`/documentos/${id}`, campos);
      setDocumentos(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar o documento.');
    }
  }, []);

  return { documentos, carregando, erro, carregar, remover, atualizar };
}
