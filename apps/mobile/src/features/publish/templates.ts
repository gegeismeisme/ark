'use client';

export type PublishTemplate = {
  id: string;
  icon: string;
  labelKey: string;
  descriptionKey: string;
  defaultTitleKey: string;
  defaultDescriptionKey: string;
  defaultChecklistKeys?: string[];
  dueInHours?: number;
  requireAttachment?: boolean;
  sharePath?: string;
  shareMessageKey?: string;
};

export const PUBLISH_TEMPLATES: PublishTemplate[] = [
  {
    id: 'class-feedback',
    icon: '📝',
    labelKey: 'app.publish.templates.classFeedback.label',
    descriptionKey: 'app.publish.templates.classFeedback.description',
    defaultTitleKey: 'app.publish.templates.classFeedback.title',
    defaultDescriptionKey: 'app.publish.templates.classFeedback.body',
    defaultChecklistKeys: [
      'app.publish.templates.classFeedback.checklist.attendance',
      'app.publish.templates.classFeedback.checklist.highlights',
      'app.publish.templates.classFeedback.checklist.blockers',
      'app.publish.templates.classFeedback.checklist.attachments',
    ],
    dueInHours: 24,
    requireAttachment: true,
    sharePath: '/publish/class-feedback',
    shareMessageKey: 'app.publish.templates.classFeedback.shareMessage',
  },
  {
    id: 'field-inspection',
    icon: '📸',
    labelKey: 'app.publish.templates.fieldInspection.label',
    descriptionKey: 'app.publish.templates.fieldInspection.description',
    defaultTitleKey: 'app.publish.templates.fieldInspection.title',
    defaultDescriptionKey: 'app.publish.templates.fieldInspection.body',
    defaultChecklistKeys: [
      'app.publish.templates.fieldInspection.checklist.safety',
      'app.publish.templates.fieldInspection.checklist.maintenance',
      'app.publish.templates.fieldInspection.checklist.photos',
      'app.publish.templates.fieldInspection.checklist.followUp',
    ],
    dueInHours: 12,
    sharePath: '/publish/field-inspection',
    shareMessageKey: 'app.publish.templates.fieldInspection.shareMessage',
  },
  {
    id: 'meeting-notes',
    icon: '🗂️',
    labelKey: 'app.publish.templates.meetingNotes.label',
    descriptionKey: 'app.publish.templates.meetingNotes.description',
    defaultTitleKey: 'app.publish.templates.meetingNotes.title',
    defaultDescriptionKey: 'app.publish.templates.meetingNotes.body',
    defaultChecklistKeys: [
      'app.publish.templates.meetingNotes.checklist.agenda',
      'app.publish.templates.meetingNotes.checklist.decisions',
      'app.publish.templates.meetingNotes.checklist.actionItems',
      'app.publish.templates.meetingNotes.checklist.reviewDate',
    ],
    dueInHours: 48,
    sharePath: '/publish/meeting-notes',
    shareMessageKey: 'app.publish.templates.meetingNotes.shareMessage',
  },
  {
    id: 'campus-ops',
    icon: '🏗️',
    labelKey: 'app.publish.templates.campusOps.label',
    descriptionKey: 'app.publish.templates.campusOps.description',
    defaultTitleKey: 'app.publish.templates.campusOps.title',
    defaultDescriptionKey: 'app.publish.templates.campusOps.body',
    defaultChecklistKeys: [
      'app.publish.templates.campusOps.checklist.utility',
      'app.publish.templates.campusOps.checklist/security',
      'app.publish.templates.campusOps.checklist/vendors',
      'app.publish.templates.campusOps.checklist.comms',
    ],
    dueInHours: 6,
    requireAttachment: true,
    sharePath: '/publish/campus-ops',
    shareMessageKey: 'app.publish.templates.campusOps.shareMessage',
  },
];
