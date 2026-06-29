// ── STATE ──
const CASES_KEY = 'medikarya_cases';
const PROFILE_KEY = 'medikarya_profile';

let cases = JSON.parse(localStorage.getItem(CASES_KEY) || '[]');
let currentStep = 1;
const totalSteps = 5;
let currentDetailId = null;
let currentDraftId = null;
let filterStatusVal = '';
let filterSearchVal = '';
let currentView = 'dashboard';

// Migrate data from the old "CliniqCase" key if present, then drop it.
(function migrateLegacyData() {
  if (cases.length === 0) {
    const legacy = localStorage.getItem('cliniqcases');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        if (Array.isArray(parsed) && parsed.length) {
          cases = parsed.map(c => c.status === 'Discharged' ? { ...c, status: 'Completed' } : c);
          localStorage.setItem(CASES_KEY, JSON.stringify(cases));
        }
      } catch (e) {}
      localStorage.removeItem('cliniqcases');
    }
  }
  // Convert any lingering 'Active' cases to 'Completed'
  if (cases.some(c => c.status === 'Active')) {
    cases = cases.map(c => c.status === 'Active' ? { ...c, status: 'Completed' } : c);
    localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  }
})();

// Preload sample data
if (cases.length === 0) {
  cases = [
    {
      id: 'CC-001', date: '2025-06-10', status: 'Completed',
      name: 'Ramesh Kumar Singh', age: '45', gender: 'Male',
      address: 'Meerut, UP', occupation: 'Farmer', religion: 'Hindu',
      admission_date: '2025-06-10', ward: 'Ward 4', contact: '9876543210',
      socio: 'Lower middle', informant: 'Self', informant_rel: 'Self', reliable: 'Reliable',
      chief_complaint: 'High grade fever with chills for 5 days, associated headache',
      hpi: 'Patient was apparently well 5 days back when he developed sudden onset high grade fever (103°F) with chills. Fever is continuous with no diurnal variation. Associated with severe headache, myalgia, and loss of appetite. No rash, no vomiting.',
      past_medical: 'No significant past history', past_surgical: 'Appendectomy in 2015',
      drugs: 'Tab. Paracetamol 500mg SOS. No known drug allergy.', family: 'No similar illness in family',
      diet: 'Non-vegetarian', appetite: 'Decreased', sleep: 'Disturbed', bladder: 'Regular', addiction: 'None',
      menstrual: '',
      appearance: 'Moderately built', consciousness: 'Conscious & oriented',
      picle: 'Pallor',
      temp: '103', pulse: '100', bp_sys: '110', bp_dia: '70', rr: '22', spo2: '97', weight: '62', height: '168',
      cvs: 'S1 S2 heard, no murmur, JVP not raised', rs: 'Bilateral air entry equal, no added sounds', gi: 'Soft abdomen, splenomegaly 3cm below costal margin, non-tender', cns: 'No focal neurological deficit', msk: '', skin: '',
      inv_hb: '9.2', inv_tlc: '3200', inv_plt: '0.8', inv_bsf: '95', inv_bspp: '', inv_hba1c: '',
      inv_creatinine: '1.0', inv_urea: '28', inv_na: '136', inv_k: '3.8', inv_sgot: '45', inv_sgpt: '52',
      inv_urine: 'Albumin trace, no pus cells', inv_imaging: 'USG abdomen: Splenomegaly, mild hepatomegaly',
      inv_other: 'Malarial antigen test: Positive for P. falciparum',
      provisional_dx: 'Falciparum Malaria', diff_dx: '1. Dengue fever\n2. Typhoid fever\n3. Viral hepatitis',
      final_dx: 'Falciparum Malaria (confirmed by RDT and peripheral smear)',
      medications: 'Tab. Artemether-Lumefantrine (AL) 4 tabs BD × 3 days\nSyr. Paracetamol 500mg TDS for fever\nIV fluids: NS 500mL @ 30 drops/min',
      non_pharm: 'Bed rest, adequate hydration, mosquito net', followup: 'Review after 3 days, repeat CBC',
      prognosis: 'Good', notes: 'Classic case of Falciparum Malaria. Note splenomegaly and thrombocytopenia. Monitor for cerebral malaria signs.'
    }
  ];
  saveCases();
}

function saveCases() {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  updateStats();
}

// ── VIEWS ──
const VIEW_TITLES = {
  dashboard: 'Patient Cases',
  form: 'New Patient Case',
  preview: 'Case Summary Preview',
  detail: 'Case Detail',
  profile: 'My Profile'
};

function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');

  const title = document.getElementById('topbar-title');
  if (title) title.textContent = VIEW_TITLES[name] || 'Medikarya Technologies';

  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === name || (name === 'dashboard' && l.dataset.view === 'dashboard'));
  });

  if (name === 'dashboard') renderCasesTable();
  if (name === 'profile') openProfileView();

  toggleSidebar(false);
  window.scrollTo(0, 0);
}

// Used by sidebar / topbar buttons
function navTo(name) {
  if (name === 'dashboard') {
    filterStatusVal = '';
    const filter = document.querySelector('.filter-select');
    if (filter) filter.value = '';
  }
  showView(name);
}

function navToDrafts() {
  filterStatusVal = 'Draft';
  const filter = document.querySelector('.filter-select');
  if (filter) filter.value = 'Draft';
  showView('dashboard');
  document.querySelectorAll('.sidebar-link').forEach(l => {
    l.classList.toggle('active', l.dataset.view === 'drafts');
  });
}

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  const shouldOpen = (open === true) ? true : (open === false ? false : !sidebar.classList.contains('open'));
  sidebar.classList.toggle('open', shouldOpen);
  if (overlay) overlay.classList.toggle('show', shouldOpen);
}

