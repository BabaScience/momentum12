import { describe, it, expect } from 'vitest';
import { StreakService } from './streak.service.js';

describe('StreakService', () => {
  const streakService = new StreakService();

  describe('getStreakMilestone', () => {
    it('should identify 7 day milestone', () => {
      const result = streakService.getStreakMilestone(7);
      expect(result.isMilestone).toBe(true);
      expect(result.milestone).toBe(7);
      expect(result.nextMilestone).toBe(14);
      expect(result.message).toContain('week');
    });

    it('should identify 30 day milestone', () => {
      const result = streakService.getStreakMilestone(30);
      expect(result.isMilestone).toBe(true);
      expect(result.milestone).toBe(30);
      expect(result.message).toContain('30 days');
    });

    it('should identify 100 day milestone', () => {
      const result = streakService.getStreakMilestone(100);
      expect(result.isMilestone).toBe(true);
      expect(result.milestone).toBe(100);
      expect(result.message).toContain('100 days');
    });

    it('should not be milestone for non-milestone numbers', () => {
      const result = streakService.getStreakMilestone(15);
      expect(result.isMilestone).toBe(false);
      expect(result.milestone).toBe(14);
      expect(result.nextMilestone).toBe(21);
      expect(result.message).toBe('');
    });

    it('should handle zero streak', () => {
      const result = streakService.getStreakMilestone(0);
      expect(result.isMilestone).toBe(false);
      expect(result.milestone).toBe(0);
      expect(result.nextMilestone).toBe(7);
    });

    it('should calculate correct next milestone', () => {
      expect(streakService.getStreakMilestone(5).nextMilestone).toBe(7);
      expect(streakService.getStreakMilestone(8).nextMilestone).toBe(14);
      expect(streakService.getStreakMilestone(25).nextMilestone).toBe(30);
      expect(streakService.getStreakMilestone(80).nextMilestone).toBe(100);
    });
  });
});

