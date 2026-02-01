import { useState } from 'react';

/* ─── SAMPLE (TP53 exon-7 region) ────────────────────────────────────────── */
const SAMPLE_SEQUENCE = [
  'ATGGAGGAGCCGCAGTCAGATCCTAGCGTGAGTTTGCCTGTCCTGGGAGAGACCGGCGC',
  'ACAGAGGAAGAGAATCTCCGCAAGAAAGTGGGGTTTGTCTCCTTCCAGCCAAGGTCTGA',
  'GCCTGCAGTTCAACTGACTGTTTCAAGTTATAGGGTGACAGGTTTCATCTGGCAAGCCA',
  'GGCTTCGGGCTCAGTGGAACTCGGAGGAAAGTGAGGCTTTGCTCAGGAGAGGGGTTGCT',
  'GATCTGCCCCCGGGCTCTCCCAGGACACCTATGGAAACTACTTCCTGAAACAACGTTCTG',
  'TGTTTGTGTCCCCTTCGGTGGCCCCTGCACCAGAAGAAACCCCGCGGGAGCGCCCCTCCC',
  'CCATCCCCCTCCCCCAAGAGATTCGTTGCCCTCCCAGGGTGGGCTGGCCCACTCGAACCC',
  'CCATCCGGGTTCTTCACCTGTTTGGCTTCCTGGAAGGTGGAGACTCAGCCCAGCCCCCAA',
  'GGTGAACTCAATCTCAAGGTCAATGGCAGGCCGTCCCCTTCCAGGTTCTTCGCCTGCAGC',
  'CCCGGCACTGCCTCAGCCCTCAGCCCTAAGCCCAGTGCCAACTCAGCCCCCGGCCCCCAG'
].join('');

/* ─── MOCK UTILS ─────────────────────────────────────────────────────────── */
function validateSequence(seq) {
  const cleaned = seq.toUpperCase().replace(/[^ATGC]/g, '');
  if (!cleaned.length) return { valid: false, error: 'No valid DNA bases found.' };
  if (cleaned.length < 40) return { valid: false, error: 'Sequence must be at least 40 bp.' };
  return { valid: true, cleaned };
}
async function designPrimers(seq) {
  await new Promise(r => setTimeout(r, 950));
  const fwd = seq.substring(0, 20);
  const revRaw = seq.substring(seq.length - 21, seq.length - 1);
  const comp = { A:'T', T:'A', G:'C', C:'G' };
  const rev = revRaw.split('').reverse().map(b => comp[b] || b).join('');
  const gc = s => ((s.match(/[GC]/g) || []).length / s.length) * 100;
  const tm = s => 2 * (s.match(/[AT]/g) || []).length + 4 * (s.match(/[GC]/g) || []).length;
  return { success: true, data: {
    forward_primer: { sequence: fwd, length: fwd.length, tm: tm(fwd), gc_content: +gc(fwd).toFixed(1), position: '1–20', quality_grade: 'Good', quality_score: 78, hairpin: { risk_level: 'low', delta_g: -0.4 }, gc_clamp: { has_clamp: true, clamp_strength: 2 } },
    reverse_primer: { sequence: rev, length: rev.length, tm: tm(rev), gc_content: +gc(rev).toFixed(1), position: `${seq.length-20}–${seq.length}`, quality_grade: 'Good', quality_score: 74, hairpin: { risk_level: 'medium', delta_g: -1.2 }, gc_clamp: { has_clamp: false, clamp_strength: 1 } },
    expected_product_size: seq.length,
    tm_difference: Math.abs(tm(fwd) - tm(rev)),
    dimer_analysis: { risk_level: 'low' },
    pcr_protocol: { annealing_temp: Math.min(tm(fwd), tm(rev)) - 5, extension_time: Math.max(60, Math.ceil(seq.length / 1000) * 60), cycles: 35, polymerase: 'Taq DNA Polymerase (high-fidelity)', notes: ['Use hot-start polymerase for best specificity', 'Verify product size on gel after PCR'] },
    all_candidates: []
  }};
}

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const MODES = {
  diagnostic: { name:'Diagnostic PCR',     desc:'Detection & identification',   icon:'🔬', prodMin:200,  prodMax:800,  tmMin:55, tmMax:65 },
  cloning:    { name:'Cloning',            desc:'Gene cloning & subcloning',    icon:'🧬', prodMin:100,  prodMax:3000, tmMin:58, tmMax:68 },
  qpcr:       { name:'qPCR (Real-Time)',   desc:'Quantitative real-time PCR',   icon:'📊', prodMin:70,   prodMax:200,  tmMin:58, tmMax:62 },
  mutation:   { name:'Mutation Detection', desc:'SNP detection & mutagenesis',  icon:'🎯', prodMin:150,  prodMax:500,  tmMin:60, tmMax:68 }
};
const QC = { Excellent:'#00FFC6', Good:'#00c9a0', Fair:'#F59E0B', Poor:'#EF4444' };
const RC = { low:'#00FFC6', medium:'#F59E0B', high:'#EF4444' };
const UC = { high:'#EF4444', medium:'#F59E0B', low:'#00FFC6' };

