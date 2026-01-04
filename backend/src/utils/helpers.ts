import { v4 as uuidv4 } from 'uuid';
import { addDays, addWeeks, differenceInDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';

/**
 * Generate a unique identifier
 */
export const generateId = (): string => {
  return uuidv4();
};

/**
 * Calculate the end date for a 12-week plan
 */
export const calculate12WeekEndDate = (startDate: Date): Date => {
  return addWeeks(startDate, 12);
};

/**
 * Calculate the current week number of a 12-week plan
 */
export const calculateCurrentWeek = (startDate: Date, currentDate: Date = new Date()): number => {
  const daysDiff = differenceInDays(startOfDay(currentDate), startOfDay(startDate));
  
  if (daysDiff < 0) return 0;
  
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  return Math.min(weekNumber, 12);
};

/**
 * Calculate days remaining in a 12-week plan
 */
export const calculateDaysRemaining = (endDate: Date, currentDate: Date = new Date()): number => {
  const daysDiff = differenceInDays(endOfDay(endDate), startOfDay(currentDate));
  return Math.max(0, daysDiff);
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Get start of day for a given date
 */
export const getStartOfDay = (date: Date = new Date()): Date => {
  return startOfDay(date);
};

/**
 * Get end of day for a given date
 */
export const getEndOfDay = (date: Date = new Date()): Date => {
  return endOfDay(date);
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 */
export const formatDateISO = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Parse ISO date string to Date
 */
export const parseDate = (dateString: string): Date => {
  return parseISO(dateString);
};

/**
 * Get the next N days from a given date
 */
export const getNextDays = (days: number, fromDate: Date = new Date()): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(addDays(fromDate, i));
  }
  return dates;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
};

/**
 * Clamp a value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Chunk an array into smaller arrays
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remove duplicates from an array
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Safely parse JSON
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

