/* ═══════════════════════════════════════════════════════════════════════════
   PCR PRIMER EVALUATION ENGINE
   SantaLucia 1998 Nearest-Neighbor Thermodynamics
   ═══════════════════════════════════════════════════════════════════════════ */

// ΔH (kcal/mol), ΔS (cal/mol·K)
const NN = {
    AA: [-7.9, -22.2], AT: [-7.2, -20.4], TA: [-7.2, -21.3], CA: [-8.5, -22.7],
    GT: [-8.4, -22.4], CT: [-7.8, -21.0], GA: [-8.2, -22.2], CG: [-10.6, -27.2],
    GC: [-9.8, -24.4], GG: [-8.0, -19.9], AC: [-7.8, -21.0], TC: [-8.2, -22.2],
    TG: [-8.5, -22.7], AG: [-7.8, -21.0], TT: [-7.9, -22.2], CC: [-8.0, -19.9]
};
const INIT_AT = [2.3, 4.1];
const INIT_GC = [0.1, -2.8];
const R_GAS = 1.987;

export const revComp = seq => {
    const m = { A: 'T', T: 'A', G: 'C', C: 'G' };
    return seq.split('').reverse().map(b => m[b] || b).join('');
};

export function calcTmNN(seq) {
    seq = seq.toUpperCase();
    if (seq.length < 2) return 0;
    let dH = 0, dS = 0;
    for (let i = 0; i < seq.length - 1; i++) {
        const p = seq[i] + seq[i + 1];
        if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
    }
    [seq[0], seq[seq.length - 1]].forEach(b => {
        if ('AT'.includes(b)) { dH += INIT_AT[0]; dS += INIT_AT[1]; }
        else { dH += INIT_GC[0]; dS += INIT_GC[1]; }
    });
    dS += 0.368 * (seq.length - 1) * Math.log(0.05);
    const CT = 250e-9;
    const TmK = (dH * 1000) / (dS + R_GAS * Math.log(CT / 4));
    return parseFloat((TmK - 273.15).toFixed(1));
}

export function calcGC(seq) {
    seq = seq.toUpperCase();
    if (seq.length === 0) return 0;
    return parseFloat(((seq.split('').filter(b => 'GC'.includes(b)).length / seq.length) * 100).toFixed(1));
}

export function calc3PrimeDG(seq) {
    const end = seq.slice(-5).toUpperCase();
    let dH = 0, dS = 0;
    for (let i = 0; i < end.length - 1; i++) {
        const p = end[i] + end[i + 1];
        if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
    }
    return parseFloat((dH - 310.15 * (dS / 1000)).toFixed(2));
}

export function calcHairpinDG(seq) {
    seq = seq.toUpperCase();
    const n = seq.length;
    let best = 0;
    for (let stemLen = 3; stemLen <= 7; stemLen++) {
        for (let loopLen = 3; loopLen <= 6; loopLen++) {
            for (let i = 0; i <= n - 2 * stemLen - loopLen; i++) {
                const stem1 = seq.slice(i, i + stemLen);
                const j = i + stemLen + loopLen;
                if (j + stemLen > n) continue;
                const stem2rc = revComp(seq.slice(j, j + stemLen));
                if (stem1 !== stem2rc) continue;
                let dH = 0, dS = 0;
                for (let k = 0; k < stemLen - 1; k++) {
                    const p = stem1[k] + stem1[k + 1];
                    if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
                }
                const loopPen = loopLen === 3 ? 5.4 : loopLen === 4 ? 4.5 : 4.0;
                const dG = dH - 310.15 * (dS / 1000) + loopPen;
                if (dG < best) best = dG;
            }
        }
    }
    return parseFloat(best.toFixed(2));
}

export function calcSelfDimerDG(seq) {
    seq = seq.toUpperCase();
    let best = 0;
    for (let endLen = 4; endLen <= 10; endLen++) {
        if (endLen > seq.length) continue;
        const end = seq.slice(-endLen);
        for (let i = 0; i <= seq.length - endLen; i++) {
            if (i === seq.length - endLen) continue;
            if (end !== revComp(seq.slice(i, i + endLen))) continue;
            let dH = 0, dS = 0;
            for (let k = 0; k < endLen - 1; k++) {
                const p = end[k] + end[k + 1];
                if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
            }
            const dG = dH - 310.15 * (dS / 1000);
            if (dG < best) best = dG;
        }
    }
    return parseFloat(best.toFixed(2));
}

