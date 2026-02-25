import { useState, useEffect, useRef } from 'react';

/* ─── API CONFIG ─────────────────────────────────────────────────────────── */
const API_URL = import.meta.env?.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

// ─── SAMPLE SEQUENCE ────────────────────────────────────────────────────────
const SAMPLE_SEQUENCE = [
  'ATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGATCGTAGCTAGCTAGC',
  'TAGCTGATCGTAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATG',
  'CGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCAAGGTCGATCGTAGCTAGCTAGCT',
  'AGCTGATCGTAGCTAGCATGCAGGCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGC',
  'GATCGTAGCTAGCTAGCTAGCTGATCGTGGCTAGCATGCGATCGTAGCTAGCTAGCTAGC',
  'TGATCGTAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGAT',
  'CGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGA',
  'TCGTAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGATCGT',
  'AGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGATCG',
  'TAGCTAGCATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGCATGCGATCGTAGC'
].join('');

// ─── CAS ENZYME CONFIGS ─────────────────────────────────────────────────────
const CAS_ENZYMES = {
  spCas9: { name: 'SpCas9 (S. pyogenes)',   pam: 'NGG',    pamLength: 3, guideLength: 20, pamPosition: 'downstream', color: '#34D399' },
  saCas9: { name: 'SaCas9 (S. aureus)',     pam: 'NNGRRT', pamLength: 6, guideLength: 21, pamPosition: 'downstream', color: '#60A5FA' },
  cas12a: { name: 'Cas12a / Cpf1',          pam: 'TTTV',   pamLength: 4, guideLength: 20, pamPosition: 'upstream',   color: '#FBBF24' },
  custom: { name: 'Custom PAM',             pam: '',       pamLength: 0, guideLength: 20, pamPosition: 'downstream', color: '#A78BFA' }
};

// ─── IUPAC → REGEX ──────────────────────────────────────────────────────────
const IUPAC = { N:'[ATGC]',R:'[AG]',Y:'[CT]',M:'[AC]',K:'[GT]',S:'[GC]',W:'[AT]',H:'[ACT]',B:'[CGT]',V:'[ACG]',D:'[AGT]',A:'A',T:'T',G:'G',C:'C' };
const pamToRegex = p => new RegExp('^' + [...p.toUpperCase()].map(c => IUPAC[c]||'[ATGC]').join('') + '$');

// ─── SEQUENCE HELPERS ────────────────────────────────────────────────────────
const revComp = seq => { const m={A:'T',T:'A',G:'C',C:'G'}; return seq.split('').reverse().map(b=>m[b]||b).join(''); };
const gcContent = seq => ((seq.match(/[GC]/g)||[]).length / seq.length)*100;
const guideEfficiency = (guide, gc) => { if(gc<30||gc>80) return 'Low'; if(gc>=40&&gc<=60&&guide.length>=20) return 'High'; return 'Medium'; };

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ADVANCED PRIMER DESIGN ENGINE ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

// SantaLucia 1998 Nearest-Neighbor Parameters: [ΔH kcal/mol, ΔS cal/mol/K]
const NN = {
  AA:[-7.9,-22.2], AT:[-7.2,-20.4], TA:[-7.2,-21.3], CA:[-8.5,-22.7],
  GT:[-8.4,-22.4], CT:[-7.8,-21.0], GA:[-8.2,-22.2], CG:[-10.6,-27.2],
  GC:[-9.8,-24.4], GG:[-8.0,-19.9], AC:[-7.8,-21.0], TC:[-8.2,-22.2],
  TG:[-8.5,-22.7], AG:[-7.8,-21.0], TT:[-7.9,-22.2], CC:[-8.0,-19.9]
};
const INIT_AT = [2.3, 4.1];
const INIT_GC = [0.1, -2.8];
const R_GAS   = 1.987; // cal/mol/K

function calcTmNN(seq) {
  seq = seq.toUpperCase();
  let dH = 0, dS = 0;
  for (let i = 0; i < seq.length - 1; i++) {
    const p = seq[i] + seq[i+1];
    if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
  }
  // Initiation
  const ends = [seq[0], seq[seq.length-1]];
  ends.forEach(b => { if ('AT'.includes(b)) { dH+=INIT_AT[0]; dS+=INIT_AT[1]; } else { dH+=INIT_GC[0]; dS+=INIT_GC[1]; } });
  // Salt correction (50 mM NaCl)
  dS += 0.368 * (seq.length - 1) * Math.log(0.05);
  const CT = 250e-9; // 250 nM oligo
  const TmK = (dH * 1000) / (dS + R_GAS * Math.log(CT / 4));
  return parseFloat((TmK - 273.15).toFixed(1));
}

function calcGcPercent(seq) {
  seq = seq.toUpperCase();
  return parseFloat(((seq.split('').filter(b => 'GC'.includes(b)).length / seq.length) * 100).toFixed(1));
}

function calc3PrimeStabilityDG(seq) {
  // ΔG of last 5 bp as a duplex stub (nearest-neighbor sum at 37°C)
  const end = seq.slice(-5).toUpperCase();
  let dH = 0, dS = 0;
  for (let i = 0; i < end.length - 1; i++) {
    const p = end[i] + end[i+1];
    if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
  }
  const T = 310.15;
  return parseFloat((dH - T * (dS / 1000)).toFixed(2));
}

function calcLast5GC(seq) {
  const end = seq.slice(-5).toUpperCase();
  return parseFloat(((end.split('').filter(b => 'GC'.includes(b)).length / 5) * 100).toFixed(1));
}

function calcHairpinDG(seq) {
  seq = seq.toUpperCase();
  let best = 0;
  const n = seq.length;
  for (let stemLen = 3; stemLen <= 7; stemLen++) {
    for (let loopLen = 3; loopLen <= 6; loopLen++) {
      for (let i = 0; i <= n - 2*stemLen - loopLen; i++) {
        const stem1 = seq.slice(i, i + stemLen);
        const j     = i + stemLen + loopLen;
        if (j + stemLen > n) continue;
        const stem2rc = revComp(seq.slice(j, j + stemLen));
        // Require full complementarity
        if (stem1 !== stem2rc) continue;
        let dH = 0, dS = 0;
        for (let k = 0; k < stemLen - 1; k++) {
          const p = stem1[k] + stem1[k+1];
          if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
        }
        const loopPenalty = loopLen === 3 ? 5.4 : loopLen === 4 ? 4.5 : 4.0;
        const T = 310.15;
        const dG = dH - T * (dS / 1000) + loopPenalty;
        if (dG < best) best = dG;
      }
    }
  }
  return parseFloat(best.toFixed(2));
}

function calcSelfDimerDG(seq) {
  seq = seq.toUpperCase();
  let best = 0;
  for (let endLen = 4; endLen <= 10; endLen++) {
    if (endLen > seq.length) continue;
    const end = seq.slice(-endLen);
    for (let i = 0; i <= seq.length - endLen; i++) {
      if (i === seq.length - endLen) continue; // skip self
      const region = seq.slice(i, i + endLen);
      if (end === revComp(region)) {
        let dH = 0, dS = 0;
        for (let k = 0; k < endLen - 1; k++) {
          const p = end[k] + end[k+1];
          if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
        }
        const T = 310.15;
        const dG = dH - T * (dS / 1000);
        if (dG < best) best = dG;
      }
    }
  }
  return parseFloat(best.toFixed(2));
}

function calcCrossDimerDG(fwd, rev) {
  fwd = fwd.toUpperCase(); rev = rev.toUpperCase();
  let best = 0;
  for (let endLen = 4; endLen <= 10; endLen++) {
    if (endLen > fwd.length || endLen > rev.length) continue;
    const fEnd = fwd.slice(-endLen);
    const rRc  = revComp(rev.slice(-endLen));
    if (fEnd === rRc) {
      let dH = 0, dS = 0;
      for (let k = 0; k < endLen - 1; k++) {
        const p = fEnd[k] + fEnd[k+1];
        if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
      }
      const T = 310.15;
      const dG = dH - T * (dS / 1000);
      if (dG < best) best = dG;
    }
  }
  return parseFloat(best.toFixed(2));
}

