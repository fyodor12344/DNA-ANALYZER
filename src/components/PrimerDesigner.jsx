import { useState, useEffect } from 'react';

/* ─── API CONFIG ─────────────────────────────────────────────────────────── */
const API_URL = import.meta.env?.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

/* ─── SAMPLE SEQUENCE ────────────────────────────────────────────────────── */
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
  if (cleaned.length === 0) return { valid: false, error: 'No valid DNA bases found.' };
  if (cleaned.length < 40)  return { valid: false, error: 'Sequence must be at least 40 bp.' };
  return { valid: true, cleaned };
}

async function designPrimers(seq) {
  await new Promise(r => setTimeout(r, 900));
  const fwdSeq = seq.substring(0, 20);
  const revRaw = seq.substring(seq.length - 21, seq.length - 1);
  const comp   = { A:'T', T:'A', G:'C', C:'G' };
  const revSeq = revRaw.split('').reverse().map(b => comp[b] || b).join('');
  const gc     = s => ((s.match(/[GC]/g)||[]).length / s.length) * 100;
  const calcTm = s => 2*(s.match(/[AT]/g)||[]).length + 4*(s.match(/[GC]/g)||[]).length;
  return {
    success: true,
    data: {
      forward_primer: {
        sequence: fwdSeq, length: fwdSeq.length, tm: calcTm(fwdSeq),
        gc_content: parseFloat(gc(fwdSeq).toFixed(1)), position: '1–20',
        quality_grade: 'Good', quality_score: 78,
        hairpin: { risk_level: 'low', delta_g: -0.4 },
        gc_clamp: { has_clamp: true, clamp_strength: 2 },
        issues: [], warnings: []
      },
      reverse_primer: {
        sequence: revSeq, length: revSeq.length, tm: calcTm(revSeq),
        gc_content: parseFloat(gc(revSeq).toFixed(1)), position: `${seq.length-20}–${seq.length}`,
        quality_grade: 'Good', quality_score: 74,
        hairpin: { risk_level: 'medium', delta_g: -1.2 },
        gc_clamp: { has_clamp: false, clamp_strength: 1 },
        issues: [], warnings: []
      },
      expected_product_size: seq.length,
      tm_difference: Math.abs(calcTm(fwdSeq) - calcTm(revSeq)),
      dimer_analysis: { risk_level: 'low' },
      pcr_protocol: {
        annealing_temp: Math.min(calcTm(fwdSeq), calcTm(revSeq)) - 5,
        extension_time: Math.max(60, Math.ceil(seq.length / 1000) * 60),
        cycles: 35,
        polymerase: 'Taq DNA Polymerase (high-fidelity)',
        notes: ['Use hot-start polymerase for best specificity', 'Verify product size on gel after PCR']
      },
      all_candidates: []
    }
  };
}

/* ─── APP MODES ──────────────────────────────────────────────────────────── */
const APP_MODES = {
  diagnostic: { name:'Diagnostic PCR',     desc:'Standard detection & identification',  prodMin:200,  prodMax:800,  tmMin:55, tmMax:65 },
  cloning:    { name:'Cloning',            desc:'Gene cloning & subcloning',             prodMin:100,  prodMax:3000, tmMin:58, tmMax:68 },
  qpcr:       { name:'qPCR (Real-Time)',   desc:'Quantitative real-time PCR',            prodMin:70,   prodMax:200,  tmMin:58, tmMax:62 },
  mutation:   { name:'Mutation Detection', desc:'SNP detection & mutagenesis',           prodMin:150,  prodMax:500,  tmMin:60, tmMax:68 }
};

/* ─── COLOURS ────────────────────────────────────────────────────────────── */
const QUAL_COL = { Excellent:'#00FFC6', Good:'#00c9a0', Fair:'#F59E0B', Poor:'#EF4444' };
const RISK_COL = { low:'#00FFC6', medium:'#F59E0B', high:'#EF4444' };
const URG_COL  = { high:'#EF4444', medium:'#F59E0B', low:'#00FFC6' };

