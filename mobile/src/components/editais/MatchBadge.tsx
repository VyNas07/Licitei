import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MatchBadgeProps {
  type: 'Alta' | 'Média' | 'Baixa' | 'Atenção';
}

export const MatchBadge = ({ type }: MatchBadgeProps) => {
  const getStyles = () => {
    switch (type) {
      case 'Alta':
        return { 
          bg: '#F0FDF4', 
          border: '#DCFCE7', 
          text: '#166534', 
          dot: '#22C55E',
          label: 'Alta compatibilidade' 
        };
      case 'Atenção':
        return { 
          bg: '#FFFBEB', 
          border: '#FEF3C7', 
          text: '#92400E', 
          dot: '#F59E0B',
          label: 'Atenção' 
        };
      case 'Baixa':
        return { 
          bg: '#FEF2F2', 
          border: '#FEE2E2', 
          text: '#991B1B', 
          dot: '#EF4444',
          label: 'Baixa compatibilidade' 
        };
      default:
        return { 
          bg: '#F1F5F9', 
          border: '#E2E8F0', 
          text: '#475569', 
          dot: '#94A3B8',
          label: 'Média compatibilidade' 
        };
    }
  };

  const config = getStyles();

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.border }]}>
      <View style={[styles.dot, { backgroundColor: config.dot }]} />
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});