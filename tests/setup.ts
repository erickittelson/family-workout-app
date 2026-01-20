import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock session for tests
const mockSession = {
  user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
  circleId: 'test-circle-id',
  activeCircle: {
    id: 'test-circle-id',
    name: 'Test Circle',
    role: 'owner',
    memberId: 'test-member-id',
  },
  circles: [{
    id: 'test-circle-id',
    name: 'Test Circle',
    role: 'owner',
    memberId: 'test-member-id',
  }],
};

// Mock Next.js headers (required for server-side auth)
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: vi.fn(() => ({ value: 'test-circle-id' })),
    set: vi.fn(),
    delete: vi.fn(),
  }),
  headers: () => new Map(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '',
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Neon Auth
vi.mock('@neondatabase/auth/next/server', () => ({
  createAuth: vi.fn(() => ({
    getSession: vi.fn(() => Promise.resolve({
      data: {
        session: { userId: 'test-user-id' },
        user: { name: 'Test User', email: 'test@example.com' },
      },
    })),
  })),
}));

vi.mock('@neondatabase/auth/next', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated',
    isPending: false,
  }),
}));

// Mock our auth module
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(() => Promise.resolve(mockSession)),
  requireAuth: vi.fn(() => Promise.resolve(mockSession)),
  requireCircle: vi.fn(() => Promise.resolve(mockSession)),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/neon-auth', () => ({
  getSession: vi.fn(() => Promise.resolve(mockSession)),
  requireAuth: vi.fn(() => Promise.resolve(mockSession)),
  requireCircle: vi.fn(() => Promise.resolve(mockSession)),
  switchCircle: vi.fn(() => Promise.resolve(true)),
  getCurrentMemberId: vi.fn(() => Promise.resolve('test-member-id')),
  authServer: {
    getSession: vi.fn(() => Promise.resolve({
      data: {
        session: { userId: 'test-user-id' },
        user: { name: 'Test User', email: 'test@example.com' },
      },
    })),
  },
  authClient: {
    useSession: () => ({ data: mockSession, status: 'authenticated' }),
  },
  useSession: () => ({ data: mockSession, status: 'authenticated' }),
}));

// Mock next-auth (legacy)
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: mockSession,
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Global fetch mock
global.fetch = vi.fn();

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
