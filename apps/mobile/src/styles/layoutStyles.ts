import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

const WORK_DARK = '#0a2f7b';
const WORK_LIGHT = '#eef4ff';
const WORK_MID = '#123c9c';
const WORK_ACCENT = '#5b7edc';
const WORK_ACCENT_SOFT = '#c7d6ff';

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
  toastDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#f87171',
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
  authSafeArea: {
    flex: 1,
    backgroundColor: WORK_LIGHT,
  },
  authScreen: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: WORK_LIGHT,
  },
  authShell: {
    flex: 1,
    gap: 32,
    justifyContent: 'space-between',
  },
  authHeroSection: {
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: WORK_DARK,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
  },
  authHeroBadge: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#f8fafc',
    textTransform: 'uppercase',
  },
  authHeroHint: {
    fontSize: 13,
    color: '#d3e0ff',
  },
  authFormSection: {
    borderRadius: 28,
    backgroundColor: WORK_LIGHT,
    padding: 4,
  },
  authFormCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 24,
    gap: 16,
    minHeight: 420,
    shadowColor: WORK_DARK,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  authFormCardBody: {
    flex: 1,
    paddingTop: 12,
  },
  authFormSections: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 20,
  },
  authFieldsBlock: {
    gap: 16,
    minHeight: 220,
  },
  authActionsBlock: {
    gap: 12,
  },
  authForgotSpacer: {
    height: 48,
  },
  authPanelStack: {
    flex: 1,
    justifyContent: 'space-between',
  },
  authFormStack: {
    gap: 16,
  },
  authFormHeader: {
    gap: 4,
  },
  authFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: WORK_MID,
  },
  authFormSubtitle: {
    fontSize: 13,
    color: WORK_ACCENT,
  },
  authFieldSpacer: {
    height: 74,
  },
  authDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: WORK_ACCENT_SOFT,
  },
  authDividerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: WORK_ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  authSocialSection: {
    gap: 12,
  },
  authSocialWrapper: {
    borderRadius: 28,
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: WORK_DARK,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    gap: 16,
  },
  authSocialHeading: {
    fontSize: 15,
    fontWeight: '600',
    color: WORK_MID,
  },
  authSocialIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  authSocialIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: WORK_ACCENT_SOFT,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authSocialIconOnly: {
    color: WORK_MID,
  },
  authSocialHint: {
    fontSize: 12,
    color: WORK_ACCENT,
  },
  homeScreen: {
    gap: 16,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: WORK_DARK,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
    marginBottom: 20,
  },
  homeHeaderText: {
    flex: 1,
    gap: 4,
  },
  homeGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: WORK_MID,
  },
  homeGreetingSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  homeHeaderIcons: {
    marginLeft: 16,
  },
  homeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WORK_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  homeSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  homeOrgHint: {
    fontSize: 13,
    color: '#94a3b8',
  },
  homeSummaryCard: {
    flexBasis: '48%',
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  homeSummaryIcon: {
    fontSize: 18,
  },
  homeSummaryLabel: {
    fontSize: 13,
    color: '#1f2937',
  },
  homeSummaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  homeTaskList: {
    gap: 12,
  },
  homeTaskCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#f8fbff',
    padding: 16,
    gap: 6,
  },
  homeTaskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  homeTaskMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  homeTaskStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: WORK_MID,
  },
  homeTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  homeTaskDescription: {
    fontSize: 13,
    color: '#475569',
  },
  homeEmptyTasks: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 24,
  },
  homeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  accountScreen: {
    gap: 20,
  },
  accountHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  accountAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: WORK_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: WORK_ACCENT_SOFT,
  },
  accountAvatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: WORK_MID,
  },
  accountHeaderText: {
    flex: 1,
    gap: 4,
  },
  accountNameEditRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  accountNameInput: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  accountSaveButton: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: WORK_MID,
  },
  accountSaveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  accountName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  accountNameHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  accountJoined: {
    fontSize: 13,
    color: '#6b7280',
  },
  accountMenu: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    shadowColor: WORK_DARK,
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  accountMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  accountMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WORK_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountMenuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  accountMenuChevron: {
    fontSize: 20,
    color: '#cbd5f5',
  },
  accountOrgCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 20,
    gap: 12,
    shadowColor: WORK_DARK,
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  accountOrgCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  accountOrgCardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  accountOrgCardMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  accountInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  accountOrgSlug: {
    fontSize: 12,
    color: '#94a3b8',
  },
  signOutButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
