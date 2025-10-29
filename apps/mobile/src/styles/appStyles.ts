import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  panel: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 6,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleLabelActive: {
    color: '#111827',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonPressedLight: {
    backgroundColor: '#f9fafb',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sessionBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionEmail: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sessionAid: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipLabelActive: {
    color: '#ffffff',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  successText: {
    fontSize: 13,
    color: '#047857',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  taskCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    gap: 10,
  },
  taskHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskBadgeSent: {
    color: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  taskBadgeInProgress: {
    color: '#047857',
    backgroundColor: '#d1fae5',
  },
  taskBadgeCompleted: {
    color: '#1f2937',
    backgroundColor: '#e5e7eb',
  },
  taskBadgeArchived: {
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
  },
  taskDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  taskReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  reviewBadgePending: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
  },
  reviewBadgeAccepted: {
    color: '#065f46',
    backgroundColor: '#d1fae5',
  },
  reviewBadgeChanges: {
    color: '#991b1b',
    backgroundColor: '#fee2e2',
  },
  taskReviewNote: {
    fontSize: 12,
    color: '#4b5563',
  },
  taskReviewNoteWarning: {
    color: '#b91c1c',
  },
  taskNote: {
    fontSize: 13,
    color: '#1f2937',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionPrimary: {
    flexGrow: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSecondary: {
    flexGrow: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
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
});