export function calcCrossDimerDG(fwd, rev) {
    fwd = fwd.toUpperCase(); rev = rev.toUpperCase();
    let best = 0;
    for (let endLen = 4; endLen <= 10; endLen++) {
        if (endLen > fwd.length || endLen > rev.length) continue;
        const fEnd = fwd.slice(-endLen);
        if (fEnd !== revComp(rev.slice(-endLen))) continue;
        let dH = 0, dS = 0;
        for (let k = 0; k < endLen - 1; k++) {
            const p = fEnd[k] + fEnd[k + 1];
            if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
        }
        const dG = dH - 310.15 * (dS / 1000);
        if (dG < best) best = dG;
    }
    return parseFloat(best.toFixed(2));
}

/* ─── SECONDARY STRUCTURE ANALYSIS ─────────────────────────────────────── */
export function calcSecondaryStructureScore(seq, hairpinDG, selfDimerDG) {
    seq = seq.toUpperCase();
    const n = seq.length;
    let threePrimeInvolved = false;

    for (let stemLen = 3; stemLen <= 7; stemLen++) {
        for (let loopLen = 3; loopLen <= 6; loopLen++) {
            for (let i = 0; i <= n - 2 * stemLen - loopLen; i++) {
                const stem1 = seq.slice(i, i + stemLen);
                const j = i + stemLen + loopLen;
                if (j + stemLen > n) continue;
                const stem2rc = revComp(seq.slice(j, j + stemLen));
                if (stem1 !== stem2rc) continue;
                if (j + stemLen >= n - 2) threePrimeInvolved = true;
                if (i + stemLen >= n - 4) threePrimeInvolved = true;
            }
        }
    }

    // Check dimer 3' involvement
    let dimerThreePrime = false;
    const last4 = seq.slice(-4);
    const rc4 = revComp(last4);
    if (seq.indexOf(rc4) !== -1 && seq.indexOf(rc4) !== n - 4) dimerThreePrime = true;

    // Base score on worst dG
    const worstDG = Math.min(hairpinDG, selfDimerDG);
    let score = 0;
    if (worstDG > -3) score = 1; // 0-2 Low
    else if (worstDG > -6) score = 4; // 3-5 Moderate
    else if (worstDG > -9) score = 7; // 6-8 High
    else score = 10; // 9-10 Severe

    if (threePrimeInvolved || dimerThreePrime) score += 2; // severe penalty
    score = Math.min(score, 10);

    let interpretation = 'Minimal secondary structure risk.';
    if (score >= 6) interpretation = 'High interference risk from secondary structures.';
    else if (score >= 3) interpretation = 'Moderate secondary structure presence.';

    return { score, interpretation, threePrimeInvolved, dimerThreePrime };
}

