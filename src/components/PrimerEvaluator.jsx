import { useState } from 'react';
import { evaluatePrimerPair, generateAlternatives, SAMPLE_PRIMERS } from '../utils/primerEvalEngine';

/* ─── COLORS ──────────────────────────────────────────────────────────────── */
const RISK_COLORS = { Low: '#00FFC6', Moderate: '#F59E0B', High: '#EF4444', Critical: '#DC2626' };
const RISK_BG = { Low: 'rgba(0,255,198,0.08)', Moderate: 'rgba(245,158,11,0.08)', High: 'rgba(239,68,68,0.08)', Critical: 'rgba(220,38,38,0.08)' };
const CLASS_COLORS = { Recommended: '#00FFC6', Acceptable: '#60A5FA', 'Not Recommended': '#F59E0B', 'Auto-Rejected': '#EF4444' };

/* ═══════════════════════════════════════════════════════════════════════════
   PCR PRIMER EVALUATOR COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PrimerEvaluator({ result, setResult }) {
    const [fwdInput, setFwdInput] = useState('');
    const [revInput, setRevInput] = useState('');
    const [templateInput, setTemplateInput] = useState('');
    const [mode, setMode] = useState('standard');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEvaluate = () => {
        if (!fwdInput.trim() || !revInput.trim()) { setError('Enter both forward and reverse primer sequences.'); return; }
        setLoading(true); setError('');
        setTimeout(() => {
            const evalResult = evaluatePrimerPair(fwdInput, revInput, mode, templateInput);
            if (evalResult.error) { setError(evalResult.error); setLoading(false); return; }
            let alternatives = [];
            if (evalResult.classification === 'REJECTED' || evalResult.classification === 'CONDITIONALLY ACCEPTED' || evalResult.weightedScore < 65) {
                alternatives = generateAlternatives(fwdInput, revInput);
            }
            setResult({ ...evalResult, alternatives, fwdInput, revInput, templateInput, mode });
            setLoading(false);
        }, 600);
    };

    const loadSample = (key) => {
        const s = SAMPLE_PRIMERS[key];
        setFwdInput(s.forward); setRevInput(s.reverse); setTemplateInput('');
        setError(''); setResult(null);
    };

    const clearAll = () => { setFwdInput(''); setRevInput(''); setTemplateInput(''); setError(''); setResult(null); };

    const exportPDF = () => {
        if (!result) return;
        const d = result;
        const t = d.thermoData;
        let h = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PCR Primer Evaluation Report</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#333;max-width:900px;margin:40px auto}
    h1{color:#00A389;border-bottom:3px solid #00A389;padding-bottom:12px}h2{color:#1e293b;margin-top:24px}
    .card{margin:16px 0;padding:20px;border-left:4px solid #00A389;background:#f8fafc;border-radius:4px}
    .rejected-card{border-left-color:#EF4444;background:#fef2f2}
    .metric{display:inline-block;margin:6px 16px 6px 0;padding:6px 12px;background:#e2e8f0;border-radius:4px;font-size:0.9em}
    code{background:#e5e5e5;padding:3px 8px;border-radius:3px;font-family:monospace;font-size:1em}
    table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}
    th{background:#00A389;color:white}.warn{color:#b45309;margin:4px 0}
    .footer{margin-top:30px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:0.85em;color:#94a3b8}</style></head><body>
    <h1>PCR Primer Evaluation Report</h1>
    <div class="card ${d.classification === 'REJECTED' ? 'rejected-card' : ''}">
    <h2>Classification: ${d.classification} (${d.weightedScore}/100)</h2>
    <div class="metric">Confidence Band: ${d.confidenceBand}</div>
    <div class="metric">PCR Success: ${d.successProbability}%</div>
    <div class="metric">Risk Tier: ${d.riskTier}</div>
    <div class="metric">Specificity Score: ${d.specificityScore}/100</div>
    <div class="metric">Mode: ${d.mode === 'standard' ? 'Standard PCR' : 'Research'}</div>
    </div>`;
        if (d.classification === 'REJECTED' && d.triggers && d.triggers.length > 0) {
            h += `<h2>Safety Gate Triggers</h2><ul>`;
            d.triggers.forEach(t => { h += `<li class="warn">${t}</li>`; });
            h += `</ul>`;
        }
        if (d.classification === 'CONDITIONALLY ACCEPTED' && d.optimizationSuggestions) {
            h += `<h2>Suggested Optimizations</h2><ul>`;
            d.optimizationSuggestions.forEach(s => { h += `<li>${s}</li>`; });
            h += `</ul>`;
        }
        h += `<h2>Primer Details</h2><table><tr><th>Parameter</th><th>Forward</th><th>Reverse</th></tr>
    <tr><td>Sequence</td><td><code>${t.forward.seq}</code></td><td><code>${t.reverse.seq}</code></td></tr>
    <tr><td>Length</td><td>${t.forward.len} bp</td><td>${t.reverse.len} bp</td></tr>
    <tr><td>Tm</td><td>${t.forward.tm} C</td><td>${t.reverse.tm} C</td></tr>
    <tr><td>GC Content</td><td>${t.forward.gc}%</td><td>${t.reverse.gc}%</td></tr>
    <tr><td>Hairpin dG</td><td>${t.forward.hairpinDG} kcal/mol</td><td>${t.reverse.hairpinDG} kcal/mol</td></tr>
    <tr><td>Self-Dimer dG</td><td>${t.forward.selfDimerDG} kcal/mol</td><td>${t.reverse.selfDimerDG} kcal/mol</td></tr>
    <tr><td>3-prime Stability dG</td><td>${t.forward.threePrimeDG} kcal/mol</td><td>${t.reverse.threePrimeDG} kcal/mol</td></tr>
    </table>
    <div class="card"><h2>Pair Metrics</h2>
    <div class="metric">Tm Difference: ${t.tmDiff} C</div>
    <div class="metric">Annealing Temp: ${t.annealingTemp} C</div>
    <div class="metric">Cross-Dimer dG: ${t.crossDimerDG} kcal/mol</div></div>
    <h2>Melting Behavior</h2><p>${d.meltingCurve.overallMeltQuality}</p>
    <h2>Secondary Structure</h2><p>Score: ${d.structureScore}/10 - ${d.structureInterpretation}</p>
    <p>${d.threePrimeInterference ? '3-prime end structural interference DETECTED.' : 'No 3-prime end structural interference detected.'}</p>`;
        if (d.alternatives?.length) {
            h += `<h2>Alternative Candidates</h2><table><tr><th>Rank</th><th>Modification</th><th>Score</th><th>Risk Tier</th><th>Classification</th></tr>`;
            d.alternatives.forEach((a, i) => {
                h += `<tr><td>${i + 1}</td><td>${a.label}</td><td>${a.score}/100</td><td>${a.riskTier}</td><td>${a.classification}</td></tr>`;
            });
            h += `</table>`;
        }
        h += `<div class="footer">Generated: ${new Date().toLocaleString()} | Model: SantaLucia 1998 Nearest-Neighbor | Conditions: [oligo]=250nM, [Na+]=50mM</div></body></html>`;
        const blob = new Blob([h], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `PCR_Evaluation_${new Date().toISOString().split('T')[0]}.html`;
        a.click();
        const w = window.open(url); if (w) w.onload = () => setTimeout(() => w.print(), 250);
    };

    /* ═══ STYLES ═══ */
    const S = {
        container: { padding: '1.5rem', fontFamily: 'Inter, sans-serif' },
        title: { fontFamily: 'Montserrat, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#00BFA5', margin: '0 0 0.25rem 0' },
        subtitle: { color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.5rem 0' },
        inputGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
        inputGroup: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
        label: { fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
        input: { background: 'rgba(11,18,32,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#f1f5f9', fontFamily: 'monospace', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' },
        modeRow: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
        modeBtn: (active) => ({ padding: '0.5rem 1.25rem', borderRadius: '6px', border: active ? '1px solid #00BFA5' : '1px solid rgba(255,255,255,0.1)', background: active ? 'rgba(0,191,165,0.15)' : 'rgba(15,23,42,0.6)', color: active ? '#00FFC6' : '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }),
        sampleRow: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' },
        sampleLabel: { fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginRight: '0.25rem' },
        sampleBtn: { padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' },
        actionRow: { display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' },
        evalBtn: { flex: 1, minWidth: '200px', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #00A389, #00BFA5)', color: 'white', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 0.2s', opacity: loading ? 0.7 : 1 },
        clearBtn: { padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' },
        error: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#FCA5A5', marginBottom: '1rem', fontSize: '0.9rem' },
        card: { background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' },
        cardTitle: { fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.75rem' },
        metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
        metricBox: { background: 'rgba(11,18,32,0.5)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.04)' },
        metricLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' },
        metricValue: { fontSize: '1.1rem', fontWeight: 700 },
        table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
        th: { padding: '0.6rem 0.75rem', textAlign: 'left', background: 'rgba(0,191,165,0.1)', color: '#00BFA5', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.08)' },
        td: { padding: '0.6rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#cbd5e1' },
        badge: (color, bg) => ({ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color, background: bg || 'rgba(255,255,255,0.05)' }),
        summaryItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', color: '#cbd5e1', fontSize: '0.9rem' },
        divider: { height: '1px', background: 'rgba(255,255,255,0.06)', margin: '1.25rem 0' },
    };

    /* ═══ RENDER ═══ */
    return (
        <div style={S.container}>
            <h2 style={S.title}>PCR Primer Evaluation Engine</h2>
            <p style={S.subtitle}>Advanced primer pair analysis with safety gates, Bayesian risk modeling, and thermodynamic simulation</p>

            {/* Mode Selection */}
            <div style={S.modeRow}>
                <button style={S.modeBtn(mode === 'standard')} onClick={() => setMode('standard')}>Standard Mode</button>
                <button style={S.modeBtn(mode === 'research')} onClick={() => setMode('research')}>Research Mode</button>
            </div>

            {/* Primer Inputs */}
            <div style={S.inputGrid}>
                <div style={S.inputGroup}>
                    <label style={S.label}>Forward Primer (5' to 3')</label>
                    <input style={S.input} value={fwdInput} onChange={e => setFwdInput(e.target.value.toUpperCase())}
                        placeholder="e.g. ATGGAGGAGCCGCAGTCAG" spellCheck="false"
                        onFocus={e => { e.target.style.borderColor = 'rgba(0,191,165,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                    {fwdInput && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{fwdInput.replace(/[^ATGC]/gi, '').length} bases</span>}
                </div>
                <div style={S.inputGroup}>
                    <label style={S.label}>Reverse Primer (5' to 3')</label>
                    <input style={S.input} value={revInput} onChange={e => setRevInput(e.target.value.toUpperCase())}
                        placeholder="e.g. CCAGCTTCATGCCAGCTAC" spellCheck="false"
                        onFocus={e => { e.target.style.borderColor = 'rgba(0,191,165,0.5)'; }}
                        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                    {revInput && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{revInput.replace(/[^ATGC]/gi, '').length} bases</span>}
                </div>
            </div>
            <div style={{ ...S.inputGroup, marginBottom: '1rem' }}>
                <label style={{ ...S.label, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Target Template Sequence (Optional)</span>
                    <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }}>For Specificity & 8-mer scoring</span>
                </label>
                <textarea style={{ ...S.input, minHeight: '80px', fontFamily: 'monospace' }} value={templateInput} onChange={e => setTemplateInput(e.target.value.toUpperCase().replace(/[^ATGC]/gi, ''))}
                    placeholder="Paste full genomic target sequence here to calculate off-target risk..." spellCheck="false"
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,191,165,0.5)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }} />
                {templateInput && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{templateInput.length} bases</span>}
            </div>

            {/* Sample Buttons */}
            <div style={S.sampleRow}>
                <span style={S.sampleLabel}>Load Sample:</span>
                {Object.entries(SAMPLE_PRIMERS).map(([key, s]) => (
                    <button key={key} style={S.sampleBtn} onClick={() => loadSample(key)}
                        onMouseEnter={e => { e.target.style.borderColor = 'rgba(0,191,165,0.3)'; e.target.style.color = '#00FFC6'; }}
                        onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.color = '#cbd5e1'; }}>
                        {s.name}
                    </button>
                ))}
            </div>

            {/* Action Buttons */}
            <div style={S.actionRow}>
                <button style={S.evalBtn} onClick={handleEvaluate} disabled={loading}>
                    {loading ? 'Evaluating...' : 'Evaluate Primer Pair'}
                </button>
                {(fwdInput || revInput || result) && (
                    <button style={S.clearBtn} onClick={clearAll}>Clear</button>
                )}
                {result && (
                    <button style={{ ...S.clearBtn, color: '#60A5FA', borderColor: 'rgba(96,165,250,0.3)' }} onClick={exportPDF}>
                        Export Report
                    </button>
                )}
            </div>

            {error && <div style={S.error}>{error}</div>}

            {/* ═══ RESULTS ═══ */}
            {result && (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>

                    {/* Classification Banner */}
                    <div style={{ ...S.card, borderLeft: `6px solid ${result.classColor}`, background: result.classification === 'REJECTED' ? 'rgba(239,68,68,0.06)' : result.classification === 'CONDITIONALLY ACCEPTED' ? 'rgba(245,158,11,0.06)' : 'rgba(0,255,198,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Primer Classification</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', color: result.classColor }}>
                                    {result.classification}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>{result.weightedScore} / 100</span>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>{result.confidenceBand}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Specificity</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: result.specificityScore >= 60 ? '#00FFC6' : '#F59E0B' }}>{result.specificityScore}/100</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>PCR Success</div>
                                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: result.successProbability >= 80 ? '#00FFC6' : result.successProbability >= 65 ? '#60A5FA' : result.successProbability >= 50 ? '#F59E0B' : '#EF4444' }}>{result.successProbability}%</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Risk Tier</div>
                                    <span style={S.badge(
                                        result.riskTier === 'Low Risk' ? '#00FFC6' : result.riskTier === 'Moderate Risk' ? '#60A5FA' : result.riskTier === 'Elevated Risk' ? '#F59E0B' : '#EF4444',
                                        result.riskTier === 'Low Risk' ? 'rgba(0,255,198,0.1)' : result.riskTier === 'Moderate Risk' ? 'rgba(96,165,250,0.1)' : result.riskTier === 'Elevated Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
                                    )}>{result.riskTier}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rejection Triggers OR Optimizations */}
                    {(result.classification === 'REJECTED' && result.triggers?.length > 0) && (
                        <div style={{ ...S.card, borderLeft: '4px solid #EF4444' }}>
                            <div style={{ ...S.cardTitle, color: '#EF4444' }}>Safety Gate Triggers</div>
                            {result.triggers.map((t, i) => (
                                <div key={i} style={{ padding: '0.6rem 0.8rem', margin: '0.5rem 0', background: 'rgba(239,68,68,0.08)', borderRadius: '6px', color: '#FCA5A5', fontSize: '0.9rem', borderLeft: '3px solid #EF4444' }}>
                                    {t}
                                </div>
                            ))}
                        </div>
                    )}

                    {result.classification === 'CONDITIONALLY ACCEPTED' && result.optimizationSuggestions && result.optimizationSuggestions.length > 0 && (
                        <div style={{ ...S.card, borderLeft: '4px solid #F59E0B' }}>
                            <div style={{ ...S.cardTitle, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                Suggested Optimizations
                            </div>
                            <div style={{ color: '#cbd5e1', fontSize: '0.9rem', marginBottom: '1rem' }}>This primer pair has moderate issues but might be usable if optimized. Consider the following adjustments:</div>
                            {result.optimizationSuggestions.map((s, i) => (
                                <div key={i} style={{ padding: '0.6rem 0.8rem', margin: '0.5rem 0', background: 'rgba(245,158,11,0.08)', borderRadius: '6px', color: '#FDE68A', fontSize: '0.9rem', borderLeft: '3px solid #F59E0B', display: 'flex', gap: '0.5rem' }}>
                                    <span style={{ color: '#F59E0B', fontWeight: 'bold' }}>•</span>
                                    <span>{s}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Melting Behavior */}
                    <div style={S.card}>
                        <div style={{ ...S.cardTitle, color: '#00BFA5' }}>Melting Behavior</div>
                        <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{result.meltingCurve.overallMeltQuality}</p>
                        <div style={{ ...S.metricGrid, marginTop: '0.75rem' }}>
                            <div style={S.metricBox}>
                                <div style={S.metricLabel}>Forward Melting</div>
                                <div style={{ ...S.metricValue, color: result.meltingCurve.fwdMeltQuality === 'Sharp & Specific' ? '#00FFC6' : '#F59E0B', fontSize: '0.9rem' }}>{result.meltingCurve.fwdMeltQuality}</div>
                            </div>
                            <div style={S.metricBox}>
                                <div style={S.metricLabel}>Reverse Melting</div>
                                <div style={{ ...S.metricValue, color: result.meltingCurve.revMeltQuality === 'Sharp & Specific' ? '#00FFC6' : '#F59E0B', fontSize: '0.9rem' }}>{result.meltingCurve.revMeltQuality}</div>
                            </div>
                            {result.meltingCurve.asymmetricMelting && (
                                <div style={{ ...S.metricBox, borderLeft: '3px solid #F59E0B' }}>
                                    <div style={S.metricLabel}>Asymmetry</div>
                                    <div style={{ ...S.metricValue, color: '#F59E0B', fontSize: '0.9rem' }}>Detected</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Structural Integrity */}
                    <div style={S.card}>
                        <div style={{ ...S.cardTitle, color: '#00BFA5' }}>Structural Integrity</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', fontFamily: 'Montserrat, sans-serif', color: result.structureScore >= 6 ? '#EF4444' : result.structureScore >= 3 ? '#F59E0B' : '#00FFC6', background: result.structureScore >= 6 ? 'rgba(239,68,68,0.1)' : result.structureScore >= 3 ? 'rgba(245,158,11,0.1)' : 'rgba(0,255,198,0.1)', border: `2px solid ${result.structureScore >= 6 ? '#EF4444' : result.structureScore >= 3 ? '#F59E0B' : '#00FFC6'}` }}>
                                {result.structureScore}/10
                            </div>
                            <div>
                                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.95rem' }}>{result.structureInterpretation}</div>
                                <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                    {result.threePrimeInterference ? "3' end structural interference DETECTED." : "No 3' end structural interference detected."}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thermodynamic Details */}
                    <div style={S.card}>
                        <div style={{ ...S.cardTitle, color: '#00BFA5' }}>Thermodynamic Details</div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={S.table}>
                                <thead>
                                    <tr>
                                        <th style={S.th}>Parameter</th>
                                        <th style={S.th}>Forward</th>
                                        <th style={S.th}>Reverse</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td style={S.td}>Sequence</td><td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{result.thermoData.forward.seq}</td><td style={{ ...S.td, fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>{result.thermoData.reverse.seq}</td></tr>
                                    <tr><td style={S.td}>Length</td><td style={S.td}>{result.thermoData.forward.len} bp</td><td style={S.td}>{result.thermoData.reverse.len} bp</td></tr>
                                    <tr><td style={S.td}>Tm</td><td style={S.td}>{result.thermoData.forward.tm} C</td><td style={S.td}>{result.thermoData.reverse.tm} C</td></tr>
                                    <tr><td style={S.td}>GC Content</td><td style={S.td}>{result.thermoData.forward.gc}%</td><td style={S.td}>{result.thermoData.reverse.gc}%</td></tr>
                                    <tr><td style={S.td}>Hairpin dG</td><td style={S.td}>{result.thermoData.forward.hairpinDG} kcal/mol</td><td style={S.td}>{result.thermoData.reverse.hairpinDG} kcal/mol</td></tr>
                                    <tr><td style={S.td}>Self-Dimer dG</td><td style={S.td}>{result.thermoData.forward.selfDimerDG} kcal/mol</td><td style={S.td}>{result.thermoData.reverse.selfDimerDG} kcal/mol</td></tr>
                                    <tr><td style={S.td}>3' Stability dG</td><td style={S.td}>{result.thermoData.forward.threePrimeDG} kcal/mol</td><td style={S.td}>{result.thermoData.reverse.threePrimeDG} kcal/mol</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ ...S.metricGrid, marginTop: '0.75rem' }}>
                            <div style={S.metricBox}><div style={S.metricLabel}>Tm Difference</div><div style={{ ...S.metricValue, color: result.thermoData.tmDiff > 5 ? '#EF4444' : result.thermoData.tmDiff > 3 ? '#F59E0B' : '#00FFC6' }}>{result.thermoData.tmDiff} C</div></div>
                            <div style={S.metricBox}><div style={S.metricLabel}>Annealing Temp</div><div style={{ ...S.metricValue, color: result.thermoData.annealingTemp < 50 ? '#EF4444' : '#00FFC6' }}>{result.thermoData.annealingTemp} C</div></div>
                            <div style={S.metricBox}><div style={S.metricLabel}>Cross-Dimer dG</div><div style={{ ...S.metricValue, color: result.thermoData.crossDimerDG < -9 ? '#EF4444' : result.thermoData.crossDimerDG < -5 ? '#F59E0B' : '#00FFC6' }}>{result.thermoData.crossDimerDG} kcal/mol</div></div>
                        </div>
                    </div>

                    {/* Scientific Summary */}
                    <div style={S.card}>
                        <div style={{ ...S.cardTitle, color: '#00BFA5' }}>Scientific Summary</div>
                        {result.summaryPoints.map((p, i) => (
                            <div key={i} style={S.summaryItem}>
                                <span style={{ color: '#00BFA5', fontWeight: 700 }}>--</span>
                                <span>{p}</span>
                            </div>
                        ))}
                    </div>

                    {/* Alternatives Table */}
                    {result.alternatives && result.alternatives.length > 0 && (
                        <div style={S.card}>
                            <div style={{ ...S.cardTitle, color: '#60A5FA' }}>Suggested Alternatives</div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={S.table}>
                                    <thead>
                                        <tr>
                                            <th style={S.th}>Rank</th>
                                            <th style={S.th}>Modification</th>
                                            <th style={S.th}>Score</th>
                                            <th style={S.th}>Risk Tier</th>
                                            <th style={S.th}>Classification</th>
                                            <th style={S.th}>Success %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.alternatives.map((a, i) => (
                                            <tr key={i}>
                                                <td style={S.td}>{i + 1}</td>
                                                <td style={S.td}>{a.label}</td>
                                                <td style={S.td}><span style={{ fontWeight: 700, color: a.score >= 85 ? '#00FFC6' : a.score >= 65 ? '#60A5FA' : '#F59E0B' }}>{a.score}/100</span></td>
                                                <td style={S.td}>
                                                    <span style={S.badge(
                                                        a.riskTier === 'Low Risk' ? '#00FFC6' : a.riskTier === 'Moderate Risk' ? '#60A5FA' : a.riskTier === 'Elevated Risk' ? '#F59E0B' : '#EF4444',
                                                        a.riskTier === 'Low Risk' ? 'rgba(0,255,198,0.1)' : a.riskTier === 'Moderate Risk' ? 'rgba(96,165,250,0.1)' : a.riskTier === 'Elevated Risk' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
                                                    )}>{a.riskTier}</span>
                                                </td>
                                                <td style={{ ...S.td, color: a.classification === 'ACCEPTED' ? '#00FFC6' : a.classification === 'CONDITIONALLY ACCEPTED' ? '#F59E0B' : '#EF4444', fontWeight: 600 }}>{a.classification}</td>
                                                <td style={S.td}>{a.successProb}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Meta Footer */}
                    <div style={{ textAlign: 'center', padding: '0.75rem', color: '#475569', fontSize: '0.75rem' }}>
                        Model: SantaLucia 1998 Nearest-Neighbor | Conditions: [oligo]=250nM, [Na+]=50mM, T=37 C
                    </div>
                </div>
            )}
        </div>
    );
}
