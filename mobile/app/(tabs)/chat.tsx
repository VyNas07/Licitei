import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, ListRenderItem } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import EventSource from 'react-native-sse';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

const LOGO_IMAGE = require('../../assets/images/licitei-logo.png');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function ChatScreen() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  const sendMessage = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: trimmedQuery };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

    const es = new EventSource(`${API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: userMessage.content }),
    });

    es.addEventListener('message', (event) => {
      if (!event.data) return;
      try {
        const data = JSON.parse(event.data);
        
        setMessages((prev) => prev.map(msg => 
          msg.id === assistantMsgId 
            ? { ...msg, content: msg.content + (data.content || data.chunk || '') } 
            : msg
        ));
      } catch (e) {
        console.error("Erro no parse do SSE:", e);
      }
    });

    es.addEventListener('error', (event) => {
      console.log('Fim do stream ou erro:', event);
      setIsTyping(false);
      es.close();
    });
  };

  const renderItem = useCallback<ListRenderItem<Message>>(({ item }) => (
    <View style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
      {item.role === 'assistant' && (
        <View style={styles.avatarContainer}>
          <Image source={LOGO_IMAGE} style={styles.messageAvatar} resizeMode="contain" />
        </View>
      )}
      <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.messageText, item.role === 'user' ? styles.userText : styles.assistantText]}>
          {item.content}
        </Text>
      </View>
    </View>
  ), []);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyAvatarWrapper}>
        <Image source={LOGO_IMAGE} style={styles.emptyAvatar} resizeMode="contain" />
        <View style={styles.sparkleBadge}>
          <Ionicons name="sparkles" size={14} color="#FFF" />
        </View>
      </View>
      <Text style={styles.emptyTitle}>Olá! Eu sou a LicIA 👋</Text>
      <Text style={styles.emptyText}>
        Sua assistente especialista em licitações. Posso te ajudar a resumir editais, verificar requisitos ou tirar dúvidas sobre certidões.
      </Text>
    </View>
  ), []);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const onContentSizeChange = useCallback(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerProfile}>
          <Image source={LOGO_IMAGE} style={styles.headerAvatar} resizeMode="contain" />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>LicIA</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.chatList, messages.length === 0 && styles.chatListEmpty]}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={onContentSizeChange}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#0EA5E9" />
          <Text style={styles.typingText}>LicIA está analisando...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Digite aqui..."
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!query.trim() || isTyping) && styles.sendButtonDisabled]} 
              onPress={sendMessage} 
              disabled={isTyping || !query.trim()}
            >
              <Ionicons name="paper-plane" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 },
  headerProfile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9' },
  headerInfo: { justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  statusText: { fontSize: 12, color: '#64748B' },

  chatList: { padding: 16, gap: 16, paddingBottom: 24 },
  chatListEmpty: { flexGrow: 1, justifyContent: 'center' },
  
  emptyContainer: { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  emptyAvatarWrapper: { position: 'relative', marginBottom: 20 },
  emptyAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#E0F2FE' },
  sparkleBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#0EA5E9', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 },

  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatarContainer: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFF', marginBottom: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  messageAvatar: { width: '100%', height: '100%' },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#0F172A', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#FFF' },
  assistantText: { color: '#334155' },

  typingIndicator: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 16, gap: 8 },
  typingText: { fontSize: 13, color: '#64748B', fontStyle: 'italic' },

  inputWrapper: { backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  inputContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 24, paddingLeft: 16, paddingRight: 8, paddingVertical: 6, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  input: { flex: 1, maxHeight: 100, minHeight: 40, fontSize: 15, color: '#0F172A', paddingVertical: Platform.OS === 'ios' ? 10 : 6, textAlignVertical: 'center' },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0EA5E9', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#2b3b63' }
});