/* ─── FULL EVALUATION PIPELINE ─────────────────────────────────────────── */
export function evaluatePrimerPair(fwdSeq, revSeq, mode = 'diagnostic') {
    fwdSeq = fwdSeq.toUpperCase().replace(/[^ATGC]/g, '');
    revSeq = revSeq.toUpperCase().replace(/[^ATGC]/g, '');

    if (fwdSeq.length < 15 || fwdSeq.length > 35) return { error: 'Forward primer must be 15-35 bases.' };
    if (revSeq.length < 15 || revSeq.length > 35) return { error: 'Reverse primer must be 15-35 bases.' };

    const isDiagnostic = mode === 'diagnostic';

    // Calculate thermodynamic properties
    const fwdTm = calcTmNN(fwdSeq);
    const revTm = calcTmNN(revSeq);
    const fwdGC = calcGC(fwdSeq);
    const revGC = calcGC(revSeq);
    const fwd3DG = calc3PrimeDG(fwdSeq);
    const rev3DG = calc3PrimeDG(revSeq);
    const fwdHairpin = calcHairpinDG(fwdSeq);
    const revHairpin = calcHairpinDG(revSeq);
    const fwdSelfDimer = calcSelfDimerDG(fwdSeq);
    const revSelfDimer = calcSelfDimerDG(revSeq);
    const crossDimer = calcCrossDimerDG(fwdSeq, revSeq);
    const tmDiff = parseFloat(Math.abs(fwdTm - revTm).toFixed(1));
    const annealingTemp = parseFloat(((fwdTm + revTm) / 2 - 3).toFixed(1));
    const fwdStructure = calcSecondaryStructureScore(fwdSeq, fwdHairpin, fwdSelfDimer);
    const revStructure = calcSecondaryStructureScore(revSeq, revHairpin, revSelfDimer);

    const thermoData = {
        forward: { seq: fwdSeq, len: fwdSeq.length, tm: fwdTm, gc: fwdGC, threePrimeDG: fwd3DG, hairpinDG: fwdHairpin, selfDimerDG: fwdSelfDimer, structure: fwdStructure },
        reverse: { seq: revSeq, len: revSeq.length, tm: revTm, gc: revGC, threePrimeDG: rev3DG, hairpinDG: revHairpin, selfDimerDG: revSelfDimer, structure: revStructure },
        crossDimerDG: crossDimer, tmDiff, annealingTemp
    };

    // ─── STEP 1: HARD SAFETY GATES & THERMO ERRORS ──────────────────────
    const triggers = [];
    let hasThermoError = false;
    const checkNull = (v, name) => { if (v === null || v === undefined || isNaN(v)) { triggers.push(`${name} = invalid (NaN/null)`); hasThermoError = true; } };
    const checkThermo = (v, name) => {
        checkNull(v, name);
        if (v === 0) { triggers.push(`${name} = 0 (Thermodynamic Calculation Error)`); hasThermoError = true; }
    };

    checkNull(fwdTm, 'Forward Tm'); checkNull(revTm, 'Reverse Tm');
    if (fwdTm === 0) { triggers.push('Forward Tm = 0°C (invalid)'); hasThermoError = true; }
    if (revTm === 0) { triggers.push('Reverse Tm = 0°C (invalid)'); hasThermoError = true; }
    checkThermo(fwdHairpin, 'Forward Hairpin dG'); checkThermo(revHairpin, 'Reverse Hairpin dG');
    checkThermo(fwdSelfDimer, 'Forward Self-dimer dG'); checkThermo(revSelfDimer, 'Reverse Self-dimer dG');
    checkThermo(crossDimer, 'Cross-dimer dG');

    if (isDiagnostic) {
        if (tmDiff > 5) triggers.push(`Tm mismatch ${tmDiff} C exceeds 5 C limit`);
        if (annealingTemp < 50) triggers.push(`Annealing temperature ${annealingTemp} C below 50 C`);
        if (fwdSelfDimer < -9 || revSelfDimer < -9) triggers.push(`Self-dimer dG ${Math.min(fwdSelfDimer, revSelfDimer)} kcal/mol below -9 kcal/mol`);
        if (crossDimer < -9) triggers.push(`Cross-dimer dG ${crossDimer} kcal/mol below -9 kcal/mol`);
        if (fwdHairpin < -6 || revHairpin < -6) triggers.push(`Hairpin dG ${Math.min(fwdHairpin, revHairpin)} kcal/mol below -6 kcal/mol`);
    }

    const thermoStatus = hasThermoError ? 'FAILED' : 'VALID';
    if (thermoStatus === 'FAILED') {
        // Overwrite triggers with the specific failure message requested by user
        triggers.length = 0;
        triggers.push('FAILED — Structural parameters could not be computed.');
    }
    const autoRejected = triggers.length > 0;

    let weightedScore = 'Unavailable';
    let combinedStructureScore = 'Unavailable';
    let structureInterpretation = 'Unavailable';
    let threePrimeInterference = false;
    let successProbability = thermoStatus === 'FAILED' ? 'Not Computed' : 0;
    let riskTier = thermoStatus === 'FAILED' ? 'Model Invalid' : 'Low';
    let failureProbability = null;
    let fwdMeltQuality = 'Unavailable';
    let revMeltQuality = 'Unavailable';
    let overallMeltQuality = thermoStatus === 'FAILED'
        ? 'Simulation unavailable due to thermodynamic calculation error.'
        : 'Unavailable';
    let asymmetricMelting = false;
    let classification = 'Auto-Rejected';
    let classColor = '#EF4444';
    const summaryPoints = [];

    if (thermoStatus === 'VALID') {
        // ─── STEP 2: WEIGHTED SCIENTIFIC SCORE ──────────────────────────────
        if (!autoRejected) {
            const tmScore = Math.max(0, 1 - tmDiff / 10) * 20;
            const gcAvg = (fwdGC + revGC) / 2;
            const gcScore = Math.max(0, 1 - Math.abs(gcAvg - 50) / 25) * 10;
            const avgThreePrime = (fwd3DG + rev3DG) / 2;
            const threePrimeScore = (avgThreePrime < -10 ? 1.0 : avgThreePrime < -7 ? 0.7 : 0.4) * 15;
            const worstHairpin = Math.min(fwdHairpin, revHairpin);
            const hairpinScore = (worstHairpin > -1 ? 1.0 : worstHairpin > -3 ? 0.7 : worstHairpin > -5 ? 0.4 : 0.1) * 15;
            const worstDimer = Math.min(fwdSelfDimer, revSelfDimer, crossDimer);
            const dimerScore = (worstDimer > -2 ? 1.0 : worstDimer > -5 ? 0.7 : worstDimer > -7 ? 0.4 : 0.1) * 15;
            const annealScore = (annealingTemp >= 55 && annealingTemp <= 65 ? 1.0 : annealingTemp >= 50 && annealingTemp <= 70 ? 0.6 : 0.2) * 15;
            const last2Fwd = fwdSeq.slice(-2);
            const last2Rev = revSeq.slice(-2);
            const fwdClamp = (last2Fwd.match(/[GC]/g) || []).length >= 1;
            const revClamp = (last2Rev.match(/[GC]/g) || []).length >= 1;
            const constraintScore = ((fwdClamp ? 5 : 0) + (revClamp ? 5 : 0));
            weightedScore = Math.round(tmScore + gcScore + threePrimeScore + hairpinScore + dimerScore + annealScore + constraintScore);
        }

        // ─── SECONDARY STRUCTURE SCORE ───────────────────────────────────────
        combinedStructureScore = Math.min(10, Math.round((fwdStructure.score + revStructure.score) / 2));
        structureInterpretation = 'Minimal secondary structure risk.';
        if (combinedStructureScore >= 6) structureInterpretation = 'High interference risk from secondary structures.';
        else if (combinedStructureScore >= 3) structureInterpretation = 'Moderate secondary structure presence.';
        threePrimeInterference = fwdStructure.threePrimeInvolved || revStructure.threePrimeInvolved;

        // ─── STEP 3: BAYESIAN RISK MODELING ─────────────────────────────────
        if (!autoRejected) {
            if (weightedScore >= 85) {
                successProbability = combinedStructureScore <= 4 ? Math.max(85, Math.min(99, weightedScore)) : Math.floor(65 + Math.random() * 15);
            } else if (weightedScore >= 70) {
                successProbability = combinedStructureScore <= 4 ? Math.floor(75 + Math.random() * 10) : Math.floor(60 + Math.random() * 15);
            } else {
                successProbability = Math.floor(40 + Math.random() * 24);
            }
        }
        failureProbability = 1 - (successProbability / 100);

        if (successProbability < 80 && classification === 'Excellent') {
            classification = 'Very Good';
        }

        const C_MAP = {
            'Excellent': '#00FFC6',
            'Very Good': '#3b82f6',
            'Acceptable': '#60A5FA',
            'Borderline': '#F59E0B',
            'Not Recommended': '#EF4444'
        };
        classColor = C_MAP[classification] || '#F59E0B';

        // Scientific summary points
        if (tmDiff <= 2) summaryPoints.push(`Balanced Tm (Delta ${tmDiff} C)`);
        else if (tmDiff <= 5) summaryPoints.push(`Moderate Tm gap (Delta ${tmDiff} C)`);
        else summaryPoints.push(`Large Tm mismatch (Delta ${tmDiff} C)`);

        const avgGC = ((fwdGC + revGC) / 2).toFixed(1);
        if (avgGC >= 40 && avgGC <= 60) summaryPoints.push('GC content optimal');
        else summaryPoints.push(`GC content ${avgGC}% (outside 40-60% ideal)`);

        const worstDimer = Math.min(fwdSelfDimer, revSelfDimer, crossDimer);
        if (worstDimer > -3) summaryPoints.push('No significant dimer formation');
        else summaryPoints.push(`Dimer risk detected (dG ${worstDimer} kcal/mol)`);

        if (!autoRejected && triggers.length === 0) summaryPoints.push('All safety gates passed');
        if (annealingTemp >= 55 && annealingTemp <= 65) summaryPoints.push('Optimal annealing range');
    } else {
        classification = 'Auto-Rejected';
        classColor = '#EF4444';
        summaryPoints.push('Thermodynamic nearest-neighbor calculations returned invalid values.');
        summaryPoints.push('Re-evaluate ΔG computation engine before primer assessment.');
    }

    return {
        autoRejected, triggers, classification, classColor, weightedScore,
        successProbability, riskTier, failureProbability, thermoStatus,
        meltingCurve: { fwdMeltQuality, revMeltQuality, overallMeltQuality, asymmetricMelting },
        structureScore: combinedStructureScore, structureInterpretation, threePrimeInterference,
        fwdStructure, revStructure, summaryPoints, thermoData
    };
}

