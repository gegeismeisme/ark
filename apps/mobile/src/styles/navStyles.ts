import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export const navStyles = {
  bottomNavWrapper: {
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
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
    shadowColor: '#111827',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  bottomNavFabIcon: {
    color: '#ffffff',
  },
} as const satisfies NamedStyles;
