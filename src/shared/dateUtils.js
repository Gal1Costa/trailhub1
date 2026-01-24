const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Determines if a review can be submitted for a hike based on its date.
 * Reviews are allowed once the hike's calendar day has started (same day or later).
 * Uses timezone-aware comparison to account for users in different timezones.
 * 
 * The comparison is lenient: if the hike date's calendar day has started in ANY
 * timezone (specifically GMT+4, Georgia's timezone), reviews are allowed.
 * This ensures users in timezones ahead of UTC can review hikes on the correct day.
 * 
 * @param {Date|string|null} hikeDate - The hike date (DateTime from database)
 * @returns {boolean} - true if reviews are allowed (hike date is today or in the past), false otherwise
 */
function canReviewHike(hikeDate) {
  if (!hikeDate) {
    // If no hike date, allow review (fallback behavior)
    console.log('[canReviewHike] No hike date provided, allowing review');
    return true;
  }

  // Parse the hike date and get calendar day in UTC
  const hikeDayUTC = dayjs.utc(hikeDate).startOf('day');
  
  // Get today's calendar day in UTC
  const todayUTC = dayjs.utc().startOf('day');
  
  // Also check in Georgia timezone (GMT+4) - if it's the hike date there, allow review
  // This handles the case where users in timezones ahead of UTC are trying to review
  const georgiaTimezone = 'Asia/Tbilisi'; // GMT+4
  const hikeDayGeorgia = dayjs(hikeDate).tz(georgiaTimezone).startOf('day');
  const todayGeorgia = dayjs().tz(georgiaTimezone).startOf('day');
  
  // Allow reviews if:
  // 1. Hike date is today or in the past in UTC, OR
  // 2. Hike date is today or in the past in Georgia timezone (GMT+4)
  // This ensures users in timezones ahead of UTC can review on the correct day
  const resultUTC = hikeDayUTC.isSame(todayUTC) || hikeDayUTC.isBefore(todayUTC);
  const resultGeorgia = hikeDayGeorgia.isSame(todayGeorgia) || hikeDayGeorgia.isBefore(todayGeorgia);
  const result = resultUTC || resultGeorgia;
  
  // Debug logging
  console.log('[canReviewHike] Date comparison:', {
    hikeDateInput: hikeDate,
    hikeDateISO: new Date(hikeDate).toISOString(),
    hikeDayUTC: hikeDayUTC.toISOString(),
    todayUTC: todayUTC.toISOString(),
    hikeDayFormattedUTC: hikeDayUTC.format('YYYY-MM-DD'),
    todayFormattedUTC: todayUTC.format('YYYY-MM-DD'),
    hikeDayFormattedGeorgia: hikeDayGeorgia.format('YYYY-MM-DD'),
    todayFormattedGeorgia: todayGeorgia.format('YYYY-MM-DD'),
    isSameUTC: hikeDayUTC.isSame(todayUTC),
    isBeforeUTC: hikeDayUTC.isBefore(todayUTC),
    isSameGeorgia: hikeDayGeorgia.isSame(todayGeorgia),
    isBeforeGeorgia: hikeDayGeorgia.isBefore(todayGeorgia),
    resultUTC,
    resultGeorgia,
    canReview: result,
  });
  
  return result;
}

module.exports = {
  canReviewHike,
};
