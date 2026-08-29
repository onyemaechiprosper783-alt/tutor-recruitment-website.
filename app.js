const form = document.getElementById('tutorForm');
const submitButton = document.getElementById('submitButton');
const schedule = document.getElementById('scheduleValue');
const finalSchedule = document.getElementById('finalSchedule');
const criteriaError = document.getElementById('criteriaError');
const agreementError = document.getElementById('agreementError');
const criteriaInputs = [...document.querySelectorAll('input[name="criteria"]')];

const SUPABASE_URL = 'https://letakjckpnpdiqwiuohc.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || '';

function getSchedule() {
  const selected = criteriaInputs.filter(i => i.checked).map(i => i.value);
  if (selected.length === 2) return '7:00 PM — 11:00 PM';
  if (selected[0] === 'WAEC') return '7:00 PM — 9:00 PM';
  if (selected[0] === 'JAMB') return '9:00 PM — 11:00 PM';
  return '';
}
function updateSchedule() {
  const value = getSchedule();
  schedule.textContent = value || 'Select WAEC, JAMB, or both';
  finalSchedule.textContent = value || 'Not selected';
  criteriaError.textContent = '';
}
criteriaInputs.forEach(input => input.addEventListener('change', updateSchedule));

function setError(field, message) {
  const label = field.closest('label');
  const error = label?.querySelector('.error');
  if (error) error.textContent = message;
  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
}
function validate() {
  let valid = true;
  form.querySelectorAll('[required]').forEach(field => {
    const value = field.type === 'checkbox' ? field.checked : field.value.trim();
    if (!value) { setError(field, 'This field is required.'); valid = false; }
    else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) { setError(field, 'Enter a valid email address.'); valid = false; }
    else if (field.name === 'about' && field.value.trim().length < 30) { setError(field, 'Please write at least 30 characters.'); valid = false; }
    else setError(field, '');
  });
  const selected = criteriaInputs.filter(i => i.checked).map(i => i.value);
  if (selected.length < 1 || selected.length > 2 || selected.some(v => !['WAEC','JAMB'].includes(v))) { criteriaError.textContent = 'Select WAEC, JAMB, or both.'; valid = false; }
  const agreement = document.querySelector('input[name="agreement"]');
  agreementError.textContent = agreement.checked ? '' : 'Please confirm the information is accurate.';
  return valid && agreement.checked;
}
form.querySelectorAll('input,select,textarea').forEach(field => field.addEventListener('input', () => setError(field, '')));

function status(message, type = 'error') {
  let el = document.getElementById('submitStatus');
  if (!el) { el = document.createElement('p'); el.id = 'submitStatus'; submitButton.parentElement.appendChild(el); }
  el.textContent = message; el.className = `submit-status ${type}`;
}

async function submitApplication(data) {
  if (!SUPABASE_ANON_KEY) throw new Error('Supabase publishable key is not configured.');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_tutor_recruitment_application`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({
      p_full_name: data.fullName, p_email: data.email, p_phone: data.phone,
      p_location: data.location, p_criteria: data.criteria, p_subject: data.subject,
      p_experience: data.experience, p_about: data.about, p_teaching_window: data.teachingWindow
    })
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  status('');
  if (!validate()) return;
  const criteria = criteriaInputs.filter(i => i.checked).map(i => i.value);
  const data = Object.fromEntries(new FormData(form).entries());
  data.criteria = criteria; data.teachingWindow = getSchedule();
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Submitting…';
  try {
    await submitApplication(data);
    form.outerHTML = `<div class="success"><div style="font-size:42px">✓</div><h3>Application received</h3><p>Thank you, ${data.fullName}. Your tutor application has been submitted successfully. We’ll review it and contact you using the details provided.</p></div>`;
    document.getElementById('application').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error(error);
    status('We could not submit your application. Please try again in a moment.', 'error');
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Submit application';
  }
});
updateSchedule();
