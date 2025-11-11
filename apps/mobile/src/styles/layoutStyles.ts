import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const layoutStyles = {
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
  syncHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  reminderStack: {
    gap: 8,
    marginBottom: 12,
  },
  reminderCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  reminderCardWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  reminderCardInfo: {
    backgroundColor: '#ecfeff',
    borderColor: '#67e8f9',
  },
  reminderText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#0f172a',
  },
  reminderTextWarning: {
    color: '#b91c1c',
  },
  reminderTextInfo: {
    color: '#0f172a',
  },
  reminderActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reminderActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  reminderActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  toastContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toastInfo: {
    backgroundColor: '#ecfeff',
    borderColor: '#67e8f9',
  },
  toastWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  toastMessageRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastIcon: {
    fontSize: 16,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
  toastActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#0f172a',
    backgroundColor: '#ffffff',
  },
  toastActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  placeholderCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholderText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  taskListContainer: {
    gap: 16,
  },
  loadingCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
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
    gap: 16,
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
  sessionActions: {
    flexDirection: 'row',
    gap: 12,
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
  formField: {
    gap: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  publishTemplateCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 16,
    gap: 8,
  },
  publishTemplateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  publishTemplateDescription: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  publishTemplateChecklist: {
    marginTop: 8,
    gap: 6,
  },
  publishTemplateChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publishTemplateChecklistIcon: {
    fontSize: 14,
  },
  publishTemplateChecklistLabel: {
    fontSize: 13,
    color: '#1f2937',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
  },
  successText: {
    fontSize: 13,
    color: '#047857',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  insightRow: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 16,
    gap: 8,
  },
  insightLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  insightList: {
    marginTop: 16,
    gap: 12,
  },
  insightListItem: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 4,
  },
  insightListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  insightListMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  insightTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightTrendLabelCol: {
    flex: 1,
    gap: 2,
  },
  insightTrendBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    flexDirection: 'row',
    overflow: 'hidden',
    minWidth: 120,
  },
  insightTrendBarFill: {
    height: '100%',
  },
  timeline: {
    gap: 12,
  },
  timelineList: {
    gap: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineIconWrapper: {
    alignItems: 'center',
  },
  timelineIcon: {
    fontSize: 18,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 4,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  timelineMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  checklist: {
    gap: 8,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checklistItemChecked: {
    opacity: 0.6,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistIcon: {
    fontSize: 18,
  },
  checklistLabel: {
    fontSize: 14,
    color: '#111827',
  },
  checklistLabelChecked: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  checklistInputRow: {
    gap: 8,
  },
  chipDanger: {
    borderColor: '#fecaca',
    backgroundColor: '#fee2e2',
  },
  chipDangerText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
  },
} as const satisfies NamedStyles;


