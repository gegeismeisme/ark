import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const modalStyles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 13,
    color: '#4b5563',
  },
  modalInput: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  modalHintRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalButtonPrimary: {
    backgroundColor: '#111827',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
} as const satisfies NamedStyles;
