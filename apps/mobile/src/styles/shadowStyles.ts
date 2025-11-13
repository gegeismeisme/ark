import { Platform } from 'react-native';

type ShadowConfig = {
  color?: string;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  radius?: number;
  spread?: number;
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    const r = normalized[0];
    const g = normalized[1];
    const b = normalized[2];
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
    };
  }

  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  return null;
};

const toRgba = (hexColor: string, opacity: number) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return `rgba(0,0,0,${opacity})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

export const createShadowStyle = ({
  color = '#000000',
  opacity = 0.1,
  offsetX = 0,
  offsetY = 2,
  radius = 4,
  spread = 0,
}: ShadowConfig) => {
  const commonShadow = {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowRadius: radius,
  } as const;

  if (Platform.OS === 'web') {
    const rgba = toRgba(color, opacity);
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px ${spread}px ${rgba}`,
    } as const;
  }

  return commonShadow;
};
