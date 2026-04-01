export type Level3Result = {
  alignmentScore: number;

  teamScore: number;
  capTableScore: number;
  activityScore: number;

  stageEstimate: 'pre-seed' | 'seed' | 'post-seed' | 'unknown';
  stageConfidence: 'high' | 'medium' | 'low';

  whySelected: string[];
  riskFlags: string[];
};

function normaliseType(value: string | null | undefined): string {
  return (value || '').toUpperCase().trim();
}

/* -------------------------
   TEAM (stage-neutral)
------------------------- */
function scoreTeam(officers: any[]) {
  const active = officers.filter((o) => !o.resigned_on);
  const directors = active.filter((o) =>
    (o.role || '').toLowerCase().includes('director')
  );

  const count = directors.length;

  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (count >= 1) {
    score += 4;
    reasons.push('at least one director');
  }

  if (count >= 2) {
    score += 6;
    reasons.push('multiple directors');
  }

  if (count >= 3) {
    score += 4;
    reasons.push('broader management structure');
  }

  if (count === 1) {
    risks.push('single-director structure');
  }

  return { score: Math.min(score, 15), count, reasons, risks };
}

/* -------------------------
   CAP TABLE (stage-neutral)
------------------------- */
function scoreCapTable(pscs: any[]) {
  const count = pscs.length;

  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (count >= 1) {
    score += 4;
    reasons.push(`PSCs present (${count})`);
  }

  if (count >= 2) {
    score += 6;
    reasons.push('multiple PSCs');
  }

  if (count >= 3) {
    score += 3;
    reasons.push('non-trivial ownership structure');
  }

  if (count === 0) {
    risks.push('no PSC data');
  }

  return { score: Math.min(score, 15), count, reasons, risks };
}

/* -------------------------
   ACTIVITY (stage-neutral)
------------------------- */
function scoreActivity(filings: any[]) {
  const types = filings.map((f) => normaliseType(f.filing_type));
  const total = filings.length;

  const meaningful = types.filter(
    (t) => t && t !== 'NEWINC' && t !== 'CS01'
  ).length;

  let score = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  if (total >= 2) {
    score += 5;
    reasons.push('more than incorporation');
  }

  if (meaningful >= 1) {
    score += 5;
    reasons.push('non-trivial filing activity');
  }

  if (meaningful >= 3) {
    score += 5;
    reasons.push('multiple meaningful filings');
  }

  if (total === 1) {
    risks.push('only incorporation filing');
  }

  return {
    score: Math.min(score, 15),
    total,
    meaningful,
    reasons,
    risks,
  };
}

/* -------------------------
   STAGE (uses SH01 etc.)
------------------------- */
function estimateStage(
  filings: any[],
  officers: any[],
  pscs: any[],
  charges: any[]
): { stage: Level3Result['stageEstimate']; confidence: Level3Result['stageConfidence'] } {
  const types = filings.map((f) => normaliseType(f.filing_type));
  const sh01 = types.filter((t) => t === 'SH01').length;

  const directorCount = officers.filter(
    (o) =>
      !o.resigned_on &&
      (o.role || '').toLowerCase().includes('director')
  ).length;

  if (sh01 === 0 && filings.length <= 2 && directorCount <= 2) {
    return { stage: 'pre-seed', confidence: 'medium' };
  }

  if (sh01 >= 1 && sh01 <= 2 && charges.length === 0) {
    return { stage: 'seed', confidence: 'medium' };
  }

  if (sh01 >= 2 || charges.length >= 1 || directorCount >= 3) {
    return { stage: 'post-seed', confidence: 'medium' };
  }

  return { stage: 'unknown', confidence: 'low' };
}

/* -------------------------
   MAIN
------------------------- */
export function scoreEnrichedCompany(data: {
  filings: any[];
  officers: any[];
  pscs: any[];
  charges: any[];
}): Level3Result {
  const team = scoreTeam(data.officers);
  const cap = scoreCapTable(data.pscs);
  const activity = scoreActivity(data.filings);

  const stage = estimateStage(
    data.filings,
    data.officers,
    data.pscs,
    data.charges
  );

  /* -------------------------
     ALIGNMENT SCORE
     (NO funding signals)
  ------------------------- */
  let alignment =
    team.score +
    cap.score +
    activity.score;

  const reasons = [
    ...team.reasons,
    ...cap.reasons,
    ...activity.reasons,
  ];

  const risks = [
    ...team.risks,
    ...cap.risks,
    ...activity.risks,
  ];

  /* -------------------------
     CRITICAL PENALTIES
  ------------------------- */

  if (team.count === 1 && activity.total <= 1) {
    alignment -= 10;
    risks.push('likely shell / trivial structure');
  }

  if (cap.count === 0 && activity.total <= 1) {
    alignment -= 5;
  }

  alignment = Math.max(0, alignment);

  return {
    alignmentScore: alignment,

    teamScore: team.score,
    capTableScore: cap.score,
    activityScore: activity.score,

    stageEstimate: stage.stage,
    stageConfidence: stage.confidence,

    whySelected: reasons,
    riskFlags: risks,
  };
}