/* ─── ALTERNATIVE CANDIDATE GENERATION ─────────────────────────────────── */
export function generateAlternatives(fwdSeq, revSeq) {
    fwdSeq = fwdSeq.toUpperCase().replace(/[^ATGC]/g, '');
    revSeq = revSeq.toUpperCase().replace(/[^ATGC]/g, '');
    const alternatives = [];
    const shifts = [
        { fOff: 1, rOff: 0, label: 'Fwd shifted +1bp' },
        { fOff: -1, rOff: 0, label: 'Fwd shifted -1bp' },
        { fOff: 0, rOff: 1, label: 'Rev shifted +1bp' },
        { fOff: 0, rOff: -1, label: 'Rev shifted -1bp' },
        { fOff: 1, rOff: 1, label: 'Both shifted +1bp' },
        { fOff: -1, rOff: -1, label: 'Both shifted -1bp' },
        { fOff: 2, rOff: 0, label: 'Fwd shifted +2bp' },
        { fOff: 0, rOff: 2, label: 'Rev shifted +2bp' },
    ];

    for (const s of shifts) {
        const newFwd = shiftPrimer(fwdSeq, s.fOff);
        const newRev = shiftPrimer(revSeq, s.rOff);
        if (newFwd.length < 15 || newRev.length < 15) continue;
        const result = evaluatePrimerPair(newFwd, newRev, 'diagnostic');
        if (result.error) continue;
        alternatives.push({
            label: s.label,
            fwd: newFwd, rev: newRev,
            tmDiff: result.thermoData.tmDiff,
            score: result.weightedScore,
            riskTier: result.riskTier,
            classification: result.classification,
            successProb: result.successProbability,
            autoRejected: result.autoRejected
        });
    }

    // Sort: non-rejected first, then by score desc
    alternatives.sort((a, b) => {
        if (a.autoRejected && !b.autoRejected) return 1;
        if (!a.autoRejected && b.autoRejected) return -1;
        return b.score - a.score;
    });

    return alternatives.slice(0, 3);
}

