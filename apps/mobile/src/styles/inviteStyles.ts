import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const inviteStyles = {
  requestSection: {
    gap: 12,
  },
  requestHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestRefresh: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestRefreshText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    gap: 6,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestOrg: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  requestStatus: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requestMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestNote: {
    fontSize: 13,
    color: '#4b5563',
  },
} as const satisfies NamedStyles;
