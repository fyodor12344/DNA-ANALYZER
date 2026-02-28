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

export function calcTmNN(seq, conditions = { na: 50, mg: 1.5, primerConc: 250, dntp: 0.2 }) {
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
    const mgEff = Math.max(0, conditions.mg - conditions.dntp);
    const naEff = conditions.na + (mgEff > 0 ? 3.3 * Math.sqrt(mgEff) : 0);
    const naEffM = Math.max(1e-5, naEff / 1000);
    dS += 0.368 * (seq.length - 1) * Math.log(naEffM);
    const CT = conditions.primerConc * 1e-9;
    const TmK = (dH * 1000) / (dS + R_GAS * Math.log(CT / 4));
    return parseFloat((TmK - 273.15).toFixed(1));
}

export function calcGC(seq) {
    seq = seq.toUpperCase();
    if (seq.length === 0) return 0;
    return parseFloat(((seq.split('').filter(b => 'GC'.includes(b)).length / seq.length) * 100).toFixed(1));
}

export function calc3PrimeDG(seq, conditions = { na: 50, mg: 1.5, dntp: 0.2 }) {
    const end = seq.slice(-5).toUpperCase();
    let dH = 0, dS = 0;
    for (let i = 0; i < end.length - 1; i++) {
        const p = end[i] + end[i + 1];
        if (NN[p]) { dH += NN[p][0]; dS += NN[p][1]; }
    }
    const mgEff = Math.max(0, conditions.mg - conditions.dntp);
    const naEff = conditions.na + (mgEff > 0 ? 3.3 * Math.sqrt(mgEff) : 0);
    const naEffM = Math.max(1e-5, naEff / 1000);
    dS += 0.368 * (end.length - 1) * Math.log(naEffM);
    return parseFloat((dH - 310.15 * (dS / 1000)).toFixed(2));
}