function checkInternalComplementarity(seq) {
  seq = seq.toUpperCase();
  const n = seq.length;
  for (let len = 5; len <= 8; len++) {
    for (let i = 0; i <= n - 2*len; i++) {
      const sub = seq.slice(i, i+len);
      for (let j = i+len; j <= n-len; j++) {
        if (seq.slice(j, j+len) === revComp(sub)) return true;
      }
    }
  }
  return false;
}

function countMaxRepeatInRegion(seq, region) {
  // Count how many times 8-mers from primer appear in the full sequence
  const primer = seq.toUpperCase();
  const template = region.toUpperCase();
  let maxCount = 0;
  for (let i = 0; i <= primer.length - 8; i++) {
    const kmer = primer.slice(i, i+8);
    let count = 0, pos = 0;
    while ((pos = template.indexOf(kmer, pos)) !== -1) { count++; pos++; }
    if (count > maxCount) maxCount = count;
  }
  return maxCount;
}

function hasRuns(seq, n=4) {
  return ['A','T','G','C'].some(b => seq.toUpperCase().includes(b.repeat(n)));
}

function hasGCClamp(seq) {
  const end2 = seq.slice(-2).toUpperCase();
  const gc = (end2.match(/[GC]/g)||[]).length;
  return gc >= 1 && gc <= 2;
}

function noTerminalGGGCCC(seq) {
  const end3 = seq.slice(-3).toUpperCase();
  return !end3.includes('GGG') && !end3.includes('CCC');
}

// ─── APPLICATION MODE AMPLICON RANGES ────────────────────────────────────────
const AMPLICON_RANGES = {
  diagnostic:  { min: 400, max: 700,  label: 'Diagnostic PCR' },
  cloning:     { min: 100, max: 3000, label: 'Cloning' },
  qpcr:        { min: 70,  max: 200,  label: 'qPCR' },
  mutation:    { min: 150, max: 400,  label: 'Mutation Detection' }
};

// ─── FULL PRIMER SCORING (weighted) ──────────────────────────────────────────
function scorePrimer(p, fullSeq) {
  // 25% Tm stability (target 60-63°C)
  const tmScore = Math.max(0, 1 - Math.abs(p.tm - 61.5) / 5);

  // 20% GC balance (target 50%)
  const gcScore = Math.max(0, 1 - Math.abs(p.gc - 50) / 15);

  // 20% secondary structure safety (hairpin)
  const hpScore = p.hairpin > -1 ? 1.0 : p.hairpin > -2 ? 0.85 : p.hairpin > -3 ? 0.6 : 0.0;

  // 15% primer-dimer risk (self-dimer)
  const sdScore = p.selfDimer > -2 ? 1.0 : p.selfDimer > -3.5 ? 0.8 : p.selfDimer > -5 ? 0.55 : 0.0;

  // 10% 3' clamp quality
  const clampScore = hasGCClamp(p.seq) ? 1.0 : 0.0;

  // 10% specificity (penalize repetitive binding)
  const repeatCount = countMaxRepeatInRegion(p.seq, fullSeq);
  const specScore = repeatCount <= 2 ? 1.0 : repeatCount <= 5 ? 0.7 : repeatCount <= 10 ? 0.4 : 0.1;

  const total = 0.25*tmScore + 0.20*gcScore + 0.20*hpScore + 0.15*sdScore + 0.10*clampScore + 0.10*specScore;
  return parseFloat((total * 100).toFixed(1));
}

function classifyScore(score, tmDiff, gcMax) {
  let grade = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 60 ? 'Borderline' : 'Reject';
  let warnings = [];

  if (tmDiff > 3) {
    if (grade === 'Excellent') grade = 'Good';
    else if (grade === 'Good')  grade = 'Borderline';
    warnings.push(`Tm difference ${tmDiff.toFixed(1)}°C exceeds 3°C — compatibility downgraded`);
  }
  if (gcMax > 70) {
    warnings.push(`GC content ${gcMax}% exceeds 70% — HIGH RISK of secondary structures`);
  }
  return { grade, warnings };
}

