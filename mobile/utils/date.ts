import {
  format,
  formatDistance,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subDays,
  subWeeks,
  differenceInDays,
  isSameDay,
  isToday,
  isPast,
  isFuture,
} from 'date-fns';

export const dateUtils = {
  format,
  formatDistance,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subDays,
  subWeeks,
  differenceInDays,
  isSameDay,
  isToday,
  isPast,
  isFuture,
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string, formatStr: string = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
};

/**
 * Format date relative to now
 */
export const formatRelative = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistance(d, new Date(), { addSuffix: true });
};

/**
 * Get time of day greeting
 */
export const getTimeOfDayGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/**
 * Calculate days remaining until end date
 */
export const getDaysRemaining = (endDate: Date | string): number => {
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diff = differenceInDays(end, new Date());
  return Math.max(0, diff);
};

/**
 * Calculate current week number in a 12-week plan
 */
export const getCurrentWeek = (startDate: Date | string): number => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const daysDiff = differenceInDays(new Date(), startOfDay(start));
  
  if (daysDiff < 0) return 0;
  
  const weekNumber = Math.floor(daysDiff / 7) + 1;
  return Math.min(weekNumber, 12);
};

/**
 * Get dates for a week given week number in plan
 */
export const getWeekDates = (
  planStartDate: Date | string,
  weekNumber: number
): { start: Date; end: Date } => {
  const start = typeof planStartDate === 'string' ? new Date(planStartDate) : planStartDate;
  const weekStart = addWeeks(startOfDay(start), weekNumber - 1);
  const weekEnd = addDays(weekStart, 6);
  
  return { start: weekStart, end: weekEnd };
};

/**
 * Generate date range for display
 */
export const getDateRangeString = (startDate: Date, endDate: Date): string => {
  const startStr = format(startDate, 'MMM d');
  const endStr = format(endDate, 'MMM d, yyyy');
  return `${startStr} - ${endStr}`;
};

