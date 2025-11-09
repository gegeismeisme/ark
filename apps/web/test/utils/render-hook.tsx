import type { ReactNode } from 'react';
import { render } from '@testing-library/react';

type RenderHookOptions<TProps> = {
  initialProps?: TProps;
  wrapper?: ({ children }: { children: ReactNode }) => JSX.Element;
};

type RenderHookResult<TResult, TProps> = {
  result: { current: TResult | null };
  rerender: (props?: TProps) => void;
  unmount: () => void;
};

export function renderHookCompat<TResult, TProps = void>(
  callback: (props: TProps) => TResult,
  { initialProps, wrapper: Wrapper }: RenderHookOptions<TProps> = {}
): RenderHookResult<TResult, TProps> {
  const resultRef: { current: TResult | null } = { current: null };

  function HookHarness({ hookProps }: { hookProps: TProps | undefined }) {
    resultRef.current = callback(hookProps as TProps);
    return null;
  }

  function WithWrapper({ hookProps }: { hookProps: TProps | undefined }) {
    const element = <HookHarness hookProps={hookProps} />;
    return Wrapper ? <Wrapper>{element}</Wrapper> : element;
  }

  const { rerender, unmount } = render(<WithWrapper hookProps={initialProps} />);

  return {
    result: resultRef,
    rerender: (nextProps?: TProps) => rerender(<WithWrapper hookProps={nextProps} />),
    unmount,
  };
}
