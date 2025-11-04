import Constants from 'expo-constants';

type Extras = Record<string, unknown>;

const asExtras = (value: unknown): Extras =>
  typeof value === 'object' && value !== null ? (value as Extras) : {};

const computeExtras = (): Extras => {
  const runtimeConstants = Constants as unknown as {
    manifest?: { extra?: Extras };
    manifest2?: { extra?: Extras };
  };

  const globalObject = globalThis as Record<string, unknown>;
  const staticConfig = globalObject.__expo_static_config__ as
    | { expoConfig?: { extra?: Extras } }
    | undefined;
  const expoConfig = globalObject.expoConfig as { extra?: Extras } | undefined;

  return {
    ...asExtras(expoConfig?.extra),
    ...asExtras(staticConfig?.expoConfig?.extra),
    ...asExtras(runtimeConstants.manifest?.extra),
    ...asExtras(runtimeConstants.manifest2?.extra),
    ...asExtras(Constants.expoConfig?.extra),
  };
};

let cachedExtras: Extras | null = null;

export const getExpoExtras = (): Extras => {
  if (!cachedExtras) {
    cachedExtras = computeExtras();
  }
  return cachedExtras;
};

export const getExtraString = (key: string): string => {
  const value = getExpoExtras()[key];
  return typeof value === 'string' ? value : '';
};