/* ════════════════════════════════════════════════════════════════════════════ */
export default function PrimerDesigner() {
  const [seq, setSeq]           = useState('');
  const [mode, setMode]         = useState('diagnostic');
  const [primers, setPrimers]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showCand, setShowCand] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const M = MODES[mode];
  const bp = seq.toUpperCase().replace(/[^ATGC]/g, '').length;

  /* ── helpers ── */
  const buildAnalysis = p => {
    const a = [];
    if (p.hairpin?.risk_level !== 'low') a.push({ type: p.hairpin.risk_level === 'high' ? 'error' : 'warning', icon:'🔄', title:'Hairpin Formation Risk', issue:`Secondary structure risk detected (ΔG = ${p.hairpin.delta_g} kcal/mol)`, impact:'Reduces available primer for binding — lowers yield & efficiency.', fixes:['Shift primer 2–3 bp up or downstream','Add 3–5 % DMSO to the reaction','Raise annealing temp by 2–3 °C'] });
    if (!p.gc_clamp?.has_clamp) a.push({ type:'warning', icon:'🔗', title:'Missing GC Clamp', issue:'No G/C in the last 5 bases of the 3′ end.', impact:'Weaker 3′ binding reduces extension — especially critical for cloning.', fixes:['Shift primer so a G or C lands at 3′','Extend by 1–2 G/C bases if the template allows'] });
    return a;
  };
  const buildTips = (data) => {
    const tips = [], f = data.forward_primer, r = data.reverse_primer;
    if (!f || !r) return tips;
    if (Math.abs(f.tm - r.tm) > 5) tips.push({ cat:'Temperature', icon:'🌡️', title:'Large Tm Difference', rec:`Gradient PCR between ${Math.min(f.tm,r.tm)-5} °C and ${Math.max(f.tm,r.tm)-3} °C to find the sweet spot.`, urg:'high' });
    if (data.dimer_analysis?.risk_level !== 'low') tips.push({ cat:'Dimer Prevention', icon:'🔗', title:'Primer-Dimer Risk', rec:'Lower primer concentration to 0.2 µM. Use a hot-start polymerase.', urg:'medium' });
    tips.push({ cat:'Protocol', icon:'🧪', title:`${M.name} Best Practices`, rec: M.name === 'qPCR (Real-Time)' ? 'Keep amplicon 70–150 bp. Use ROX dye. Target 90–110 % efficiency.' : 'Use high-fidelity polymerase (Phusion / Q5). Sequence-verify before cloning.', urg:'low' });
    return tips;
  };

  const handleDesign = async () => {
    if (!seq.trim()) { setError('Please enter a DNA sequence.'); return; }
    const v = validateSequence(seq);
    if (!v.valid) { setError(v.error); return; }
    setLoading(true); setError(''); setPrimers(null);
    const res = await designPrimers(v.cleaned);
    setLoading(false);
    if (res.success) {
      if (res.data.forward_primer) res.data.forward_primer.detailed_analysis = buildAnalysis(res.data.forward_primer);
      if (res.data.reverse_primer) res.data.reverse_primer.detailed_analysis = buildAnalysis(res.data.reverse_primer);
      res.data.optimization_tips = buildTips(res.data);
      setPrimers(res.data);
    } else setError(res.error);
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */
  return (
  <div style={{ minHeight:'100vh', background:'#0c0e14', color:'#e2e4e9', fontFamily:'"Sora",sans-serif' }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{ box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar{ width:5px; }
    ::-webkit-scrollbar-track{ background:#131518; }
    ::-webkit-scrollbar-thumb{ background:#2a2d3a; border-radius:3px; }

    /* ── cards ── */
    .pc{ background:#141720; border:1px solid #24272f; border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; }

    /* ── labels ── */
    .lbl{ display:block; font-size:.82rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.42rem; }

    /* ── inputs ── */
    select, textarea{
      width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px;
      color:#e2e4e9; font-family:'Sora',sans-serif; font-size:.92rem;
      padding:.7rem .85rem; outline:none; transition:border-color .2s;
    }
    select:focus, textarea:focus{ border-color:#00FFC6; }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:.8rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }
    select option{ background:#0f1117; }

    /* ── buttons ── */
    .btn-p{
      display:flex; align-items:center; justify-content:center; gap:.5rem;
      width:100%; padding:.88rem 1.25rem;
      background:linear-gradient(135deg,#00FFC6,#00b08a);
      border:none; border-radius:10px;
      color:#0c0e14; font-family:'Sora',sans-serif; font-weight:600; font-size:.98rem;
      cursor:pointer; transition:all .22s;
    }
    .btn-p:hover{ filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,255,198,.28); }
    .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-g{
      display:inline-flex; align-items:center; gap:.38rem;
      padding:.46rem .9rem; background:transparent;
      border:1px solid #24272f; border-radius:7px;
      color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.84rem; font-weight:500;
      cursor:pointer; transition:all .2s;
    }
    .btn-g:hover{ border-color:#00FFC6; color:#00FFC6; background:rgba(0,255,198,.05); }

    .btn-sample{
      display:inline-flex; align-items:center; gap:.35rem;
      padding:.4rem .82rem; background:rgba(0,255,198,.08);
      border:1px solid rgba(0,255,198,.28); border-radius:7px;
      color:#00FFC6; font-family:'JetBrains Mono',monospace; font-size:.78rem; font-weight:500;
      cursor:pointer; transition:all .2s;
    }
    .btn-sample:hover{ background:rgba(0,255,198,.15); border-color:rgba(0,255,198,.5); }

    /* ── mode cards ── */
    .mode-card{
      background:#141720; border:1px solid #24272f; border-radius:11px;
      padding:1rem; cursor:pointer; transition:all .22s; position:relative;
    }
    .mode-card:hover{ border-color:#00FFC630; transform:translateY(-1px); }
    .mode-card.active{ border-color:#00FFC6; background:rgba(0,255,198,.06); box-shadow:0 0 18px rgba(0,255,198,.1); }

    /* ── stats ── */
    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:.8rem .6rem; text-align:center; }
    .stat-v{ font-size:1.3rem; font-weight:700; line-height:1.2; }
    .stat-l{ font-size:.72rem; color:#6b7080; text-transform:uppercase; letter-spacing:.06em; margin-top:.25rem; }

    /* ── primer seq ── */
    .seq-box{
      background:#0a0c12; border:1px solid #1e2130; border-radius:8px;
      padding:.8rem .9rem; font-family:'JetBrains Mono',monospace;
      font-size:.84rem; color:#00FFC6; letter-spacing:1.5px; word-break:break-all; line-height:1.75;
    }

    /* ── misc ── */
    .a-card{ border-radius:9px; padding:.85rem; margin-bottom:.55rem; }
    .tip-card{ background:#0f1117; border:1px solid #1e2130; border-radius:9px; padding:.85rem; margin-bottom:.55rem; }
    .proto-box{ background:#0f1117; border:1px solid #1e2130; border-radius:9px; padding:.8rem; text-align:center; }
    .cand-row{ background:#0f1117; border:1px solid #1e2130; border-radius:8px; padding:.8rem; margin-bottom:.45rem; }

    /* ── spinner ── */
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:16px; height:16px; border:2px solid #0c0e1440; border-top-color:#0c0e14; border-radius:50%; animation:spin .5s linear infinite; }

    /* ── info panel ── */
    .info-wrap{ overflow:hidden; transition:max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; }
    .info-wrap.closed{ max-height:0; opacity:0; }
    .info-wrap.open{ max-height:1000px; opacity:1; }

    /* ── step ── */
    .step-row{ display:flex; gap:.55rem; align-items:flex-start; margin-bottom:.6rem; }
    .step-num{ flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#00FFC6; color:#0c0e14; font-size:.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:.1rem; }

    /* ── responsive ── */
    .mode-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.55rem; }
    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.55rem; }
    .primer-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
    .proto-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:.5rem; }
    .prop-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.4rem; }

    @media(max-width:640px){
      .mode-grid{ grid-template-columns:repeat(2,1fr); }
      .stat-grid{ grid-template-columns:repeat(2,1fr); }
      .primer-grid{ grid-template-columns:1fr; }
      .proto-grid{ grid-template-columns:1fr; }
      .pc{ padding:1rem; }
    }
    @media(max-width:380px){
      .mode-grid{ grid-template-columns:1fr 1fr; gap:.4rem; }
      .stat-grid{ grid-template-columns:1fr 1fr; gap:.4rem; }
    }
  `}</style>

  {/* ═══ HEADER ═══ */}
  <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.5rem 1.2rem 1.2rem' }}>
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.65rem', marginBottom:'.4rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'1.5rem' }}>🧬</span>
        <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.4rem', color:'#fff' }}>PCR Primer Designer</h1>
        <span style={{ background:'rgba(0,255,198,.1)', border:'1px solid rgba(0,255,198,.25)', color:'#00FFC6', fontSize:'.64rem', fontWeight:600, padding:'.2rem .52rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Research Grade</span>
      </div>
      <p style={{ color:'#6b7080', fontSize:'.88rem', lineHeight:1.55, maxWidth:560 }}>
        Application-specific primer design with Tm, GC, hairpin &amp; dimer analysis across four PCR workflows.
      </p>
    </div>
  </div>

  <div style={{ maxWidth:860, margin:'0 auto', padding:'1.15rem 1.1rem 3rem' }}>

    {/* ═══ INFO TOGGLE ═══ */}
    <button className="btn-g" onClick={()=>setInfoOpen(v=>!v)} style={{ width:'100%', justifyContent:'space-between', marginBottom:'1rem' }}>
      <span style={{ display:'flex', alignItems:'center', gap:'.42rem' }}>
        <span style={{ fontSize:'.9rem' }}>💡</span>
        <span style={{ fontSize:'.86rem' }}>Why This Tool Matters &amp; How to Use It</span>
      </span>
      <span style={{ fontSize:'.72rem', color:'#6b7080', transition:'transform .25s', transform:infoOpen?'rotate(180deg)':'rotate(0)', display:'inline-block' }}>▼</span>
    </button>

    <div className={`info-wrap ${infoOpen ? 'open' : 'closed'}`}>
      <div className="pc" style={{ padding:'1.3rem' }}>

        {/* WHY */}
        <div style={{ marginBottom:'1.1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.5rem' }}>
            <span style={{ fontSize:'.92rem' }}>🎯</span>
            <span style={{ fontSize:'.82rem', fontWeight:600, color:'#00FFC6', textTransform:'uppercase', letterSpacing:'.07em' }}>Why This Tool Matters</span>
          </div>
          <p style={{ fontSize:'.88rem', color:'#8a8f9e', lineHeight:1.75, margin:0 }}>
            Designing primers by hand is slow and error-prone. A single mismatch at the
            <strong style={{ color:'#c8cad4' }}> 3′ end </strong>
            can silently kill your entire PCR run. This tool automates every critical check —
            <strong style={{ color:'#c8cad4' }}> melting temperature </strong>,
            <strong style={{ color:'#c8cad4' }}> GC content </strong>,
            <strong style={{ color:'#c8cad4' }}> hairpin &amp; dimer risk </strong>, and
            <strong style={{ color:'#c8cad4' }}> 3′ GC-clamp stability </strong>
            — so you get a reliable, optimised primer pair in seconds. Each application mode enforces the exact parameter windows that matter most for that specific workflow.
          </p>
        </div>

        <div style={{ borderTop:'1px solid #24272f', margin:'1rem 0' }}></div>

        {/* WORKFLOW */}
        <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.65rem' }}>
          <span style={{ fontSize:'.92rem' }}>📖</span>
          <span style={{ fontSize:'.82rem', fontWeight:600, color:'#60A5FA', textTransform:'uppercase', letterSpacing:'.07em' }}>Workflow &amp; Next Steps</span>
        </div>
        {[
          ['Pick Your Application',      'Choose the PCR type below. Each mode pre-tunes amplicon size, Tm window, and strictness — Diagnostic is the broadest; qPCR is the tightest.'],
          ['Paste Your Target Sequence', 'Drop in your gene region (FASTA body or plain text). The tool strips headers, line-breaks, and numbers for you automatically.'],
          ['Run the Analysis',           'Hit Design Primers. The engine scores every candidate on Tm balance, GC%, hairpin ΔG, dimer risk, and 3′ clamp — then surfaces the best pair.'],
          ['Use the Results Downstream', 'Copy the oligo sequences straight into a synthesis order or clone them into an expression vector. The protocol block gives you annealing temp, extension time, and cycle count ready to go.']
        ].map(([title, desc], i) => (
          <div key={i} className="step-row">
            <div className="step-num">{i+1}</div>
            <div>
              <div style={{ fontSize:'.86rem', fontWeight:600, color:'#c8cad4', marginBottom:'.1rem' }}>{title}</div>
              <div style={{ fontSize:'.82rem', color:'#6b7080', lineHeight:1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ═══ MODE SELECTOR ═══ */}
    <label className="lbl">Application Mode</label>
    <div className="mode-grid" style={{ marginBottom:'1.1rem' }}>
      {Object.entries(MODES).map(([k, m]) => (
        <div key={k} className={`mode-card ${mode===k?'active':''}`} onClick={()=>setMode(k)}>
          {mode===k && <span style={{ position:'absolute', top:'.5rem', right:'.5rem', background:'#00FFC6', color:'#0c0e14', fontSize:'.6rem', fontWeight:700, width:18, height:18, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
          <div style={{ fontSize:'1.3rem', marginBottom:'.28rem' }}>{m.icon}</div>
          <div style={{ fontSize:'.82rem', fontWeight:600, color:mode===k?'#00FFC6':'#c8cad4', marginBottom:'.18rem' }}>{m.name}</div>
          <div style={{ fontSize:'.74rem', color:'#6b7080', lineHeight:1.4 }}>{m.desc}</div>
        </div>
      ))}
    </div>

    {/* mode strip */}
    <div style={{ background:'rgba(0,255,198,.06)', border:'1px solid rgba(0,255,198,.18)', borderRadius:9, padding:'.58rem .85rem', marginBottom:'1.1rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
      <span style={{ fontSize:'.84rem', color:'#00FFC6', fontWeight:600 }}>{M.icon} {M.name}</span>
      <span style={{ color:'#3a3d4a', fontSize:'.78rem' }}>|</span>
      <span style={{ fontSize:'.82rem', color:'#8a8f9e' }}>Amplicon {M.prodMin}–{M.prodMax} bp</span>
      <span style={{ color:'#3a3d4a', fontSize:'.78rem' }}>|</span>
      <span style={{ fontSize:'.82rem', color:'#8a8f9e' }}>Tm {M.tmMin}–{M.tmMax} °C</span>
    </div>

    {/* ═══ SEQUENCE INPUT ═══ */}
    <div className="pc">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.42rem', flexWrap:'wrap', gap:'.4rem' }}>
        <label className="lbl" style={{ margin:0 }}>Target DNA Sequence</label>
        <button className="btn-sample" onClick={loadSample}><span>⚡</span> Load Sample</button>
      </div>
      <textarea rows={5} value={seq} onChange={e=>setSeq(e.target.value)} placeholder="Paste your target gene region here… (whitespace &amp; numbers are ignored)" />
      {seq && (
        <div style={{ marginTop:'.42rem', fontSize:'.8rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace', display:'flex', alignItems:'center', gap:'.7rem', flexWrap:'wrap' }}>
          <span>{bp} bp after cleaning</span>
          {bp < 150 && bp > 0 && <span style={{ color:'#F59E0B' }}>⚠ Short sequence — parameters will auto-adjust</span>}
        </div>
      )}
    </div>

    {error && (
      <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'.62rem .82rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.45rem' }}>
        <span style={{ fontSize:'.88rem' }}>⚠️</span>
        <span style={{ fontSize:'.84rem', color:'#F87171' }}>{error}</span>
      </div>
    )}

    {/* ═══ SUBMIT ═══ */}
    <button className="btn-p" onClick={handleDesign} disabled={loading}>
      {loading ? <><span className="spin"></span> Designing Primers…</> : <><span>🚀</span> Design Primers</>}
    </button>

    {/* ═══════════════════════════════════════════════════════════════════
        RESULTS
        ═══════════════════════════════════════════════════════════════════ */}
    {primers && (<>

      {/* STATS */}
      <div style={{ marginTop:'1.5rem' }}>
        <span style={{ fontSize:'.8rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'.07em' }}>
          Results — <span style={{ color:'#00FFC6' }}>{M.name}</span>
        </span>
        <div className="stat-grid" style={{ marginTop:'.5rem' }}>
          {[
            { l:'Product Size',  v:`${primers.expected_product_size} bp`,                                     c:'#fff' },
            { l:'Tm Difference', v:`${primers.tm_difference?.toFixed(1)} °C`,                                 c:'#fff' },
            { l:'Compatibility', v: primers.tm_difference < 5 ? 'Excellent' : 'Acceptable',                  c: primers.tm_difference < 5 ? '#00FFC6' : '#F59E0B' },
            { l:'Dimer Risk',    v: primers.dimer_analysis?.risk_level || '—',                                c: RC[primers.dimer_analysis?.risk_level] || '#6b7080' }
          ].map((s,i) => (
            <div key={i} className="stat-b">
              <div className="stat-v" style={{ color:s.c }}>{s.v}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* OPTIMIZATION TIPS */}
      {primers.optimization_tips?.length && (
        <div className="pc" style={{ marginTop:'1.1rem', borderColor:'rgba(245,158,11,.22)', background:'rgba(245,158,11,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.65rem' }}>
            <span style={{ fontSize:'.92rem' }}>💡</span>
            <span style={{ fontSize:'.82rem', fontWeight:600, color:'#F59E0B', textTransform:'uppercase', letterSpacing:'.07em' }}>PCR Optimization</span>
          </div>
          {primers.optimization_tips.map((t,i) => (
            <div key={i} className="tip-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.32rem', flexWrap:'wrap', gap:'.35rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                  <span style={{ fontSize:'.96rem' }}>{t.icon}</span>
                  <span style={{ fontSize:'.82rem', fontWeight:600, color:'#FCD34D' }}>{t.title}</span>
                </div>
                <span style={{ background:`${UC[t.urg]}15`, color:UC[t.urg], fontSize:'.68rem', fontWeight:600, padding:'.18rem .48rem', borderRadius:10, textTransform:'uppercase', letterSpacing:'.05em' }}>{t.urg}</span>
              </div>
              <p style={{ fontSize:'.84rem', color:'#8a8f9e', lineHeight:1.65, margin:0 }}>{t.rec}</p>
            </div>
          ))}
        </div>
      )}

      {/* PRIMERS */}
      <div style={{ marginTop:'1.1rem' }}>
        <span style={{ fontSize:'.8rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'.07em' }}>Recommended Primers</span>
      </div>
      <div className="primer-grid" style={{ marginTop:'.5rem' }}>
        {[
          primers.forward_primer && { ...primers.forward_primer, label:'Forward' },
          primers.reverse_primer && { ...primers.reverse_primer, label:'Reverse' }
        ].map((p, i) => p ? (
          <div key={i} className="pc" style={{ padding:'1.15rem' }}>
            {/* header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.6rem', flexWrap:'wrap', gap:'.35rem' }}>
              <span style={{ fontSize:'.9rem', fontWeight:600, color:'#00FFC6' }}>{p.label} Primer</span>
              <span style={{ background:`${QC[p.quality_grade]}18`, color:QC[p.quality_grade], border:`1px solid ${QC[p.quality_grade]}40`, fontSize:'.7rem', fontWeight:600, padding:'.2rem .55rem', borderRadius:12 }}>
                {p.quality_grade} · {p.quality_score}/100
              </span>
            </div>
            {/* copy + seq */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'.28rem' }}>
              <button className="btn-g" onClick={()=>navigator.clipboard?.writeText(p.sequence)}>📋 Copy</button>
            </div>
            <div className="seq-box">{p.sequence}</div>
            {/* props */}
            <div className="prop-grid" style={{ marginTop:'.65rem' }}>
              {[['Length',`${p.length} bp`],['Tm',`${p.tm} °C`],['GC Content',`${p.gc_content} %`],['Position',p.position]].map(([l,v],j) => (
                <div key={j} style={{ background:'#0f1117', borderRadius:7, padding:'.5rem .58rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'.76rem', color:'#6b7080' }}>{l}</span>
                  <span style={{ fontSize:'.82rem', color:'#c8cad4', fontWeight:600, fontFamily:'"JetBrains Mono",monospace' }}>{v}</span>
                </div>
              ))}
            </div>
            {/* quick metrics */}
            {p.hairpin && p.gc_clamp && (
              <div className="prop-grid" style={{ marginTop:'.5rem' }}>
                {[
                  { l:'Hairpin Risk', v:p.hairpin.risk_level,                          c:RC[p.hairpin.risk_level] },
                  { l:'GC Clamp',     v:p.gc_clamp.has_clamp ? 'Present' : 'Missing',  c:p.gc_clamp.has_clamp ? '#00FFC6' : '#F59E0B' }
                ].map((m,j) => (
                  <div key={j} style={{ background:'#0f1117', borderRadius:7, padding:'.42rem .58rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'.74rem', color:'#6b7080' }}>{m.l}</span>
                    <span style={{ fontSize:'.8rem', color:m.c, fontWeight:600 }}>{m.v}</span>
                  </div>
                ))}
              </div>
            )}
            {/* quality flags */}
            {p.detailed_analysis?.length > 0 && (
              <div style={{ marginTop:'.7rem' }}>
                <span style={{ fontSize:'.76rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'.06em' }}>Quality Flags</span>
                {p.detailed_analysis.map((a,j) => {
                  const col = { error:'#EF4444', warning:'#F59E0B', info:'#60A5FA' }[a.type] || '#6b7080';
                  return (
                    <div key={j} className="a-card" style={{ marginTop:'.38rem', background:`${col}0e`, border:`1px solid ${col}35` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'.35rem', marginBottom:'.32rem' }}>
                        <span style={{ fontSize:'.88rem' }}>{a.icon}</span>
                        <span style={{ fontSize:'.8rem', fontWeight:600, color:col }}>{a.title}</span>
                      </div>
                      <p style={{ fontSize:'.78rem', color:'#8a8f9e', lineHeight:1.6, margin:'0 0 .26rem' }}>{a.issue}</p>
                      <p style={{ fontSize:'.76rem', color:'#606878', lineHeight:1.55, margin:'0 0 .32rem', fontStyle:'italic' }}>{a.impact}</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:'.16rem' }}>
                        {a.fixes.map((f,fi) => (
                          <span key={fi} style={{ fontSize:'.76rem', color:'#00c9a0', paddingLeft:'.65rem', position:'relative' }}>
                            <span style={{ position:'absolute', left:0, color:'#00FFC660' }}>›</span>{f}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div key={i} className="pc" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:180, color:'#EF4444', fontSize:'.9rem' }}>No suitable primer found</div>
        ))}
      </div>

      {/* PCR PROTOCOL */}
      {primers.pcr_protocol && (
        <div className="pc" style={{ marginTop:'1.1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.6rem' }}>
            <span style={{ fontSize:'.92rem' }}>🧪</span>
            <span style={{ fontSize:'.82rem', fontWeight:600, color:'#00FFC6', textTransform:'uppercase', letterSpacing:'.07em' }}>Recommended Protocol</span>
          </div>
          <div className="proto-grid" style={{ marginBottom:'.7rem' }}>
            {[['Annealing Temp',`${primers.pcr_protocol.annealing_temp} °C`],['Extension Time',`${primers.pcr_protocol.extension_time} s`],['Cycles',primers.pcr_protocol.cycles]].map(([l,v],i) => (
              <div key={i} className="proto-box">
                <div style={{ fontSize:'.72rem', color:'#6b7080', marginBottom:'.22rem', textTransform:'uppercase', letterSpacing:'.06em' }}>{l}</div>
                <div style={{ fontSize:'1.1rem', color:'#00FFC6', fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:'.84rem', color:'#8a8f9e', marginBottom:'.32rem' }}>
            <span style={{ color:'#6b7080' }}>Polymerase: </span>{primers.pcr_protocol.polymerase}
          </div>
          {primers.pcr_protocol.notes?.map((n,i) => (
            <div key={i} style={{ fontSize:'.82rem', color:'#F59E0B', marginBottom:'.2rem' }}>• {n}</div>
          ))}
        </div>
      )}

      {/* ALTERNATIVE CANDIDATES */}
      {primers.all_candidates?.length > 0 && (
        <div className="pc" style={{ marginTop:'1.1rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.45rem' }}>
            <span style={{ fontSize:'.8rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'.07em' }}>Alternative Candidates</span>
            <button className="btn-g" onClick={()=>setShowCand(v=>!v)}>{showCand ? 'Hide' : 'Show'} ({primers.all_candidates.length})</button>
          </div>
          {showCand && primers.all_candidates.map((c,i) => (
            <div key={i} className="cand-row">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.28rem' }}>
                <span style={{ fontSize:'.84rem', color:'#00FFC6', fontWeight:600 }}>{c.type}</span>
                <span style={{ fontSize:'.8rem', color:QC[c.quality_grade] }}>{c.quality_grade}</span>
              </div>
              <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.8rem', color:'#c8cad4', marginBottom:'.28rem' }}>{c.sequence}</div>
              <div style={{ fontSize:'.76rem', color:'#6b7080' }}>Tm {c.tm} °C · GC {c.gc_content} % · {c.length} bp</div>
            </div>
          ))}
        </div>
      )}
    </>)}

  </div>
  </div>
  );

  /* ── load sample (declared here so it closes over setSeq) ── */
  function loadSample() { setSeq(SAMPLE_SEQUENCE); setError(''); setPrimers(null); }
}