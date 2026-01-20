import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testMember, testMetrics, mockAuthSession } from '../fixtures/testData';

// Mock the database and auth modules
const mockDb = {
  query: {
    circleMembers: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    memberMetrics: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: vi.fn(),
};

const mockAuth = vi.fn();

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ auth: mockAuth }));

describe('Members API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockAuthSession);
  });

  describe('GET /api/members', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      // Import the route handler
      const { GET } = await import('@/app/api/members/route');
      const response = await GET(new Request('http://localhost/api/members'));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return members for authenticated user', async () => {
      const mockMembers = [testMember];
      mockDb.query.circleMembers.findMany.mockResolvedValue(mockMembers);
      mockDb.query.memberMetrics.findFirst.mockResolvedValue(testMetrics);

      const { GET } = await import('@/app/api/members/route');
      const response = await GET(new Request('http://localhost/api/members'));

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/members', () => {
    it('should create a new member', async () => {
      const newMember = { ...testMember, id: 'new-member-id' };
      mockDb.returning.mockResolvedValue([newMember]);

      const { POST } = await import('@/app/api/members/route');
      const response = await POST(new Request('http://localhost/api/members', {
        method: 'POST',
        body: JSON.stringify({ name: 'New Member' }),
      }));

      expect(response.status).toBe(200);
    });

    it('should return 400 when name is missing', async () => {
      const { POST } = await import('@/app/api/members/route');
      const response = await POST(new Request('http://localhost/api/members', {
        method: 'POST',
        body: JSON.stringify({}),
      }));

      expect(response.status).toBe(400);
    });
  });
});
