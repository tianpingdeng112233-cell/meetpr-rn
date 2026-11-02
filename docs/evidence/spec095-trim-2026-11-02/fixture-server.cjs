// Synthetic, local-only data. No real credentials or production calls.
// node docs/evidence/spec095-trim-2026-11-02/fixture-server.cjs
const http = require('node:http');
const studentId = '09500000-0000-4000-8000-000000000001';
const coachId = '09500000-0000-4000-8000-000000000002';
const requestId = '09500000-0000-4000-8000-000000000003';
const date = '2026-11-02T00:00:00Z';
const required = ['unit_preference', 'gender', 'birth_date', 'height_cm', 'weight_kg', 'training_years', 'squat_stance', 'deadlift_style', 'squat_1rm_kg', 'bench_1rm_kg', 'deadlift_1rm_kg', 'is_competing'];
const removed = ['training_days', 'gym_tier', 'equipment_overrides', 'daily_life_intensity', 'life_stress', 'recovery_speed', 'sleep_hours', 'muscle_groups_to_strengthen'];
const history = { training_days: ['mon', 'wed'], gym_tier: 'professional', equipment_overrides: ['barbell_dumbbell', 'heavy_dumbbells'], daily_life_intensity: 2, life_stress: 3, recovery_speed: 4, sleep_hours: 3, muscle_groups_to_strengthen: ['quad'] };
function emptyProfile() {
  return { ...Object.fromEntries([...required, ...removed, 'bench_grip', 'injury_notes', 'injury_areas', 'competition_date', 'target_weight_class', 'note_to_coach', 'completed_at'].map(key => [key, null])), user_id: studentId, created_at: date, updated_at: date, upload_attachment_ids: [] };
}
function filledProfile() {
  return { ...emptyProfile(), unit_preference: 'kg', gender: 'male', birth_date: '2000-01-01', height_cm: '180', weight_kg: '80', training_years: 3, squat_stance: 'high_bar', deadlift_style: 'conventional', squat_1rm_kg: '180', bench_1rm_kg: '100', deadlift_1rm_kg: '220', is_competing: false };
}
function completion(profile) {
  const missing = required.filter(key => profile[key] == null);
  if (profile.is_competing && !profile.competition_date) missing.push('competition_date');
  return missing.length ? { status: 422, body: { error: 'ONBOARDING_INCOMPLETE', missing_fields: missing } } : { status: 200, body: { ...profile, completed_at: profile.completed_at ?? date } };
}
function createFixture() {
  let profile = emptyProfile();
  let request = null;
  let coachName = '王磊';
  const patches = [];
  const binding = (status = 'pending') => ({ id: requestId, student_id: studentId, coach_id: coachId, coach_display_name: coachName, display_name: 'Fixture student', invite_code_id: null, skip_evaluation: true, skip_reason: null, status, submitted_at: date, responded_at: status === 'accepted' ? date : null, expired_at: '2026-11-09T00:00:00Z', first_run: status === 'accepted' ? { binding_plan_count: 1, has_settled_day: true, first_plan: null } : null });
  return async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const input = raw ? JSON.parse(raw) : {};
    const path = req.url.split('?')[0];
    const send = (body, status = 200) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (path === '/fixture/reset') {
      coachName = Object.hasOwn(input, 'coachName') ? input.coachName : '王磊';
      profile = input.mode === 'new' ? emptyProfile() : { ...filledProfile(), ...history, completed_at: input.mode === 'legacy-draft' ? null : date };
      request = input.mode === 'veteran' ? binding('accepted') : input.mode === 'pending' ? binding() : null;
      patches.length = 0; return send({ profile, request });
    }
    if (path === '/fixture/state') return send({ profile, request, patches });
    if (path === '/auth/email/login') return send({ user: { id: studentId, email: 'fixture@example.test', phone: null, role: 'coached_student', created_at: date }, access_token: 'local-fixture', refresh_token: 'local-fixture' });
    if (path === '/auth/refresh') return send({ access_token: 'local-fixture', refresh_token: 'local-fixture' });
    if (path === '/students/me/onboarding/complete') { const result = completion(profile); if (result.status === 200) profile = result.body; return send(result.body, result.status); }
    if (path.endsWith('/onboarding')) {
      if (req.method === 'PUT' || req.method === 'PATCH') { patches.push(input); profile = { ...profile, ...input, updated_at: new Date().toISOString() }; }
      return send(profile);
    }
    if (path === '/bind-requests/mine') return send({ bind_request: request });
    if (path === '/bind-requests' && req.method === 'POST') { request = binding(); return send(request); }
    if (path === `/bind-requests/${requestId}` && req.method === 'DELETE') { request = null; return send({}); }
    if (path.endsWith('/plans')) return send({ plans: [] });
    if (path === '/events' || path === '/me/timezone') return send({});
    return send({ error: 'FIXTURE_UNIMPLEMENTED', path }, 404);
  };
}
if (require.main === module) http.createServer(createFixture()).listen(3095, '127.0.0.1', () => console.log('Local-only fixture 3095'));
module.exports = { completion, filledProfile, required, history, createFixture };