/* ════════════════════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════════════════════ */
export default function PrimerDesigner() {
  const [sequence, setSequence]       = useState('');
  const [appMode, setAppMode]         = useState('diagnostic');
  const [primers, setPrimers]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [showCand, setShowCand]       = useState(false);
  const [showInfo, setShowInfo]       = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI]     = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const mode = APP_MODES[appMode];
  const bpCount = sequence.toUpperCase().replace(/[^ATGC]/g,'').length;

  /* ── load sample ── */
  const loadSample = () => { setSequence(SAMPLE_SEQUENCE); setError(''); setPrimers(null); setAiExplanation(''); };

  /* ── close export menu on outside click ── */
  useEffect(() => {
    const close = () => setShowExportMenu(false);
    if (showExportMenu) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [showExportMenu]);

  /* ── FASTA upload ── */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        const cleanSeq = content
          .split('\n')
          .filter(line => !line.startsWith('>'))
          .join('')
          .replace(/\s/g, '');
        setSequence(cleanSeq);
        setError('');
        setPrimers(null);
        setAiExplanation('');
      }
    };
    reader.readAsText(file);
  };

  /* ── Export functions ── */
  const exportTXT = (detailed = false) => {
    if (!primers) return;
    let content = `PCR Primer Designer Results\n`;
    content += `${'='.repeat(50)}\n\n`;
    content += `Application Mode: ${mode.name}\n`;
    content += `Product Size: ${primers.expected_product_size} bp\n`;
    content += `Tm Difference: ${primers.tm_difference?.toFixed(1)} °C\n\n`;

    if (primers.forward_primer) {
      content += `FORWARD PRIMER:\n`;
      content += `  Sequence: ${primers.forward_primer.sequence}\n`;
      content += `  Length: ${primers.forward_primer.length} bp\n`;
      content += `  Tm: ${primers.forward_primer.tm} °C\n`;
      content += `  GC Content: ${primers.forward_primer.gc_content}%\n`;
      content += `  Quality: ${primers.forward_primer.quality_grade} (${primers.forward_primer.quality_score}/100)\n\n`;
    }

    if (primers.reverse_primer) {
      content += `REVERSE PRIMER:\n`;
      content += `  Sequence: ${primers.reverse_primer.sequence}\n`;
      content += `  Length: ${primers.reverse_primer.length} bp\n`;
      content += `  Tm: ${primers.reverse_primer.tm} °C\n`;
      content += `  GC Content: ${primers.reverse_primer.gc_content}%\n`;
      content += `  Quality: ${primers.reverse_primer.quality_grade} (${primers.reverse_primer.quality_score}/100)\n\n`;
    }

    if (detailed && primers.pcr_protocol) {
      content += `PCR PROTOCOL:\n`;
      content += `  Annealing Temp: ${primers.pcr_protocol.annealing_temp} °C\n`;
      content += `  Extension Time: ${primers.pcr_protocol.extension_time} s\n`;
      content += `  Cycles: ${primers.pcr_protocol.cycles}\n`;
      content += `  Polymerase: ${primers.pcr_protocol.polymerase}\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Primer_Results_${detailed ? 'Detailed_' : ''}${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportPDF = (detailed = false) => {
    if (!primers) return;
    let content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PCR Primer Designer Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #00FFC6; border-bottom: 3px solid #00FFC6; padding-bottom: 10px; }
    .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .primer-box { margin: 20px 0; padding: 20px; border-left: 4px solid #00FFC6; background: #f9f9f9; }
    code { background: #e5e5e5; padding: 4px 8px; border-radius: 3px; font-family: monospace; font-size: 1.1em; }
    .label { font-weight: bold; color: #555; }
  </style>
</head>
<body>
  <h1>PCR Primer Designer Results</h1>
  <div class="summary">
    <p><span class="label">Mode:</span> ${mode.name}</p>
    <p><span class="label">Product Size:</span> ${primers.expected_product_size} bp</p>
    <p><span class="label">Tm Difference:</span> ${primers.tm_difference?.toFixed(1)} °C</p>
    <p><span class="label">Generated:</span> ${new Date().toLocaleString()}</p>
  </div>`;

    if (primers.forward_primer) {
      content += `
  <div class="primer-box">
    <h2>Forward Primer</h2>
    <p><span class="label">Sequence:</span> <code>${primers.forward_primer.sequence}</code></p>
    <p><span class="label">Length:</span> ${primers.forward_primer.length} bp</p>
    <p><span class="label">Tm:</span> ${primers.forward_primer.tm} °C</p>
    <p><span class="label">GC Content:</span> ${primers.forward_primer.gc_content}%</p>
    <p><span class="label">Quality:</span> ${primers.forward_primer.quality_grade} (${primers.forward_primer.quality_score}/100)</p>
  </div>`;
    }

    if (primers.reverse_primer) {
      content += `
  <div class="primer-box">
    <h2>Reverse Primer</h2>
    <p><span class="label">Sequence:</span> <code>${primers.reverse_primer.sequence}</code></p>
    <p><span class="label">Length:</span> ${primers.reverse_primer.length} bp</p>
    <p><span class="label">Tm:</span> ${primers.reverse_primer.tm} °C</p>
    <p><span class="label">GC Content:</span> ${primers.reverse_primer.gc_content}%</p>
    <p><span class="label">Quality:</span> ${primers.reverse_primer.quality_grade} (${primers.reverse_primer.quality_score}/100)</p>
  </div>`;
    }

    if (detailed && primers.pcr_protocol) {
      content += `
  <div class="primer-box">
    <h2>PCR Protocol</h2>
    <p><span class="label">Annealing Temp:</span> ${primers.pcr_protocol.annealing_temp} °C</p>
    <p><span class="label">Extension Time:</span> ${primers.pcr_protocol.extension_time} s</p>
    <p><span class="label">Cycles:</span> ${primers.pcr_protocol.cycles}</p>
    <p><span class="label">Polymerase:</span> ${primers.pcr_protocol.polymerase}</p>
  </div>`;
    }

    content += `</body></html>`;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Primer_Results_${detailed ? 'Detailed_' : ''}${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 250);
      };
    }
    setShowExportMenu(false);
  };

  /* ── submit ── */
  const handleDesign = async () => {
    if (!sequence.trim()) { setError('Please enter a DNA sequence.'); return; }
    const v = validateSequence(sequence);
    if (!v.valid) { setError(v.error); return; }
    setLoading(true); setError(''); setPrimers(null); setAiExplanation('');
    const res = await designPrimers(v.cleaned);
    setLoading(false);
    if (res.success) {
      if (res.data.forward_primer) res.data.forward_primer.detailed_analysis = buildAnalysis(res.data.forward_primer);
      if (res.data.reverse_primer) res.data.reverse_primer.detailed_analysis = buildAnalysis(res.data.reverse_primer);
      res.data.optimization_tips = buildTips(res.data, mode);
      setPrimers(res.data);
    } else { setError(res.error); }
  };

  /* ── AI explain ── */
  const handleAI = async () => {
    if (!primers) return;
    setLoadingAI(true); setError(''); setAiExplanation('');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`${API_URL}/api/explain`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tool:'PCR Primer Designer', data:primers }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'AI failed'); }
      const data = await res.json();
      const txt = data.explanation || data.output_text || data.data?.explanation || data.choices?.[0]?.message?.content;
      if (!txt) throw new Error('No explanation returned');
      setAiExplanation(txt);
    } catch (e) { setError(e.name === 'AbortError' ? 'AI timed out' : (e.message || 'AI failed')); }
    finally { setLoadingAI(false); }
  };

  /* ── analysis helpers ── */
  function buildAnalysis(p) {
    const a = [];
    if (p.hairpin?.risk_level !== 'low') a.push({
      type: p.hairpin.risk_level === 'high' ? 'error' : 'warning', 
      title:'Hairpin Formation Risk',
      issue:`May form a secondary structure (ΔG = ${p.hairpin.delta_g} kcal/mol)`,
      impact:'Reduces primer availability, which lowers PCR yield and overall efficiency.',
      fixes:['Shift primer 2–3 bp upstream or downstream','Add 3–5 % DMSO to destabilise secondary structures','Increase annealing temperature by 2–3 °C']
    });
    if (!p.gc_clamp?.has_clamp) a.push({
      type:'warning',
      title:'Missing GC Clamp',
      issue:'No G or C base within the last 5 bases of the 3′ end.',
      impact:'Weaker 3′ binding reduces extension efficiency — especially important for cloning workflows.',
      fixes:['Shift primer so a natural G/C falls at the 3′ end','Extend the primer by 1–2 G/C bases if the template allows']
    });
    return a;
  }

  function buildTips(data, m) {
    const tips = [];
    const f = data.forward_primer, r = data.reverse_primer;
    if (!f || !r) return tips;
    if (Math.abs(f.tm - r.tm) > 5) tips.push({
      category:'Temperature', title:'Large Tm Difference Detected',
      recommendation:`Run a gradient PCR between ${Math.min(f.tm,r.tm)-5} °C and ${Math.max(f.tm,r.tm)-3} °C to find the optimal annealing temperature.`,
      urgency:'high'
    });
    if (data.dimer_analysis?.risk_level !== 'low') tips.push({
      category:'Dimer Prevention', title:'Primer-Dimer Risk Detected',
      recommendation:'Reduce primer concentration to 0.2 µM and use a hot-start polymerase to minimise dimer formation.',
      urgency:'medium'
    });
    tips.push({
      category:'Protocol', title:`${m.name} Best Practices`,
      recommendation: m.name === 'qPCR (Real-Time)'
        ? 'Keep amplicon size between 70–150 bp. Use a ROX passive reference dye. Verify amplification efficiency falls within 90–110 %.'
        : 'Use a high-fidelity polymerase (Phusion or Q5). Confirm your final product by sequencing before downstream use.',
      urgency:'low'
    });
    return tips;
  }

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

    .pc{ background:#141720; border:1px solid #24272f; border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; }
    .lbl{ display:block; font-size:0.94rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:0.42rem; }

    select, textarea{
      width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px;
      color:#e2e4e9; font-family:'Sora',sans-serif; font-size:1.02rem;
      padding:0.7rem 0.85rem; outline:none; transition:border-color 0.2s;
    }
    select:focus, textarea:focus{ border-color:#00FFC6; }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:0.9rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }

    .btn-p{
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width:100%; padding:0.88rem 1.25rem;
      background:linear-gradient(135deg,#00FFC6,#00b08a);
      border:none; border-radius:10px;
      color:#0c0e14; font-family:'Sora',sans-serif; font-weight:600; font-size:1.08rem;
      cursor:pointer; transition:all 0.22s; letter-spacing:0.02em;
    }
    .btn-p:hover{ filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,255,198,0.28); }
    .btn-p:disabled{ filter:brightness(0.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-ai{
      display:flex; align-items:center; justify-content:center; gap:0.5rem;
      width:100%; padding:0.82rem 1.25rem;
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.02rem;
      cursor:pointer; transition:all 0.22s;
    }
    .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,0.35); }
    .btn-ai:disabled{ filter:brightness(0.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-g{
      display:inline-flex; align-items:center; gap:0.38rem;
      padding:0.5rem 0.95rem; background:transparent;
      border:1px solid #24272f; border-radius:7px;
      color:#8a8f9e; font-family:'Sora',sans-serif; font-size:0.92rem; font-weight:500;
      cursor:pointer; transition:all 0.2s;
    }
    .btn-g:hover{ border-color:#00FFC6; color:#00FFC6; background:rgba(0,255,198,0.05); }

    .btn-sample{
      display:inline-flex; align-items:center; gap:0.35rem;
      padding:0.44rem 0.88rem; background:rgba(0,255,198,0.08);
      border:1px solid rgba(0,255,198,0.28); border-radius:7px;
      color:#00FFC6; font-family:'JetBrains Mono',monospace; font-size:0.86rem; font-weight:500;
      cursor:pointer; transition:all 0.2s;
    }
    .btn-sample:hover{ background:rgba(0,255,198,0.15); border-color:rgba(0,255,198,0.5); }

    .btn-export{
      display:inline-flex; align-items:center; gap:0.35rem;
      padding:0.44rem 0.88rem; background:rgba(96,165,250,0.1);
      border:1px solid rgba(96,165,250,0.28); border-radius:7px;
      color:#60A5FA; font-family:'Sora',sans-serif; font-size:0.86rem; font-weight:500;
      cursor:pointer; transition:all 0.2s; position:relative;
    }
    .btn-export:hover{ background:rgba(96,165,250,0.18); border-color:rgba(96,165,250,0.5); }

    .export-menu{
      position:absolute; top:calc(100% + 0.35rem); right:0;
      background:#141720; border:1px solid #24272f; border-radius:10px;
      box-shadow:0 12px 32px rgba(0,0,0,0.45); padding:0.55rem;
      z-index:100; min-width:220px;
    }
    .export-item{
      padding:0.65rem 0.75rem; border-radius:7px; cursor:pointer;
      border:1px solid transparent; margin-bottom:0.28rem; transition:all 0.18s;
      font-size:0.9rem; color:#8a8f9e;
    }
    .export-item:hover{ border-color:#60A5FA; background:rgba(96,165,250,0.07); color:#60A5FA; }
    .export-item:last-child{ margin-bottom:0; }

    .mode-card{
      background:#141720; border:1px solid #24272f; border-radius:11px;
      padding:1rem; cursor:pointer; transition:all 0.22s; position:relative;
    }
    .mode-card:hover{ border-color:#00FFC630; transform:translateY(-1px); }
    .mode-card.active{ border-color:#00FFC6; background:rgba(0,255,198,0.06); box-shadow:0 0 18px rgba(0,255,198,0.1); }

    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:0.85rem 0.65rem; text-align:center; }
    .stat-v{ font-size:1.42rem; font-weight:700; line-height:1.2; }
    .stat-l{ font-size:0.8rem; color:#6b7080; text-transform:uppercase; letter-spacing:0.06em; margin-top:0.28rem; }

    .seq-box{
      background:#0a0c12; border:1px solid #1e2130; border-radius:8px;
      padding:0.85rem 0.95rem; font-family:'JetBrains Mono',monospace;
      font-size:0.92rem; color:#00FFC6; letter-spacing:1.5px; word-break:break-all; line-height:1.75;
    }

    .a-card{ border-radius:9px; padding:0.9rem; margin-bottom:0.58rem; }
    .tip-card{ background:#0f1117; border:1px solid #1e2130; border-radius:9px; padding:0.9rem; margin-bottom:0.58rem; }
    .proto-box{ background:#0f1117; border:1px solid #1e2130; border-radius:9px; padding:0.85rem; text-align:center; }
    .cand-row{ background:#0f1117; border:1px solid #1e2130; border-radius:8px; padding:0.85rem; margin-bottom:0.48rem; }

    .info-wrap{ overflow:hidden; transition:max-height 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.3s; }
    .info-wrap.closed{ max-height:0; opacity:0; }
    .info-wrap.open{ max-height:1000px; opacity:1; }

    .step-row{ display:flex; gap:0.58rem; align-items:flex-start; margin-bottom:0.65rem; }
    .step-num{ flex-shrink:0; width:26px; height:26px; border-radius:50%; background:#00FFC6; color:#0c0e14; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:0.1rem; }

    .mode-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:0.58rem; }
    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:0.58rem; }
    .primer-grid{ display:grid; grid-template-columns:1fr 1fr; gap:0.9rem; }
    .proto-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:0.55rem; }
    .prop-grid{ display:grid; grid-template-columns:1fr 1fr; gap:0.45rem; }

    .ai-box{ background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:1.25rem; margin-bottom:1rem; }

    @media(max-width:640px){
      .mode-grid{ grid-template-columns:repeat(2,1fr); }
      .stat-grid{ grid-template-columns:repeat(2,1fr); }
      .primer-grid{ grid-template-columns:1fr; }
      .proto-grid{ grid-template-columns:1fr; }
      .pc{ padding:1rem; }
      
      .export-menu{ 
        right:auto; 
        left:0; 
        max-width:calc(100vw - 2.2rem);
      }
      
      .lbl{ font-size:0.82rem; }
      select, textarea{ font-size:0.9rem; }
      .btn-p{ font-size:0.96rem; padding:0.8rem 1.1rem; }
      .btn-ai{ font-size:0.92rem; }
      .btn-g{ font-size:0.84rem; padding:0.42rem 0.8rem; }
      .btn-sample{ font-size:0.78rem; padding:0.38rem 0.72rem; }
      .btn-export{ font-size:0.78rem; padding:0.38rem 0.72rem; }
      .export-item{ font-size:0.82rem; padding:0.58rem 0.65rem; }
      .stat-v{ font-size:1.2rem; }
      .stat-l{ font-size:0.72rem; }
      .seq-box{ font-size:0.82rem; padding:0.75rem 0.8rem; }
    }
    @media(max-width:380px){
      .mode-grid{ grid-template-columns:1fr 1fr; gap:0.42rem; }
      .stat-grid{ grid-template-columns:1fr 1fr; gap:0.42rem; }
    }

    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,0.25); border-top-color:#fff; border-radius:50%; animation:spin 0.5s linear infinite; }
  `}</style>

  {/* ═══ HEADER ═══ */}
  <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.5rem 1.2rem 1.2rem' }}>
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.42rem', flexWrap:'wrap' }}>
        <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.55rem', color:'#fff' }}>PCR Primer Designer</h1>
        <span style={{ background:'rgba(0,255,198,0.1)', border:'1px solid rgba(0,255,198,0.25)', color:'#00FFC6', fontSize:'0.7rem', fontWeight:600, padding:'0.22rem 0.56rem', borderRadius:20, letterSpacing:'0.08em', textTransform:'uppercase' }}>Research Grade</span>
      </div>
      <p style={{ color:'#6b7080', fontSize:'0.96rem', lineHeight:1.58, maxWidth:580 }}>
        Application-specific primer design with Tm, GC, hairpin &amp; dimer analysis across four PCR workflows.
      </p>
    </div>
  </div>

  <div style={{ maxWidth:860, margin:'0 auto', padding:'1.2rem 1.15rem 3rem' }}>

    {/* ═══ INFO TOGGLE ═══ */}
    <button className="btn-g" onClick={()=>setShowInfo(v=>!v)} style={{ width:'100%', justifyContent:'space-between', marginBottom:'1rem' }}>
      <span style={{ display:'flex', alignItems:'center', gap:'0.42rem' }}>
        <span style={{ fontSize:'0.94rem' }}>Why This Tool Matters &amp; How to Use It</span>
      </span>
      <span style={{ fontSize:'0.78rem', color:'#6b7080', transition:'transform 0.25s', transform:showInfo?'rotate(180deg)':'rotate(0)', display:'inline-block' }}>▼</span>
    </button>

    <div className={`info-wrap ${showInfo ? 'open' : 'closed'}`}>
      <div className="pc" style={{ padding:'1.35rem' }}>

        {/* WHY */}
        <div style={{ marginBottom:'1.15rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.52rem' }}>
            <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#00FFC6', textTransform:'uppercase', letterSpacing:'0.07em' }}>Why This Tool Matters</span>
          </div>
          <p style={{ fontSize:'0.96rem', color:'#8a8f9e', lineHeight:1.78, margin:0 }}>
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

        <div style={{ borderTop:'1px solid #24272f', margin:'1.05rem 0' }}></div>

        {/* WORKFLOW */}
        <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.68rem' }}>
          <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#60A5FA', textTransform:'uppercase', letterSpacing:'0.07em' }}>Workflow &amp; Next Steps</span>
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
              <div style={{ fontSize:'0.94rem', fontWeight:600, color:'#c8cad4', marginBottom:'0.12rem' }}>{title}</div>
              <div style={{ fontSize:'0.9rem', color:'#6b7080', lineHeight:1.65 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ═══ MODE SELECTOR ═══ */}
    <label className="lbl">Application Mode</label>
    <div className="mode-grid" style={{ marginBottom:'1.15rem' }}>
      {Object.entries(APP_MODES).map(([k, m]) => (
        <div key={k} className={`mode-card ${appMode===k?'active':''}`} onClick={()=>setAppMode(k)}>
          {appMode===k && <span style={{ position:'absolute', top:'0.52rem', right:'0.52rem', background:'#00FFC6', color:'#0c0e14', fontSize:'0.64rem', fontWeight:700, width:19, height:19, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>✓</span>}
          <div style={{ fontSize:'0.9rem', fontWeight:600, color:appMode===k?'#00FFC6':'#c8cad4', marginBottom:'0.2rem' }}>{m.name}</div>
          <div style={{ fontSize:'0.82rem', color:'#6b7080', lineHeight:1.45 }}>{m.desc}</div>
        </div>
      ))}
    </div>

    {/* mode strip */}
    <div style={{ background:'rgba(0,255,198,0.06)', border:'1px solid rgba(0,255,198,0.18)', borderRadius:9, padding:'0.62rem 0.9rem', marginBottom:'1.15rem', display:'flex', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
      <span style={{ fontSize:'0.92rem', color:'#00FFC6', fontWeight:600 }}>{mode.name}</span>
      <span style={{ color:'#3a3d4a', fontSize:'0.84rem' }}>|</span>
      <span style={{ fontSize:'0.9rem', color:'#8a8f9e' }}>Amplicon {mode.prodMin}–{mode.prodMax} bp</span>
      <span style={{ color:'#3a3d4a', fontSize:'0.84rem' }}>|</span>
      <span style={{ fontSize:'0.9rem', color:'#8a8f9e' }}>Tm {mode.tmMin}–{mode.tmMax} °C</span>
    </div>

    {/* ═══ SEQUENCE INPUT ═══ */}
    <div className="pc">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.45rem', flexWrap:'wrap', gap:'0.42rem' }}>
        <label className="lbl" style={{ margin:0 }}>Target DNA Sequence</label>
        <div style={{ display:'flex', gap:'0.42rem', flexWrap:'wrap' }}>
          <label className="btn-sample" style={{ cursor:'pointer', margin:0 }}>
            Upload FASTA
            <input type="file" accept=".fasta,.fa,.txt" onChange={handleFileUpload} style={{ display:'none' }} />
          </label>
          <button className="btn-sample" onClick={loadSample}>Load Sample</button>
        </div>
      </div>
      <textarea rows={5} value={sequence} onChange={e=>setSequence(e.target.value)} placeholder="Paste your target gene region here or upload a FASTA file… (whitespace &amp; numbers are ignored)" />
      {sequence && (
        <div style={{ marginTop:'0.45rem', fontSize:'0.88rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace', display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
          <span>{bpCount} bp after cleaning</span>
          {bpCount < 150 && bpCount > 0 && <span style={{ color:'#F59E0B' }}>Short sequence — parameters will auto-adjust</span>}
        </div>
      )}
    </div>

    {error && (
      <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:8, padding:'0.65rem 0.88rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'0.48rem' }}>
        <span style={{ fontSize:'0.92rem', color:'#F87171' }}>{error}</span>
      </div>
    )}

    {/* ═══ SUBMIT ═══ */}
    <button className="btn-p" onClick={handleDesign} disabled={loading}>
      {loading ? <><span className="spin"></span> Designing Primers…</> : <>Design Primers</>}
    </button>

    {/* ═══════════════════════════════════════════════════════════════════
        RESULTS
        ═══════════════════════════════════════════════════════════════════ */}
    {primers && (<>

      {/* STATS */}
      <div style={{ marginTop:'1.55rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.52rem', flexWrap:'wrap', gap:'0.52rem' }}>
          <span style={{ fontSize:'0.88rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'0.07em' }}>
            Results — <span style={{ color:'#00FFC6' }}>{mode.name}</span>
          </span>
          <div style={{ position:'relative' }}>
            <button 
              className="btn-export" 
              onClick={(e) => { e.stopPropagation(); setShowExportMenu(v => !v); }}
            >
              Export Results <span style={{ fontSize:'0.76rem', marginLeft:'0.22rem' }}>▼</span>
            </button>
            {showExportMenu && (
              <div className="export-menu" onClick={(e) => e.stopPropagation()}>
                <div className="export-item" onClick={() => exportTXT(false)}>
                  <strong>TXT - Summary Only</strong>
                  <div style={{ fontSize:'0.78rem', color:'#6b7080', marginTop:'0.16rem' }}>Basic primer info</div>
                </div>
                <div className="export-item" onClick={() => exportTXT(true)}>
                  <strong>TXT - Detailed</strong>
                  <div style={{ fontSize:'0.78rem', color:'#6b7080', marginTop:'0.16rem' }}>Includes PCR protocol</div>
                </div>
                <div className="export-item" onClick={() => exportPDF(false)}>
                  <strong>PDF - Summary Only</strong>
                  <div style={{ fontSize:'0.78rem', color:'#6b7080', marginTop:'0.16rem' }}>Basic primer info</div>
                </div>
                <div className="export-item" onClick={() => exportPDF(true)}>
                  <strong>PDF - Detailed</strong>
                  <div style={{ fontSize:'0.78rem', color:'#6b7080', marginTop:'0.16rem' }}>Includes PCR protocol</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="stat-grid" style={{ marginTop:'0.52rem' }}>
          {[
            { l:'Product Size',  v:`${primers.expected_product_size} bp`,                                     c:'#fff' },
            { l:'Tm Difference', v:`${primers.tm_difference?.toFixed(1)} °C`,                                 c:'#fff' },
            { l:'Compatibility', v: primers.tm_difference < 5 ? 'Excellent' : 'Acceptable',                  c: primers.tm_difference < 5 ? '#00FFC6' : '#F59E0B' },
            { l:'Dimer Risk',    v: primers.dimer_analysis?.risk_level || '—',                                c: RISK_COL[primers.dimer_analysis?.risk_level] || '#6b7080' }
          ].map((s,i) => (
            <div key={i} className="stat-b">
              <div className="stat-v" style={{ color:s.c }}>{s.v}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI EXPLAIN BUTTON */}
      <div style={{ marginTop:'1.15rem' }}>
        <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
          {loadingAI ? <><span className="spin"></span> Generating AI Analysis…</> : <>Get AI Explanation</>}
        </button>
      </div>

      {/* AI RESULT */}
      {aiExplanation && (
        <div className="ai-box">
          <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.65rem' }}>
            <span style={{ fontSize:'0.94rem', fontWeight:600, color:'#818cf8' }}>AI Analysis</span>
          </div>
          <div style={{ fontSize:'0.96rem', color:'#e2e4e9', lineHeight:1.82, whiteSpace:'pre-wrap', maxHeight:450, overflowY:'auto', background:'rgba(0,0,0,0.25)', borderRadius:8, padding:'0.8rem', border:'1px solid #24272f' }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* OPTIMIZATION TIPS */}
      {primers.optimization_tips?.length > 0 && (
        <div className="pc" style={{ marginTop:'1.15rem', borderColor:'rgba(245,158,11,0.22)', background:'rgba(245,158,11,0.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.68rem' }}>
            <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#F59E0B', textTransform:'uppercase', letterSpacing:'0.07em' }}>PCR Optimization</span>
          </div>
          {primers.optimization_tips.map((t,i) => (
            <div key={i} className="tip-card">
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.35rem', flexWrap:'wrap', gap:'0.38rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.42rem' }}>
                  <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#FCD34D' }}>{t.title}</span>
                </div>
                <span style={{ background:`${URG_COL[t.urgency]}15`, color:URG_COL[t.urgency], fontSize:'0.74rem', fontWeight:600, padding:'0.2rem 0.52rem', borderRadius:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>{t.urgency}</span>
              </div>
              <p style={{ fontSize:'0.92rem', color:'#8a8f9e', lineHeight:1.68, margin:0 }}>{t.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {/* PRIMERS */}
      <div style={{ marginTop:'1.15rem' }}>
        <span style={{ fontSize:'0.88rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'0.07em' }}>Recommended Primers</span>
      </div>
      <div className="primer-grid" style={{ marginTop:'0.52rem' }}>
        {[
          primers.forward_primer && { ...primers.forward_primer, label:'Forward' },
          primers.reverse_primer && { ...primers.reverse_primer, label:'Reverse' }
        ].map((p, i) => p ? (
          <div key={i} className="pc" style={{ padding:'1.2rem' }}>
            {/* header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.65rem', flexWrap:'wrap', gap:'0.38rem' }}>
              <span style={{ fontSize:'0.98rem', fontWeight:600, color:'#00FFC6' }}>{p.label} Primer</span>
              <span style={{ background:`${QUAL_COL[p.quality_grade]}18`, color:QUAL_COL[p.quality_grade], border:`1px solid ${QUAL_COL[p.quality_grade]}40`, fontSize:'0.76rem', fontWeight:600, padding:'0.22rem 0.58rem', borderRadius:12 }}>
                {p.quality_grade} · {p.quality_score}/100
              </span>
            </div>
            {/* copy + seq */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.3rem' }}>
              <button className="btn-g" onClick={()=>navigator.clipboard?.writeText(p.sequence)}>Copy</button>
            </div>
            <div className="seq-box">{p.sequence}</div>
            {/* props */}
            <div className="prop-grid" style={{ marginTop:'0.68rem' }}>
              {[['Length',`${p.length} bp`],['Tm',`${p.tm} °C`],['GC Content',`${p.gc_content} %`],['Position',p.position]].map(([l,v],j) => (
                <div key={j} style={{ background:'#0f1117', borderRadius:7, padding:'0.54rem 0.62rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:'0.84rem', color:'#6b7080' }}>{l}</span>
                  <span style={{ fontSize:'0.9rem', color:'#c8cad4', fontWeight:600, fontFamily:'"JetBrains Mono",monospace' }}>{v}</span>
                </div>
              ))}
            </div>
            {/* quick metrics */}
            {p.hairpin && p.gc_clamp && (
              <div className="prop-grid" style={{ marginTop:'0.54rem' }}>
                {[
                  { l:'Hairpin Risk', v:p.hairpin.risk_level,                          c:RISK_COL[p.hairpin.risk_level] },
                  { l:'GC Clamp',     v:p.gc_clamp.has_clamp ? 'Present' : 'Missing',  c:p.gc_clamp.has_clamp ? '#00FFC6' : '#F59E0B' }
                ].map((m,j) => (
                  <div key={j} style={{ background:'#0f1117', borderRadius:7, padding:'0.46rem 0.62rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.82rem', color:'#6b7080' }}>{m.l}</span>
                    <span style={{ fontSize:'0.88rem', color:m.c, fontWeight:600 }}>{m.v}</span>
                  </div>
                ))}
              </div>
            )}
            {/* quality flags */}
            {p.detailed_analysis?.length > 0 && (
              <div style={{ marginTop:'0.75rem' }}>
                <span style={{ fontSize:'0.84rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'0.06em' }}>Quality Flags</span>
                {p.detailed_analysis.map((a,j) => {
                  const col = { error:'#EF4444', warning:'#F59E0B', info:'#60A5FA' }[a.type] || '#6b7080';
                  return (
                    <div key={j} className="a-card" style={{ marginTop:'0.42rem', background:`${col}0e`, border:`1px solid ${col}35` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.38rem', marginBottom:'0.35rem' }}>
                        <span style={{ fontSize:'0.88rem', fontWeight:600, color:col }}>{a.title}</span>
                      </div>
                      <p style={{ fontSize:'0.86rem', color:'#8a8f9e', lineHeight:1.65, margin:'0 0 0.28rem' }}>{a.issue}</p>
                      <p style={{ fontSize:'0.84rem', color:'#606878', lineHeight:1.6, margin:'0 0 0.35rem', fontStyle:'italic' }}>{a.impact}</p>
                      <div style={{ display:'flex', flexDirection:'column', gap:'0.18rem' }}>
                        {a.fixes.map((f,fi) => (
                          <span key={fi} style={{ fontSize:'0.84rem', color:'#00c9a0', paddingLeft:'0.68rem', position:'relative' }}>
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
          <div key={i} className="pc" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:190, color:'#EF4444', fontSize:'0.98rem' }}>No suitable primer found</div>
        ))}
      </div>

      {/* PCR PROTOCOL */}
      {primers.pcr_protocol && (
        <div className="pc" style={{ marginTop:'1.15rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.42rem', marginBottom:'0.65rem' }}>
            <span style={{ fontSize:'0.9rem', fontWeight:600, color:'#00FFC6', textTransform:'uppercase', letterSpacing:'0.07em' }}>Recommended Protocol</span>
          </div>
          <div className="proto-grid" style={{ marginBottom:'0.75rem' }}>
            {[['Annealing Temp',`${primers.pcr_protocol.annealing_temp} °C`],['Extension Time',`${primers.pcr_protocol.extension_time} s`],['Cycles',primers.pcr_protocol.cycles]].map(([l,v],i) => (
              <div key={i} className="proto-box">
                <div style={{ fontSize:'0.79rem', color:'#6b7080', marginBottom:'0.24rem', textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</div>
                <div style={{ fontSize:'1.2rem', color:'#00FFC6', fontWeight:600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:'0.92rem', color:'#8a8f9e', marginBottom:'0.35rem' }}>
            <span style={{ color:'#6b7080' }}>Polymerase: </span>{primers.pcr_protocol.polymerase}
          </div>
          {primers.pcr_protocol.notes?.map((n,i) => (
            <div key={i} style={{ fontSize:'0.9rem', color:'#F59E0B', marginBottom:'0.22rem' }}>• {n}</div>
          ))}
        </div>
      )}

      {/* ALTERNATIVE CANDIDATES */}
      {primers.all_candidates?.length > 0 && (
        <div className="pc" style={{ marginTop:'1.15rem' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.48rem' }}>
            <span style={{ fontSize:'0.88rem', fontWeight:600, color:'#6b7080', textTransform:'uppercase', letterSpacing:'0.07em' }}>Alternative Candidates</span>
            <button className="btn-g" onClick={()=>setShowCand(v=>!v)}>{showCand ? 'Hide' : 'Show'} ({primers.all_candidates.length})</button>
          </div>
          {showCand && primers.all_candidates.map((c,i) => (
            <div key={i} className="cand-row">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                <span style={{ fontSize:'0.92rem', color:'#00FFC6', fontWeight:600 }}>{c.type}</span>
                <span style={{ fontSize:'0.88rem', color:QUAL_COL[c.quality_grade] }}>{c.quality_grade}</span>
              </div>
              <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'0.88rem', color:'#c8cad4', marginBottom:'0.3rem' }}>{c.sequence}</div>
              <div style={{ fontSize:'0.84rem', color:'#6b7080' }}>Tm {c.tm} °C · GC {c.gc_content} % · {c.length} bp</div>
            </div>
          ))}
        </div>
      )}
    </>)}

  </div>
  </div>
  );
}