const form = document.getElementById('tutorForm');
const submitButton = document.getElementById('submitButton');
const schedule = document.getElementById('scheduleValue');
const finalSchedule = document.getElementById('finalSchedule');
const criteriaError = document.getElementById('criteriaError');
const agreementError = document.getElementById('agreementError');
const criteriaInputs = [...document.querySelectorAll('input[name="criteria"]')];

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
  if (message) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
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
  const res = await fetch('/api/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.detail || result.error || `Submission failed (${res.status})`);
  return result;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  status('');
  if (!validate()) {
    const first = form.querySelector('[aria-invalid="true"]');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const criteria = criteriaInputs.filter(i => i.checked).map(i => i.value);
  const data = Object.fromEntries(new FormData(form).entries());
  data.criteria = criteria; data.teachingWindow = getSchedule();
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Submitting…';
  try {
    await submitApplication(data);
    form.outerHTML = `<div class="success"><div style="font-size:42px">✓</div><h3>Application received</h3><p>Thank you, ${data.fullName}. Your application has been submitted successfully. Our team will review it and contact you using the details provided.</p></div>`;
  } catch (error) {
    console.error(error);
    status(error.message.includes('environment') ? 'The application service is not configured yet. Please try again later.' : 'We could not submit your application right now. Please check your connection and try again.', 'error');
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Submit application';
  }
});
updateSchedule();
