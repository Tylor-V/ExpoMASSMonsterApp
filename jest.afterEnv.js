// Additional Jest configuration executed after test environment is set up
const { beforeEach, afterEach, jest } = require('@jest/globals');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});