// ── DASHBOARD ──
function updateStats() {
  const total = cases.length;
  const draft = cases.filter(c => c.status === 'Draft').length;
  const completed = cases.filter(c => c.status === 'Completed').length;

  setText('stat-total', total);
  setText('stat-draft', draft);
  setText('stat-completed', completed);
  setText('sidebar-draft-count', draft);

  // Mirror the same numbers on the profile page
  setText('profile-stat-total', total);
  setText('profile-stat-completed', completed);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderCasesTable() {
  updateStats();
  let filtered = cases.filter(c => {
    const haystack = [
      c.name,
      c.id,
      c.final_dx,
      c.provisional_dx,
      c.chief_complaint
    ].join(' ').toLowerCase();
    const matchSearch = !filterSearchVal ||
      haystack.includes(filterSearchVal.toLowerCase());
    const matchStatus = !filterStatusVal || c.status === filterStatusVal;
    return matchSearch && matchStatus;
  });

  const tbody = document.getElementById('cases-tbody');
  const empty = document.getElementById('empty-state');
  const table = document.getElementById('cases-table');

  if (cases.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    setText('empty-state-icon', '📁');
    setText('empty-state-title', 'No cases yet');
    setText('empty-state-text', 'Create your first patient case to get started.');
    empty.style.display = 'block';
    return;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    table.style.display = 'none';
    setText('empty-state-icon', '🔍');
    setText('empty-state-title', 'No matching cases');
    setText('empty-state-text', 'Try a different name, case ID, diagnosis, or status filter.');
    empty.style.display = 'block';
    return;
  }

  table.style.display = '';
  empty.style.display = 'none';

  tbody.innerHTML = filtered.map(c => `
    <tr onclick="viewCase('${c.id}')">
      <td>
        <div class="patient-name">${c.name}</div>
        <div class="patient-id">${c.id}</div>
      </td>
      <td>${c.age}y / ${c.gender}</td>
      <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.chief_complaint || '—'}</td>
      <td>${c.final_dx || c.provisional_dx || '—'}</td>
      <td>${c.date}</td>
      <td><span class="badge badge-${(c.status || '').toLowerCase().replace('-', '')}">${c.status}</span></td>
      <td onclick="event.stopPropagation()">
        <div class="case-actions">
          <button class="btn-secondary" style="padding:5px 10px; font-size:12px;" onclick="viewCase('${c.id}')">View</button>
          ${c.status === 'Draft' ? `<button class="btn-secondary" style="padding:5px 10px; font-size:12px; background:var(--accent); border-color:var(--accent); color:#fff;" onclick="editDraftCase('${c.id}')">✏️ Edit</button>` : ''}
          <button class="btn-danger" style="padding:5px 10px; font-size:12px;" onclick="deleteCase('${c.id}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterCases(val) {
  filterSearchVal = val;
  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) clearBtn.classList.toggle('show', !!val);
  renderCasesTable();
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) input.value = '';
  filterCases('');
}

function filterByStatus(val) {
  filterStatusVal = val;
  renderCasesTable();
}

// ── FORM ──
function startNewCase() {
  currentStep = 1;
  currentDraftId = null;
  resetForm();
  updateStepper();
  showView('form');
}

function editDraftCase(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  currentStep = 1;
  currentDraftId = id;
  resetForm();

  // Populate all form fields from saved draft
  const setVal = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  setVal('f-name', c.name === 'Untitled Draft' ? '' : c.name);
  setVal('f-age', c.age); setVal('f-contact', c.contact); setVal('f-address', c.address);
  setVal('f-occupation', c.occupation); setVal('f-religion', c.religion);
  setVal('f-ward', c.ward); setVal('f-admission-date', c.admission_date);
  setVal('f-informant', c.informant); setVal('f-informant-rel', c.informant_rel);
  setVal('f-chief-complaint', c.chief_complaint); setVal('f-hpi', c.hpi);
  setVal('f-past-medical', c.past_medical); setVal('f-past-surgical', c.past_surgical);
  setVal('f-drugs', c.drugs); setVal('f-family', c.family); setVal('f-menstrual', c.menstrual);
  setVal('v-temp', c.temp); setVal('v-pulse', c.pulse); setVal('v-bp-sys', c.bp_sys);
  setVal('v-bp-dia', c.bp_dia); setVal('v-rr', c.rr); setVal('v-spo2', c.spo2);
  setVal('v-weight', c.weight); setVal('v-height', c.height);
  setVal('f-cvs', c.cvs); setVal('f-rs', c.rs); setVal('f-gi', c.gi);
  setVal('f-cns', c.cns); setVal('f-msk', c.msk); setVal('f-skin', c.skin);
  setVal('inv-hb', c.inv_hb); setVal('inv-tlc', c.inv_tlc); setVal('inv-plt', c.inv_plt);
  setVal('inv-bsf', c.inv_bsf); setVal('inv-bspp', c.inv_bspp); setVal('inv-hba1c', c.inv_hba1c);
  setVal('inv-creatinine', c.inv_creatinine); setVal('inv-urea', c.inv_urea);
  setVal('inv-na', c.inv_na); setVal('inv-k', c.inv_k);
  setVal('inv-sgot', c.inv_sgot); setVal('inv-sgpt', c.inv_sgpt);
  setVal('inv-urine', c.inv_urine); setVal('inv-imaging', c.inv_imaging); setVal('inv-other', c.inv_other);
  setVal('f-provisional-dx', c.provisional_dx); setVal('f-diff-dx', c.diff_dx);
  setVal('f-final-dx', c.final_dx); setVal('f-medications', c.medications);
  setVal('f-non-pharm', c.non_pharm); setVal('f-followup', c.followup); setVal('f-notes', c.notes);

  // Restore hidden radio/checkbox values
  const setHidden = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = val || ''; };
  setHidden('f-gender-val', c.gender); setHidden('f-reliable-val', c.reliable);
  setHidden('f-diet-val', c.diet); setHidden('f-appetite-val', c.appetite);
  setHidden('f-sleep-val', c.sleep); setHidden('f-bladder-val', c.bladder);
  setHidden('f-addiction-val', c.addiction); setHidden('f-picle-val', c.picle);
  setHidden('f-appearance-val', c.appearance); setHidden('f-consciousness-val', c.consciousness);
  setHidden('f-prognosis-val', c.prognosis);

  // Highlight selected radio options visually
  const highlightRadio = (groupId, value) => {
    document.querySelectorAll('#' + groupId + ' .radio-option').forEach(o => {
      const inp = o.querySelector('input');
      if (inp && inp.value === value) o.classList.add('selected');
    });
  };
  highlightRadio('rg-gender', c.gender); highlightRadio('rg-reliable', c.reliable);
  highlightRadio('rg-diet', c.diet); highlightRadio('rg-appetite', c.appetite);
  highlightRadio('rg-sleep', c.sleep); highlightRadio('rg-bladder', c.bladder);
  highlightRadio('rg-appearance', c.appearance); highlightRadio('rg-consciousness', c.consciousness);
  highlightRadio('rg-prognosis', c.prognosis);

  const statusEl = document.getElementById('f-status');
  if (statusEl) statusEl.value = 'Draft';

  updateStepper();
  showView('form');
  showToast('Draft ' + id + ' loaded for editing');
}

function resetForm() {
  const fields = ['f-name','f-age','f-contact','f-address','f-occupation','f-religion','f-ward',
    'f-informant','f-informant-rel','f-chief-complaint','f-hpi','f-past-medical','f-past-surgical',
    'f-drugs','f-family','f-menstrual','f-cvs','f-rs','f-gi','f-cns','f-msk','f-skin',
    'inv-hb','inv-tlc','inv-plt','inv-bsf','inv-bspp','inv-hba1c','inv-creatinine','inv-urea',
    'inv-na','inv-k','inv-sgot','inv-sgpt','inv-urine','inv-imaging','inv-other',
    'f-provisional-dx','f-diff-dx','f-final-dx','f-medications','f-non-pharm','f-followup','f-notes',
    'v-temp','v-pulse','v-bp-sys','v-bp-dia','v-rr','v-spo2','v-weight','v-height'
  ];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const hidden = ['f-gender-val','f-reliable-val','f-diet-val','f-appetite-val','f-sleep-val',
    'f-bladder-val','f-addiction-val','f-picle-val','f-appearance-val','f-consciousness-val','f-prognosis-val'];
  hidden.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.checkbox-option').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.toggle-switch').forEach(sw => sw.classList.remove('on'));
  document.querySelectorAll('.system-detail').forEach(d => d.classList.remove('visible'));
  const admDate = document.getElementById('f-admission-date');
  if (admDate) admDate.value = new Date().toISOString().split('T')[0];
  const status = document.getElementById('f-status');
  if (status) status.value = 'Completed';
}

function updateStepper() {
  for (let i = 1; i <= totalSteps; i++) {
    const ind = document.getElementById('step-ind-' + i);
    ind.classList.remove('active', 'done');
    if (i < currentStep) ind.classList.add('done');
    if (i === currentStep) ind.classList.add('active');
    if (i < totalSteps) {
      const line = document.getElementById('line-' + i);
      if (i < currentStep) line.classList.add('done');
      else line.classList.remove('done');
    }
  }
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + currentStep).classList.add('active');
  document.getElementById('step-indicator').textContent = `Step ${currentStep} of ${totalSteps}`;

  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnPreview = document.getElementById('btn-preview');

  btnPrev.style.display = currentStep > 1 ? 'inline-flex' : 'none';
  if (currentStep === totalSteps) {
    btnNext.style.display = 'none';
    btnPreview.style.display = 'inline-flex';
  } else {
    btnNext.style.display = 'inline-flex';
    btnPreview.style.display = 'none';
  }
}

function nextStep() {
  if (currentStep === 1 && !document.getElementById('f-name').value.trim()) {
    showToast('⚠️ Patient name is required', true); return;
  }
  if (currentStep === 1 && !document.getElementById('f-gender-val').value) {
    showToast('⚠️ Please select gender', true); return;
  }
  if (currentStep === 2 && !document.getElementById('f-chief-complaint').value.trim()) {
    showToast('⚠️ Chief complaint is required', true); return;
  }
  if (currentStep < totalSteps) { currentStep++; updateStepper(); window.scrollTo(0,0); }
}

function prevStep() {
  if (currentStep > 1) { currentStep--; updateStepper(); window.scrollTo(0,0); }
}

function confirmBack() {
  if (confirm('Go back to dashboard? Unsaved data will be lost.')) showView('dashboard');
}

// Radio / checkbox helpers
function selectRadio(groupId, el, hiddenId, value) {
  document.querySelectorAll('#' + groupId + ' .radio-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById(hiddenId).value = value;
}

function toggleCheckbox(el, hiddenId) {
  el.classList.toggle('selected');
  const group = el.closest('.checkbox-group');
  const selected = Array.from(group.querySelectorAll('.checkbox-option.selected'))
    .map(o => o.textContent.trim());
  document.getElementById(hiddenId).value = selected.join(', ');
}

function toggleSystem(sysId) {
  const detail = document.getElementById(sysId);
  const tog = document.getElementById('tog-' + sysId);
  const isVisible = detail.classList.contains('visible');
  detail.classList.toggle('visible');
  tog.classList.toggle('on');
}

// ── PREVIEW ──
function gv(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.value ? el.value.trim() : '';
}

function showPreview() {
  if (!gv('f-provisional-dx')) {
    showToast('⚠️ Please enter provisional diagnosis', true); return;
  }
  buildPreview();
  showView('preview');
}

function buildPreview() {
  const pv = (id) => gv(id) || '<span class="empty">Not recorded</span>';
  const pvText = (id) => {
    const v = gv(id);
    return v
      ? `<div class="preview-text-block">${v.replace(/\n/g,'<br>')}</div>`
      : `<div class="preview-text-block empty">Not recorded</div>`;
  };

  const html = `
    <div class="preview-header">
      <div>
        <div class="preview-patient-name">${gv('f-name') || 'Unknown Patient'}</div>
        <div class="preview-patient-meta">${gv('f-age')} years | ${gv('f-gender-val')} | Admitted: ${gv('f-admission-date')} | Ward: ${gv('f-ward')}</div>
      </div>
      <div class="preview-case-id">DRAFT CASE</div>
    </div>
    <div class="preview-body">

      <div class="preview-section">
        <div class="preview-section-title">👤 Demographics</div>
        <div class="preview-grid">
          ${pField('Name', gv('f-name'))}
          ${pField('Age', gv('f-age') + ' years')}
          ${pField('Gender', gv('f-gender-val'))}
          ${pField('Occupation', gv('f-occupation'))}
          ${pField('Address', gv('f-address'))}
          ${pField('Contact', gv('f-contact'))}
          ${pField('Socioeconomic Status', gv('f-socio'))}
          ${pField('Informant', gv('f-informant') + (gv('f-informant-rel') ? ' (' + gv('f-informant-rel') + ')' : ''))}
          ${pField('History Reliability', gv('f-reliable-val'))}
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-section-title">📋 Chief Complaint</div>
        ${pvText('f-chief-complaint')}
      </div>

      <div class="preview-section">
        <div class="preview-section-title">📖 History of Present Illness</div>
        ${pvText('f-hpi')}
      </div>

      <div class="preview-section">
        <div class="preview-section-title">⏳ Past History</div>
        <div class="preview-grid">
          <div class="preview-field" style="grid-column:1/-1;">
            <div class="preview-field-label">Past Medical</div>
            <div class="preview-field-value">${gv('f-past-medical') || '<span class="empty">Not recorded</span>'}</div>
          </div>
          <div class="preview-field" style="grid-column:1/-1;">
            <div class="preview-field-label">Past Surgical</div>
            <div class="preview-field-value">${gv('f-past-surgical') || '<span class="empty">Not recorded</span>'}</div>
          </div>
          <div class="preview-field" style="grid-column:1/-1;">
            <div class="preview-field-label">Drug & Allergy History</div>
            <div class="preview-field-value">${gv('f-drugs') || '<span class="empty">Not recorded</span>'}</div>
          </div>
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-section-title">🔄 Personal & Social History</div>
        <div class="preview-grid">
          ${pField('Diet', gv('f-diet-val'))}
          ${pField('Appetite', gv('f-appetite-val'))}
          ${pField('Sleep', gv('f-sleep-val'))}
          ${pField('Bladder & Bowel', gv('f-bladder-val'))}
          ${pField('Addictions', gv('f-addiction-val'))}
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-section-title">❤️ Vital Signs</div>
        <div class="vitals-preview-grid">
          ${vpField('Temp', gv('v-temp'), '°F')}
          ${vpField('Pulse', gv('v-pulse'), 'bpm')}
          ${vpField('BP', (gv('v-bp-sys') && gv('v-bp-dia')) ? gv('v-bp-sys') + '/' + gv('v-bp-dia') : '', 'mmHg')}
          ${vpField('RR', gv('v-rr'), '/min')}
          ${vpField('SpO2', gv('v-spo2'), '%')}
          ${vpField('Weight', gv('v-weight'), 'kg')}
          ${vpField('Height', gv('v-height'), 'cm')}
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-section-title">🩺 General Examination</div>
        <div class="preview-grid">
          ${pField('Appearance', gv('f-appearance-val'))}
          ${pField('Consciousness', gv('f-consciousness-val'))}
          ${pField('PICLE', gv('f-picle-val'))}
        </div>
      </div>

      ${buildSystemsPreview()}

      <div class="preview-section">
        <div class="preview-section-title">🔬 Key Investigations</div>
        <div class="preview-grid">
          ${pField('Hb', gv('inv-hb') + (gv('inv-hb') ? ' g/dL' : ''))}
          ${pField('TLC', gv('inv-tlc'))}
          ${pField('Platelets', gv('inv-plt'))}
          ${pField('BS Fasting', gv('inv-bsf') + (gv('inv-bsf') ? ' mg/dL' : ''))}
          ${pField('HbA1c', gv('inv-hba1c') + (gv('inv-hba1c') ? '%' : ''))}
          ${pField('Creatinine', gv('inv-creatinine') + (gv('inv-creatinine') ? ' mg/dL' : ''))}
          ${pField('SGOT/SGPT', (gv('inv-sgot') && gv('inv-sgpt')) ? gv('inv-sgot') + ' / ' + gv('inv-sgpt') : '')}
          ${pField('Na+ / K+', (gv('inv-na') && gv('inv-k')) ? gv('inv-na') + ' / ' + gv('inv-k') : '')}
        </div>
        ${gv('inv-imaging') ? `<div style="margin-top:10px;"><div class="preview-field-label" style="margin-bottom:4px; font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px;">Imaging</div>${pvText('inv-imaging')}</div>` : ''}
      </div>

      <div class="preview-section">
        <div class="preview-section-title">🏷️ Diagnosis</div>
        <div style="margin-bottom:8px;">
          <div class="preview-field-label" style="font-size:12px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Provisional Diagnosis</div>
          ${pvText('f-provisional-dx')}
        </div>
        ${gv('f-diff-dx') ? `<div style="margin-bottom:8px;"><div class="preview-field-label" style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Differential Diagnoses</div>${pvText('f-diff-dx')}</div>` : ''}
        ${gv('f-final-dx') ? `<div><div class="preview-field-label" style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Final Diagnosis</div>${pvText('f-final-dx')}</div>` : ''}
      </div>

      <div class="preview-section">
        <div class="preview-section-title">💊 Treatment Plan</div>
        ${pvText('f-medications')}
        ${gv('f-non-pharm') ? `<div style="margin-top:8px;"><div class="preview-field-label" style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">Non-pharmacological</div>${pvText('f-non-pharm')}</div>` : ''}
        <div class="preview-grid" style="margin-top:10px;">
          ${pField('Prognosis', gv('f-prognosis-val'))}
          ${pField('Status', gv('f-status') ? document.getElementById('f-status').options[document.getElementById('f-status').selectedIndex].text : '')}
        </div>
      </div>

      ${gv('f-notes') ? `<div class="preview-section"><div class="preview-section-title">📝 Student Notes</div>${pvText('f-notes')}</div>` : ''}

    </div>
  `;
  document.getElementById('preview-content').innerHTML = html;
}

function pField(label, value) {
  const isEmpty = !value || value.trim() === '' || value.includes('undefined') || value.trim() === 'years' || value.trim() === 'g/dL' || value.trim() === '%' || value.trim() === 'mg/dL';
  return `<div class="preview-field">
    <div class="preview-field-label">${label}</div>
    <div class="preview-field-value ${isEmpty ? 'empty' : ''}">${isEmpty ? 'Not recorded' : value}</div>
  </div>`;
}

function vpField(label, value, unit) {
  return `<div class="vital-preview-item">
    <div class="vital-preview-label">${label}</div>
    <div class="vital-preview-value">${value || '—'}</div>
    <div class="vital-preview-unit">${unit}</div>
  </div>`;
}

function buildSystemsPreview() {
  const systems = [
    {label:'CVS', id:'f-cvs'}, {label:'RS', id:'f-rs'}, {label:'GI', id:'f-gi'},
    {label:'CNS', id:'f-cns'}, {label:'Musculoskeletal', id:'f-msk'}, {label:'Skin', id:'f-skin'}
  ];
  const filled = systems.filter(s => gv(s.id));
  if (!filled.length) return '';
  return `<div class="preview-section">
    <div class="preview-section-title">🔍 Systemic Examination</div>
    ${filled.map(s => `
      <div style="margin-bottom:8px;">
        <div class="preview-field-label" style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.4px; margin-bottom:4px;">${s.label}</div>
        <div class="preview-text-block">${gv(s.id).replace(/\n/g,'<br>')}</div>
      </div>
    `).join('')}
  </div>`;
}

// ── SUBMIT ──
function nextCaseId() {
  let n = cases.length + 1;
  let id = 'CC-' + String(n).padStart(3, '0');
  while (cases.some(c => c.id === id)) {
    n++;
    id = 'CC-' + String(n).padStart(3, '0');
  }
  return id;
}

function buildCaseFromForm(id, statusOverride) {
  return {
    id, date: new Date().toISOString().split('T')[0],
    status: statusOverride || document.getElementById('f-status').value,
    name: gv('f-name'), age: gv('f-age'), gender: gv('f-gender-val'),
    address: gv('f-address'), occupation: gv('f-occupation'), religion: gv('f-religion'),
    admission_date: gv('f-admission-date'), ward: gv('f-ward'), contact: gv('f-contact'),
    socio: gv('f-socio'), informant: gv('f-informant'), informant_rel: gv('f-informant-rel'),
    reliable: gv('f-reliable-val'), chief_complaint: gv('f-chief-complaint'),
    hpi: gv('f-hpi'), past_medical: gv('f-past-medical'), past_surgical: gv('f-past-surgical'),
    drugs: gv('f-drugs'), family: gv('f-family'),
    diet: gv('f-diet-val'), appetite: gv('f-appetite-val'), sleep: gv('f-sleep-val'),
    bladder: gv('f-bladder-val'), addiction: gv('f-addiction-val'), menstrual: gv('f-menstrual'),
    appearance: gv('f-appearance-val'), consciousness: gv('f-consciousness-val'), picle: gv('f-picle-val'),
    temp: gv('v-temp'), pulse: gv('v-pulse'), bp_sys: gv('v-bp-sys'), bp_dia: gv('v-bp-dia'),
    rr: gv('v-rr'), spo2: gv('v-spo2'), weight: gv('v-weight'), height: gv('v-height'),
    cvs: gv('f-cvs'), rs: gv('f-rs'), gi: gv('f-gi'), cns: gv('f-cns'), msk: gv('f-msk'), skin: gv('f-skin'),
    inv_hb: gv('inv-hb'), inv_tlc: gv('inv-tlc'), inv_plt: gv('inv-plt'), inv_bsf: gv('inv-bsf'),
    inv_bspp: gv('inv-bspp'), inv_hba1c: gv('inv-hba1c'), inv_creatinine: gv('inv-creatinine'),
    inv_urea: gv('inv-urea'), inv_na: gv('inv-na'), inv_k: gv('inv-k'),
    inv_sgot: gv('inv-sgot'), inv_sgpt: gv('inv-sgpt'), inv_urine: gv('inv-urine'),
    inv_imaging: gv('inv-imaging'), inv_other: gv('inv-other'),
    provisional_dx: gv('f-provisional-dx'), diff_dx: gv('f-diff-dx'), final_dx: gv('f-final-dx'),
    medications: gv('f-medications'), non_pharm: gv('f-non-pharm'), followup: gv('f-followup'),
    prognosis: gv('f-prognosis-val'), notes: gv('f-notes')
  };
}

function hasAnyCaseInput() {
  const fields = [
    'f-name','f-age','f-contact','f-address','f-occupation','f-religion','f-ward',
    'f-informant','f-informant-rel','f-chief-complaint','f-hpi','f-past-medical','f-past-surgical',
    'f-drugs','f-family','f-menstrual','f-cvs','f-rs','f-gi','f-cns','f-msk','f-skin',
    'f-provisional-dx','f-diff-dx','f-final-dx','f-medications','f-non-pharm','f-followup','f-notes',
    'f-gender-val','f-reliable-val','f-diet-val','f-appetite-val','f-sleep-val','f-prognosis-val'
  ];
  return fields.some(id => gv(id));
}

function saveDraftCase(goDashboard = false) {
  if (!hasAnyCaseInput()) {
    showToast('Add at least one detail before saving draft', true);
    return;
  }
  const id = currentDraftId || nextCaseId();
  const draftCase = buildCaseFromForm(id, 'Draft');
  draftCase.name = draftCase.name || 'Untitled Draft';

  const existingIndex = cases.findIndex(c => c.id === id);
  if (existingIndex >= 0) cases[existingIndex] = draftCase;
  else cases.push(draftCase);

  currentDraftId = id;
  saveCases();
  showToast('Draft saved: ' + id);
  if (goDashboard) {
    filterStatusVal = 'Draft';
    const filter = document.querySelector('.filter-select');
    if (filter) filter.value = 'Draft';
    showView('dashboard');
  }
}

function submitCase() {
  const submitId = currentDraftId || nextCaseId();
  const submittedCase = buildCaseFromForm(submitId);
  submittedCase.name = submittedCase.name || 'Untitled Case';
  if (submittedCase.status === 'Draft' || submittedCase.status === 'Active') submittedCase.status = 'Completed';

  const existingIndex = cases.findIndex(c => c.id === submitId);
  if (existingIndex >= 0) cases[existingIndex] = submittedCase;
  else cases.push(submittedCase);

  currentDraftId = null;
  saveCases();
  showToast('Case ' + submitId + ' submitted successfully!');
  showView('dashboard');
  return;

  const id = 'CC-' + String(cases.length + 1).padStart('3','0');
  const newCase = {
    id, date: new Date().toISOString().split('T')[0],
    status: document.getElementById('f-status').value,
    name: gv('f-name'), age: gv('f-age'), gender: gv('f-gender-val'),
    address: gv('f-address'), occupation: gv('f-occupation'), religion: gv('f-religion'),
    admission_date: gv('f-admission-date'), ward: gv('f-ward'), contact: gv('f-contact'),
    socio: gv('f-socio'), informant: gv('f-informant'), informant_rel: gv('f-informant-rel'),
    reliable: gv('f-reliable-val'), chief_complaint: gv('f-chief-complaint'),
    hpi: gv('f-hpi'), past_medical: gv('f-past-medical'), past_surgical: gv('f-past-surgical'),
    drugs: gv('f-drugs'), family: gv('f-family'),
    diet: gv('f-diet-val'), appetite: gv('f-appetite-val'), sleep: gv('f-sleep-val'),
    bladder: gv('f-bladder-val'), addiction: gv('f-addiction-val'), menstrual: gv('f-menstrual'),
    appearance: gv('f-appearance-val'), consciousness: gv('f-consciousness-val'), picle: gv('f-picle-val'),
    temp: gv('v-temp'), pulse: gv('v-pulse'), bp_sys: gv('v-bp-sys'), bp_dia: gv('v-bp-dia'),
    rr: gv('v-rr'), spo2: gv('v-spo2'), weight: gv('v-weight'), height: gv('v-height'),
    cvs: gv('f-cvs'), rs: gv('f-rs'), gi: gv('f-gi'), cns: gv('f-cns'), msk: gv('f-msk'), skin: gv('f-skin'),
    inv_hb: gv('inv-hb'), inv_tlc: gv('inv-tlc'), inv_plt: gv('inv-plt'), inv_bsf: gv('inv-bsf'),
    inv_bspp: gv('inv-bspp'), inv_hba1c: gv('inv-hba1c'), inv_creatinine: gv('inv-creatinine'),
    inv_urea: gv('inv-urea'), inv_na: gv('inv-na'), inv_k: gv('inv-k'),
    inv_sgot: gv('inv-sgot'), inv_sgpt: gv('inv-sgpt'), inv_urine: gv('inv-urine'),
    inv_imaging: gv('inv-imaging'), inv_other: gv('inv-other'),
    provisional_dx: gv('f-provisional-dx'), diff_dx: gv('f-diff-dx'), final_dx: gv('f-final-dx'),
    medications: gv('f-medications'), non_pharm: gv('f-non-pharm'), followup: gv('f-followup'),
    prognosis: gv('f-prognosis-val'), notes: gv('f-notes')
  };
  cases.push(newCase);
  saveCases();
  showToast('✅ Case ' + id + ' submitted successfully!');
  showView('dashboard');
}

// ── CASE DETAIL ──
function viewCase(id) {
  const c = cases.find(x => x.id === id);
  if (!c) return;
  currentDetailId = id;
  document.getElementById('detail-patient-name').textContent = c.name;
  document.getElementById('detail-patient-meta').textContent = `${c.age}y | ${c.gender} | ${c.id} | ${c.date}`;

  // Overview tab
  document.getElementById('detail-overview-content').innerHTML = `
    <div class="info-card">
      <div class="info-card-title">Patient Details</div>
      <div class="preview-grid">
        ${dpf('Name', c.name)} ${dpf('Age', c.age + ' years')} ${dpf('Gender', c.gender)}
        ${dpf('Ward', c.ward)} ${dpf('Admitted', c.admission_date)} ${dpf('Status', `<span class="badge badge-${(c.status||'').toLowerCase().replace('-','')}">${c.status}</span>`)}
        ${dpf('Occupation', c.occupation)} ${dpf('Address', c.address)} ${dpf('Contact', c.contact)}
      </div>
    </div>
    <div class="info-card">
      <div class="info-card-title">Chief Complaint</div>
      <div style="font-size:15px; line-height:1.7; color:var(--text);">${(c.chief_complaint||'Not recorded').replace(/\n/g,'<br>')}</div>
    </div>
    <div class="info-card">
      <div class="info-card-title">Diagnosis</div>
      <div style="margin-bottom:8px;"><span style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Provisional</span><p style="margin-top:4px;">${c.provisional_dx||'—'}</p></div>
      ${c.final_dx ? `<div><span style="font-size:12px; font-weight:700; color:var(--primary); text-transform:uppercase;">Final</span><p style="margin-top:4px; font-weight:600; color:var(--primary);">${c.final_dx}</p></div>` : ''}
    </div>
    <div class="info-card">
      <div class="info-card-title">Vital Signs</div>
      <div class="vitals-preview-grid">
        ${vpField('Temp', c.temp,'°F')} ${vpField('Pulse', c.pulse,'bpm')}
        ${vpField('BP', (c.bp_sys&&c.bp_dia)?c.bp_sys+'/'+c.bp_dia:'','mmHg')}
        ${vpField('RR', c.rr,'/min')} ${vpField('SpO2', c.spo2,'%')}
        ${vpField('Weight', c.weight,'kg')} ${vpField('Height', c.height,'cm')}
      </div>
    </div>
  `;

  // History tab
  document.getElementById('detail-history-content').innerHTML = `
    <div class="info-card">
      <div class="info-card-title">History of Present Illness</div>
      <p style="line-height:1.8;">${(c.hpi||'Not recorded').replace(/\n/g,'<br>')}</p>
    </div>
    <div class="info-card">
      <div class="info-card-title">Past History</div>
      <b style="font-size:13px; color:var(--text-muted);">Medical:</b> <p>${c.past_medical||'—'}</p>
      <b style="font-size:13px; color:var(--text-muted); margin-top:8px; display:block;">Surgical:</b> <p>${c.past_surgical||'—'}</p>
      <b style="font-size:13px; color:var(--text-muted); margin-top:8px; display:block;">Drugs & Allergies:</b> <p>${c.drugs||'—'}</p>
      <b style="font-size:13px; color:var(--text-muted); margin-top:8px; display:block;">Family:</b> <p>${c.family||'—'}</p>
    </div>
    <div class="info-card">
      <div class="info-card-title">Personal History</div>
      <div class="preview-grid">
        ${dpf('Diet', c.diet)} ${dpf('Appetite', c.appetite)} ${dpf('Sleep', c.sleep)}
        ${dpf('Bladder/Bowel', c.bladder)} ${dpf('Addictions', c.addiction)}
      </div>
    </div>
  `;

  // Exam tab
  const systems = [{l:'CVS', v:c.cvs},{l:'RS', v:c.rs},{l:'GI', v:c.gi},{l:'CNS', v:c.cns},{l:'Musculoskeletal', v:c.msk},{l:'Skin', v:c.skin}];
  document.getElementById('detail-exam-content').innerHTML = `
    <div class="info-card">
      <div class="info-card-title">General Examination</div>
      <div class="preview-grid">
        ${dpf('Appearance', c.appearance)} ${dpf('Consciousness', c.consciousness)} ${dpf('PICLE', c.picle)}
      </div>
    </div>
    ${systems.filter(s=>s.v).map(s=>`
      <div class="info-card">
        <div class="info-card-title">${s.l}</div>
        <p style="line-height:1.8;">${s.v.replace(/\n/g,'<br>')}</p>
      </div>
    `).join('')}
  `;

  // Investigations tab
  document.getElementById('detail-investigations-content').innerHTML = `
    <div class="info-card">
      <div class="info-card-title">Blood Reports</div>
      <div class="preview-grid">
        ${dpf('Hb', c.inv_hb + (c.inv_hb?' g/dL':''))} ${dpf('TLC', c.inv_tlc)} ${dpf('Platelets', c.inv_plt)}
        ${dpf('BS Fasting', c.inv_bsf + (c.inv_bsf?' mg/dL':''))} ${dpf('HbA1c', c.inv_hba1c + (c.inv_hba1c?'%':''))}
        ${dpf('Creatinine', c.inv_creatinine + (c.inv_creatinine?' mg/dL':''))} ${dpf('Urea', c.inv_urea + (c.inv_urea?' mg/dL':''))}
        ${dpf('Na+', c.inv_na + (c.inv_na?' mEq/L':''))} ${dpf('K+', c.inv_k + (c.inv_k?' mEq/L':''))}
        ${dpf('SGOT', c.inv_sgot + (c.inv_sgot?' U/L':''))} ${dpf('SGPT', c.inv_sgpt + (c.inv_sgpt?' U/L':''))}
      </div>
    </div>
    ${c.inv_urine ? `<div class="info-card"><div class="info-card-title">Urine Examination</div><p>${c.inv_urine}</p></div>` : ''}
    ${c.inv_imaging ? `<div class="info-card"><div class="info-card-title">Imaging</div><p style="line-height:1.8;">${c.inv_imaging.replace(/\n/g,'<br>')}</p></div>` : ''}
    ${c.inv_other ? `<div class="info-card"><div class="info-card-title">Other Investigations</div><p style="line-height:1.8;">${c.inv_other.replace(/\n/g,'<br>')}</p></div>` : ''}
  `;

  // Diagnosis tab
  document.getElementById('detail-diagnosis-content').innerHTML = `
    <div class="info-card">
      <div class="info-card-title">Diagnosis</div>
      ${c.provisional_dx ? `<div style="margin-bottom:12px;"><div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Provisional</div><p style="font-size:15px;">${c.provisional_dx.replace(/\n/g,'<br>')}</p></div>` : ''}
      ${c.diff_dx ? `<div style="margin-bottom:12px;"><div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px;">Differentials</div><p>${c.diff_dx.replace(/\n/g,'<br>')}</p></div>` : ''}
      ${c.final_dx ? `<div><div style="font-size:12px; font-weight:700; color:var(--primary); text-transform:uppercase; margin-bottom:4px;">Final Diagnosis</div><p style="font-size:16px; font-weight:700; color:var(--primary);">${c.final_dx}</p></div>` : ''}
    </div>
    ${c.medications ? `<div class="info-card"><div class="info-card-title">Medications</div><p style="line-height:1.9; font-family:monospace; font-size:14px;">${c.medications.replace(/\n/g,'<br>')}</p></div>` : ''}
    ${c.non_pharm ? `<div class="info-card"><div class="info-card-title">Non-pharmacological</div><p>${c.non_pharm}</p></div>` : ''}
    ${c.followup ? `<div class="info-card"><div class="info-card-title">Follow-up Plan</div><p>${c.followup}</p></div>` : ''}
    <div class="info-card">
      <div class="info-card-title">Summary</div>
      <div class="preview-grid">
        ${dpf('Prognosis', c.prognosis)} ${dpf('Status', `<span class="badge badge-${(c.status||'').toLowerCase().replace('-','')}">${c.status}</span>`)}
      </div>
    </div>
    ${c.notes ? `<div class="info-card" style="border-left: 3px solid var(--accent);"><div class="info-card-title">📝 Student Notes</div><p style="line-height:1.8;">${c.notes.replace(/\n/g,'<br>')}</p></div>` : ''}
  `;

  // Reset tabs
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab-btn').classList.add('active');
  document.getElementById('tab-overview').classList.add('active');

  showView('detail');
}

function dpf(label, value) {
  const empty = !value || value === '' || value === '—' || value === 'years' || value === 'g/dL' || value === '%' || value === 'mg/dL';
  return `<div class="preview-field">
    <div class="preview-field-label">${label}</div>
    <div class="preview-field-value ${empty && !value?.includes('badge') ? 'empty' : ''}">${(empty && !value?.includes('badge')) ? 'Not recorded' : (value||'—')}</div>
  </div>`;
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

function deleteCase(id) {
  if (!confirm('Delete this case? This cannot be undone.')) return;
  cases = cases.filter(c => c.id !== id);
  saveCases();
  renderCasesTable();
  showToast('🗑 Case deleted');
}

function deleteCurrentCase() {
  if (!confirm('Delete this case? This cannot be undone.')) return;
  cases = cases.filter(c => c.id !== currentDetailId);
  saveCases();
  showToast('🗑 Case deleted');
  showView('dashboard');
}

function printCase() { window.print(); }

// ── PROFILE ──
function defaultProfile() {
  return { name: '', email: '', contact: '', college: '' };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile();
    return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch (e) {
    return defaultProfile();
  }
}

function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function initialsFromName(name) {
  if (!name || !name.trim()) return 'ST';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || 'ST';
}

// Push the saved profile into the sidebar mini-card and the topbar
function renderProfileWidgets() {
  const profile = loadProfile();
  const displayName = profile.name || 'Student';
  const initials = initialsFromName(profile.name);

  setText('sidebar-profile-name', displayName);
  setText('sidebar-profile-email', profile.email || 'Add your profile');
  setText('topbar-profile-name', displayName);
  setText('topbar-profile-role', profile.college || 'My Profile');
  setText('sidebar-avatar', initials);
  setText('topbar-avatar', initials);
  setText('profile-avatar-lg', initials);
}

// Populate the profile form fields when entering the Profile view
function openProfileView() {
  const profile = loadProfile();
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setVal('profile-name', profile.name);
  setVal('profile-email', profile.email);
  setVal('profile-contact', profile.contact);
  setVal('profile-college', profile.college);
  setText('profile-avatar-lg', initialsFromName(profile.name));
  updateStats();
}

// Live-update the avatar initials as the student types their name/email
function livePreviewProfile() {
  const name = document.getElementById('profile-name')?.value || '';
  setText('profile-avatar-lg', initialsFromName(name));
}

function saveProfileForm() {
  const getVal = id => document.getElementById(id)?.value.trim() || '';
  const name = getVal('profile-name');
  const email = getVal('profile-email');

  if (!name) {
    showToast('⚠️ Please enter your name', true);
    return;
  }
  if (!email) {
    showToast('⚠️ Please enter your email address', true);
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('⚠️ Please enter a valid email address', true);
    return;
  }

  const profile = { name, email, contact: getVal('profile-contact'), college: getVal('profile-college') };
  saveProfile(profile);
  renderProfileWidgets();
  showToast('✅ Profile saved');
}

// ── TOAST ──
function showToast(msg, isError) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? '#c0392b' : 'var(--primary)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── INIT ──
renderProfileWidgets();
renderCasesTable();