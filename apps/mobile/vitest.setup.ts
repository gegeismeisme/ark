import '@testing-library/jest-dom';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const originalError = console.error;
console.error = (...args: unknown[]) => {
  const [message] = args;
  if (typeof message === 'string' && message.includes('not wrapped in act')) {
    return;
  }
  originalError(...args);
};