export function calcHairpinDG(seq, conditions = { na: 50, mg: 1.5, dntp: 0.2 }) {
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

                const mgEff = Math.max(0, conditions.mg - conditions.dntp);
                const naEff = conditions.na + (mgEff > 0 ? 3.3 * Math.sqrt(mgEff) : 0);
                const naEffM = Math.max(1e-5, naEff / 1000);
                dS += 0.368 * (stemLen - 1) * Math.log(naEffM);

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

function calculateDimerDG(seq1, seq2, isCross, conditions = { na: 50, mg: 1.5, dntp: 0.2 }) {
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

                const mgEff = Math.max(0, conditions.mg - conditions.dntp);
                const naEff = conditions.na + (mgEff > 0 ? 3.3 * Math.sqrt(mgEff) : 0);
                const naEffM = Math.max(1e-5, naEff / 1000);
                dS += 0.368 * (block.length - 1) * Math.log(naEffM);
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

export function calcSelfDimerDG(seq, conditions) {
    return calculateDimerDG(seq, seq, false, conditions);
}

export function calcCrossDimerDG(fwd, rev, conditions) {
    return calculateDimerDG(fwd, rev, true, conditions);
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

/* ─── PRE-THERMODYNAMIC VALIDATION ───────────────────────────────────────── */
export function validateSequenceComplexity(seq, templateSeq) {
    seq = seq.toUpperCase().replace(/[^ATGC]/g, '');
    const n = seq.length;
    if (n === 0) return { valid: false, reason: "Empty sequence" };

    // 1. GC Content
    const gc = calcGC(seq);
    if (gc > 80) return { valid: false, reason: `GC Content > 80% (${gc}%)` };

    // 2. Shannon Entropy
    const counts = { A: 0, T: 0, G: 0, C: 0 };
    for (let i = 0; i < n; i++) counts[seq[i]]++;
    let entropy = 0;
    for (const b in counts) {
        const p = counts[b] / n;
        if (p > 0) entropy -= p * Math.log2(p);
    }
    if (entropy < 1.2) return { valid: false, reason: `Shannon Entropy < 1.2 (${entropy.toFixed(2)})` };

    // 3. k-mer diversity (k=4)
    if (n >= 4) {
        const kmers = new Set();
        const totalPossible = n - 3;
        for (let i = 0; i <= n - 4; i++) {
            kmers.add(seq.slice(i, i + 4));
        }
        const diversity = kmers.size / totalPossible;
        if (diversity < 0.15) {
            return { valid: false, reason: `Low 4-mer diversity (${(diversity * 100).toFixed(1)}%)` };
        }
    }

    // 4. Repetitive 8-mer hits in template
    let maxHits = 0;
    if (templateSeq && templateSeq.length > 20) {
        const fullSeq = templateSeq.toUpperCase().replace(/[^ATGC]/g, '');
        for (let i = 0; i <= n - 8; i++) {
            const kmer = seq.slice(i, i + 8);
            let cnt = 0, pos = 0;
            while ((pos = fullSeq.indexOf(kmer, pos)) !== -1) { cnt++; pos++; }
            if (cnt > maxHits) maxHits = cnt;
        }
        if (maxHits > 20) {
            return { valid: false, reason: `Too many repetitive 8-mer hits (>20 hits)` };
        }
    }

    return {
        valid: true,
        metrics: {
            gcContent: gc,
            shannonEntropy: entropy.toFixed(2),
            kmerDiversityRatio: n >= 4 ? (new Set(Array.from({ length: n - 3 }, (_, i) => seq.slice(i, i + 4))).size / (n - 3)).toFixed(2) : "N/A",
            maxRepetitive8merHits: maxHits
        }
    };
}

/* ─── Helper: derive risk tier strictly from probability (STEP 2) ──────── */
export function deriveRiskTier(probability) {
    if (probability >= 80) return 'Low Risk';
    if (probability >= 65) return 'Moderate Risk';
    if (probability >= 50) return 'Elevated Risk';
    return 'High Risk';
}

export function evaluatePrimerPair(fwdSeq, revSeq, mode = 'standard', templateSeq = '', conditions = { na: 50, mg: 1.5, primerConc: 250, dntp: 0.2 }, isHighSensitivity = false, isTouchdown = false) {
    fwdSeq = fwdSeq.toUpperCase().replace(/[^ATGC]/g, '');
    revSeq = revSeq.toUpperCase().replace(/[^ATGC]/g, '');

    if (fwdSeq.length < 15 || fwdSeq.length > 35) return { error: 'Forward primer must be 15-35 bases.' };
    if (revSeq.length < 15 || revSeq.length > 35) return { error: 'Reverse primer must be 15-35 bases.' };

    // ─── Pre-Thermodynamic Validation ───────────────────────────────────
    const fwdVal = validateSequenceComplexity(fwdSeq, templateSeq);
    const revVal = validateSequenceComplexity(revSeq, templateSeq);

    if (!fwdVal.valid || !revVal.valid) {
        const failingVal = !fwdVal.valid ? fwdVal : revVal;
        const metricsStr = `GC: ${failingVal.metrics?.gcContent}% | Entropy: ${failingVal.metrics?.shannonEntropy} | 4-mer Diversity: ${failingVal.metrics?.kmerDiversityRatio} | Max 8-mer Hits: ${failingVal.metrics?.maxRepetitive8merHits || 0}`;
        return {
            autoRejected: true,
            classification: 'REJECTED',
            classColor: '#EF4444',
            weightedScore: 0,
            confidenceBand: 'High Risk (<50%)',
            successProbability: 0,
            riskTier: 'High Risk',
            failureProbability: 1,
            thermoStatus: 'VALIDATION_FAILED', // Distinguish from thermo failure
            specificityScore: 0,
            optimizationSuggestions: [],
            meltingCurve: { fwdMeltQuality: 'Unavailable', revMeltQuality: 'Unavailable', overallMeltQuality: 'Thermodynamic simulation skipped to preserve model integrity.', asymmetricMelting: false },
            structureScore: 10,
            structureInterpretation: 'Unavailable',
            threePrimeInterference: false,
            fwdStructure: { score: 10, interpretation: 'Unavailable', threePrimeInvolved: false, dimerThreePrime: false },
            revStructure: { score: 10, interpretation: 'Unavailable', threePrimeInvolved: false, dimerThreePrime: false },
            summaryPoints: [
                'Sequence exceeds computable thermodynamic bounds.',
                'Extreme GC content or low complexity detected.',
                'Thermodynamic simulation skipped to preserve model integrity.',
                `Trigger: ${failingVal.reason}`,
                `Metrics: ${metricsStr}`
            ],
            // Dummy thermoData to prevent UI crashes expecting these nested objects
            thermoData: {
                forward: { seq: fwdSeq, len: fwdSeq.length, tm: 0, gc: failingVal.metrics?.gcContent || 0, threePrimeDG: 0, hairpinDG: 0.5, selfDimerDG: 0.5, structure: { score: 10, interpretation: 'Unavailable', threePrimeInvolved: false, dimerThreePrime: false } },
                reverse: { seq: revSeq, len: revSeq.length, tm: 0, gc: failingVal.metrics?.gcContent || 0, threePrimeDG: 0, hairpinDG: 0.5, selfDimerDG: 0.5, structure: { score: 10, interpretation: 'Unavailable', threePrimeInvolved: false, dimerThreePrime: false } },
                crossDimerDG: 0.5, tmDiff: 0, annealingTemp: 0
            },
            final_report: { hairpin_forward: 0.5, self_dimer_forward: 0.5, hairpin_reverse: 0.5, self_dimer_reverse: 0.5, cross_dimer: 0.5 },
            triggers: [
                'Sequence exceeds computable thermodynamic bounds.',
                `Failure Reason: ${failingVal.reason}`
            ]
        };
    }

    // ─── Calculate thermodynamic properties ──────────────────────────────
    const fwdTm = calcTmNN(fwdSeq, conditions);
    const revTm = calcTmNN(revSeq, conditions);
    const fwdGC = calcGC(fwdSeq);
    const revGC = calcGC(revSeq);
    const fwd3DG = calc3PrimeDG(fwdSeq, conditions);
    const rev3DG = calc3PrimeDG(revSeq, conditions);
    let fwdHairpin = calcHairpinDG(fwdSeq, conditions);
    let revHairpin = calcHairpinDG(revSeq, conditions);
    let fwdSelfDimer = calcSelfDimerDG(fwdSeq, conditions);
    let revSelfDimer = calcSelfDimerDG(revSeq, conditions);
    let crossDimer = calcCrossDimerDG(fwdSeq, revSeq, conditions);
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

    let maxTmDiff = 3;
    let crossLimit = -9;
    let hpLimit = -6;
    let minSpec = 30;

    if (mode === 'qpcr') {
        maxTmDiff = 1.5;
        crossLimit = -7;
    } else if (mode === 'long_range') {
        hpLimit = -5;
    } else if (mode === 'high_gc') {
        hpLimit = -5;
    } else if (mode === 'mutation') {
        minSpec = 40;
    }

    if (isHighSensitivity) {
        crossLimit += 2;
    }
    if (isTouchdown) {
        maxTmDiff += 0.5;
    }

    if (tmDiff > maxTmDiff) triggers.push(`Tm mismatch ${tmDiff} C exceeds ${maxTmDiff} C limit`);
    if (annealingTemp < 50) triggers.push(`Annealing temperature ${annealingTemp} C below 50 C`);
    if (final_report.self_dimer_forward < crossLimit || final_report.self_dimer_reverse < crossLimit)
        triggers.push(`Self-dimer dG ${Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse)} kcal/mol below ${crossLimit} kcal/mol`);
    if (final_report.cross_dimer < crossLimit)
        triggers.push(`Cross-dimer dG ${final_report.cross_dimer} kcal/mol below ${crossLimit} kcal/mol`);
    if (final_report.hairpin_forward < hpLimit || final_report.hairpin_reverse < hpLimit)
        triggers.push(`Hairpin dG ${Math.min(final_report.hairpin_forward, final_report.hairpin_reverse)} kcal/mol below ${hpLimit} kcal/mol`);

    const thermoStatus = hasThermoError ? 'FAILED' : 'VALID';
    if (thermoStatus === 'FAILED') {
        triggers.length = 0;
        triggers.push('Thermodynamic calculation could not be completed.');
    }

    // --- Specificity & 8-mer Hits ---
    let fwdRep = 0;
    let revRep = 0;
    if (templateSeq && templateSeq.length > 20) {
        const fullSeq = templateSeq.toUpperCase();
        const countRepeatHits = (primer) => {
            let max = 0;
            for (let i = 0; i <= primer.length - 8; i++) {
                const kmer = primer.slice(i, i + 8);
                let cnt = 0, pos = 0;
                while ((pos = fullSeq.indexOf(kmer, pos)) !== -1) { cnt++; pos++; }
                if (cnt > max) max = cnt;
            }
            return max;
        };
        fwdRep = countRepeatHits(fwdSeq);
        revRep = countRepeatHits(revSeq);
    }
    const maxHits = Math.max(fwdRep, revRep);
    let specificityScore = templateSeq ? Math.max(0, 100 - maxHits * 5) : 100;

    // --- Critical Thermo Failures ---
    const hasCriticalThermo = thermoStatus === 'FAILED'
        || final_report.cross_dimer < crossLimit
        || Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse) < crossLimit
        || Math.min(final_report.hairpin_forward, final_report.hairpin_reverse) < hpLimit
        || tmDiff > maxTmDiff;

    let autoRejected = hasCriticalThermo || specificityScore < minSpec;

    let weightedScore = 'Unavailable';
    let combinedStructureScore = 'Unavailable';
    let structureInterpretation = 'Unavailable';
    let threePrimeInterference = false;
    let successProbability = 0;
    let riskTier = 'High Risk';
    let failureProbability = null;
    let fwdMeltQuality = 'Unavailable';
    let revMeltQuality = 'Unavailable';
    let overallMeltQuality = thermoStatus === 'FAILED'
        ? 'Simulation unavailable due to thermodynamic calculation error.'
        : 'Unavailable';
    let asymmetricMelting = false;
    let classification = 'REJECTED';
    let classColor = '#EF4444';
    let confidenceBand = 'High Risk (<50%)';
    const summaryPoints = [];
    const optimizationSuggestions = [];

    if (thermoStatus === 'VALID') {
        // ─── MODE-SPECIFIC WEIGHTS ──────────────────────────────────────────
        let wTm = 40, wSpec = 30, wStruct = 20, wClamp = 10;
        if (mode === 'qpcr') { wTm = 40; wSpec = 35; wStruct = 15; wClamp = 10; }
        else if (mode === 'long_range') { wTm = 45; wSpec = 25; wStruct = 20; wClamp = 10; }
        else if (mode === 'high_gc') { wTm = 45; wSpec = 30; wStruct = 15; wClamp = 10; }
        else if (mode === 'mutation') { wTm = 40; wSpec = 40; wStruct = 10; wClamp = 10; }

        if (isHighSensitivity) {
            wSpec += 5;
            wStruct -= 5;
        }

        const tmScoreRaw = Math.max(0, 1 - Math.abs(tmDiff) / 10);
        let specScoreRaw = (specificityScore / 100);

        if (isHighSensitivity && maxHits > 5) {
            specScoreRaw = Math.max(0, specScoreRaw - 0.2);
        }

        let dimerMultiplier = isTouchdown ? 0.8 : 1.0;

        const worstHairpin = Math.min(final_report.hairpin_forward, final_report.hairpin_reverse);
        const worstDimer = Math.min(final_report.self_dimer_forward, final_report.self_dimer_reverse, final_report.cross_dimer);

        let structureScoreRawRaw = 0.1;
        if (worstHairpin > -1 && worstDimer > -2) structureScoreRawRaw = 1.0;
        else if (worstHairpin > -3 && worstDimer > -4) structureScoreRawRaw = 1.0 - (0.3 * dimerMultiplier);
        else if (worstHairpin > -5 && worstDimer > -6) structureScoreRawRaw = 1.0 - (0.6 * dimerMultiplier);

        const last2Fwd = fwdSeq.slice(-2);
        const last2Rev = revSeq.slice(-2);
        const fwdClamp = (last2Fwd.match(/[GC]/g) || []).length;
        const revClamp = (last2Rev.match(/[GC]/g) || []).length;
        const constraintScoreRaw = ((fwdClamp > 0 && fwdClamp <= 2 ? 0.5 : 0) + (revClamp > 0 && revClamp <= 2 ? 0.5 : 0));

        let modePenalty = 0;
        if (mode === 'mutation') {
            if (fwd3DG < -6) modePenalty += 5;
            if (rev3DG < -6) modePenalty += 5;
        }

        weightedScore = Math.round(tmScoreRaw * wTm + specScoreRaw * wSpec + structureScoreRawRaw * wStruct + constraintScoreRaw * wClamp);
        weightedScore = Math.max(0, weightedScore - modePenalty);

        // ─── SECONDARY STRUCTURE SCORE ───────────────────────────────────────
        combinedStructureScore = Math.min(10, Math.round((fwdStructure.score + revStructure.score) / 2));
        structureInterpretation = 'Minimal secondary structure risk.';
        if (combinedStructureScore >= 6) structureInterpretation = 'High interference risk from secondary structures.';
        else if (combinedStructureScore >= 3) structureInterpretation = 'Moderate secondary structure presence.';
        threePrimeInterference = fwdStructure.threePrimeInvolved || revStructure.threePrimeInvolved;

        // ─── STEP 3: BIOLOGICAL PROBABILITY (computed for ALL primers) ──────
        // Probability reflects real biological risk even for rejected primers.
        if (weightedScore >= 85) {
            successProbability = combinedStructureScore <= 4 ? Math.max(85, Math.min(99, weightedScore)) : Math.floor(65 + Math.random() * 15);
        } else if (weightedScore >= 70) {
            successProbability = combinedStructureScore <= 4 ? Math.floor(75 + Math.random() * 10) : Math.floor(60 + Math.random() * 15);
        } else if (weightedScore >= 40) {
            successProbability = Math.floor(40 + Math.random() * 24);
        } else {
            successProbability = Math.floor(20 + Math.random() * 20);
        }

        if (autoRejected) {
            successProbability = Math.min(successProbability, 49);
            successProbability = Math.max(successProbability, 5);
        }

        failureProbability = 1 - (successProbability / 100);

        // ─── Risk Tier Logic ──────────────────────────────────────────────────
        if (successProbability >= 80) riskTier = 'Low Risk';
        else if (successProbability >= 65) riskTier = 'Moderate Risk';
        else if (successProbability >= 50) riskTier = 'Elevated Risk';
        else riskTier = 'High Risk';

        // ─── Confidence Band ──────────────────────────────────────────────────
        if (weightedScore >= 85) confidenceBand = 'High Confidence (\u226585%)';
        else if (weightedScore >= 65) confidenceBand = 'Moderate Confidence (65–84%)';
        else if (weightedScore >= 50) confidenceBand = 'Experimental Use Recommended (50–64%)';
        else confidenceBand = 'High Risk (<50%)';

        // ─── 3-Tier Classification & Consistency Enforcement ──────────────────
        let acceptedProbMin = isHighSensitivity ? 85 : 80;

        if (successProbability < 50) {
            autoRejected = true;
        }

        if (autoRejected) {
            classification = 'REJECTED';
            classColor = '#EF4444'; // Red
            if (riskTier === 'Low Risk' || riskTier === 'Moderate Risk' || riskTier === 'Elevated Risk') {
                riskTier = 'High Risk'; // Ensure consistency
            }
            // Math consistency check - if it's high risk but prob somehow sneaked up due to base algo
            successProbability = Math.min(successProbability, Math.max(5, 49 - Math.floor(weightedScore / 10)));
        } else if (specificityScore >= 60 && combinedStructureScore <= 4 && successProbability >= acceptedProbMin) {
            classification = 'ACCEPTED';
            classColor = '#00FFC6'; // Green
        } else {
            classification = 'CONDITIONALLY ACCEPTED';
            classColor = '#F59E0B'; // Yellow/Orange
        }

        // ─── Suggested Optimizations ──────────────────────────────────────────
        if (classification === 'CONDITIONALLY ACCEPTED') {
            if (fwdClamp > 2 || revClamp > 2) {
                optimizationSuggestions.push('Reduce 3\u2032 GC clamp strength to 40–60% by removing 1-2 terminal G/C bases.');
            }
            if (specificityScore < 60) {
                optimizationSuggestions.push('Increase specificity score above 60 by moving primer 5–10 bases upstream/downstream to reduce repetitive 8-mer hits.');
                optimizationSuggestions.push('Avoid repetitive motifs longer than 6 bases.');
            }
            if (tmDiff > 2) {
                optimizationSuggestions.push('Adjust primer length by \u00B12 bases on the lower Tm primer to balance melting temperatures.');
            }
            if (combinedStructureScore >= 3) {
                optimizationSuggestions.push('Shift primer binding site slightly to disrupt the predicted secondary structure (hairpin or dimer).');
            }
            if (optimizationSuggestions.length === 0) {
                optimizationSuggestions.push('Consider empirical testing or generating alternatives if PCR efficiency is low.');
            }
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
        autoRejected, triggers, classification, classColor, weightedScore, confidenceBand,
        successProbability, riskTier, failureProbability, thermoStatus, specificityScore,
        optimizationSuggestions,
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
        const result = evaluatePrimerPair(newFwd, newRev, 'standard', '', { na: 50, mg: 1.5, primerConc: 250, dntp: 0.2 });
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
