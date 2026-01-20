import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testWorkoutPlan, testWorkoutSession, testMember, mockAuthSession } from '../fixtures/testData';

const mockDb = {
  query: {
    workoutPlans: { findMany: vi.fn(), findFirst: vi.fn() },
    workoutSessions: { findMany: vi.fn(), findFirst: vi.fn() },
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

describe('Workout Plans API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockAuthSession);
  });

  describe('GET /api/workout-plans', () => {
    it('should return workout plans', async () => {
      mockDb.query.workoutPlans.findMany.mockResolvedValue([testWorkoutPlan]);

      const { GET } = await import('@/app/api/workout-plans/route');
      const response = await GET(new Request('http://localhost/api/workout-plans'));

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/workout-plans', () => {
    it('should create a workout plan', async () => {
      mockDb.returning.mockResolvedValue([testWorkoutPlan]);

      const { POST } = await import('@/app/api/workout-plans/route');
      const response = await POST(new Request('http://localhost/api/workout-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Plan',
          memberId: 'test-member-id',
          exercises: [],
        }),
      }));

      expect(response.status).toBe(200);
    });
  });
});

describe('Workout Sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockAuthSession);
  });

  describe('GET /api/workout-sessions', () => {
    it('should return workout sessions', async () => {
      mockDb.query.workoutSessions.findMany.mockResolvedValue([testWorkoutSession]);

      const { GET } = await import('@/app/api/workout-sessions/route');
      const response = await GET(new Request('http://localhost/api/workout-sessions'));

      expect(response.status).toBe(200);
    });
  });
});