function designPrimers(sequence, appMode = 'diagnostic') {
  const seq   = sequence.toUpperCase().replace(/[^ATGC]/g, '');
  const range = AMPLICON_RANGES[appMode] || AMPLICON_RANGES.diagnostic;
  const n     = seq.length;

  const allFwd = [], allRev = [];

  // Scan forward primers across entire sequence
  for (let start = 0; start < n - 18; start++) {
    for (let len = 18; len <= 22; len++) {
      if (start + len > n) continue;
      const primer = seq.slice(start, start + len);
      const gc = calcGcPercent(primer);
      if (gc < 40 || gc > 65) continue;       // strict GC
      if (hasRuns(primer, 4)) continue;
      if (!hasGCClamp(primer)) continue;
      if (!noTerminalGGGCCC(primer)) continue;
      if (checkInternalComplementarity(primer)) continue;
      const tm = calcTmNN(primer);
      if (tm < 58 || tm > 65) continue;
      const hairpin    = calcHairpinDG(primer);
      const selfDimer  = calcSelfDimerDG(primer);
      if (hairpin < -3) continue;
      if (selfDimer < -5) continue;
      const stability  = calc3PrimeStabilityDG(primer);
      const last5gc    = calcLast5GC(primer);
      allFwd.push({ seq: primer, start, end: start+len, len, tm, gc, hairpin, selfDimer, stability, last5gc });
    }
  }

  // Scan reverse primers
  for (let endPos = range.min; endPos <= n; endPos++) {
    for (let len = 18; len <= 22; len++) {
      const start = endPos - len;
      if (start < 0) continue;
      const rcPrimer = revComp(seq.slice(start, endPos));
      const gc = calcGcPercent(rcPrimer);
      if (gc < 40 || gc > 65) continue;
      if (hasRuns(rcPrimer, 4)) continue;
      if (!hasGCClamp(rcPrimer)) continue;
      if (!noTerminalGGGCCC(rcPrimer)) continue;
      if (checkInternalComplementarity(rcPrimer)) continue;
      const tm = calcTmNN(rcPrimer);
      if (tm < 58 || tm > 65) continue;
      const hairpin   = calcHairpinDG(rcPrimer);
      const selfDimer = calcSelfDimerDG(rcPrimer);
      if (hairpin < -3) continue;
      if (selfDimer < -5) continue;
      const stability = calc3PrimeStabilityDG(rcPrimer);
      const last5gc   = calcLast5GC(rcPrimer);
      allRev.push({ seq: rcPrimer, start, end: endPos, len, tm, gc, hairpin, selfDimer, stability, last5gc });
    }
  }

  if (!allFwd.length || !allRev.length) return null;

  // Score all candidates
  allFwd.forEach(p => { p.score = scorePrimer(p, seq); });
  allRev.forEach(p => { p.score = scorePrimer(p, seq); });
  allFwd.sort((a,b) => b.score - a.score);
  allRev.sort((a,b) => b.score - a.score);

  // Find best pair within amplicon range with Tm diff ≤ 3°C
  let best = null, bestPairScore = -Infinity;

  for (const fwd of allFwd.slice(0, 50)) {
    for (const rev of allRev.slice(0, 50)) {
      const amp = rev.end - fwd.start;
      if (amp < range.min || amp > range.max) continue;
      if (Math.abs(fwd.tm - rev.tm) > 3) continue;
      const cd = calcCrossDimerDG(fwd.seq, rev.seq);
      if (cd < -6) continue;
      const pairScore = (fwd.score + rev.score) / 2 - Math.abs(fwd.tm - rev.tm) * 2;
      if (pairScore > bestPairScore) {
        bestPairScore = pairScore;
        best = { fwd, rev, amp, cd, pairScore };
      }
    }
  }

  if (!best) return null;

  const { fwd, rev, amp, cd } = best;
  const tmDiff = parseFloat(Math.abs(fwd.tm - rev.tm).toFixed(1));
  const annealTm = parseFloat((Math.min(fwd.tm, rev.tm) - 5).toFixed(1));
  const overallScore = parseFloat(((fwd.score + rev.score) / 2).toFixed(1));
  const gcMax = Math.max(fwd.gc, rev.gc);
  const { grade, warnings } = classifyScore(overallScore, tmDiff, gcMax);

  // Specificity score (based on repeat counts)
  const fwdRepeat = countMaxRepeatInRegion(fwd.seq, seq);
  const revRepeat = countMaxRepeatInRegion(rev.seq, seq);
  const specScore = parseFloat((Math.max(0, 100 - (fwdRepeat + revRepeat) * 5)).toFixed(1));

  if (fwdRepeat > 5) warnings.push(`Forward primer may bind repetitive regions (${fwdRepeat} 8-mer hits)`);
  if (revRepeat > 5) warnings.push(`Reverse primer may bind repetitive regions (${revRepeat} 8-mer hits)`);

  return {
    forward_primer: {
      sequence: fwd.seq,
      length: `${fwd.len} bp`,
      Tm: `${fwd.tm}°C`,
      GC_percent: `${fwd.gc}%`,
      hairpin_dG: `${fwd.hairpin} kcal/mol`,
      self_dimer_dG: `${fwd.selfDimer} kcal/mol`,
      three_prime_stability_dG: `${fwd.stability} kcal/mol`,
      last_5bp_GC_percent: `${fwd.last5gc}%`
    },
    reverse_primer: {
      sequence: rev.seq,
      length: `${rev.len} bp`,
      Tm: `${rev.tm}°C`,
      GC_percent: `${rev.gc}%`,
      hairpin_dG: `${rev.hairpin} kcal/mol`,
      self_dimer_dG: `${rev.selfDimer} kcal/mol`,
      three_prime_stability_dG: `${rev.stability} kcal/mol`,
      last_5bp_GC_percent: `${rev.last5gc}%`
    },
    cross_dimer_dG: `${cd} kcal/mol`,
    amplicon_size: `${amp} bp`,
    annealing_temperature: `${annealTm}°C`,
    Tm_difference: `${tmDiff}°C`,
    specificity_score: `${specScore}/100`,
    overall_score: `${overallScore}/100`,
    classification: grade,
    warnings,
    _meta: {
      application_mode: AMPLICON_RANGES[appMode]?.label,
      model: 'SantaLucia 1998 Nearest-Neighbor',
      conditions: '[oligo]=250nM, [Na+]=50mM',
      scoring: '25% Tm · 20% GC · 20% structure · 15% dimer · 10% clamp · 10% specificity'
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function CRISPRFinder() {
  const [sequence, setSequence]             = useState('');
  const [selectedCas, setSelectedCas]       = useState('spCas9');
  const [customPAM, setCustomPAM]           = useState('');
  const [customGuideLen, setCustomGuideLen] = useState(20);
  const [customPAMPos, setCustomPAMPos]     = useState('downstream');
  const [pamSites, setPamSites]             = useState(null);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [showInfo, setShowInfo]             = useState(false);
  const [aiExplanation, setAiExplanation]   = useState('');
  const [loadingAI, setLoadingAI]           = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  // Primer design state
  const [showPrimerPanel, setShowPrimerPanel] = useState(false);
  const [primerAppMode, setPrimerAppMode]     = useState('diagnostic');
  const [primerResult, setPrimerResult]       = useState(null);
  const [primerLoading, setPrimerLoading]     = useState(false);
  const [primerError, setPrimerError]         = useState('');
  const [activeTab, setActiveTab]             = useState('crispr'); // 'crispr' | 'primer'

  // Close export on outside click
  useEffect(() => {
    const close = () => setShowExportMenu(false);
    if (showExportMenu) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [showExportMenu]);

  const casConfig = selectedCas === 'custom'
    ? { ...CAS_ENZYMES.custom, pam: customPAM.toUpperCase(), pamLength: customPAM.length, guideLength: customGuideLen, pamPosition: customPAMPos }
    : CAS_ENZYMES[selectedCas];

  // FASTA upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === 'string') {
        const clean = evt.target.result.split('\n').filter(l => !l.startsWith('>')).join('').replace(/\s/g,'');
        setSequence(clean); setError(''); setPamSites(null); setAiExplanation(''); setPrimerResult(null);
      }
    };
    reader.readAsText(file);
  };

  // ── Export ──
  const exportTXT = (detailed=false) => {
    if (!pamSites) return;
    let c = `CRISPR PAM Site Finder Results\n${'='.repeat(50)}\n\nEnzyme: ${casConfig.name}\nPAM: ${casConfig.pam}\nSeq Length: ${pamSites.seqLen} bp\nTotal Sites: ${pamSites.total}\nForward: ${pamSites.forward}\nReverse: ${pamSites.reverse}\n\n`;
    if (detailed && pamSites.sites.length > 0) {
      c += `${'='.repeat(50)}\nDETAILED SITES\n${'='.repeat(50)}\n\n`;
      pamSites.sites.forEach((s,i) => {
        c += `Site ${i+1}:\n  Position: ${s.position}-${s.positionEnd}\n  Strand: ${s.strand}\n  PAM: ${s.pamSequence}\n  Guide: ${s.guideRNA}\n  GC: ${s.gcContent}%\n  Efficiency: ${s.efficiency}\n\n`;
      });
    }
    if (primerResult) {
      c += `\n${'='.repeat(50)}\nPRIMER DESIGN RESULTS\n${'='.repeat(50)}\n\n`;
      c += JSON.stringify(primerResult, null, 2);
    }
    const blob = new Blob([c], {type:'text/plain'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `CRISPR_Results_${detailed?'Detailed_':''}${new Date().toISOString().split('T')[0]}.txt`;
    a.click(); setShowExportMenu(false);
  };

  const exportPDF = (detailed=false) => {
    if (!pamSites) return;
    let h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>CRISPR Results</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#333}h1{color:#34D399;border-bottom:3px solid #34D399;padding-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:10px;text-align:left}
    th{background:#34D399;color:#fff}tr:even{background:#f9f9f9}.sum{background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0}
    code{background:#eee;padding:2px 5px;border-radius:3px;font-family:monospace}
    .primer-box{background:#f0f4ff;border-left:4px solid #6366f1;padding:15px;margin:10px 0;border-radius:4px}
    </style></head><body>
    <h1>CRISPR PAM Site Finder Results</h1>
    <div class="sum"><b>Enzyme:</b> ${casConfig.name}<br><b>PAM:</b> ${casConfig.pam}<br>
    <b>Seq Length:</b> ${pamSites.seqLen} bp<br><b>Total Sites:</b> ${pamSites.total}<br>
    <b>Forward:</b> ${pamSites.forward}<br><b>Reverse:</b> ${pamSites.reverse}<br>
    <b>Generated:</b> ${new Date().toLocaleString()}</div>`;
    if (detailed && pamSites.sites.length > 0) {
      h += `<h2>PAM Sites</h2><table><thead><tr><th>#</th><th>Position</th><th>Strand</th><th>PAM</th><th>Guide RNA</th><th>GC%</th><th>Efficiency</th></tr></thead><tbody>`;
      pamSites.sites.forEach((s,i) => {
        h += `<tr><td>${i+1}</td><td>${s.position}-${s.positionEnd}</td><td>${s.strand}</td><td><code>${s.pamSequence}</code></td><td><code>${s.guideRNA}</code></td><td>${s.gcContent}</td><td>${s.efficiency}</td></tr>`;
      });
      h += `</tbody></table>`;
    }
    if (primerResult) {
      h += `<h2>Primer Design Results</h2>
      <div class="primer-box"><b>Classification:</b> ${primerResult.classification} &nbsp;|&nbsp; <b>Score:</b> ${primerResult.overall_score}<br>
      <b>Amplicon:</b> ${primerResult.amplicon_size} &nbsp;|&nbsp; <b>Annealing Tm:</b> ${primerResult.annealing_temperature}<br><br>
      <b>Forward:</b> <code>${primerResult.forward_primer.sequence}</code> (${primerResult.forward_primer.Tm}, GC ${primerResult.forward_primer.GC_percent})<br>
      <b>Reverse:</b> <code>${primerResult.reverse_primer.sequence}</code> (${primerResult.reverse_primer.Tm}, GC ${primerResult.reverse_primer.GC_percent})<br>
      ${primerResult.warnings?.length ? `<br><b>⚠ Warnings:</b> ${primerResult.warnings.join('; ')}` : ''}
      </div>`;
    }
    h += `</body></html>`;
    const blob = new Blob([h], {type:'text/html'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `CRISPR_Results_${detailed?'Detailed_':''}${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    const w = window.open(url); if (w) w.onload = () => setTimeout(() => w.print(), 250);
    setShowExportMenu(false);
  };

  // ── CRISPR: find PAM sites ──
  const iupacRx = p => new RegExp('^' + [...p.toUpperCase()].map(c => IUPAC[c]||'[ATGC]').join('') + '$');

  const findPAMSites = (seq, cfg) => {
    const sites = [], rx = pamToRegex(cfg.pam);
    const addSites = (strand, src, toFwd) => {
      for (let i = 0; i <= src.length - cfg.pamLength; i++) {
        const pamSeq = src.substring(i, i + cfg.pamLength);
        if (!rx.test(pamSeq)) continue;
        const fPos = strand === 'forward' ? i : toFwd(i);
        const pamEnd = fPos + cfg.pamLength;
        let gS, gE;
        if (cfg.pamPosition === 'downstream') { gE = fPos; gS = Math.max(0, gE - cfg.guideLength); }
        else { gS = pamEnd; gE = Math.min(seq.length, gS + cfg.guideLength); }
        const guide = seq.substring(gS, gE);
        const gc = gcContent(guide);
        const ctxS = Math.max(0, Math.min(gS, fPos) - 10);
        const ctxE = Math.min(seq.length, Math.max(gE, pamEnd) + 10);
        sites.push({
          position: fPos+1, positionEnd: pamEnd, strand, pamSequence: pamSeq,
          guideRNA: guide, guideLength: guide.length, guideStart: gS+1, guideEnd: gE,
          context: seq.substring(ctxS, ctxE), contextStart: ctxS+1,
          gcContent: gc.toFixed(1), efficiency: guideEfficiency(guide, gc)
        });
      }
    };
    addSites('forward', seq, i => i);
    const rc = revComp(seq);
    addSites('reverse', rc, i => seq.length - i - cfg.pamLength);
    sites.sort((a,b) => a.position - b.position);
    return sites;
  };

  const handleFind = () => {
    setError('');
    if (!sequence.trim()) { setError('Please enter a DNA sequence.'); return; }
    if (selectedCas === 'custom' && !customPAM.trim()) { setError('Enter a custom PAM pattern.'); return; }
    const clean = sequence.toUpperCase().replace(/[^ATGC]/g,'');
    if (clean.length < 20) { setError('Sequence must be at least 20 bp.'); return; }
    setLoading(true); setPamSites(null); setAiExplanation(''); setPrimerResult(null);
    setTimeout(() => {
      const sites = findPAMSites(clean, casConfig);
      setPamSites({ sites, total: sites.length, forward: sites.filter(s=>s.strand==='forward').length, reverse: sites.filter(s=>s.strand==='reverse').length, seqLen: clean.length });
      setLoading(false);
    }, 420);
  };

  const loadSample = () => { setSequence(SAMPLE_SEQUENCE); setError(''); setPamSites(null); setAiExplanation(''); setPrimerResult(null); };

  // ── AI explain ──
  const handleAI = async () => {
    if (!pamSites) return;
    setLoadingAI(true); setError(''); setAiExplanation('');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`${API_URL}/api/explain`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tool:'CRISPR PAM Site Finder', data: pamSites }), signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'AI failed'); }
      const data = await res.json();
      const txt = data.explanation || data.output_text || data.data?.explanation || data.choices?.[0]?.message?.content;
      if (!txt) throw new Error('No explanation returned');
      setAiExplanation(txt);
    } catch(e) { setError(e.name==='AbortError'?'AI timed out':(e.message||'AI failed')); }
    finally { setLoadingAI(false); }
  };

  // ── Primer design ──
  const handlePrimerDesign = () => {
    const clean = sequence.toUpperCase().replace(/[^ATGC]/g,'');
    if (clean.length < 50) { setPrimerError('Need at least 50 bp for primer design.'); return; }
    setPrimerLoading(true); setPrimerResult(null); setPrimerError('');
    setTimeout(() => {
      const result = designPrimers(clean, primerAppMode);
      if (!result) {
        setPrimerError('No valid primer pair found for this mode. Try a different application mode or check your sequence.');
      } else {
        setPrimerResult(result);
      }
      setPrimerLoading(false);
    }, 600);
  };

  // ── Colours ──
  const effColor = e => ({High:'#34D399', Medium:'#FBBF24', Low:'#F87171'}[e]);
  const effBg    = e => ({High:'rgba(52,211,153,0.12)', Medium:'rgba(251,191,36,0.12)', Low:'rgba(248,113,113,0.12)'}[e]);
  const classColor = c => ({Excellent:'#34D399', Good:'#60A5FA', Borderline:'#FBBF24', Reject:'#F87171'}[c]||'#a0a3b1');
  const classBg    = c => ({Excellent:'rgba(52,211,153,0.12)', Good:'rgba(96,165,250,0.12)', Borderline:'rgba(251,191,36,0.12)', Reject:'rgba(248,113,113,0.12)'}[c]||'transparent');

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh', background:'#0a0c12', color:'#e2e4e9', fontFamily:'"Sora",sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#12141c}::-webkit-scrollbar-thumb{background:#262a36;border-radius:3px}
        
        .card{background:#13151f;border:1px solid #1e2130;border-radius:14px;padding:1.5rem;margin-bottom:1.2rem}
        .card-sm{padding:1rem}
        
        .tab-btn{flex:1;padding:.65rem 1rem;background:transparent;border:none;border-bottom:2px solid transparent;
          color:#4a4d5e;font-family:'Sora',sans-serif;font-weight:600;font-size:.82rem;cursor:pointer;
          transition:all .2s;text-transform:uppercase;letter-spacing:.06em}
        .tab-btn.active{color:#e2e4e9;border-bottom-color:#34D399}
        .tab-btn:hover:not(.active){color:#a0a3b1;border-bottom-color:#2e3240}

        .btn-primary{display:flex;align-items:center;justify-content:center;gap:.5rem;
          width:100%;padding:.85rem 1.5rem;
          background:linear-gradient(135deg,#34D399,#059669);
          border:none;border-radius:10px;color:#0a0c12;font-family:'Sora',sans-serif;
          font-weight:700;font-size:.92rem;cursor:pointer;transition:all .22s;letter-spacing:.02em}
        .btn-primary:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 6px 24px rgba(52,211,153,.3)}
        .btn-primary:disabled{filter:brightness(.55);cursor:not-allowed;transform:none;box-shadow:none}

        .btn-primer{display:flex;align-items:center;justify-content:center;gap:.5rem;
          width:100%;padding:.82rem 1.5rem;
          background:linear-gradient(135deg,#818cf8,#4f46e5);
          border:none;border-radius:10px;color:#fff;font-family:'Sora',sans-serif;
          font-weight:700;font-size:.92rem;cursor:pointer;transition:all .22s}
        .btn-primer:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 6px 24px rgba(99,102,241,.3)}
        .btn-primer:disabled{filter:brightness(.5);cursor:not-allowed;transform:none;box-shadow:none}

        .btn-ai{display:flex;align-items:center;justify-content:center;gap:.5rem;
          width:100%;padding:.75rem;background:linear-gradient(135deg,#6366f1,#4338ca);
          border:none;border-radius:10px;color:#fff;font-family:'Sora',sans-serif;
          font-weight:600;font-size:.88rem;cursor:pointer;transition:all .2s}
        .btn-ai:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn-ai:disabled{filter:brightness(.45);cursor:not-allowed;transform:none}

        .btn-ghost{display:inline-flex;align-items:center;gap:.4rem;padding:.48rem .95rem;
          background:transparent;border:1px solid #1e2130;border-radius:8px;
          color:#4a4d5e;font-family:'Sora',sans-serif;font-size:.78rem;font-weight:500;
          cursor:pointer;transition:all .2s}
        .btn-ghost:hover{border-color:#34D399;color:#34D399;background:rgba(52,211,153,.05)}

        .btn-sample{display:inline-flex;align-items:center;gap:.32rem;padding:.38rem .78rem;
          background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.22);border-radius:7px;
          color:#34D399;font-family:'JetBrains Mono',monospace;font-size:.72rem;font-weight:500;
          cursor:pointer;transition:all .18s}
        .btn-sample:hover{background:rgba(52,211,153,.16);border-color:rgba(52,211,153,.45)}

        .btn-export{display:inline-flex;align-items:center;gap:.32rem;padding:.38rem .78rem;
          background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.22);border-radius:7px;
          color:#60A5FA;font-family:'Sora',sans-serif;font-size:.75rem;font-weight:500;
          cursor:pointer;transition:all .18s;position:relative}
        .btn-export:hover{background:rgba(96,165,250,.15);border-color:rgba(96,165,250,.4)}

        .export-menu{position:absolute;top:calc(100% + .35rem);right:0;
          background:#0e1018;border:1px solid #1e2130;border-radius:10px;
          box-shadow:0 16px 40px rgba(0,0,0,.55);padding:.5rem;z-index:100;min-width:215px}
        .export-item{padding:.55rem .65rem;border-radius:7px;cursor:pointer;
          border:1px solid transparent;margin-bottom:.25rem;transition:all .16s;font-size:.8rem;color:#8a8f9e}
        .export-item:hover{border-color:#60A5FA;background:rgba(96,165,250,.07);color:#60A5FA}
        .export-item:last-child{margin-bottom:0}

        label.lbl{display:block;font-size:.72rem;font-weight:700;color:#3d4155;
          text-transform:uppercase;letter-spacing:.09em;margin-bottom:.4rem}
        select,textarea{width:100%;background:#0e1018;border:1px solid #1e2130;border-radius:8px;
          color:#e2e4e9;font-family:'Sora',sans-serif;font-size:.86rem;
          padding:.68rem .82rem;outline:none;transition:border .18s}
        select:focus,textarea:focus{border-color:#34D399}
        textarea{resize:vertical;font-family:'JetBrains Mono',monospace;font-size:.76rem;line-height:1.75}
        textarea::placeholder{color:#252837}

        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem}
        .stat-box{background:#0e1018;border:1px solid #1e2130;border-radius:10px;padding:.8rem .7rem;text-align:center}
        .stat-val{font-size:1.5rem;font-weight:700;line-height:1.2}
        .stat-lbl{font-size:.66rem;color:#3d4155;text-transform:uppercase;letter-spacing:.06em;margin-top:.28rem}

        .primer-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .primer-card{background:#0e1018;border:1px solid #1e2130;border-radius:12px;padding:1rem}
        .primer-seq{font-family:'JetBrains Mono',monospace;font-size:.8rem;word-break:break-all;
          background:#080a10;padding:.65rem .8rem;border-radius:7px;border:1px solid #14161e;
          color:#a0f0c8;letter-spacing:.03em;margin-bottom:.7rem}
        .metric-row{display:flex;justify-content:space-between;align-items:center;
          padding:.3rem 0;border-bottom:1px solid #14161e;font-size:.78rem}
        .metric-row:last-child{border-bottom:none}
        .metric-key{color:#3d4155;font-weight:600}
        .metric-val{color:#c8cad4;font-family:'JetBrains Mono',monospace;font-size:.74rem}

        .json-block{background:#080a10;border:1px solid #14161e;border-radius:10px;
          padding:1rem;font-family:'JetBrains Mono',monospace;font-size:.72rem;
          line-height:1.85;color:#a0a3b1;overflow-x:auto;max-height:480px;overflow-y:auto}
        .json-key{color:#818cf8}
        .json-str{color:#34D399}
        .json-num{color:#FBBF24}
        .json-null{color:#F87171}

        .results-table{width:100%;border-collapse:collapse;font-size:.78rem}
        .results-table th{background:#0e1018;color:#3d4155;font-weight:700;font-size:.65rem;
          text-transform:uppercase;letter-spacing:.07em;padding:.55rem .65rem;
          text-align:left;border-bottom:1px solid #1e2130;position:sticky;top:0}
        .results-table td{padding:.5rem .65rem;border-bottom:1px solid #13151f;font-family:'JetBrains Mono',monospace}
        .results-table tr:hover td{background:#0d0f18}

        .eff-badge{display:inline-block;padding:.18rem .5rem;border-radius:5px;font-size:.67rem;font-weight:700;letter-spacing:.03em}
        .strand-badge{display:inline-block;padding:.16rem .48rem;border-radius:5px;font-size:.7rem;font-weight:600}

        .seq-display{background:#080a10;border:1px solid #1e2130;border-radius:8px;padding:.85rem 1rem;
          font-family:'JetBrains Mono',monospace;font-size:.7rem;line-height:2;word-break:break-all;color:#6b7080}
        .pam-fwd{background:rgba(52,211,153,.2);color:#34D399;font-weight:700;padding:1px 3px;border-radius:3px}
        .pam-rev{background:rgba(96,165,250,.2);color:#60A5FA;font-weight:700;padding:1px 3px;border-radius:3px}
        .guide-fwd{border-bottom:2px solid #34D399;padding-bottom:1px}
        .guide-rev{border-bottom:2px solid #60A5FA;padding-bottom:1px}

        .info-panel{overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1),opacity .3s}
        .info-panel.closed{max-height:0;opacity:0}
        .info-panel.open{max-height:900px;opacity:1}

        .bar-track{height:4px;background:#0e1018;border-radius:2px;overflow:hidden;margin-top:.3rem}
        .bar-fill{height:100%;border-radius:2px;transition:width .65s cubic-bezier(.4,0,.2,1)}

        .warning-item{display:flex;gap:.5rem;align-items:flex-start;
          background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);
          border-radius:8px;padding:.55rem .75rem;margin-bottom:.4rem;font-size:.76rem;color:#FBBF24}

        @media(max-width:640px){.stat-grid{grid-template-columns:repeat(2,1fr)}.primer-grid{grid-template-columns:1fr}.card{padding:1rem}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .5s linear infinite}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .35s ease forwards}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:'linear-gradient(180deg,#0e1018 0%,#0a0c12 100%)',borderBottom:'1px solid #1a1d28',padding:'1.75rem 1.5rem 1.35rem'}}>
        <div style={{maxWidth:900,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.7rem',marginBottom:'.5rem'}}>
            <span style={{fontSize:'1.45rem'}}>🧬</span>
            <h1 style={{fontFamily:'Sora',fontWeight:700,fontSize:'1.4rem',color:'#fff',letterSpacing:'-.015em'}}>
              CRISPR PAM Site Finder
            </h1>
            <span style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',color:'#34D399',fontSize:'.58rem',fontWeight:700,padding:'.2rem .5rem',borderRadius:20,letterSpacing:'.08em',textTransform:'uppercase'}}>
              Research Grade
            </span>
            <span style={{background:'rgba(129,140,248,.1)',border:'1px solid rgba(129,140,248,.25)',color:'#818cf8',fontSize:'.58rem',fontWeight:700,padding:'.2rem .5rem',borderRadius:20,letterSpacing:'.08em',textTransform:'uppercase'}}>
              + Primer Engine v2
            </span>
          </div>
          <p style={{color:'#3d4155',fontSize:'.8rem',lineHeight:1.6,maxWidth:580}}>
            Identify PAM sites for CRISPR-Cas gene editing & design optimized PCR primers with full nearest-neighbor thermodynamic analysis.
          </p>
        </div>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'1.2rem 1.25rem 3rem'}}>

        {/* ── TABS ── */}
        <div style={{display:'flex',borderBottom:'1px solid #1e2130',marginBottom:'1.2rem'}}>
          <button className={`tab-btn ${activeTab==='crispr'?'active':''}`} onClick={()=>setActiveTab('crispr')}>🔬 CRISPR PAM Finder</button>
          <button className={`tab-btn ${activeTab==='primer'?'active':''}`} onClick={()=>setActiveTab('primer')}>🧪 Primer Design</button>
        </div>

        {/* ── INFO TOGGLE ── */}
        <button className="btn-ghost" onClick={()=>setShowInfo(v=>!v)} style={{marginBottom:'1rem',width:'100%',justifyContent:'space-between'}}>
          <span style={{display:'flex',alignItems:'center',gap:'.4rem'}}><span>💡</span> How It Works & Workflow</span>
          <span style={{fontSize:'.68rem',color:'#3d4155',transition:'transform .25s',transform:showInfo?'rotate(180deg)':'none',display:'inline-block'}}>▼</span>
        </button>
        <div className={`info-panel ${showInfo?'open':'closed'}`}>
          <div className="card card-sm" style={{marginBottom:'1.2rem',borderColor:'#1a1d28'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:'.55rem'}}>
              {[
                ['1','Select Enzyme','Choose SpCas9 (NGG) for broad targeting, SaCas9 for AAV, or Cas12a for T-rich regions.','#34D399'],
                ['2','Paste Sequence','Input your gene region. Whitespace & numbers are stripped automatically.','#60A5FA'],
                ['3','Find PAM Sites','Each hit is scored by GC content — aim for 40–60% for High efficiency.','#FBBF24'],
                ['4','Design Primers','Switch to Primer Design tab. Choose mode (Diagnostic/qPCR/Cloning) & run full NN analysis.','#818cf8'],
              ].map(([n,title,desc,c])=>(
                <div key={n} style={{background:'#080a10',border:`1px solid #1a1d28`,borderRadius:9,padding:'.6rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.38rem',marginBottom:'.3rem'}}>
                    <span style={{background:c,color:'#0a0c12',fontSize:'.6rem',fontWeight:700,width:17,height:17,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{n}</span>
                    <span style={{fontSize:'.72rem',fontWeight:600,color:'#e2e4e9'}}>{title}</span>
                  </div>
                  <p style={{fontSize:'.68rem',color:'#3d4155',lineHeight:1.55}}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CAS SELECTION ── */}
        <div className="card">
          <label className="lbl">Cas Enzyme</label>
          <select value={selectedCas} onChange={e=>setSelectedCas(e.target.value)}>
            <option value="spCas9">SpCas9 — NGG · Standard, broadest target range</option>
            <option value="saCas9">SaCas9 — NNGRRT · Compact, ideal for AAV delivery</option>
            <option value="cas12a">Cas12a / Cpf1 — TTTV · T-rich PAM, staggered cut</option>
            <option value="custom">Custom PAM Pattern</option>
          </select>
          {selectedCas === 'custom' && (
            <div style={{marginTop:'1rem',display:'grid',gridTemplateColumns:'1fr 130px 170px',gap:'.7rem'}}>
              <div>
                <label className="lbl">PAM Pattern <span style={{textTransform:'none',color:'#252837',fontWeight:400}}>(IUPAC)</span></label>
                <input type="text" value={customPAM} onChange={e=>setCustomPAM(e.target.value.toUpperCase())} placeholder="e.g. NGG"
                  style={{width:'100%',background:'#0e1018',border:'1px solid #1e2130',borderRadius:8,color:'#e2e4e9',fontFamily:'"JetBrains Mono",monospace',fontSize:'.84rem',padding:'.68rem .82rem',outline:'none'}}
                  onFocus={e=>e.target.style.borderColor='#34D399'} onBlur={e=>e.target.style.borderColor='#1e2130'}
                />
              </div>
              <div>
                <label className="lbl">Guide Length</label>
                <input type="number" value={customGuideLen} onChange={e=>setCustomGuideLen(parseInt(e.target.value)||20)} min={15} max={25}
                  style={{width:'100%',background:'#0e1018',border:'1px solid #1e2130',borderRadius:8,color:'#e2e4e9',fontFamily:'Sora',fontSize:'.84rem',padding:'.68rem .82rem',outline:'none'}}
                  onFocus={e=>e.target.style.borderColor='#34D399'} onBlur={e=>e.target.style.borderColor='#1e2130'}
                />
              </div>
              <div>
                <label className="lbl">PAM Position</label>
                <select value={customPAMPos} onChange={e=>setCustomPAMPos(e.target.value)}>
                  <option value="downstream">Downstream (3′)</option>
                  <option value="upstream">Upstream (5′)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ── SEQUENCE INPUT ── */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.42rem',flexWrap:'wrap',gap:'.4rem'}}>
            <label className="lbl" style={{margin:0}}>DNA Sequence</label>
            <div style={{display:'flex',gap:'.38rem',flexWrap:'wrap'}}>
              <label className="btn-sample" style={{cursor:'pointer',margin:0}}>
                <span>📁</span> FASTA
                <input type="file" accept=".fasta,.fa,.txt" onChange={handleFileUpload} style={{display:'none'}}/>
              </label>
              <button className="btn-sample" onClick={loadSample}><span>⚡</span> Sample</button>
            </div>
          </div>
          <textarea rows={5} value={sequence} onChange={e=>setSequence(e.target.value)} placeholder="Paste your target gene region here or upload a FASTA file…"/>
          {sequence && (
            <div style={{marginTop:'.4rem',fontSize:'.68rem',color:'#252837',fontFamily:'"JetBrains Mono",monospace'}}>
              {sequence.toUpperCase().replace(/[^ATGC]/g,'').length} bp valid bases
            </div>
          )}
        </div>

        {error && (
          <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.25)',borderRadius:8,padding:'.6rem .82rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.48rem'}}>
            <span>⚠️</span><span style={{fontSize:'.76rem',color:'#F87171'}}>{error}</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── TAB: CRISPR ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'crispr' && (
          <>
            <button className="btn-primary" onClick={handleFind} disabled={loading}>
              {loading ? <><span className="spin"></span> Scanning…</> : <><span>🔍</span> Find PAM Sites</>}
            </button>

            {pamSites && (
              <div className="fade-in">
                {/* Summary stats */}
                <div style={{marginTop:'1.75rem'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.6rem',flexWrap:'wrap',gap:'.45rem'}}>
                    <span style={{fontSize:'.74rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.07em'}}>
                      Results — <span style={{color:'#34D399'}}>{casConfig.name}</span> · PAM <span style={{fontFamily:'"JetBrains Mono",monospace',color:'#FBBF24'}}>{casConfig.pam}</span>
                    </span>
                    <div style={{position:'relative'}}>
                      <button className="btn-export" onClick={e=>{e.stopPropagation();setShowExportMenu(v=>!v)}}>
                        <span>📥</span> Export <span style={{fontSize:'.7rem'}}>▼</span>
                      </button>
                      {showExportMenu && (
                        <div className="export-menu" onClick={e=>e.stopPropagation()}>
                          <div className="export-item" onClick={()=>exportTXT(false)}><strong>TXT Summary</strong><div style={{fontSize:'.7rem',color:'#3d4155',marginTop:'.12rem'}}>Basic statistics</div></div>
                          <div className="export-item" onClick={()=>exportTXT(true)}><strong>TXT Detailed</strong><div style={{fontSize:'.7rem',color:'#3d4155',marginTop:'.12rem'}}>All sites + sequences</div></div>
                          <div className="export-item" onClick={()=>exportPDF(false)}><strong>PDF Summary</strong><div style={{fontSize:'.7rem',color:'#3d4155',marginTop:'.12rem'}}>For reports</div></div>
                          <div className="export-item" onClick={()=>exportPDF(true)}><strong>PDF Detailed</strong><div style={{fontSize:'.7rem',color:'#3d4155',marginTop:'.12rem'}}>Full data incl. primers</div></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="stat-grid">
                    <div className="stat-box"><div className="stat-val" style={{color:'#fff'}}>{pamSites.total}</div><div className="stat-lbl">Total Sites</div></div>
                    <div className="stat-box"><div className="stat-val" style={{color:'#34D399'}}>{pamSites.forward}</div><div className="stat-lbl">Forward (+)</div></div>
                    <div className="stat-box"><div className="stat-val" style={{color:'#60A5FA'}}>{pamSites.reverse}</div><div className="stat-lbl">Reverse (−)</div></div>
                    <div className="stat-box"><div className="stat-val" style={{color:'#6b7080',fontSize:'1.1rem'}}>{pamSites.seqLen}<span style={{fontSize:'.55rem',fontWeight:400}}> bp</span></div><div className="stat-lbl">Seq Length</div></div>
                  </div>
                </div>

                {/* AI button */}
                <div style={{marginTop:'1rem'}}>
                  <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
                    {loadingAI ? <><span className="spin"></span> Generating AI Analysis…</> : <>✨ Get AI Explanation</>}
                  </button>
                </div>
                {aiExplanation && (
                  <div style={{background:'rgba(99,102,241,.07)',border:'1px solid rgba(99,102,241,.25)',borderRadius:12,padding:'1.1rem',marginTop:'.85rem'}}>
                    <div style={{fontSize:'.8rem',fontWeight:600,color:'#818cf8',marginBottom:'.5rem'}}>AI Analysis</div>
                    <div style={{fontSize:'.84rem',color:'#e2e4e9',lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:400,overflowY:'auto',background:'rgba(0,0,0,.2)',borderRadius:8,padding:'.7rem',border:'1px solid #14161e'}}>{aiExplanation}</div>
                  </div>
                )}

                {/* Efficiency bars */}
                {pamSites.total > 0 && (
                  <div className="card" style={{marginTop:'1.2rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.65rem'}}>
                      <span style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.06em'}}>Efficiency Breakdown</span>
                      <div style={{display:'flex',gap:'.7rem'}}>
                        {['High','Medium','Low'].map(e=>(
                          <span key={e} style={{fontSize:'.63rem',color:effColor(e),display:'flex',alignItems:'center',gap:'.22rem'}}>
                            <span style={{width:5,height:5,borderRadius:'50%',background:effColor(e),display:'inline-block'}}></span>{e}
                          </span>
                        ))}
                      </div>
                    </div>
                    {['High','Medium','Low'].map(e => {
                      const cnt = pamSites.sites.filter(s=>s.efficiency===e).length;
                      const pct = pamSites.total ? (cnt/pamSites.total)*100 : 0;
                      return (
                        <div key={e} style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'.4rem'}}>
                          <span style={{width:46,fontSize:'.7rem',color:effColor(e),fontWeight:600}}>{e}</span>
                          <div style={{flex:1}}><div className="bar-track"><div className="bar-fill" style={{width:`${pct}%`,background:effColor(e)}}></div></div></div>
                          <span style={{width:40,fontSize:'.66rem',color:'#3d4155',textAlign:'right'}}>{cnt} ({pct.toFixed(0)}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Annotated sequence */}
                {pamSites.total > 0 && (
                  <div className="card" style={{marginTop:'1.2rem'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.55rem'}}>
                      <span style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.06em'}}>Annotated Sequence</span>
                      <div style={{display:'flex',gap:'.9rem',fontSize:'.65rem'}}>
                        <span style={{color:'#34D399'}}>■ PAM (+)</span>
                        <span style={{color:'#60A5FA'}}>■ PAM (−)</span>
                        <span style={{color:'#34D399',borderBottom:'2px solid #34D399',paddingBottom:1}}>guide (+)</span>
                        <span style={{color:'#60A5FA',borderBottom:'2px solid #60A5FA',paddingBottom:1}}>guide (−)</span>
                      </div>
                    </div>
                    <div className="seq-display">
                      {(() => {
                        const s = sequence.toUpperCase().replace(/[^ATGC]/g,'');
                        const map = Array.from({length:s.length},()=>({pam:null,guide:null}));
                        pamSites.sites.forEach(site => {
                          const pS=site.position-1, pE=site.positionEnd, gS=site.guideStart-1, gE=site.guideEnd;
                          for(let i=pS;i<pE&&i<s.length;i++) map[i].pam=site.strand;
                          for(let i=gS;i<gE&&i<s.length;i++) if(!map[i].guide) map[i].guide=site.strand;
                        });
                        const chunks=[];let cur=null;
                        map.forEach((m,i)=>{
                          const key=`${m.pam||'_'}|${m.guide||'_'}`;
                          if(cur&&cur.key===key){cur.end=i+1;}
                          else{cur={key,pam:m.pam,guide:m.guide,start:i,end:i+1};chunks.push(cur);}
                        });
                        return chunks.map((c,i)=>{
                          let cls='';
                          if(c.pam==='forward') cls+=' pam-fwd';
                          else if(c.pam==='reverse') cls+=' pam-rev';
                          if(!c.pam&&c.guide==='forward') cls+=' guide-fwd';
                          else if(!c.pam&&c.guide==='reverse') cls+=' guide-rev';
                          return <span key={i} className={cls.trim()}>{s.substring(c.start,c.end)}</span>;
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* Sites table */}
                {pamSites.total > 0 && (
                  <div className="card" style={{marginTop:'1.2rem',padding:0,overflow:'hidden'}}>
                    <div style={{padding:'.8rem 1rem .45rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.06em'}}>PAM Sites · {pamSites.total} found</span>
                    </div>
                    <div style={{overflowX:'auto'}}>
                      <table className="results-table">
                        <thead><tr><th>#</th><th>Position</th><th>Strand</th><th>PAM</th><th>sgRNA Sequence</th><th>GC %</th><th>Efficiency</th></tr></thead>
                        <tbody>
                          {pamSites.sites.map((s,i)=>(
                            <tr key={i}>
                              <td style={{color:'#3d4155',fontWeight:600}}>{i+1}</td>
                              <td style={{color:'#6b7080'}}>{s.position}–{s.positionEnd}</td>
                              <td><span className="strand-badge" style={{background:s.strand==='forward'?'rgba(52,211,153,.1)':'rgba(96,165,250,.1)',color:s.strand==='forward'?'#34D399':'#60A5FA'}}>{s.strand==='forward'?'(+) Fwd':'(−) Rev'}</span></td>
                              <td style={{color:s.strand==='forward'?'#34D399':'#60A5FA',fontWeight:600}}>{s.pamSequence}</td>
                              <td style={{color:'#a0a3b1',fontSize:'.72rem',maxWidth:210,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={s.guideRNA}>{s.guideRNA}</td>
                              <td style={{color:'#6b7080'}}>{s.gcContent}</td>
                              <td><span className="eff-badge" style={{background:effBg(s.efficiency),color:effColor(s.efficiency)}}>{s.efficiency}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {pamSites.total === 0 && (
                  <div className="card" style={{marginTop:'1.4rem',textAlign:'center',padding:'2.2rem 1.5rem'}}>
                    <div style={{fontSize:'1.8rem',marginBottom:'.4rem'}}>🔍</div>
                    <p style={{color:'#a0a3b1',fontWeight:600,fontSize:'.84rem'}}>No PAM sites found</p>
                    <p style={{color:'#3d4155',fontSize:'.73rem',marginTop:'.28rem'}}>Try a different Cas enzyme or verify your sequence.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ── TAB: PRIMER DESIGN ── */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {activeTab === 'primer' && (
          <div className="fade-in">
            {/* Application mode */}
            <div className="card">
              <label className="lbl">Application Mode</label>
              <select value={primerAppMode} onChange={e=>{setPrimerAppMode(e.target.value);setPrimerResult(null);setPrimerError('');}}>
                <option value="diagnostic">Diagnostic PCR · 400–700 bp amplicon</option>
                <option value="cloning">Cloning · 100–3000 bp amplicon</option>
                <option value="qpcr">qPCR · 70–200 bp amplicon</option>
                <option value="mutation">Mutation Detection · 150–400 bp amplicon</option>
              </select>
              <div style={{marginTop:'.65rem',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.5rem'}}>
                {Object.entries(AMPLICON_RANGES).map(([key,v])=>(
                  <div key={key} onClick={()=>{setPrimerAppMode(key);setPrimerResult(null);setPrimerError('');}}
                    style={{background:primerAppMode===key?'rgba(129,140,248,.12)':'#0e1018',border:`1px solid ${primerAppMode===key?'rgba(129,140,248,.4)':'#1e2130'}`,
                      borderRadius:8,padding:'.45rem .5rem',cursor:'pointer',transition:'all .18s',textAlign:'center'}}>
                    <div style={{fontSize:'.72rem',fontWeight:600,color:primerAppMode===key?'#818cf8':'#3d4155'}}>{v.label}</div>
                    <div style={{fontSize:'.62rem',color:'#252837',marginTop:'.12rem',fontFamily:'"JetBrains Mono",monospace'}}>{v.min}–{v.max} bp</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Thermodynamic constraints reference */}
            <div className="card" style={{borderColor:'#1a1d28'}}>
              <div style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.65rem'}}>Thermodynamic Constraints Applied</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'.45rem'}}>
                {[
                  ['Primer Length','18–22 bp','#34D399'],
                  ['GC Content','40–60%','#34D399'],
                  ['Melting Tm','58–65°C','#60A5FA'],
                  ['ΔTm','≤ 3°C','#60A5FA'],
                  ['Hairpin ΔG','> −3 kcal/mol','#FBBF24'],
                  ['Self-Dimer ΔG','> −5 kcal/mol','#FBBF24'],
                  ['Cross-Dimer ΔG','> −6 kcal/mol','#F87171'],
                  ['GC Clamp (3′)','1–2 GC bases','#34D399'],
                ].map(([k,v,c])=>(
                  <div key={k} style={{background:'#080a10',border:'1px solid #14161e',borderRadius:7,padding:'.42rem .55rem'}}>
                    <div style={{fontSize:'.63rem',color:'#252837',fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em'}}>{k}</div>
                    <div style={{fontSize:'.76rem',color:c,fontFamily:'"JetBrains Mono",monospace',fontWeight:600,marginTop:'.1rem'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:'.65rem',fontSize:'.7rem',color:'#252837',lineHeight:1.6}}>
                Model: SantaLucia 1998 nearest-neighbor · [oligo] = 250 nM · [Na⁺] = 50 mM · Scoring: 25% Tm · 20% GC · 20% structure · 15% dimer · 10% clamp · 10% specificity
              </div>
            </div>

            {primerError && (
              <div style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.25)',borderRadius:8,padding:'.6rem .82rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:'.48rem'}}>
                <span>⚠️</span><span style={{fontSize:'.76rem',color:'#F87171'}}>{primerError}</span>
              </div>
            )}

            <button className="btn-primer" onClick={handlePrimerDesign} disabled={primerLoading||!sequence.trim()}>
              {primerLoading ? <><span className="spin"></span> Running Thermodynamic Analysis…</> : <><span>🧪</span> Design Optimal Primers</>}
            </button>

            {/* ── PRIMER RESULTS ── */}
            {primerResult && (
              <div className="fade-in" style={{marginTop:'1.75rem'}}>
                {/* Classification banner */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem',flexWrap:'wrap',gap:'.6rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.7rem'}}>
                    <span style={{background:classBg(primerResult.classification),border:`1px solid ${classColor(primerResult.classification)}44`,
                      color:classColor(primerResult.classification),padding:'.28rem .75rem',borderRadius:20,
                      fontSize:'.72rem',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase'}}>
                      {primerResult.classification === 'Excellent' ? '⭐ ' : primerResult.classification === 'Good' ? '✅ ' : primerResult.classification === 'Borderline' ? '⚠️ ' : '❌ '}
                      {primerResult.classification}
                    </span>
                    <span style={{fontSize:'1.1rem',fontWeight:700,color:classColor(primerResult.classification)}}>{primerResult.overall_score}</span>
                    <span style={{fontSize:'.7rem',color:'#3d4155'}}>overall</span>
                  </div>
                  <div style={{display:'flex',gap:'1rem',fontSize:'.72rem',color:'#3d4155'}}>
                    <span>Amplicon: <b style={{color:'#a0a3b1'}}>{primerResult.amplicon_size}</b></span>
                    <span>Anneal: <b style={{color:'#a0a3b1'}}>{primerResult.annealing_temperature}</b></span>
                    <span>ΔTm: <b style={{color:'#a0a3b1'}}>{primerResult.Tm_difference}</b></span>
                    <span>Specificity: <b style={{color:'#818cf8'}}>{primerResult.specificity_score}</b></span>
                  </div>
                </div>

                {/* Warnings */}
                {primerResult.warnings?.length > 0 && (
                  <div style={{marginBottom:'1rem'}}>
                    {primerResult.warnings.map((w,i)=>(
                      <div key={i} className="warning-item"><span>⚠</span><span>{w}</span></div>
                    ))}
                  </div>
                )}

                {/* Primer pair cards */}
                <div className="primer-grid">
                  {[
                    ['forward_primer','→ Forward Primer','#34D399'],
                    ['reverse_primer','← Reverse Primer','#60A5FA'],
                  ].map(([key,label,color])=>{
                    const p = primerResult[key];
                    return (
                      <div key={key} className="primer-card">
                        <div style={{fontSize:'.7rem',fontWeight:700,color,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:'.55rem'}}>{label}</div>
                        <div className="primer-seq">{p.sequence}</div>
                        {[
                          ['Length', p.length],
                          ['Tm (NN model)', p.Tm],
                          ['GC Content', p.GC_percent],
                          ['Hairpin ΔG', p.hairpin_dG],
                          ['Self-Dimer ΔG', p.self_dimer_dG],
                          ['3′ Stability ΔG', p.three_prime_stability_dG],
                          ['Last 5bp GC%', p.last_5bp_GC_percent],
                        ].map(([k,v])=>(
                          <div key={k} className="metric-row">
                            <span className="metric-key">{k}</span>
                            <span className="metric-val" style={{
                              color: (k.includes('ΔG')&&parseFloat(v)<-2)?'#FBBF24':(k.includes('ΔG')&&parseFloat(v)<-4)?'#F87171':'#c8cad4'
                            }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* Cross-dimer */}
                <div className="card" style={{marginTop:'1rem',borderColor: parseFloat(primerResult.cross_dimer_dG)<-4?'rgba(248,113,113,.3)':'#1e2130'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.07em'}}>Cross-Dimer ΔG</span>
                    <span style={{fontFamily:'"JetBrains Mono",monospace',fontSize:'.88rem',fontWeight:600,
                      color:parseFloat(primerResult.cross_dimer_dG)<-4?'#F87171':parseFloat(primerResult.cross_dimer_dG)<-2?'#FBBF24':'#34D399'}}>
                      {primerResult.cross_dimer_dG}
                    </span>
                  </div>
                  <div style={{fontSize:'.68rem',color:'#252837',marginTop:'.3rem'}}>
                    Reject threshold: &lt; −6 kcal/mol · {parseFloat(primerResult.cross_dimer_dG) > -6 ? '✅ Within safe range' : '❌ Exceeds threshold'}
                  </div>
                </div>

                {/* Full JSON output */}
                <div className="card" style={{marginTop:'1rem'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.65rem'}}>
                    <span style={{fontSize:'.72rem',fontWeight:700,color:'#3d4155',textTransform:'uppercase',letterSpacing:'.07em'}}>Structured JSON Output</span>
                    <button className="btn-ghost" onClick={()=>{
                      navigator.clipboard?.writeText(JSON.stringify(primerResult, null, 2));
                    }} style={{fontSize:'.7rem',padding:'.3rem .65rem'}}>
                      📋 Copy JSON
                    </button>
                  </div>
                  <div className="json-block">
                    <JsonRenderer data={primerResult}/>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── JSON SYNTAX HIGHLIGHTER ──────────────────────────────────────────────────
function JsonRenderer({ data, indent = 0 }) {
  const pad = ' '.repeat(indent * 2);
  const pad1 = ' '.repeat((indent + 1) * 2);

  if (Array.isArray(data)) {
    if (data.length === 0) return <span style={{color:'#6b7080'}}>[]</span>;
    return (
      <>
        <span style={{color:'#6b7080'}}>{'['}</span>{'\n'}
        {data.map((v, i) => (
          <span key={i}>
            {pad1}<JsonRenderer data={v} indent={indent+1}/>{i < data.length-1 ? ',' : ''}{'\n'}
          </span>
        ))}
        {pad}<span style={{color:'#6b7080'}}>{']'}</span>
      </>
    );
  }
  if (data !== null && typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span style={{color:'#6b7080'}}>{'{}'}</span>;
    return (
      <>
        <span style={{color:'#6b7080'}}>{'{'}</span>{'\n'}
        {keys.map((k, i) => (
          <span key={k}>
            {pad1}<span className="json-key">"{k}"</span><span style={{color:'#6b7080'}}>: </span>
            <JsonRenderer data={data[k]} indent={indent+1}/>{i < keys.length-1 ? ',' : ''}{'\n'}
          </span>
        ))}
        {pad}<span style={{color:'#6b7080'}}>{'}'}</span>
      </>
    );
  }
  if (typeof data === 'string') return <span className="json-str">"{data}"</span>;
  if (typeof data === 'number') return <span className="json-num">{data}</span>;
  if (data === null) return <span className="json-null">null</span>;
  return <span>{String(data)}</span>;
}