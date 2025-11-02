import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { inviteStyles } from './inviteStyles';
import { layoutStyles } from './layoutStyles';
import { modalStyles } from './modalStyles';
import { navStyles } from './navStyles';
import { taskStyles } from './taskStyles';

type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

const combinedStyles = {
  ...layoutStyles,
  ...taskStyles,
  ...inviteStyles,
  ...modalStyles,
  ...navStyles,
} as const satisfies NamedStyles;

export const styles = StyleSheet.create(combinedStyles);
