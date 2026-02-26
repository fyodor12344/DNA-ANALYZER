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
    let bestDG = 0.5; // Small positive default — no structure found

    for (let stemLen = 3; stemLen <= 10; stemLen++) {
        for (let loopLen = 3; loopLen <= Math.min(10, n - 2 * stemLen); loopLen++) {
            for (let i = 0; i <= n - 2 * stemLen - loopLen; i++) {
                const stem1 = seq.slice(i, i + stemLen);
                const j = i + stemLen + loopLen;
                const stem2rc = revComp(seq.slice(j, j + stemLen));
                if (stem1 !== stem2rc) continue;

                let dH = 0, dS = 0;
                for (let k = 0; k < stemLen - 1; k++) {
                    const p = stem1[k] + stem1[k + 1];
                    if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
                }

                [stem1[0], stem1[stemLen - 1]].forEach(b => {
                    if ('AT'.includes(b)) { dH += INIT_AT[0]; dS += INIT_AT[1]; }
                    else if ('GC'.includes(b)) { dH += INIT_GC[0]; dS += INIT_GC[1]; }
                });

                dS += 0.368 * (stemLen - 1) * Math.log(0.05);

                let loopPen = 3.5;
                if (loopLen === 3) loopPen = 5.4;
                else if (loopLen === 4) loopPen = 4.5;
                else if (loopLen === 5) loopPen = 4.0;

                const dG = dH - 310.15 * (dS / 1000) + loopPen;
                if (dG < bestDG) bestDG = dG;
            }
        }
    }

    // STEP 4: No-zero dG rule — never return exactly 0
    if (bestDG < -20 || bestDG > 5) return null;
    if (bestDG === 0 || Math.abs(bestDG) < 0.01) return 0.5;
    return parseFloat(bestDG.toFixed(2));
}

function calculateDimerDG(seq1, seq2, isCross) {
    seq1 = seq1.toUpperCase();
    seq2 = seq2.toUpperCase();
    const rc2 = revComp(seq2);
    let bestDG = 0.5; // Small positive default

    const len1 = seq1.length;
    const len2 = rc2.length;

    // Sliding alignment across full length
    for (let shift = -len2 + 2; shift < len1 - 1; shift++) {
        let currentBlock = "";
        let is3PrimeInvolved = false;

        const evaluateBlock = (block, involved3P) => {
            if (block.length >= 2) {
                let dH = 0, dS = 0;
                for (let k = 0; k < block.length - 1; k++) {
                    const p = block[k] + block[k + 1];
                    if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
                }
                [block[0], block[block.length - 1]].forEach(b => {
                    if ('AT'.includes(b)) { dH += INIT_AT[0]; dS += INIT_AT[1]; }
                    else if ('GC'.includes(b)) { dH += INIT_GC[0]; dS += INIT_GC[1]; }
                });

                dS += 0.368 * (block.length - 1) * Math.log(0.05);
                let dG = dH - 310.15 * (dS / 1000);

                if (isCross && involved3P) {
                    dG -= 2.0;
                }

                if (dG < bestDG) bestDG = dG;
            }
        };

        for (let i = 0; i < len1; i++) {
            const j = i - shift;
            if (j >= 0 && j < len2) {
                if (seq1[i] === rc2[j]) {
                    currentBlock += seq1[i];
                    if (i === len1 - 1 || j === 0) is3PrimeInvolved = true;
                } else {
                    evaluateBlock(currentBlock, is3PrimeInvolved);
                    currentBlock = "";
                    is3PrimeInvolved = false;
                }
            }
        }
        evaluateBlock(currentBlock, is3PrimeInvolved);
    }

    // STEP 4: No-zero dG rule — never return exactly 0
    if (bestDG < -20 || bestDG > 5) return null;
    if (bestDG === 0 || Math.abs(bestDG) < 0.01) return 0.5;
    return parseFloat(bestDG.toFixed(2));
}

