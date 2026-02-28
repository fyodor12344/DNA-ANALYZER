import re

with open('src/components/PrimerDesigner.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Imports
code = code.replace(
    "import { evaluatePrimerPair, calcSecondaryStructureScore } from '../utils/primerEvalEngine';",
    "import { evaluatePrimerPair, calcSecondaryStructureScore, calcTmNN, calcGC, calc3PrimeDG, calcHairpinDG, calcSelfDimerDG, calcCrossDimerDG, revComp } from '../utils/primerEvalEngine';"
)

# 2. Remove local thermo functions (lines 71 to 198 typically) but keep calcLast5GC
remove_pattern = re.compile(r"/\* ═══════════════════════════════════════════════════════════════════════════\n   THERMODYNAMIC ENGINE.*?function calcLast5GC", re.DOTALL)
code = remove_pattern.sub("function calcLast5GC", code)

remove_pattern2 = re.compile(r"}\n\n// Hairpin ΔG via stem-loop search.*?function hasRuns\(seq, n = 4\) {", re.DOTALL)
code = remove_pattern2.sub("}\n\nfunction hasRuns(seq, n = 4) {", code)

# 3. Update APP_MODES
new_modes = """const APP_MODES = {
  standard: { name: 'Standard PCR', desc: 'Routine general-purpose PCR', prodMin: 200, prodMax: 1000, tmMin: 55, tmMax: 65 },
  diagnostic: { name: 'Diagnostic PCR', desc: 'Standard detection & identification', prodMin: 200, prodMax: 800, tmMin: 55, tmMax: 65 },
  cloning: { name: 'Cloning', desc: 'Gene cloning & subcloning', prodMin: 100, prodMax: 3000, tmMin: 58, tmMax: 68 },
  qpcr: { name: 'qPCR (Real-Time)', desc: 'Short amplicons (70-150bp), strict dimers', prodMin: 70, prodMax: 150, tmMin: 58, tmMax: 62 },
  high_gc: { name: 'High GC PCR', desc: 'GC tolerance up to 70%', prodMin: 150, prodMax: 800, tmMin: 60, tmMax: 70 },
  long_range: { name: 'Long-Range PCR', desc: 'Large amplicons (>3kb)', prodMin: 3000, prodMax: 10000, tmMin: 58, tmMax: 68 },
  touchdown: { name: 'Touchdown PCR', desc: 'Gradually lowering annealing temps', prodMin: 200, prodMax: 1000, tmMin: 60, tmMax: 70 },
  low_template: { name: 'Low Template PCR', desc: 'High sensitivity required', prodMin: 100, prodMax: 500, tmMin: 55, tmMax: 65 },
  mutation: { name: 'Mutation Detection', desc: 'SNP detection & mutagenesis', prodMin: 150, prodMax: 500, tmMin: 60, tmMax: 68 }
};"""
old_modes_pattern = re.compile(r"const APP_MODES = \{.*?\n\};\n", re.DOTALL)
code = old_modes_pattern.sub(new_modes + "\n", code)

# 4. scorePrimerFull logic
score_primer_old = """function scorePrimerFull(p, fullSeq, mode) {
  const tmTarget = (mode.tmMin + mode.tmMax) / 2;

  // 25% Tm stability
  const tmScore = Math.max(0, 1 - Math.abs(p.tm - tmTarget) / 5);

  // 20% GC balance
  const gcScore = Math.max(0, 1 - Math.abs(p.gc_content - 50) / 15);

  // 20% secondary structure (hairpin)
  const hpScore = p.hairpin_dg > -1 ? 1.0 : p.hairpin_dg > -2 ? 0.8 : p.hairpin_dg > -3 ? 0.55 : 0.0;

  // 15% self-dimer
  const sdScore = p.self_dimer_dg > -2 ? 1.0 : p.self_dimer_dg > -3.5 ? 0.75 : p.self_dimer_dg > -5 ? 0.45 : 0.0;

  // 10% GC clamp
  const clampScore = hasGCClamp(p.sequence) ? 1.0 : 0.0;

  // 10% specificity
  const rep = countRepeatHits(p.sequence, fullSeq);
  const specScore = rep <= 2 ? 1.0 : rep <= 5 ? 0.7 : rep <= 10 ? 0.35 : 0.1;

  const total = 0.25 * tmScore + 0.20 * gcScore + 0.20 * hpScore + 0.15 * sdScore + 0.10 * clampScore + 0.10 * specScore;
  return Math.round(total * 100);
}"""
score_primer_new = """function scorePrimerFull(p, fullSeq, mode) {
  const tmTarget = (mode.tmMin + mode.tmMax) / 2;

  let wTm = 40, wSpec = 30, wStruct = 20, wClamp = 10;
  if (mode.name === 'qPCR (Real-Time)') { wTm = 35; wSpec = 35; wStruct = 20; wClamp = 10; }
  else if (mode.name === 'Long-Range PCR') { wTm = 45; wSpec = 25; wStruct = 15; wClamp = 15; }
  else if (mode.name === 'High GC PCR') { wTm = 40; wSpec = 30; wStruct = 15; wClamp = 15; }
  else if (mode.name === 'Low Template PCR' || mode.name === 'Touchdown PCR') { wTm = 35; wSpec = 35; wStruct = 15; wClamp = 15; }

  const tmScoreRaw = Math.max(0, 1 - Math.abs(p.tm - tmTarget) / 5);
  const gcScoreRaw = Math.max(0, 1 - Math.abs(p.gc_content - 50) / 15);
  const combinedThermo = (tmScoreRaw + gcScoreRaw) / 2;

  const hpScoreRaw = p.hairpin_dg > -1 ? 1.0 : p.hairpin_dg > -2 ? 0.8 : p.hairpin_dg > -3 ? 0.55 : 0.0;
  const sdScoreRaw = p.self_dimer_dg > -2 ? 1.0 : p.self_dimer_dg > -3.5 ? 0.75 : p.self_dimer_dg > -5 ? 0.45 : 0.0;
  const combinedStruct = (hpScoreRaw + sdScoreRaw) / 2;

  const clampScoreRaw = hasGCClamp(p.sequence) ? 1.0 : 0.0;

  const rep = countRepeatHits(p.sequence, fullSeq);
  const specScoreRaw = rep <= 2 ? 1.0 : rep <= 5 ? 0.7 : rep <= 10 ? 0.35 : 0.1;

  const total = combinedThermo * (wTm / 100) + specScoreRaw * (wSpec / 100) + combinedStruct * (wStruct / 100) + clampScoreRaw * (wClamp / 100);
  return Math.round(total * 100);
}"""
if score_primer_old in code:
    code = code.replace(score_primer_old, score_primer_new)

# function signatures
code = code.replace("function scanCandidates(seq, mode, ampMin, ampMax, th) {", "function scanCandidates(seq, mode, ampMin, ampMax, th, conditions) {")
code = code.replace("const tm = calcTmNN(p);", "const tm = calcTmNN(p, conditions);")
code = code.replace("const hp = calcHairpinDG(p);", "const hp = calcHairpinDG(p, conditions);")
code = code.replace("const sd = calcSelfDimerDG(p);", "const sd = calcSelfDimerDG(p, conditions);")
code = code.replace("three_prime_dg: calc3PrimeDG(p),", "three_prime_dg: calc3PrimeDG(p, conditions),")

code = code.replace("function pickBestPair(fwds, revs, ampMin, ampMax, tmDiffMax, crossDimerMin) {", "function pickBestPair(fwds, revs, ampMin, ampMax, tmDiffMax, crossDimerMin, conditions) {")
code = code.replace("const cd = calcCrossDimerDG(fwd.sequence, rev.sequence);", "const cd = calcCrossDimerDG(fwd.sequence, rev.sequence, conditions);")

code = code.replace("function pickBorderlinePairs(fwds, revs, ampMin, ampMax) {", "function pickBorderlinePairs(fwds, revs, ampMin, ampMax, conditions) {")

code = code.replace("function buildResult(fwd, rev, amp, cross_dimer_dg, seq, mode, relaxLevel, isBorderline) {", "function buildResult(fwd, rev, amp, cross_dimer_dg, seq, mode, relaxLevel, isBorderline, conditions, modeKey) {")
code = code.replace("const evalResult = evaluatePrimerPair(fwd.sequence, rev.sequence, 'diagnostic', seq);", "const evalResult = evaluatePrimerPair(fwd.sequence, rev.sequence, modeKey, seq, conditions);")

code = code.replace("async function designPrimers(seq, mode) {", "async function designPrimers(seq, mode, conditions, modeKey) {")
code = code.replace("const { fwds, revs } = scanCandidates(seq, mode, mode.prodMin, mode.prodMax, th);", "const { fwds, revs } = scanCandidates(seq, mode, mode.prodMin, mode.prodMax, th, conditions);")
code = code.replace("const { fwds, revs } = scanCandidates(seq, mode, ampMin, ampMax, th);", "const { fwds, revs } = scanCandidates(seq, mode, ampMin, ampMax, th, conditions);")
code = code.replace("const best = pickBestPair(fwds, revs, mode.prodMin, mode.prodMax, 3, -6);", "const best = pickBestPair(fwds, revs, mode.prodMin, mode.prodMax, 3, -6, conditions);")
code = code.replace("const best = pickBestPair(fwds, revs, mode.prodMin, mode.prodMax, 5, -6);", "const best = pickBestPair(fwds, revs, mode.prodMin, mode.prodMax, 5, -6, conditions);")
code = code.replace("const best = pickBestPair(fwds, revs, ampMin, ampMax, 5, -6);", "const best = pickBestPair(fwds, revs, ampMin, ampMax, 5, -6, conditions);")
code = code.replace("const borderlinePairs = pickBorderlinePairs(fwds, revs, ampMin, ampMax);", "const borderlinePairs = pickBorderlinePairs(fwds, revs, ampMin, ampMax, conditions);")

code = code.replace("buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 0, false);", "buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 0, false, conditions, modeKey);")
code = code.replace("buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 1, false);", "buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 1, false, conditions, modeKey);")
code = code.replace("buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 2, false);", "buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 2, false, conditions, modeKey);")
code = code.replace("buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 3, false);", "buildResult(best.fwd, best.rev, best.amp, best.cross_dimer_dg, seq, mode, 3, false, conditions, modeKey);")
code = code.replace("buildResult(primary.fwd, primary.rev, primary.amp, primary.cross_dimer_dg, seq, mode, 4, true);", "buildResult(primary.fwd, primary.rev, primary.amp, primary.cross_dimer_dg, seq, mode, 4, true, conditions, modeKey);")

# 5. UI Updates
code = code.replace("const [activeSample, setActiveSample] = useState(null);", """const [activeSample, setActiveSample] = useState(null);
  const [naConc, setNaConc] = useState(50);
  const [mgConc, setMgConc] = useState(1.5);
  const [primerConc, setPrimerConc] = useState(250);
  const [dntpConc, setDntpConc] = useState(0.2);
  const [showAdvanced, setShowAdvanced] = useState(false);""")

code = code.replace("const targetSeq = overrideSample ? overrideSample.sequence : sequence;", """const targetSeq = overrideSample ? overrideSample.sequence : sequence;
    const conditions = { na: parseFloat(naConc) || 50, mg: parseFloat(mgConc) || 1.5, primerConc: parseFloat(primerConc) || 250, dntp: parseFloat(dntpConc) || 0.2 };""")

code = code.replace("const fHpDg = calcHairpinDG(fStr);", "const fHpDg = calcHairpinDG(fStr, conditions);")
code = code.replace("const rHpDg = calcHairpinDG(rStr);", "const rHpDg = calcHairpinDG(rStr, conditions);")
code = code.replace("const cd = calcCrossDimerDG(fStr, rStr);", "const cd = calcCrossDimerDG(fStr, rStr, conditions);")
code = code.replace("tm: calcTmNN(fStr)", "tm: calcTmNN(fStr, conditions)")
code = code.replace("tm: calcTmNN(rStr)", "tm: calcTmNN(rStr, conditions)")
code = code.replace("self_dimer_dg: calcSelfDimerDG(fStr)", "self_dimer_dg: calcSelfDimerDG(fStr, conditions)")
code = code.replace("self_dimer_dg: calcSelfDimerDG(rStr)", "self_dimer_dg: calcSelfDimerDG(rStr, conditions)")
code = code.replace("three_prime_stability_dg: calc3PrimeDG(fStr)", "three_prime_stability_dg: calc3PrimeDG(fStr, conditions)")
code = code.replace("three_prime_stability_dg: calc3PrimeDG(rStr)", "three_prime_stability_dg: calc3PrimeDG(rStr, conditions)")
code = code.replace("buildResult(f, r, targetSeq.length, cd, v.cleaned, targetMode, overrideSample.relaxLevel, overrideSample.isBorderline);", "buildResult(f, r, targetSeq.length, cd, v.cleaned, targetMode, overrideSample.relaxLevel, overrideSample.isBorderline, conditions, overrideSample.application_mode);")

code = code.replace("const res = await designPrimers(v.cleaned, targetMode);", "const res = await designPrimers(v.cleaned, targetMode, conditions, appMode);")

ui_injection = """        </div>

        {/* ═══ ADVANCED SETTINGS ═══ */}
        <button className="btn-g" onClick={() => setShowAdvanced(v => !v)} style={{ width: '100%', justifyContent: 'space-between', marginBottom: '1rem', marginTop: '0.45rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.42rem' }}>
            <span style={{ fontSize: '0.94rem' }}>Advanced Experimental Controls</span>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#6b7080', transition: 'transform 0.25s', transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
        </button>
        <div className={`info-wrap ${showAdvanced ? 'open' : 'closed'}`}>
          <div className="pc" style={{ marginBottom: '1.15rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', background: '#0c0e14' }}>
            <div>
              <label className="lbl">Na+ (mM)</label>
              <input type="number" step="1" value={naConc} onChange={e => setNaConc(e.target.value)} style={{ width: '100%', background: '#141720', border: '1px solid #24272f', borderRadius: '8px', color: '#e2e4e9', padding: '0.6rem 0.8rem', outline: 'none' }} />
            </div>
            <div>
              <label className="lbl">Mg2+ (mM)</label>
              <input type="number" step="0.1" value={mgConc} onChange={e => setMgConc(e.target.value)} style={{ width: '100%', background: '#141720', border: '1px solid #24272f', borderRadius: '8px', color: '#e2e4e9', padding: '0.6rem 0.8rem', outline: 'none' }} />
            </div>
            <div>
              <label className="lbl">Primer (nM)</label>
              <input type="number" step="10" value={primerConc} onChange={e => setPrimerConc(e.target.value)} style={{ width: '100%', background: '#141720', border: '1px solid #24272f', borderRadius: '8px', color: '#e2e4e9', padding: '0.6rem 0.8rem', outline: 'none' }} />
            </div>
            <div>
              <label className="lbl">dNTP (mM)</label>
              <input type="number" step="0.1" value={dntpConc} onChange={e => setDntpConc(e.target.value)} style={{ width: '100%', background: '#141720', border: '1px solid #24272f', borderRadius: '8px', color: '#e2e4e9', padding: '0.6rem 0.8rem', outline: 'none' }} />
            </div>
          </div>
        </div>"""

code = code.replace("        </div>\n\n        {error && (", ui_injection + "\n\n        {error && (")

res_injection = """            <div className="pc" style={{ marginBottom: '1.1rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#00FFC6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.55rem' }}>Experimental Conditions</div>
              <div className="stat-grid">
                <div style={{ background: '#0f1117', borderRadius: 7, padding: '0.5rem 0.65rem' }}>
                   <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{primers._meta?.conditions_used?.na || naConc} <span style={{fontSize: '0.7em'}}>mM</span></div>
                   <div style={{ fontSize: '0.78rem', color: '#6b7080' }}>Na+</div>
                </div>
                <div style={{ background: '#0f1117', borderRadius: 7, padding: '0.5rem 0.65rem' }}>
                   <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{primers._meta?.conditions_used?.mg || mgConc} <span style={{fontSize: '0.7em'}}>mM</span></div>
                   <div style={{ fontSize: '0.78rem', color: '#6b7080' }}>Mg2+</div>
                </div>
                <div style={{ background: '#0f1117', borderRadius: 7, padding: '0.5rem 0.65rem' }}>
                   <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{primers._meta?.conditions_used?.primerConc || primerConc} <span style={{fontSize: '0.7em'}}>nM</span></div>
                   <div style={{ fontSize: '0.78rem', color: '#6b7080' }}>Primer</div>
                </div>
                <div style={{ background: '#0f1117', borderRadius: 7, padding: '0.5rem 0.65rem' }}>
                   <div style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 600 }}>{primers._meta?.conditions_used?.dntp || dntpConc} <span style={{fontSize: '0.7em'}}>mM</span></div>
                   <div style={{ fontSize: '0.78rem', color: '#6b7080' }}>dNTP</div>
                </div>
              </div>
            </div>"""

code = code.replace(
    "            <div className=\"stat-grid\" style={{ marginBottom: '1.1rem' }}>",
    res_injection + "\n            <div className=\"stat-grid\" style={{ marginBottom: '1.1rem' }}>"
)

# Export updates to show Experimental Conditions
export_txt = """    let c = `PCR Primer Designer Results\\n${'='.repeat(50)}\\n\\n`;
    c += `Application Mode: ${mode.name}\\n`;
    c += `Classification: ${primers.classification}\\n`;
    if (primers.evaluation?.confidenceBand) c += `Confidence Band: ${primers.evaluation.confidenceBand}\\n`;
    if (!primers.autoRejected) c += `Overall Score: ${primers.overall_score}/100\\n`;
    c += `\\nEXPERIMENTAL CONDITIONS:\\n`;
    c += `  Na+: ${primers._meta?.conditions_used?.na || naConc} mM\\n`;
    c += `  Mg2+: ${primers._meta?.conditions_used?.mg || mgConc} mM\\n`;
    c += `  Primer Conc: ${primers._meta?.conditions_used?.primerConc || primerConc} nM\\n`;
    c += `  dNTP: ${primers._meta?.conditions_used?.dntp || dntpConc} mM\\n\\n`;
    c += `RECALCULATED THERMODYNAMICS:\\n`;
    c += `  Product Size: ${primers.expected_product_size} bp\\n`;"""
code = code.replace("    let c = `PCR Primer Designer Results\\n${'='.repeat(50)}\\n\\n`;\n    c += `Application Mode: ${mode.name}\\n`;\n    c += `Classification: ${primers.classification}\\n`;\n    if (primers.evaluation?.confidenceBand) c += `Confidence Band: ${primers.evaluation.confidenceBand}\\n`;\n    if (!primers.autoRejected) c += `Overall Score: ${primers.overall_score}/100\\n`;\n    c += `Product Size: ${primers.expected_product_size} bp\\n`;", export_txt)

meta_replace = """_meta: {
      model: 'SantaLucia 1998 Nearest-Neighbor',
      conditions: '[oligo]=250nM, [Na+]=50mM, T=37°C',"""
meta_new = """_meta: {
      model: 'SantaLucia 1998 Nearest-Neighbor',
      conditions_used: conditions,"""
code = code.replace(meta_replace, meta_new)

with open('src/components/PrimerDesigner.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated successfully")
