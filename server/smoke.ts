/**
 * AICTE CaseLens Smoke Test
 * Uses Node built-in http — no extra dependencies.
 */

import * as http from 'http';

const PORT = 3001;
let passed = 0;
let failed = 0;

function req(path: string, method = 'GET', body?: object): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const opts: http.RequestOptions = {
      hostname: 'localhost',
      port: PORT,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const reqObj = http.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode ?? 0, data: raw });
        }
      });
    });
    reqObj.on('error', reject);
    if (payload) reqObj.write(payload);
    reqObj.end();
  });
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== AICTE CaseLens Smoke Test ===\n');

  // 1. API Health
  console.log('1. API Health');
  const { data: insts } = await req('/institutions');
  assert(Array.isArray(insts), 'GET /api/institutions returns array');

  // 2. Main institution
  console.log('\n2. Main Institution');
  const inst = insts.find((i: any) => i.aictePermanentId === '1-789456123');
  assert(!!inst, 'Sri Lakshmi Narayana Institute found');

  const { data: instDetail } = await req(`/institutions/${inst.id}`);
  assert(instDetail.name === 'Sri Lakshmi Narayana Institute of Technology', 'Institution name correct');
  assert(instDetail.hasActiveConflict === true, 'Active conflict detected');
  assert(instDetail.stats.totalCases >= 4, `At least 4 cases (got ${instDetail.stats.totalCases})`);

  // 3. Case 0412
  console.log('\n3. Case 0412');
  const cases = instDetail.cases;
  const c0412 = cases.find((c: any) => c.caseNumber === 'AICTE/PGRC/2026/0412');
  assert(!!c0412, 'Case 0412 found');

  const { data: caseDetail } = await req(`/cases/${c0412.id}`);
  const missingDoc = caseDetail.documents?.find((d: any) => d.name === 'Institution Response.pdf');
  assert(missingDoc?.status === 'MISSING', 'Institution Response.pdf is MISSING');

  // 4. CaseLens scoring
  console.log('\n4. CaseLens Scoring');
  const { data: cl } = await req(`/cases/${c0412.id}/caselens`);
  const rel0198 = cl.relationships?.find((r: any) => r.relatedCase.caseNumber === 'AICTE/RB/2026/0198');
  const rel0387 = cl.relationships?.find((r: any) => r.relatedCase.caseNumber === 'AICTE/PGRC/2026/0387');

  assert(rel0198?.confidence === 87, `0412 ↔ 0198 = 87 (got ${rel0198?.confidence})`);
  assert(rel0198?.conflictType === 'ACTION_CONFLICT', '0412 ↔ 0198 is ACTION_CONFLICT');
  assert(rel0387?.confidence === 73, `0412 ↔ 0387 = 73 (got ${rel0387?.confidence})`);
  assert(rel0387?.conflictType === 'NO_CONFLICT', '0387 (Resolved) does NOT conflict');

  // 5. Conflict guard
  console.log('\n5. Conflict Guard');
  assert(cl.hasActiveConflict === true, 'hasActiveConflict is true');

  const { status: disposeStatus } = await req(`/cases/${c0412.id}/dispose`, 'POST');
  assert(disposeStatus === 409, `Disposal blocked with 409 (got ${disposeStatus})`);

  // 6. Coordination
  console.log('\n6. Coordination');
  const { data: coordData } = await req(`/cases/${c0412.id}/coordination`, 'POST');
  assert(
    coordData.success === true || coordData.error === 'Coordination request already exists',
    'Coordination sent/exists'
  );

  // 7. Acknowledgement
  console.log('\n7. Acknowledgement');
  const { data: cl2 } = await req(`/cases/${c0412.id}/caselens`);
  if (cl2.activeCoordination?.status === 'AWAITING_ACKNOWLEDGEMENT') {
    const { data: ackData } = await req(`/cases/${c0412.id}/coordination/acknowledge`, 'POST');
    assert(ackData.success === true, 'Acknowledgement successful');
  } else {
    assert(true, 'Coordination already acknowledged');
  }

  const { data: cl3 } = await req(`/cases/${c0412.id}/caselens`);
  assert(cl3.activeCoordination?.status === 'ACKNOWLEDGED', 'Coordination is ACKNOWLEDGED');
  assert(cl3.conflictBlocked === false, 'conflictBlocked=false after acknowledgement');

  // 8. New complaint analysis
  console.log('\n8. New Complaint Analysis');
  const { data: analysis } = await req('/complaints/analyze', 'POST', {
    institutionId: inst.id,
    category: 'Fee Complaint',
    description: "Students report collection of fees inconsistent with the institution's approved fee structure.",
  });
  assert(Array.isArray(analysis.matches), 'Analysis returns matches');
  assert(analysis.matches.length >= 2, `>= 2 matches (got ${analysis.matches.length})`);

  const m0198 = analysis.matches.find((m: any) => m.relatedCase.caseNumber === 'AICTE/RB/2026/0198');
  const m0387 = analysis.matches.find((m: any) => m.relatedCase.caseNumber === 'AICTE/PGRC/2026/0387');
  assert(m0198?.confidence >= 80, `RB-0198 >= 80 (got ${m0198?.confidence})`);
  assert(m0387?.confidence >= 65 && m0387?.confidence < 80, `PGRC-0387 in 65-80 (got ${m0387?.confidence})`);
  assert(m0198?.confidence > m0387?.confidence, `RB-0198 (${m0198?.confidence}) > PGRC-0387 (${m0387?.confidence})`);

  // 9. Create case 0421
  console.log('\n9. Create Case 0421');
  const { data: newCase } = await req('/complaints', 'POST', {
    institutionId: inst.id,
    category: 'Fee Complaint',
    description: "Students report collection of fees inconsistent with the institution's approved fee structure.",
    priority: 'High',
    source: 'Student Grievance Portal',
  });
  assert(newCase.success === true, 'Complaint created');
  assert(newCase.case?.caseNumber === 'AICTE/PGRC/2026/0421', `Case is 0421 (got ${newCase.case?.caseNumber})`);

  // 10. Link case
  console.log('\n10. Link Case');
  const c0198 = cases.find((c: any) => c.caseNumber === 'AICTE/RB/2026/0198');
  const { data: linkData } = await req(`/cases/${newCase.case.id}/link`, 'POST', {
    targetCaseId: c0198?.id,
  });
  assert(linkData.success === true || linkData.alreadyLinked === true, 'Link case works');

  // 11. Resolved 0387 has no active conflict
  console.log('\n11. Resolved Case 0387');
  const c0387 = cases.find((c: any) => c.caseNumber === 'AICTE/PGRC/2026/0387');
  assert(c0387?.status === 'Resolved', '0387 is Resolved');
  const { data: cl0387 } = await req(`/cases/${c0387?.id}/caselens`);
  assert(cl0387.hasActiveConflict === false, '0387 has no active conflict');

  // Summary
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('\nSmoke test error — is the server running?\n', e.message || e);
  process.exit(1);
});
