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
  if (message) field.setAttribute('aria-invalid', 'true');
  else field.removeAttribute('aria-invalid');
}
function validate() {
  let valid = true;
  form.querySelectorAll('[required]').forEach(field => {
    if (field.type === 'checkbox' ? !field.checked : !field.value.trim()) {
      setError(field, 'This field is required.'); valid = false;
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
      setError(field, 'Enter a valid email address.'); valid = false;
    } else if (field.name === 'about' && field.value.trim().length < 30) {
      setError(field, 'Please write at least 30 characters.'); valid = false;
    } else setError(field, '');
  });
  if (!criteriaInputs.some(i => i.checked)) { criteriaError.textContent = 'Select WAEC, JAMB, or both.'; valid = false; }
  if (!document.querySelector('input[name="agreement"]').checked) agreementError.textContent = 'Please confirm the information is accurate.';
  else agreementError.textContent = '';
  return valid;
}
form.querySelectorAll('input,select,textarea').forEach(field => field.addEventListener('input', () => setError(field, '')));

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!validate()) {
    const first = form.querySelector('[aria-invalid="true"]') || criteriaInputs.find(i => !i.checked) || document.querySelector('input[name="agreement"]');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const criteria = criteriaInputs.filter(i => i.checked).map(i => i.value);
  const application = Object.fromEntries(new FormData(form).entries());
  application.criteria = criteria;
  application.teachingWindow = getSchedule();
  application.submittedAt = new Date().toISOString();

  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Submitting…';
  try {
    // Safe demo persistence until a Supabase endpoint is connected.
    const existing = JSON.parse(localStorage.getItem('pinnacleTutorApplications') || '[]');
    existing.push(application);
    localStorage.setItem('pinnacleTutorApplications', JSON.stringify(existing));
    form.outerHTML = `<div class="success"><div style="font-size:42px">✓</div><h3>Application received</h3><p>Thank you, ${application.fullName}. Your tutor application has been recorded successfully. We’ll contact you using the details you provided.</p></div>`;
    document.getElementById('application').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Submit application';
    alert('We could not save your application. Please try again.');
  }
});
updateSchedule();
