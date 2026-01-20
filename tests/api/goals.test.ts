import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testGoal, testMember, mockAuthSession } from '../fixtures/testData';

const mockDb = {
  query: {
    goals: { findMany: vi.fn(), findFirst: vi.fn() },
    circleMembers: { findFirst: vi.fn() },
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

describe('Goals API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockAuthSession);
  });

  describe('GET /api/goals', () => {
    it('should return goals for authenticated user', async () => {
      mockDb.query.goals.findMany.mockResolvedValue([testGoal]);

      const { GET } = await import('@/app/api/goals/route');
      const response = await GET(new Request('http://localhost/api/goals'));

      expect(response.status).toBe(200);
    });

    it('should filter goals by memberId', async () => {
      mockDb.query.goals.findMany.mockResolvedValue([testGoal]);

      const { GET } = await import('@/app/api/goals/route');
      const response = await GET(new Request('http://localhost/api/goals?memberId=test-member-id'));

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/goals', () => {
    it('should create a new goal', async () => {
      mockDb.query.circleMembers.findFirst.mockResolvedValue(testMember);
      mockDb.returning.mockResolvedValue([testGoal]);

      const { POST } = await import('@/app/api/goals/route');
      const response = await POST(new Request('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'test-member-id',
          title: 'New Goal',
          category: 'strength',
        }),
      }));

      expect(response.status).toBe(200);
    });

    it('should return 400 when required fields missing', async () => {
      const { POST } = await import('@/app/api/goals/route');
      const response = await POST(new Request('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({ title: 'Goal only' }),
      }));

      expect(response.status).toBe(400);
    });

    it('should return 404 when member not found', async () => {
      mockDb.query.circleMembers.findFirst.mockResolvedValue(null);

      const { POST } = await import('@/app/api/goals/route');
      const response = await POST(new Request('http://localhost/api/goals', {
        method: 'POST',
        body: JSON.stringify({
          memberId: 'nonexistent-member',
          title: 'Goal',
          category: 'strength',
        }),
      }));

      expect(response.status).toBe(404);
    });
  });
});
