export const CACHE_KEYS = [
  'orgGroups',
  'tagCategories',
  'orgMembers',
  'memberTags',
  'tagRequests',
  'memberDirectory',
  'memberInvites',
  'memberJoinRequests',
  'orgVisibility',
  'groupList',
  'groupOrgMembers',
  'groupMembers',
  'taskGroups',
  'taskTagCategories',
  'taskGroupMembers',
  'taskList',
  'taskAttachments',
  'taskAttachmentDrafts',
] as const;

export type CacheKey = (typeof CACHE_KEYS)[number];

export type CacheRecord<T = unknown> = {
  key: CacheKey;
  scopeId: string | null;
  data: T;
  updatedAt: number;
};

export const buildCacheId = (key: CacheKey, scopeId?: string | null) =>
  `${key}:${scopeId ?? 'global'}`;
