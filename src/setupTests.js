import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Firebase
vi.mock('./shared/lib/firebase', () => ({
    db: {},
    auth: {},
}));

// Setup global mocks
global.navigator = {
    ...global.navigator,
    onLine: true,
};
