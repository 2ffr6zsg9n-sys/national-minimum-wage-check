(function (root) {
  'use strict';
  const WEEKS_PER_YEAR = 52.1428;
  function calculate({ fullTimePay, contracted, wholeTime, unit = 'hours', sessionHours = 1, sacrifice, sacrificePeriod = 'monthly', minimumRate }) {
    for (const value of [fullTimePay, contracted, wholeTime, sessionHours, minimumRate]) {
      if (!Number.isFinite(value) || value <= 0) throw new Error('Enter positive pay, hours and minimum wage values.');
    }
    if (!Number.isFinite(sacrifice) || sacrifice < 0) throw new Error('Salary sacrifice must be zero or a positive amount.');
    if (!['hours', 'sessions'].includes(unit) || !['monthly', 'annual'].includes(sacrificePeriod)) throw new Error('Choose valid units.');
    if (contracted > wholeTime) throw new Error('Contracted hours or sessions cannot exceed the whole-time amount.');
    const weeklyHours = contracted * (unit === 'sessions' ? sessionHours : 1);
    const annualHours = weeklyHours * WEEKS_PER_YEAR;
    const actualPay = fullTimePay * contracted / wholeTime;
    const annualSacrifice = sacrifice * (sacrificePeriod === 'monthly' ? 12 : 1);
    if (annualSacrifice > actualPay) throw new Error('Salary sacrifice cannot exceed your actual annual basic pay.');
    const adjustedPay = actualPay - annualSacrifice;
    const hourlyBefore = actualPay / annualHours;
    const hourlyAfter = adjustedPay / annualHours;
    const minimumAnnualPay = minimumRate * annualHours;
    const headroom = actualPay - minimumAnnualPay;
    // Compare before display rounding. An exact match meets the minimum.
    const below = adjustedPay < minimumAnnualPay - 1e-9;
    return { actualPay, annualSacrifice, adjustedPay, weeklyHours, annualHours, hourlyBefore, hourlyAfter, minimumRate, below, alreadyBelow: actualPay < minimumAnnualPay - 1e-9, annualGap: adjustedPay - minimumAnnualPay, maxMonthlySacrifice: Math.max(0, Math.floor((headroom / 12 + 1e-9) * 100) / 100) };
  }
  const api = { calculate, WEEKS_PER_YEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NMW = api;
})(typeof window === 'undefined' ? globalThis : window);
