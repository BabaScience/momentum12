import { describe, it, expect } from 'vitest';
import {
  calculate12WeekEndDate,
  calculateCurrentWeek,
  calculateDaysRemaining,
  calculatePercentage,
  clamp,
  chunk,
  unique,
} from './helpers.js';

describe('helpers', () => {
  describe('calculate12WeekEndDate', () => {
    it('should add 12 weeks to start date', () => {
      const startDate = new Date('2024-01-01');
      const endDate = calculate12WeekEndDate(startDate);
      
      // 12 weeks = 84 days
      const diffDays = Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(84);
    });
  });

  describe('calculateCurrentWeek', () => {
    it('should return 1 for day 0-6', () => {
      const startDate = new Date('2024-01-01');
      const day3 = new Date('2024-01-04');
      expect(calculateCurrentWeek(startDate, day3)).toBe(1);
    });

    it('should return 2 for day 7-13', () => {
      const startDate = new Date('2024-01-01');
      const day8 = new Date('2024-01-09');
      expect(calculateCurrentWeek(startDate, day8)).toBe(2);
    });

    it('should return 0 for date before start', () => {
      const startDate = new Date('2024-01-10');
      const beforeStart = new Date('2024-01-05');
      expect(calculateCurrentWeek(startDate, beforeStart)).toBe(0);
    });

    it('should cap at 12 weeks', () => {
      const startDate = new Date('2024-01-01');
      const wayLater = new Date('2024-06-01');
      expect(calculateCurrentWeek(startDate, wayLater)).toBe(12);
    });
  });

  describe('calculateDaysRemaining', () => {
    it('should return 0 for past dates', () => {
      const pastDate = new Date('2020-01-01');
      expect(calculateDaysRemaining(pastDate)).toBe(0);
    });

    it('should return positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(calculateDaysRemaining(futureDate)).toBeGreaterThan(9);
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(1, 4)).toBe(25);
      expect(calculatePercentage(3, 3)).toBe(100);
    });

    it('should return 0 when total is 0', () => {
      expect(calculatePercentage(5, 0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculatePercentage(1, 3)).toBe(33.33);
    });
  });

  describe('clamp', () => {
    it('should return value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should return min when value is below', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should return max when value is above', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('chunk', () => {
    it('should split array into chunks', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      expect(chunk(arr, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('should handle empty array', () => {
      expect(chunk([], 3)).toEqual([]);
    });

    it('should handle array smaller than chunk size', () => {
      expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('should handle empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('should work with strings', () => {
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });
});