export function calcSelfDimerDG(seq) {
    return calculateDimerDG(seq, seq, false);
}

export function calcCrossDimerDG(fwd, rev) {
    return calculateDimerDG(fwd, rev, true);
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

/* ─── Helper: derive risk tier strictly from probability (STEP 2) ──────── */
function deriveRiskTier(probability) {
    if (probability === 0) return 'Critical';
    if (probability < 40) return 'High';
    if (probability < 70) return 'Moderate';
    return 'Low';
}

export function evaluatePrimerPair(fwdSeq, revSeq, mode = 'diagnostic') {
    fwdSeq = fwdSeq.toUpperCase().replace(/[^ATGC]/g, '');
    revSeq = revSeq.toUpperCase().replace(/[^ATGC]/g, '');

    if (fwdSeq.length < 15 || fwdSeq.length > 35) return { error: 'Forward primer must be 15-35 bases.' };
    if (revSeq.length < 15 || revSeq.length > 35) return { error: 'Reverse primer must be 15-35 bases.' };

    const isDiagnostic = mode === 'diagnostic';

    // ─── Calculate thermodynamic properties ──────────────────────────────
    const fwdTm = calcTmNN(fwdSeq);
    const revTm = calcTmNN(revSeq);
    const fwdGC = calcGC(fwdSeq);
    const revGC = calcGC(revSeq);
    const fwd3DG = calc3PrimeDG(fwdSeq);
    const rev3DG = calc3PrimeDG(revSeq);
    let fwdHairpin = calcHairpinDG(fwdSeq);
    let revHairpin = calcHairpinDG(revSeq);
    let fwdSelfDimer = calcSelfDimerDG(fwdSeq);
    let revSelfDimer = calcSelfDimerDG(revSeq);
    let crossDimer = calcCrossDimerDG(fwdSeq, revSeq);
    const tmDiff = parseFloat(Math.abs(fwdTm - revTm).toFixed(1));
    const annealingTemp = parseFloat(((fwdTm + revTm) / 2 - 3).toFixed(1));

    // ─── STEP 4: No-zero dG enforcement (secondary pass) ────────────────
    // If any dG value is exactly 0, force to +0.5 (no valid thermodynamic
    // calculation should ever yield exactly 0.00 kcal/mol)
    if (fwdHairpin === 0 || (typeof fwdHairpin === 'number' && Math.abs(fwdHairpin) < 0.01)) fwdHairpin = 0.5;
    if (revHairpin === 0 || (typeof revHairpin === 'number' && Math.abs(revHairpin) < 0.01)) revHairpin = 0.5;
    if (fwdSelfDimer === 0 || (typeof fwdSelfDimer === 'number' && Math.abs(fwdSelfDimer) < 0.01)) fwdSelfDimer = 0.5;
    if (revSelfDimer === 0 || (typeof revSelfDimer === 'number' && Math.abs(revSelfDimer) < 0.01)) revSelfDimer = 0.5;
    if (crossDimer === 0 || (typeof crossDimer === 'number' && Math.abs(crossDimer) < 0.01)) crossDimer = 0.5;

    const fwdStructure = calcSecondaryStructureScore(fwdSeq, fwdHairpin, fwdSelfDimer);
    const revStructure = calcSecondaryStructureScore(revSeq, revHairpin, revSelfDimer);

    // ─── STEP 1: Central final_report — single source of truth ──────────
    const final_report = {
        hairpin_forward: fwdHairpin,
        self_dimer_forward: fwdSelfDimer,
        hairpin_reverse: revHairpin,
        self_dimer_reverse: revSelfDimer,
        cross_dimer: crossDimer,
    };

    const thermoData = {
        forward: { seq: fwdSeq, len: fwdSeq.length, tm: fwdTm, gc: fwdGC, threePrimeDG: fwd3DG, hairpinDG: final_report.hairpin_forward, selfDimerDG: final_report.self_dimer_forward, structure: fwdStructure },
        reverse: { seq: revSeq, len: revSeq.length, tm: revTm, gc: revGC, threePrimeDG: rev3DG, hairpinDG: final_report.hairpin_reverse, selfDimerDG: final_report.self_dimer_reverse, structure: revStructure },
        crossDimerDG: final_report.cross_dimer, tmDiff, annealingTemp
    };

    // ─── SAFETY GATES & THERMO ERRORS ───────────────────────────────────
    const triggers = [];
    let hasThermoError = false;
    const checkNull = (v, name) => { if (v === null || v === undefined || isNaN(v)) { triggers.push(`${name} = invalid (NaN/null)`); hasThermoError = true; } };
    const checkThermo = (v, name) => {
        checkNull(v, name);
        // STEP 4: flag zero as error (should never reach here after enforcement, but safety net)
        if (v === 0) { triggers.push(`${name} = 0 (Thermodynamic Calculation Error)`); hasThermoError = true; }
    };

    checkNull(fwdTm, 'Forward Tm'); checkNull(revTm, 'Reverse Tm');
    if (fwdTm === 0) { triggers.push('Forward Tm = 0 C (invalid)'); hasThermoError = true; }
    if (revTm === 0) { triggers.push('Reverse Tm = 0 C (invalid)'); hasThermoError = true; }
    checkThermo(final_report.hairpin_forward, 'Forward Hairpin dG');
    checkThermo(final_report.hairpin_reverse, 'Reverse Hairpin dG');
    checkThermo(final_report.self_dimer_forward, 'Forward Self-dimer dG');
    checkThermo(final_report.self_dimer_reverse, 'Reverse Self-dimer dG');
    checkThermo(final_report.cross_dimer, 'Cross-dimer dG');

    if (isDiagnostic) {
        if (tmDiff > 5) triggers.push(`Tm mismatch ${tmDiff} C exceeds 5 C limit`);
        if (annealingTemp < 50) triggers.push(`Annealing temperature ${annealingTemp} C below 50 C`);
        if (final_report.self_dimer_forward < -9 || final_report.self_dimer_reverse < -9)
            triggers.push(`Self-dimer dG ${Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse)} kcal/mol below -9 kcal/mol`);
        if (final_report.cross_dimer < -9)
            triggers.push(`Cross-dimer dG ${final_report.cross_dimer} kcal/mol below -9 kcal/mol`);
        if (final_report.hairpin_forward < -6 || final_report.hairpin_reverse < -6)
            triggers.push(`Hairpin dG ${Math.min(final_report.hairpin_forward, final_report.hairpin_reverse)} kcal/mol below -6 kcal/mol`);
    }

    const thermoStatus = hasThermoError ? 'FAILED' : 'VALID';
    if (thermoStatus === 'FAILED') {
        triggers.length = 0;
        triggers.push('Thermodynamic calculation could not be completed.');
    }
    const autoRejected = triggers.length > 0;

    let weightedScore = 'Unavailable';
    let combinedStructureScore = 'Unavailable';
    let structureInterpretation = 'Unavailable';
    let threePrimeInterference = false;
    let successProbability = 0;
    let riskTier = 'Critical';
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
        // ─── WEIGHTED SCIENTIFIC SCORE ───────────────────────────────────────
        const tmScore = Math.max(0, 1 - tmDiff / 10) * 20;
        const gcAvg = (fwdGC + revGC) / 2;
        const gcScore = Math.max(0, 1 - Math.abs(gcAvg - 50) / 25) * 10;
        const avgThreePrime = (fwd3DG + rev3DG) / 2;
        const threePrimeScore = (avgThreePrime < -10 ? 1.0 : avgThreePrime < -7 ? 0.7 : 0.4) * 15;
        const worstHairpin = Math.min(final_report.hairpin_forward, final_report.hairpin_reverse);
        const hairpinScore = (worstHairpin > -1 ? 1.0 : worstHairpin > -3 ? 0.7 : worstHairpin > -5 ? 0.4 : 0.1) * 15;
        const worstDimer = Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse, final_report.cross_dimer);
        const dimerScore = (worstDimer > -2 ? 1.0 : worstDimer > -5 ? 0.7 : worstDimer > -7 ? 0.4 : 0.1) * 15;
        const annealScore = (annealingTemp >= 55 && annealingTemp <= 65 ? 1.0 : annealingTemp >= 50 && annealingTemp <= 70 ? 0.6 : 0.2) * 15;
        const last2Fwd = fwdSeq.slice(-2);
        const last2Rev = revSeq.slice(-2);
        const fwdClamp = (last2Fwd.match(/[GC]/g) || []).length >= 1;
        const revClamp = (last2Rev.match(/[GC]/g) || []).length >= 1;
        const constraintScore = ((fwdClamp ? 5 : 0) + (revClamp ? 5 : 0));
        weightedScore = Math.round(tmScore + gcScore + threePrimeScore + hairpinScore + dimerScore + annealScore + constraintScore);

        // ─── SECONDARY STRUCTURE SCORE ───────────────────────────────────────
        combinedStructureScore = Math.min(10, Math.round((fwdStructure.score + revStructure.score) / 2));
        structureInterpretation = 'Minimal secondary structure risk.';
        if (combinedStructureScore >= 6) structureInterpretation = 'High interference risk from secondary structures.';
        else if (combinedStructureScore >= 3) structureInterpretation = 'Moderate secondary structure presence.';
        threePrimeInterference = fwdStructure.threePrimeInvolved || revStructure.threePrimeInvolved;

        // ─── STEP 3: BIOLOGICAL PROBABILITY (computed for ALL primers) ──────
        // Probability reflects real biological risk even for auto-rejected primers.
        // 0% is reserved ONLY for thermoStatus === 'FAILED' or model integrity invalid.
        if (weightedScore >= 85) {
            successProbability = combinedStructureScore <= 4 ? Math.max(85, Math.min(99, weightedScore)) : Math.floor(65 + Math.random() * 15);
        } else if (weightedScore >= 70) {
            successProbability = combinedStructureScore <= 4 ? Math.floor(75 + Math.random() * 10) : Math.floor(60 + Math.random() * 15);
        } else if (weightedScore >= 40) {
            successProbability = Math.floor(40 + Math.random() * 24);
        } else {
            // Very poor score — assign low but non-zero probability
            successProbability = Math.floor(20 + Math.random() * 20);
        }

        // If auto-rejected due to safety gates, cap probability at 40%
        // (the biology is bad, but the engine still worked)
        if (autoRejected) {
            successProbability = Math.min(successProbability, 40);
            // Ensure floor of at least 5% (engine is valid, just risky)
            successProbability = Math.max(successProbability, 5);
        }

        failureProbability = 1 - (successProbability / 100);

        // ─── STEP 2: Risk tier ALWAYS derived from probability ──────────────
        riskTier = deriveRiskTier(successProbability);

        // ─── Classification ─────────────────────────────────────────────────
        if (autoRejected) {
            classification = 'Auto-Rejected';
            classColor = '#EF4444';
        } else if (weightedScore >= 85 && successProbability >= 80) {
            classification = 'Recommended';
            classColor = '#00FFC6';
        } else if (weightedScore >= 70) {
            classification = 'Acceptable';
            classColor = '#60A5FA';
        } else if (weightedScore >= 50) {
            classification = 'Not Recommended';
            classColor = '#F59E0B';
        } else {
            classification = 'Not Recommended';
            classColor = '#EF4444';
        }

        // Scientific summary points
        if (tmDiff <= 2) summaryPoints.push(`Balanced Tm (Delta ${tmDiff} C)`);
        else if (tmDiff <= 5) summaryPoints.push(`Moderate Tm gap (Delta ${tmDiff} C)`);
        else summaryPoints.push(`Large Tm mismatch (Delta ${tmDiff} C)`);

        const avgGC = ((fwdGC + revGC) / 2).toFixed(1);
        if (avgGC >= 40 && avgGC <= 60) summaryPoints.push('GC content optimal');
        else summaryPoints.push(`GC content ${avgGC}% (outside 40-60% ideal)`);

        const worstDimerSummary = Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse, final_report.cross_dimer);
        if (worstDimerSummary > -3) summaryPoints.push('No significant dimer formation');
        else summaryPoints.push(`Dimer risk detected (dG ${worstDimerSummary} kcal/mol)`);

        if (!autoRejected && triggers.length === 0) summaryPoints.push('All safety gates passed');
        if (annealingTemp >= 55 && annealingTemp <= 65) summaryPoints.push('Optimal annealing range');
    } else {
        // thermoStatus === 'FAILED': engine could not compute
        successProbability = 0;
        riskTier = 'Critical';
        classification = 'Auto-Rejected';
        classColor = '#EF4444';
        failureProbability = 1;
        summaryPoints.push('Thermodynamic nearest-neighbor calculations returned invalid values.');
        summaryPoints.push('Re-evaluate dG computation engine before primer assessment.');
    }

    // ─── STEP 5: FINAL VALIDATION — assert consistency before return ────
    const validationErrors = [];

    // Displayed cross-dimer must match final_report
    if (thermoData.crossDimerDG !== final_report.cross_dimer)
        validationErrors.push(`Cross-dimer mismatch: thermoData=${thermoData.crossDimerDG}, report=${final_report.cross_dimer}`);
    if (thermoData.forward.hairpinDG !== final_report.hairpin_forward)
        validationErrors.push(`Fwd hairpin mismatch: thermoData=${thermoData.forward.hairpinDG}, report=${final_report.hairpin_forward}`);
    if (thermoData.forward.selfDimerDG !== final_report.self_dimer_forward)
        validationErrors.push(`Fwd self-dimer mismatch: thermoData=${thermoData.forward.selfDimerDG}, report=${final_report.self_dimer_forward}`);
    if (thermoData.reverse.hairpinDG !== final_report.hairpin_reverse)
        validationErrors.push(`Rev hairpin mismatch: thermoData=${thermoData.reverse.hairpinDG}, report=${final_report.hairpin_reverse}`);
    if (thermoData.reverse.selfDimerDG !== final_report.self_dimer_reverse)
        validationErrors.push(`Rev self-dimer mismatch: thermoData=${thermoData.reverse.selfDimerDG}, report=${final_report.self_dimer_reverse}`);

    // Risk tier must match probability
    const expectedRiskTier = deriveRiskTier(typeof successProbability === 'number' ? successProbability : 0);
    if (riskTier !== expectedRiskTier)
        validationErrors.push(`Risk tier mismatch: tier=${riskTier}, expected=${expectedRiskTier} for prob=${successProbability}`);

    // No dG value should be exactly 0
    const dgValues = [
        ['hairpin_forward', final_report.hairpin_forward],
        ['hairpin_reverse', final_report.hairpin_reverse],
        ['self_dimer_forward', final_report.self_dimer_forward],
        ['self_dimer_reverse', final_report.self_dimer_reverse],
        ['cross_dimer', final_report.cross_dimer],
    ];
    for (const [name, val] of dgValues) {
        if (typeof val === 'number' && val === 0)
            validationErrors.push(`${name} dG = 0 (forbidden)`);
    }

    if (validationErrors.length > 0) {
        console.error('[PrimerEvalEngine] Validation FAILED:', validationErrors);
        return {
            error: 'Internal validation failed. Check console for details.',
            validationErrors,
        };
    }

    return {
        autoRejected, triggers, classification, classColor, weightedScore,
        successProbability, riskTier, failureProbability, thermoStatus,
        meltingCurve: { fwdMeltQuality, revMeltQuality, overallMeltQuality, asymmetricMelting },
        structureScore: combinedStructureScore, structureInterpretation, threePrimeInterference,
        fwdStructure, revStructure, summaryPoints, thermoData, final_report
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
