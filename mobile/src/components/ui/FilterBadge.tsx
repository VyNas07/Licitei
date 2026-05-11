import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FilterBadgeProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function FilterBadge({ label, active, onPress }: FilterBadgeProps) {
  return (
    <TouchableOpacity 
      style={[styles.badge, active && styles.activeBadge]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#FFF', 
    marginRight: 8, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  activeBadge: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  text: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  activeText: { color: '#FFF' }
});