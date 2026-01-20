// Test fixtures for consistent test data

export const testCircle = {
  id: 'test-circle-id',
  name: 'Test Family',
  description: 'A test family circle',
  createdAt: new Date('2024-01-01'),
};

export const testMember = {
  id: 'test-member-id',
  circleId: 'test-circle-id',
  name: 'John Doe',
  dateOfBirth: '1990-05-15',
  gender: 'male',
  role: 'admin',
  profilePicture: null,
};

export const testMetrics = {
  id: 'test-metrics-id',
  memberId: 'test-member-id',
  weight: 180,
  height: 72,
  bodyFatPercentage: 15,
  fitnessLevel: 'intermediate',
  date: new Date('2024-01-15'),
};

export const testGoal = {
  id: 'test-goal-id',
  memberId: 'test-member-id',
  title: 'Bench Press 200 lbs',
  category: 'strength',
  description: 'Improve bench press strength',
  targetValue: 200,
  targetUnit: 'lbs',
  currentValue: 165,
  status: 'active',
  targetDate: new Date('2024-06-01'),
};

export const testMilestone = {
  id: 'test-milestone-id',
  goalId: 'test-goal-id',
  title: 'Bench 175 lbs',
  description: 'First milestone',
  targetValue: 175,
  status: 'completed',
  order: 1,
};

export const testExercise = {
  id: 'test-exercise-id',
  circleId: 'test-circle-id',
  name: 'Bench Press',
  category: 'strength',
  muscleGroups: ['chest', 'triceps', 'shoulders'],
  equipment: ['barbell', 'bench'],
  difficulty: 'intermediate',
  instructions: 'Lie on bench, grip bar, lower to chest, press up.',
};

export const testWorkoutPlan = {
  id: 'test-plan-id',
  circleId: 'test-circle-id',
  memberId: 'test-member-id',
  name: 'Push Day',
  description: 'Chest, shoulders, triceps',
  category: 'strength',
  difficulty: 'intermediate',
  estimatedDuration: 60,
  isTemplate: false,
};

export const testWorkoutSession = {
  id: 'test-session-id',
  planId: 'test-plan-id',
  memberId: 'test-member-id',
  name: 'Push Day Session',
  date: new Date('2024-01-20'),
  status: 'completed',
  startTime: new Date('2024-01-20T10:00:00'),
  endTime: new Date('2024-01-20T11:15:00'),
  notes: 'Great workout!',
  rating: 4,
};

export const testSkill = {
  id: 'test-skill-id',
  memberId: 'test-member-id',
  name: 'Pull-up',
  category: 'bodyweight',
  currentStatus: 'achieved',
  allTimeBestStatus: 'achieved',
};

export const testLimitation = {
  id: 'test-limitation-id',
  memberId: 'test-member-id',
  type: 'injury',
  description: 'Mild lower back pain',
  severity: 'moderate',
  affectedAreas: ['lower back'],
  active: true,
};

export const testPersonalRecord = {
  id: 'test-pr-id',
  memberId: 'test-member-id',
  exerciseId: 'test-exercise-id',
  value: 185,
  unit: 'lbs',
  repMax: 1,
  date: new Date('2024-01-20'),
  recordType: 'current',
};

export const testContextNote = {
  id: 'test-note-id',
  memberId: 'test-member-id',
  entityType: 'workout_session',
  entityId: 'test-session-id',
  mood: 'motivated',
  energyLevel: 4,
  painLevel: 1,
  content: 'Felt strong today, no issues.',
};

// API response mocks
export const mockAuthSession = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  circleId: 'test-circle-id',
};

export const mockUnauthorizedResponse = {
  error: 'Unauthorized',
  status: 401,
};

export const mockNotFoundResponse = {
  error: 'Not found',
  status: 404,
};
