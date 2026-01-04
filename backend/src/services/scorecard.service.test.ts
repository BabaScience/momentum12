import { describe, it, expect } from 'vitest';
import { ScorecardCalculator } from './scorecard.service.js';

describe('ScorecardCalculator', () => {
  const calculator = new ScorecardCalculator();

  describe('calculateWeeklyScore', () => {
    it('should return 100 when all goals and habits are completed', () => {
      const weeklyGoals = [
        { isCompleted: true },
        { isCompleted: true },
        { isCompleted: true },
      ];
      const habitExecutions = [
        { isCompleted: true },
        { isCompleted: true },
        { isCompleted: true },
        { isCompleted: true },
        { isCompleted: true },
      ];

      const score = calculator.calculateWeeklyScore(weeklyGoals, habitExecutions);
      expect(score).toBe(100);
    });

    it('should return 0 when nothing is completed', () => {
      const weeklyGoals = [
        { isCompleted: false },
        { isCompleted: false },
      ];
      const habitExecutions = [
        { isCompleted: false },
        { isCompleted: false },
        { isCompleted: false },
      ];

      const score = calculator.calculateWeeklyScore(weeklyGoals, habitExecutions);
      expect(score).toBe(0);
    });

    it('should calculate weighted score correctly (40% goals, 60% habits)', () => {
      // 100% goals, 50% habits
      const weeklyGoals = [
        { isCompleted: true },
        { isCompleted: true },
      ];
      const habitExecutions = [
        { isCompleted: true },
        { isCompleted: false },
      ];

      // Expected: 100 * 0.4 + 50 * 0.6 = 40 + 30 = 70
      const score = calculator.calculateWeeklyScore(weeklyGoals, habitExecutions);
      expect(score).toBe(70);
    });

    it('should return 100 when there are no goals or habits', () => {
      const score = calculator.calculateWeeklyScore([], []);
      expect(score).toBe(100);
    });

    it('should handle empty goals with habits', () => {
      const habitExecutions = [
        { isCompleted: true },
        { isCompleted: false },
      ];

      // Goals: 100% (empty = 100), Habits: 50%
      // Expected: 100 * 0.4 + 50 * 0.6 = 70
      const score = calculator.calculateWeeklyScore([], habitExecutions);
      expect(score).toBe(70);
    });
  });

  describe('calculate12WeekScore', () => {
    it('should return average of weekly scores', () => {
      const weeklyScores = [80, 90, 100, 70];
      const score = calculator.calculate12WeekScore(weeklyScores);
      expect(score).toBe(85);
    });

    it('should return 0 for empty scores', () => {
      const score = calculator.calculate12WeekScore([]);
      expect(score).toBe(0);
    });

    it('should handle single score', () => {
      const score = calculator.calculate12WeekScore([75]);
      expect(score).toBe(75);
    });
  });

  describe('isOnTrack', () => {
    it('should return true for scores >= 85', () => {
      expect(calculator.isOnTrack(85)).toBe(true);
      expect(calculator.isOnTrack(90)).toBe(true);
      expect(calculator.isOnTrack(100)).toBe(true);
    });

    it('should return false for scores < 85', () => {
      expect(calculator.isOnTrack(84)).toBe(false);
      expect(calculator.isOnTrack(70)).toBe(false);
      expect(calculator.isOnTrack(0)).toBe(false);
    });
  });

  describe('getScoreGrade', () => {
    it('should return A grade for scores >= 90', () => {
      const grade = calculator.getScoreGrade(95);
      expect(grade.grade).toBe('A');
      expect(grade.label).toBe('Excellent');
    });

    it('should return B grade for scores 80-89', () => {
      const grade = calculator.getScoreGrade(85);
      expect(grade.grade).toBe('B');
      expect(grade.label).toBe('Good');
    });

    it('should return C grade for scores 70-79', () => {
      const grade = calculator.getScoreGrade(75);
      expect(grade.grade).toBe('C');
      expect(grade.label).toBe('Fair');
    });

    it('should return D grade for scores 60-69', () => {
      const grade = calculator.getScoreGrade(65);
      expect(grade.grade).toBe('D');
      expect(grade.label).toBe('Needs Improvement');
    });

    it('should return F grade for scores < 60', () => {
      const grade = calculator.getScoreGrade(50);
      expect(grade.grade).toBe('F');
      expect(grade.label).toBe('Critical');
    });
  });
});

