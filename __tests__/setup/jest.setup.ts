/**
 * Jest Test Setup
 * 
 * Global configuration and setup for unit tests.
 * Configures testing library matchers and environment.
 */

import '@testing-library/jest-dom';
import { config } from 'dotenv';

// Load environment variables from .env.local for tests
config({ path: '.env.local' });

// Extend Jest matchers with testing-library assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveClass(className: string): R;
      toHaveTextContent(text: string | RegExp): R;
    }
  }
}

// Mock Next.js router for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Use actual environment variables for tests (don't override)
// Tests should use the same local database as development
console.log('Test environment using:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});