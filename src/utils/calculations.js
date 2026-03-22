import { getDayOfWeek, today } from './date.js';

export function calculateCalories(weightKg, distanceKm) {
  if (!weightKg || !distanceKm) return 0;
  return Math.round(weightKg * distanceKm * 0.5);
}

export function getDailyRecommendation(weeklyGoal, entriesThisWeek) {
  const todayStr = today();
  const totalDone = entriesThisWeek.reduce((s, e) => s + e.distance, 0);
  const remaining = Math.max(0, weeklyGoal - totalDone);
  const dayIndex = getDayOfWeek(todayStr); // Mon=0 .. Sun=6
  const daysLeft = 7 - dayIndex; // including today
  const doneToday = entriesThisWeek
    .filter((e) => e.date === todayStr)
    .reduce((s, e) => s + e.distance, 0);
  const recommendedToday = remaining / Math.max(1, daysLeft);
  const leftToday = Math.max(0, recommendedToday - doneToday);

  return {
    totalDone,
    remaining,
    daysLeft,
    doneToday,
    recommendedToday: Math.round(recommendedToday * 10) / 10,
    leftToday: Math.round(leftToday * 10) / 10,
    progress: weeklyGoal > 0 ? Math.min(totalDone / weeklyGoal, 1) : 0,
    progressPercent:
      weeklyGoal > 0 ? Math.round((totalDone / weeklyGoal) * 100) : 0,
    isGoalReached: totalDone >= weeklyGoal && weeklyGoal > 0,
    isOverAchieved: totalDone > weeklyGoal && weeklyGoal > 0,
  };
}

export function sumDistance(entries) {
  return entries.reduce((s, e) => s + e.distance, 0);
}

export function sumCalories(entries) {
  return entries.reduce((s, e) => s + (e.calories || 0), 0);
}
