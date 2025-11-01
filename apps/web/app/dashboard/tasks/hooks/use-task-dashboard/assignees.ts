'use client';

import { useCallback, useEffect, useState } from 'react';

import type { GroupMember } from '../../types';

type UseAssigneesArgs = {
  filteredMembers: GroupMember[];
};

type UseAssigneesResult = {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  toggle: (userId: string) => void;
  selectAll: () => void;
  clear: () => void;
};

export function useAssigneesSelection({ filteredMembers }: UseAssigneesArgs): UseAssigneesResult {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelected(filteredMembers.map((member) => member.userId));
  }, [filteredMembers]);

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  useEffect(() => {
    setSelected((prev) =>
      prev.filter((userId) => filteredMembers.some((member) => member.userId === userId))
    );
  }, [filteredMembers]);

  return {
    selected,
    setSelected,
    toggle,
    selectAll,
    clear,
  };
}
