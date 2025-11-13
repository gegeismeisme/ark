import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { createShadowStyle } from './shadowStyles';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const navStyles = {
  bottomNavWrapper: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    ...createShadowStyle({ color: '#111827', opacity: 0.08, offsetX: 0, offsetY: -4, radius: 12 }),
    elevation: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomNavItemActive: {
    transform: [{ translateY: -4 }],
  },
  bottomNavIcon: {
    color: '#6b7280',
  },
  bottomNavIconActive: {
    color: '#111827',
  },
  bottomNavIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bottomNavBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomNavLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  bottomNavLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  bottomNavFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...createShadowStyle({ color: '#111827', opacity: 0.12, offsetX: 0, offsetY: 10, radius: 20 }),
    elevation: 6,
  },
  bottomNavFabIcon: {
    color: '#ffffff',
  },
} as const satisfies NamedStyles;
