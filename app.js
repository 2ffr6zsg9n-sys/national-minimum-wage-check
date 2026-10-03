'use strict';
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
const wholePounds = value => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
let step = 0;
let REFERENCE_DATA = null;
const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
const number = id => $(id).value.trim() === '' ? NaN : Number($(id).value);
async function loadReferenceData() {
  $('next').disabled = true; $('retry').hidden = true;
  $('data-status').hidden = false; $('data-status').textContent = 'Loading pay and minimum wage rates…';
  try {
    const response = await fetch('/api/reference-data', { cache: 'no-store' });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({}));
      throw new Error(problem.error || 'Pay and minimum wage rates could not be loaded.');
    }
    const data = await response.json();
    if (!Array.isArray(data.afc) || !data.afc.length || !Array.isArray(data.nmw) || !data.nmw.length) throw new Error('The shared tables are empty or unavailable.');
    const today = new Date().toISOString().slice(0, 10);
    if (data.afc.some(r => !Number.isFinite(r.annualSalary) || r.annualSalary <= 0 || !r.afcPayRateId || !r.band || !r.effectiveFrom || r.effectiveFrom.slice(0,10) > today)
      || data.nmw.some(r => !Number.isFinite(r.hourlyRate) || r.hourlyRate <= 0 || !r.nmwRateId || !r.ageBand || !r.effectiveFrom || r.effectiveFrom.slice(0,10) > today)) throw new Error('The shared tables contain invalid or future rates.');
    REFERENCE_DATA = data;
    $('afc-pay').replaceChildren(new Option('Select your annual pay', ''));
    $('age').replaceChildren(new Option('Select your age band', ''));
    data.afc.forEach(row => $('afc-pay').add(new Option(`Band ${row.band} — ${wholePounds(row.annualSalary)}`, String(row.afcPayRateId))));
    data.nmw.forEach(row => $('age').add(new Option(`${row.ageBand} — ${money(row.hourlyRate)} per hour`, String(row.nmwRateId))));
    $('data-status').hidden = true; $('next').disabled = false;
  } catch (e) { $('data-status').textContent = `${e.message} Please retry. No saved rate tables are used.`; $('retry').hidden = false; }
}
$('retry').addEventListener('click', loadReferenceData);
loadReferenceData();
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
function updateFields() {
  const afc = radio('afc') === 'yes';
  $('afc-fields').hidden = !afc;
  $('manual-fields').hidden = radio('afc') !== 'no';
  $('unit-fields').hidden = afc;
  if (afc) { document.querySelector('input[name="unit"][value="hours"]').checked = true; $('whole').value = '37.5'; }
  const sessions = !afc && radio('unit') === 'sessions';
  $('whole').disabled = afc;
  $('session-fields').hidden = !sessions;
  $('contracted-label').textContent = `Contracted ${sessions ? 'sessions' : 'hours'} per week`;
  $('contracted-hint').textContent = `Enter your own contracted ${sessions ? 'sessions' : 'hours'}, whether full-time or part-time.`;
  $('whole-label').textContent = `Whole-time equivalent ${sessions ? 'sessions' : 'hours'} per week`;
  $('whole-hint').textContent = afc ? 'Agenda for Change whole-time hours are fixed at 37.5 per week.' : 'Enter the weekly amount for a full-time post, using the same units as your contracted time.';
}
document.querySelectorAll('input[name="afc"],input[name="unit"]').forEach(input => input.addEventListener('change', () => {
  if (input.name === 'unit') {
    const sessions = input.value === 'sessions';
    $('contracted').value = sessions ? '10' : '37.5';
    $('whole').value = sessions ? '10' : '37.5';
    if (sessions) $('session-hours').value = '4';
  }
  updateFields(); error('');
}));
function showStep(index) {
  step = index;
  $('calculator').hidden = false; $('results').hidden = true;
  document.querySelectorAll('.step').forEach((el, i) => el.hidden = i !== step);
  document.querySelectorAll('#progress li').forEach((el, i) => { el.className = i === step ? 'active' : i < step ? 'complete' : ''; if (i === step) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
  $('back').hidden = step === 0;
  $('next').textContent = step === 3 ? 'View NMW check results →' : 'Continue →';
  error(''); $(`title-${step}`).focus();
}
function validate() {
  if (!REFERENCE_DATA) throw new Error('Wait for pay and minimum wage rates to load.');
  if (step === 0) {
    if (!radio('afc')) throw new Error('Choose whether Agenda for Change rates should be used.');
    if (radio('afc') === 'yes' && !$('afc-pay').value) throw new Error('Select your full-time annual pay.');
    if (radio('afc') === 'no' && (!Number.isFinite(number('manual-pay')) || number('manual-pay') <= 0)) throw new Error('Enter a positive full-time equivalent annual basic pay.');
  }
  if (step === 1) {
    if (![number('contracted'), number('whole')].every(n => Number.isFinite(n) && n > 0)) throw new Error('Enter positive contracted and whole-time hours or sessions.');
    if (number('contracted') > number('whole')) throw new Error('Your contracted time cannot exceed the whole-time amount.');
    if (radio('unit') === 'sessions' && (!Number.isFinite(number('session-hours')) || number('session-hours') <= 0)) throw new Error('Enter the number of hours in each session.');
  }
  if (step === 2) {
    if (!Number.isFinite(number('sacrifice')) || number('sacrifice') < 0) throw new Error('Enter a salary sacrifice of zero or more.');
    const pay = fullTimePay() * number('contracted') / number('whole');
    if (number('sacrifice') * (radio('period') === 'monthly' ? 12 : 1) > pay) throw new Error('Salary sacrifice cannot exceed your actual annual basic pay.');
  }
  if (step === 3 && !$('age').value) throw new Error('Select your age band.');
}
function fullTimePay() { return radio('afc') === 'yes' ? REFERENCE_DATA.afc.find(r => String(r.afcPayRateId) === $('afc-pay').value)?.annualSalary : number('manual-pay'); }
function renderResults() {
  const age = REFERENCE_DATA.nmw.find(r => String(r.nmwRateId) === $('age').value);
  const result = NMW.calculate({ fullTimePay: fullTimePay(), contracted: number('contracted'), wholeTime: number('whole'), unit: radio('unit'), sessionHours: radio('unit') === 'sessions' ? number('session-hours') : 1, sacrifice: number('sacrifice'), sacrificePeriod: radio('period'), minimumRate: age.hourlyRate });
  $('result-title').textContent = result.below ? 'Below the minimum wage' : 'Meets the minimum wage';
  $('verdict').className = 'verdict ' + (result.below ? 'fail' : 'pass');
  $('verdict').textContent = result.alreadyBelow ? 'Your basic hourly pay is already below the minimum wage before salary sacrifice.' : result.below ? 'This salary sacrifice would take your basic hourly pay below the minimum wage for your age band.' : 'This salary sacrifice would not take your basic hourly pay below the minimum wage for your age band.';
  $('after').textContent = money(result.hourlyAfter); $('minimum').textContent = money(result.minimumRate);
  const gap = Math.abs(result.hourlyAfter - result.minimumRate);
  $('comparison').textContent = `Your hourly pay is ${gap < 1e-9 ? 'equal to' : `${gap < .005 ? 'less than £0.01' : money(gap)} ${result.below ? 'below' : 'above'}`} the minimum wage for your age group (${age.ageBand}).`;
  $('breakdown').replaceChildren();
  const rows = [['Full-time equivalent annual basic pay', money(fullTimePay())], ['Your annual basic pay before sacrifice', money(result.actualPay)], ['Annual salary sacrifice', money(result.annualSacrifice)], ['Your annual basic pay after sacrifice', money(result.adjustedPay)], ['Weekly contracted hours', result.weeklyHours.toLocaleString('en-GB', { maximumFractionDigits: 4 })], ['Hourly pay before sacrifice', money(result.hourlyBefore)], ['Maximum total monthly sacrifice on this basis', money(result.maxMonthlySacrifice)]];
  rows.forEach(([label, value]) => { const div = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; div.append(dt, dd); $('breakdown').append(div); });
  $('calculator').hidden = true; $('results').hidden = false;
  document.querySelectorAll('#progress li').forEach(el => { el.className = 'complete'; el.removeAttribute('aria-current'); });
  $('result-title').focus();
}
$('calculator').addEventListener('submit', e => { e.preventDefault(); try { validate(); if (step < 3) showStep(step + 1); else renderResults(); } catch (e) { error(e.message); } });
$('back').addEventListener('click', () => showStep(step - 1));
$('edit').addEventListener('click', () => showStep(0));
$('restart').addEventListener('click', () => { $('calculator').reset(); updateFields(); showStep(0); });