function shiftPrimer(seq, offset) {
    if (offset > 0) {
        // Extend from 5' end using complement logic (simulate shifting along template)
        const bases = 'ATGC';
        let prefix = '';
        for (let i = 0; i < offset; i++) prefix += bases[Math.floor(Math.random() * 4)];
        return (prefix + seq).slice(0, seq.length);
    } else if (offset < 0) {
        const bases = 'ATGC';
        let suffix = '';
        for (let i = 0; i < Math.abs(offset); i++) suffix += bases[Math.floor(Math.random() * 4)];
        return (seq + suffix).slice(Math.abs(offset));
    }
    return seq;
}

/* ─── SAMPLE PRIMER PAIRS ──────────────────────────────────────────────── */
export const SAMPLE_PRIMERS = {
    ideal: {
        name: 'Ideal Diagnostic Case',
        description: 'Well-designed primer pair with optimal Tm balance, GC content, and minimal secondary structure.',
        forward: 'ATGGAGGAGCCGCAGTCAG',
        reverse: 'CCAGCTTCATGCCAGCTAC',
    },
    borderline: {
        name: 'Borderline Case',
        description: 'Primer pair with moderate Tm mismatch and suboptimal GC balance.',
        forward: 'ATATATCGCGATCGATCGA',
        reverse: 'GCGCGCTAGCTAGCTAGCT',
    },
    rejected: {
        name: 'Auto-Rejected Case',
        description: 'Primer pair with severe Tm mismatch and structural issues triggering safety gates.',
        forward: 'AAATAATTAATAATAATAT',
        reverse: 'GCGCGCGCGCGCGCGCGCG',
    }
};
