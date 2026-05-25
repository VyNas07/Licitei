import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export interface ItemChecklist {
  id: number;
  texto: string;
  concluido: boolean;
}

const CHUNK_SIZE = 1900

function storageKey(editalId: string) {
  return `checklist:${editalId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

async function secureSet(key: string, value: string): Promise<void> {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  await SecureStore.setItemAsync(`${key}__count`, String(chunks.length));
  await Promise.all(
    chunks.map((chunk, idx) => SecureStore.setItemAsync(`${key}__${idx}`, chunk))
  );
}

async function secureGet(key: string): Promise<string | null> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`);
  if (!countStr) return null;
  const count = parseInt(countStr, 10);
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__${i}`))
  );
  if (chunks.some(c => c === null)) return null;
  return chunks.join('');
}

async function secureRemove(key: string): Promise<void> {
  const countStr = await SecureStore.getItemAsync(`${key}__count`);
  if (!countStr) return;
  const count = parseInt(countStr, 10);
  await Promise.all([
    SecureStore.deleteItemAsync(`${key}__count`),
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}__${i}`)),
  ]);
}

function parseChecklist(texto: string): ItemChecklist[] {
  return texto
    .split('\n')
    .map(linha => linha.trim())
    .filter(linha => linha.length > 0)
    .filter(linha => /^[-*•]|^\d+[.)]\s/.test(linha))
    .map((linha, idx) => ({
      id: idx,
      texto: linha.replace(/^[-*•]\s*|^\d+[.)]\s*/, '').trim(),
      concluido: false,
    }))
    .filter(item => item.texto.length > 0);
}

export function useChecklist(editalId: string) {
  const [itens, setItens] = useState<ItemChecklist[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [gerado, setGerado] = useState(false);
  const [respostaRaw, setRespostaRaw] = useState('');

  useEffect(() => {
    if (!editalId) return;
    secureGet(storageKey(editalId)).then(raw => {
      if (!raw) return;
      try {
        const salvo: ItemChecklist[] = JSON.parse(raw);
        if (salvo.length > 0) {
          setItens(salvo);
          setGerado(true);
        }
      } catch {
        // dado corrompido — ignora
      }
    });
  }, [editalId]);

  const persistir = useCallback((lista: ItemChecklist[]) => {
    secureSet(storageKey(editalId), JSON.stringify(lista));
  }, [editalId]);

  const gerar = useCallback(async () => {
    setCarregando(true);
    setGerado(false);
    setItens([]);
    await secureRemove(storageKey(editalId));
    try {
      const { data } = await api.post('/chat', {
        query: `Gere o checklist completo de habilitação e documentação necessária para participar do edital ${editalId}. Liste item por item com marcador de lista, um por linha.`,
      });
      const texto: string = data.resposta ?? '';
      setRespostaRaw(texto);
      const parsed = parseChecklist(texto);
      const lista = parsed.length > 0 ? parsed : texto
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 4)
        .map((t, idx) => ({ id: idx, texto: t, concluido: false }));
      setItens(lista);
      setGerado(true);
      persistir(lista);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o checklist. Verifique sua conexão e tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [editalId, persistir]);

  const toggle = useCallback((itemId: number) => {
    setItens(prev => {
      const atualizado = prev.map(item =>
        item.id === itemId ? { ...item, concluido: !item.concluido } : item
      );
      persistir(atualizado);
      return atualizado;
    });
  }, [persistir]);

  const concluidos = itens.filter(i => i.concluido).length;
  const progresso = itens.length > 0 ? (concluidos / itens.length) * 100 : 0;

  return { itens, carregando, gerado, respostaRaw, gerar, toggle, concluidos, progresso };
}
