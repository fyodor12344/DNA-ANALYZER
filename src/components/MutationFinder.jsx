import { useState, useEffect } from 'react';

/* ─── CODON TABLE ────────────────────────────────────────────────────────── */
const CODON_TABLE = {
  'TTT':'F','TTC':'F','TTA':'L','TTG':'L','TCT':'S','TCC':'S','TCA':'S','TCG':'S',
  'TAT':'Y','TAC':'Y','TAA':'*','TAG':'*','TGT':'C','TGC':'C','TGA':'*','TGG':'W',
  'CTT':'L','CTC':'L','CTA':'L','CTG':'L','CCT':'P','CCC':'P','CCA':'P','CCG':'P',
  'CAT':'H','CAC':'H','CAA':'Q','CAG':'Q','CGT':'R','CGC':'R','CGA':'R','CGG':'R',
  'ATT':'I','ATC':'I','ATA':'I','ATG':'M','ACT':'T','ACC':'T','ACA':'T','ACG':'T',
  'AAT':'N','AAC':'N','AAA':'K','AAG':'K','AGT':'S','AGC':'S','AGA':'R','AGG':'R',
  'GTT':'V','GTC':'V','GTA':'V','GTG':'V','GCT':'A','GCC':'A','GCA':'A','GCG':'A',
  'GAT':'D','GAC':'D','GAA':'E','GAG':'E','GGT':'G','GGC':'G','GGA':'G','GGG':'G'
};

/* ─── SAMPLE SEQUENCES ──────────────────────────────────────────────────── */
const MUTATION_SAMPLES = {
  normal: {
    name:'✓ Normal (Wild-Type)', icon:'✓', color:'#10B981',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'🧬 Identical Sequences – No Mutations',
    explanation:'Both sequences are exactly the same (39 bp). This represents the wild-type or normal sequence without any genetic variations. The tool will detect zero mutations, demonstrating its ability to accurately identify when sequences are identical.',
    expectedResult:'No mutations detected',
    biologicalContext:'In genetics, wild-type refers to the normal, non-mutated form of a gene. This sample serves as a control to verify the analysis tool is working correctly.'
  },
  snp: {
    name:'⚠ SNP (Missense)', icon:'⚠', color:'#F59E0B',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGTTGAAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'⚠️ Single Nucleotide Polymorphism (SNP)',
    explanation:'A single base change from C to T at position 21. This SNP changes the codon from GCT (coding for Alanine) to GTT (coding for Valine), resulting in a missense mutation. The amino acid substitution may affect protein structure and function.',
    expectedResult:'1 SNP detected (Missense mutation)',
    biologicalContext:'SNPs are the most common type of genetic variation. This particular mutation is a missense mutation, meaning it changes one amino acid in the protein sequence. Depending on the biochemical properties of the amino acids involved, this could have minimal to significant functional impact.',
    mutationDetails:{ position:21, change:'C→T' }
  },
  insertion: {
    name:'➕ Insertion', icon:'➕', color:'#3B82F6',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAAACAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'➕ Insertion Mutation (3 nucleotides)',
    explanation:'Three nucleotides (CAA) are inserted at position 24. Since the insertion is exactly 3 bases (one codon), this is an in-frame insertion that adds one extra amino acid (Glutamine) without shifting the reading frame.',
    expectedResult:'1 Insertion (3 bp, in-frame)',
    biologicalContext:'In-frame insertions add amino acids to the protein without disrupting the reading frame. While the protein structure is altered, it may still retain some function.',
    mutationDetails:{ position:24, inserted:'CAA' }
  },
  deletion: {
    name:'➖ Deletion', icon:'➖', color:'#EF4444',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'➖ Deletion Mutation (3 nucleotides)',
    explanation:'Three consecutive nucleotides (AAA) are deleted starting at position 21. This in-frame deletion removes exactly one codon, resulting in the loss of one amino acid (Lysine) from the protein sequence.',
    expectedResult:'1 Deletion (3 bp, in-frame)',
    biologicalContext:'In-frame deletions remove amino acids without causing frameshift. The severity depends on which amino acid is removed and its importance for protein function.',
    mutationDetails:{ position:21, deleted:'AAA' }
  },
  frameshiftInsertion: {
    name:'🔴 Frameshift (Insertion)', icon:'🔴', color:'#DC2626',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAACAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'🔴 Frameshift Mutation (2 bp Insertion)',
    explanation:'Two nucleotides (CA) are inserted at position 24. Since this is NOT a multiple of 3, it causes a frameshift mutation. All downstream codons are shifted, typically resulting in a completely different amino acid sequence and often premature stop codons.',
    expectedResult:'1 Insertion causing frameshift',
    biologicalContext:'Frameshift mutations are among the most severe types because they alter the entire downstream reading frame — usually producing non-functional proteins.',
    mutationDetails:{ position:24, inserted:'CA' }
  }
};

/* ─── MUTATION EXPLANATIONS ─────────────────────────────────────────────── */
const MUT_EXP = {
  Silent:   { short:'No amino acid change',       long:'Silent mutations do not change the amino acid sequence due to genetic code redundancy. Protein function is typically preserved.',                                                                                                     icon:'✓',  color:'#10B981' },
  Missense: { short:'Amino acid substitution',    long:'Amino acid change may alter protein structure or function. Effects range from benign to severe depending on the biochemical properties of the substituted amino acid.',                                                          icon:'⚠',  color:'#F59E0B' },
  Nonsense: { short:'Premature termination',      long:'Premature stop codon may produce a truncated protein. This often results in loss of protein function and can have significant biological consequences.',                                                                              icon:'⛔', color:'#EF4444' }
};

/* ─── MOCK BACKEND ──────────────────────────────────────────────────────── */
const API_URL = import.meta?.env?.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const revComp = seq => { const m={A:'T',T:'A',G:'C',C:'G'}; return seq.split('').reverse().map(b=>m[b]||b).join(''); };
const translateCodon = codon => CODON_TABLE[codon.replace(/T/g,'U')] || '?';
const parseIntoCodons = (seq, frame) => {
  if (!seq || !frame) return [];
  const off = parseInt(frame) - 1, codons = [];
  for (let i = off; i < seq.length; i += 3) {
    const c = seq.substring(i, i+3);
    if (c.length === 3) codons.push({ codon:c, position:i, aminoAcid:translateCodon(c) });
  }
  return codons;
};

/* ════════════════════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════════════════════ */
export default function MutationFinder() {
  const [seq1, setSeq1]                         = useState('');
  const [seq2, setSeq2]                         = useState('');
  const [mutations, setMutations]               = useState(null);
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [aiExplanation, setAiExplanation]       = useState('');
  const [loadingAI, setLoadingAI]               = useState(false);
  const [readingFrame, setReadingFrame]         = useState('');
  const [strand, setStrand]                     = useState('');
  const [showCodonPreview, setShowCodonPreview] = useState(false);
  const [previewSequence, setPreviewSequence]   = useState('');
  const [frameshiftDetected, setFrameshiftDetected] = useState(false);
  const [frameshiftInfo, setFrameshiftInfo]     = useState(null);
  const [showSampleMenu, setShowSampleMenu]     = useState(false);
  const [currentSample, setCurrentSample]       = useState(null);
  const [sampleBannerVisible, setSampleBannerVisible] = useState(false);
  const [infoOpen, setInfoOpen]                 = useState(false);

  /* ── validate ── */
  const validate = seq => {
    const c = seq.toUpperCase().replace(/\s/g,'');
    if (!c) return { valid:false, error:'Sequence cannot be empty' };
    if (!/^[ATGC]+$/.test(c)) return { valid:false, error:'Invalid characters — only A T G C allowed' };
    return { valid:true, cleaned:c };
  };

  /* ── load sample ── */
  const loadSample = key => {
    const s = MUTATION_SAMPLES[key];
    setSeq1(s.reference); setSeq2(s.alternate);
    setReadingFrame(s.readingFrame); setStrand(s.strand);
    setCurrentSample(s); setSampleBannerVisible(true);
    setShowSampleMenu(false); setMutations(null); setError('');
    setAiExplanation(''); setFrameshiftDetected(false); setFrameshiftInfo(null);
  };

  /* ── close menu on outside click ── */
  useEffect(() => {
    const close = () => setShowSampleMenu(false);
    if (showSampleMenu) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [showSampleMenu]);

  /* ── codon preview update ── */
  useEffect(() => {
    if (readingFrame && seq1) {
      const v = validate(seq1);
      if (v.valid) {
        let s = v.cleaned;
        if (strand === 'reverse') s = revComp(s);
        setPreviewSequence(s.substring(0, 60));
      }
    }
  }, [readingFrame, strand, seq1]);

  /* ── frameshift detection ── */
  const detectFrameshift = data => {
    if (!data?.mutations) return;
    for (const mut of data.mutations.filter(m => m.type === 'Insertion' || m.type === 'Deletion')) {
      const len = mut.type === 'Insertion' ? (mut.inserted_sequence?.length || 0) : (mut.deleted_sequence?.length || 0);
      if (len % 3 !== 0) {
        const v1 = validate(seq1), v2 = validate(seq2);
        if (v1.valid && v2.valid) {
          let s1 = v1.cleaned, s2 = v2.cleaned;
          if (strand === 'reverse') { s1 = revComp(s1); s2 = revComp(s2); }
          const off = parseInt(readingFrame) - 1;
          let firstStop = null;
          for (let i = mut.position + len + off; i < s2.length; i += 3) {
            const c = s2.substring(i, i+3);
            if (c.length === 3 && translateCodon(c) === '*') { firstStop = { position:i, codon:c }; break; }
          }
          setFrameshiftDetected(true);
          setFrameshiftInfo({
            position: mut.position, type: mut.type, length: len,
            codon: mut.type === 'Insertion' ? s2.substring(mut.position, mut.position+3) : s1.substring(mut.position, mut.position+3),
            firstStopCodon: firstStop
          });
          return;
        }
      }
    }
    setFrameshiftDetected(false); setFrameshiftInfo(null);
  };

  useEffect(() => { if (mutations) detectFrameshift(mutations); }, [mutations, readingFrame, strand]);

  /* ── confidence ── */
  const getConfidence = mut => {
    if (mut.type === 'SNP' && mut.reference_codon?.length === 3 && mut.alternate_codon?.length === 3)
      return { level:'High', reason:'Clear codon change' };
    if (mut.type === 'Insertion' || mut.type === 'Deletion')
      return { level:'Moderate', reason:'Frame-dependent interpretation' };
    return { level:'Moderate', reason:'Frame-dependent interpretation' };
  };

  /* ── submit ── */
  const handleFind = async () => {
    if (!seq1.trim() || !seq2.trim()) { setError('Please enter both sequences'); return; }
    if (!readingFrame || !strand) { setError('Please select both Reading Frame and Strand before analyzing'); return; }
    const v1 = validate(seq1), v2 = validate(seq2);
    if (!v1.valid) { setError(`Reference: ${v1.error}`); return; }
    if (!v2.valid) { setError(`Alternate: ${v2.error}`); return; }
    setLoading(true); setError(''); setAiExplanation(''); setMutations(null);
    setFrameshiftDetected(false); setFrameshiftInfo(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`${API_URL}/api/mutations`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ sequence1:v1.cleaned, sequence2:v2.cleaned, reading_frame:parseInt(readingFrame), strand }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      if (data?.mutations !== undefined) setMutations(data);
      else setError(data.error || 'Invalid response');
    } catch (e) {
      setError(e.name === 'AbortError' ? 'Request timed out.' : (e.message.includes('fetch') ? 'Cannot connect to backend.' : e.message));
    } finally { setLoading(false); }
  };

  /* ── AI explain ── */
  const handleAI = async () => {
    if (!mutations) return;
    setLoadingAI(true); setError(''); setAiExplanation('');
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(`${API_URL}/api/explain`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tool:'Mutation Finder', data:mutations }),
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
    .lbl{ display:block; font-size:.82rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.42rem; }

    select, textarea{
      width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px;
      color:#e2e4e9; font-family:'Sora',sans-serif; font-size:.92rem;
      padding:.7rem .85rem; outline:none; transition:border-color .2s;
    }
    select:focus, textarea:focus{ border-color:#8B5CF6; }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:.82rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }
    select option{ background:#0f1117; }

    /* ── buttons ── */
    .btn-p{
      display:flex; align-items:center; justify-content:center; gap:.5rem;
      width:100%; padding:.88rem 1.25rem;
      background:linear-gradient(135deg,#8B5CF6,#7C3AED);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:.98rem;
      cursor:pointer; transition:all .22s;
    }
    .btn-p:hover{ filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 24px rgba(139,92,246,.35); }
    .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-ai{
      display:flex; align-items:center; justify-content:center; gap:.5rem;
      width:100%; padding:.82rem 1.25rem;
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:.92rem;
      cursor:pointer; transition:all .22s;
    }
    .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-1px); box-shadow:0 6px 20px rgba(99,102,241,.35); }
    .btn-ai:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-g{
      display:inline-flex; align-items:center; gap:.38rem;
      padding:.46rem .9rem; background:transparent;
      border:1px solid #24272f; border-radius:7px;
      color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.84rem; font-weight:500;
      cursor:pointer; transition:all .2s;
    }
    .btn-g:hover{ border-color:#8B5CF6; color:#8B5CF6; background:rgba(139,92,246,.06); }

    .btn-sample{
      display:inline-flex; align-items:center; gap:.38rem;
      padding:.42rem .88rem; background:rgba(139,92,246,.1);
      border:1px solid rgba(139,92,246,.3); border-radius:7px;
      color:#a78bfa; font-family:'Sora',sans-serif; font-size:.82rem; font-weight:500;
      cursor:pointer; transition:all .2s; position:relative;
    }
    .btn-sample:hover{ background:rgba(139,92,246,.18); border-color:rgba(139,92,246,.55); }

    /* ── sample dropdown ── */
    .sample-menu{
      position:absolute; top:calc(100% + .35rem); left:0;
      background:#141720; border:1px solid #24272f; border-radius:10px;
      box-shadow:0 12px 32px rgba(0,0,0,.45); padding:.55rem;
      z-index:100; min-width:280px; max-width:90vw;
    }
    .sample-item{
      padding:.7rem .8rem; border-radius:8px; cursor:pointer;
      border:1px solid transparent; margin-bottom:.28rem; transition:all .18s;
    }
    .sample-item:hover{ border-color:#8B5CF6; background:rgba(139,92,246,.07); }
    .sample-item:last-child{ margin-bottom:0; }

    /* ── info panel ── */
    .info-wrap{ overflow:hidden; transition:max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; }
    .info-wrap.closed{ max-height:0; opacity:0; }
    .info-wrap.open{ max-height:1200px; opacity:1; }

    /* ── step ── */
    .step-row{ display:flex; gap:.55rem; align-items:flex-start; margin-bottom:.6rem; }
    .step-num{ flex-shrink:0; width:24px; height:24px; border-radius:50%; background:#8B5CF6; color:#fff; font-size:.66rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:.08rem; }

    /* ── stat ── */
    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:.78rem .6rem; text-align:center; }
    .stat-v{ font-size:1.4rem; font-weight:700; line-height:1.2; }
    .stat-l{ font-size:.74rem; color:#6b7080; text-transform:uppercase; letter-spacing:.06em; margin-top:.25rem; }

    /* ── codon alignment ── */
    .align-box{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1rem 1.1rem; margin-top:.7rem; }
    .align-row{ display:flex; align-items:center; gap:.7rem; margin-bottom:.5rem; }
    .align-row:last-child{ margin-bottom:0; }
    .align-lbl{ width:72px; font-size:.82rem; font-weight:600; color:#8a8f9e; flex-shrink:0; }
    .codon-chip{
      font-family:'JetBrains Mono',monospace; font-size:.92rem; font-weight:700;
      padding:.32rem .72rem; border-radius:7px; letter-spacing:2px;
    }
    .aa-chip{ font-size:.88rem; font-weight:700; padding:.28rem .6rem; border-radius:6px; }

    /* ── mutation card ── */
    .mut-card{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1.1rem; margin-bottom:.7rem; }

    /* ── tip / consequence ── */
    .consequence-box{ border-radius:9px; padding:.78rem; margin-top:.65rem; }
    .note-box{ background:rgba(100,116,139,.08); border-left:3px solid #24272f; border-radius:6px; padding:.6rem .7rem; margin-top:.55rem; font-style:italic; font-size:.8rem; color:#6b7080; line-height:1.6; }

    /* ── frameshift banner ── */
    .fs-banner{ background:linear-gradient(135deg,#7f1d1d,#991B1B); border:1px solid #dc2626; border-radius:12px; padding:1.2rem; margin-bottom:1rem; }

    /* ── AI box ── */
    .ai-box{ background:rgba(139,92,246,.08); border:1px solid rgba(139,92,246,.3); border-radius:12px; padding:1.2rem; margin-bottom:1rem; }

    /* ── grids / responsive ── */
    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.55rem; }
    .seq-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
    .config-grid{ display:grid; grid-template-columns:1fr 1fr; gap:.85rem; }
    .summary-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.55rem; }

    @media(max-width:640px){
      .seq-grid{ grid-template-columns:1fr; }
      .config-grid{ grid-template-columns:1fr; }
      .stat-grid{ grid-template-columns:repeat(2,1fr); }
      .summary-grid{ grid-template-columns:repeat(2,1fr); }
      .pc{ padding:1rem; }
      .align-box{ padding:.75rem .7rem; }
    }
    @media(max-width:380px){
      .stat-grid{ grid-template-columns:1fr 1fr; gap:.4rem; }
      .summary-grid{ grid-template-columns:1fr 1fr; gap:.4rem; }
    }

    /* ── spinner ── */
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:16px; height:16px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite; }
  `}</style>

  {/* ═══ HEADER ═══ */}
  <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.5rem 1.2rem 1.2rem' }}>
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.65rem', marginBottom:'.4rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'1.5rem' }}>🧬</span>
        <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.5rem', color:'#fff' }}>Mutation Finder</h1>
        <span style={{ background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.25)', color:'#a78bfa', fontSize:'.64rem', fontWeight:600, padding:'.2rem .52rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Research Grade</span>
      </div>
      <p style={{ color:'#6b7080', fontSize:'.9rem', lineHeight:1.55, maxWidth:560 }}>
        Compare two DNA sequences to identify and classify SNPs, insertions, deletions, and frameshift mutations with codon-level resolution.
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

    <div className={`info-wrap ${infoOpen?'open':'closed'}`}>
      <div className="pc" style={{ padding:'1.3rem' }}>
        {/* WHY */}
        <div style={{ marginBottom:'1.1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.5rem' }}>
            <span style={{ fontSize:'.92rem' }}>🎯</span>
            <span style={{ fontSize:'.82rem', fontWeight:600, color:'#8B5CF6', textTransform:'uppercase', letterSpacing:'.07em' }}>Why This Tool Matters</span>
          </div>
          <p style={{ fontSize:'.9rem', color:'#8a8f9e', lineHeight:1.75, margin:0 }}>
            Manually comparing two DNA sequences base-by-base is tedious and error-prone — especially when you need to know <strong style={{color:'#c8cad4'}}>what the mutation does at the protein level</strong>. This tool aligns your reference and alternate sequences, pinpoints every variation, and classifies each one as a
            <strong style={{color:'#c8cad4'}}> Silent </strong>,
            <strong style={{color:'#c8cad4'}}> Missense </strong>, or
            <strong style={{color:'#c8cad4'}}> Nonsense </strong>
            mutation — and flags any <strong style={{color:'#EF4444'}}>frameshift</strong> events that could destroy the entire downstream reading frame.
          </p>
        </div>
        <div style={{ borderTop:'1px solid #24272f', margin:'1rem 0' }}></div>
        {/* WORKFLOW */}
        <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.65rem' }}>
          <span style={{ fontSize:'.92rem' }}>📖</span>
          <span style={{ fontSize:'.82rem', fontWeight:600, color:'#60A5FA', textTransform:'uppercase', letterSpacing:'.07em' }}>Workflow &amp; Next Steps</span>
        </div>
        {[
          ['Pick Your Settings',         'Select the reading frame (+1, +2, or +3) and strand direction. These determine how codons are grouped — different settings produce different protein translations.'],
          ['Load or Paste Sequences',    'Use the sample dropdown to explore pre-built mutation scenarios, or paste your own reference and alternate sequences. Only A, T, G, C characters are accepted.'],
          ['Run the Analysis',           'Hit Find Mutations. The tool aligns both sequences, detects every SNP / indel, classifies each by biological consequence, and flags any frameshifts with a prominent banner.'],
          ['Interpret the Results',      'Each mutation card shows a before/after codon alignment, the amino acid change, a confidence score, and a plain-English explanation of the biological impact. Use this to prioritise which variants need further investigation.']
        ].map(([title, desc], i) => (
          <div key={i} className="step-row">
            <div className="step-num">{i+1}</div>
            <div>
              <div style={{ fontSize:'.88rem', fontWeight:600, color:'#c8cad4', marginBottom:'.1rem' }}>{title}</div>
              <div style={{ fontSize:'.84rem', color:'#6b7080', lineHeight:1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ═══ LOAD SAMPLE ═══ */}
    <div style={{ position:'relative', marginBottom:'1rem' }}>
      <button className="btn-sample" onClick={e=>{ e.stopPropagation(); setShowSampleMenu(v=>!v); }}>
        <span style={{ fontSize:'.88rem' }}>📋</span>
        <span>Load Sample Mutations</span>
        <span style={{ fontSize:'.72rem', color:'#6b7080', marginLeft:'.2rem' }}>▼</span>
      </button>
      {showSampleMenu && (
        <div className="sample-menu" onClick={e=>e.stopPropagation()}>
          {Object.entries(MUTATION_SAMPLES).map(([k, s]) => (
            <div key={k} className="sample-item" onClick={()=>loadSample(k)} style={{ background:`${s.color}0a` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.2rem' }}>
                <span style={{ fontSize:'1.1rem' }}>{s.icon}</span>
                <span style={{ fontSize:'.86rem', fontWeight:600, color:s.color }}>{s.name}</span>
              </div>
              <div style={{ fontSize:'.78rem', color:'#8a8f9e', lineHeight:1.45 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ═══ SAMPLE EXPLANATION BANNER ═══ */}
    {sampleBannerVisible && currentSample && (
      <div className="pc" style={{ borderColor:currentSample.color+'55', background:`${currentSample.color}08`, marginBottom:'1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.6rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem' }}>
            <span style={{ fontSize:'1.4rem' }}>{currentSample.icon}</span>
            <div>
              <div style={{ fontSize:'.92rem', fontWeight:700, color:currentSample.color }}>Sample Loaded: {currentSample.name}</div>
              <div style={{ fontSize:'.82rem', color:'#8a8f9e', marginTop:'.1rem' }}>{currentSample.description}</div>
            </div>
          </div>
          <button onClick={()=>setSampleBannerVisible(false)} style={{ background:'none', border:'none', color:'#6b7080', fontSize:'1.2rem', cursor:'pointer', padding:'.1rem' }}>×</button>
        </div>
        <div style={{ background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.85rem', border:`1px solid ${currentSample.color}30` }}>
          <div style={{ fontSize:'.82rem', fontWeight:600, color:'#60A5FA', marginBottom:'.35rem' }}>📚 Educational Explanation</div>
          <p style={{ fontSize:'.86rem', color:'#8a8f9e', lineHeight:1.7, margin:'0 0 .5rem' }}>{currentSample.explanation}</p>
          <div style={{ fontSize:'.82rem', color:'#8a8f9e', lineHeight:1.6 }}>
            <span style={{ color:'#60A5FA', fontWeight:600 }}>🔬 Biological Context: </span>{currentSample.biologicalContext}
          </div>
          <div style={{ marginTop:'.55rem', display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:'.76rem', color:'#6b7080', textTransform:'uppercase', letterSpacing:'.05em' }}>Expected Result</div>
              <div style={{ fontSize:'.84rem', color:currentSample.color, fontWeight:600, marginTop:'.12rem' }}>{currentSample.expectedResult}</div>
            </div>
            {currentSample.mutationDetails && (
              <div>
                <div style={{ fontSize:'.76rem', color:'#6b7080', textTransform:'uppercase', letterSpacing:'.05em' }}>Details</div>
                <div style={{ fontSize:'.82rem', color:'#8a8f9e', marginTop:'.12rem' }}>
                  {currentSample.mutationDetails.change && `Change: ${currentSample.mutationDetails.change}`}
                  {currentSample.mutationDetails.inserted && `Inserted: ${currentSample.mutationDetails.inserted}`}
                  {currentSample.mutationDetails.deleted && `Deleted: ${currentSample.mutationDetails.deleted}`}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ═══ FRAMESHIFT BANNER ═══ */}
    {frameshiftDetected && frameshiftInfo && (
      <div className="fs-banner">
        <div style={{ display:'flex', alignItems:'center', gap:'.65rem', marginBottom:'.55rem' }}>
          <span style={{ fontSize:'1.3rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize:'.92rem', fontWeight:700, color:'#FEF2F2' }}>Frameshift Mutation Detected!</div>
            <div style={{ fontSize:'.82rem', color:'#FCA5A5', marginTop:'.08rem' }}>
              {frameshiftInfo.type} of {frameshiftInfo.length} base(s) at position {frameshiftInfo.position}
            </div>
          </div>
        </div>
        <div style={{ background:'rgba(0,0,0,.35)', borderRadius:8, padding:'.75rem', border:'1px solid rgba(254,202,202,.2)' }}>
          <div style={{ fontSize:'.84rem', color:'#FEF2F2', lineHeight:1.75 }}>
            <div style={{ marginBottom:'.35rem' }}>
              <strong>📍 Frameshift begins at codon: </strong>
              <span style={{ fontFamily:'"JetBrains Mono",monospace', background:'rgba(254,202,202,.2)', padding:'.22rem .55rem', borderRadius:5, fontSize:'.88rem', fontWeight:700, letterSpacing:'2px', marginLeft:'.4rem' }}>{frameshiftInfo.codon}</span>
            </div>
            {frameshiftInfo.firstStopCodon && (
              <div style={{ marginBottom:'.35rem' }}>
                <strong>🛑 First premature stop at position {frameshiftInfo.firstStopCodon.position}: </strong>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', background:'rgba(254,202,202,.2)', padding:'.22rem .55rem', borderRadius:5, fontSize:'.88rem', fontWeight:700, letterSpacing:'2px', marginLeft:'.4rem' }}>{frameshiftInfo.firstStopCodon.codon}</span>
              </div>
            )}
            <div style={{ fontSize:'.82rem', color:'#FCA5A5', fontStyle:'italic', borderTop:'1px solid rgba(254,202,202,.2)', paddingTop:'.45rem', marginTop:'.3rem' }}>
              💡 <strong>Impact:</strong> Frameshifts alter all downstream codons — typically producing completely different amino acid sequences and often premature termination. This usually results in a non-functional protein.
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ═══ CONFIG ═══ */}
    <div className="pc" style={{ borderColor:'rgba(139,92,246,.3)', background:'rgba(139,92,246,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.7rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'.92rem' }}>⚙️</span>
        <span style={{ fontSize:'.86rem', fontWeight:600, color:'#a78bfa' }}>Analysis Configuration</span>
        <span style={{ background:'#EF4444', color:'#fff', fontSize:'.62rem', fontWeight:700, padding:'.15rem .42rem', borderRadius:8, letterSpacing:'.04em', textTransform:'uppercase', marginLeft:'.3rem' }}>Required</span>
      </div>
      <div className="config-grid">
        <div>
          <label className="lbl">Reading Frame <span style={{ textTransform:'none', color:'#6b7080', fontWeight:400, letterSpacing:0 }}>(codon boundaries)</span></label>
          <select value={readingFrame} onChange={e=>{ setReadingFrame(e.target.value); setShowCodonPreview(!!e.target.value); }} style={{ borderColor: readingFrame ? '#8B5CF6' : '#EF4444' }}>
            <option value="">Select reading frame…</option>
            <option value="1">+1  (start at position 1)</option>
            <option value="2">+2  (start at position 2)</option>
            <option value="3">+3  (start at position 3)</option>
          </select>
        </div>
        <div>
          <label className="lbl">Strand</label>
          <select value={strand} onChange={e=>setStrand(e.target.value)} style={{ borderColor: strand ? '#8B5CF6' : '#EF4444' }}>
            <option value="">Select strand…</option>
            <option value="forward">Forward  (5′ → 3′)</option>
            <option value="reverse">Reverse  (3′ → 5′)</option>
          </select>
        </div>
      </div>

      {/* codon preview */}
      {showCodonPreview && previewSequence && readingFrame && (
        <div style={{ marginTop:'.9rem', background:'#0f1117', border:'1px solid #1e2130', borderRadius:9, padding:'.8rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.5rem' }}>
            <span style={{ fontSize:'.88rem' }}>🔬</span>
            <span style={{ fontSize:'.82rem', color:'#8a8f9e', fontWeight:600 }}>Codon Preview — Frame +{readingFrame}, {strand}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'.35rem' }}>
            {parseIntoCodons(previewSequence, readingFrame).map((cd, i) => (
              <span key={i} style={{ display:'inline-flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.82rem', background:'rgba(139,92,246,.15)', border:'1px solid #8B5CF6', borderRadius:5, padding:'.2rem .4rem', color:'#e2e4e9', letterSpacing:'1.5px', fontWeight:600 }}>{cd.codon}</span>
                <span style={{ fontSize:'.7rem', color:'#a78bfa', fontWeight:700, marginTop:'.08rem' }}>{cd.aminoAcid}</span>
              </span>
            ))}
          </div>
          <div className="note-box" style={{ marginTop:'.55rem' }}>💡 Codon grouping depends on the selected reading frame. Change the frame to see different translations.</div>
        </div>
      )}

      {/* why it matters mini */}
      <div style={{ marginTop:'.85rem', background:'rgba(0,0,0,.2)', borderRadius:8, padding:'.7rem .8rem', border:'1px solid #24272f' }}>
        <div style={{ fontSize:'.84rem', color:'#8a8f9e', lineHeight:1.7 }}>
          <strong style={{ color:'#a78bfa' }}>ℹ️ Why this matters:</strong> DNA is read in triplets (codons). The reading frame sets where each triplet starts; the strand sets the direction. Different combinations produce different proteins.
        </div>
      </div>

      {(!readingFrame || !strand) && (
        <div style={{ marginTop:'.7rem', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'.55rem .7rem', display:'flex', alignItems:'center', gap:'.45rem' }}>
          <span style={{ fontSize:'.88rem' }}>⚠️</span>
          <span style={{ fontSize:'.82rem', color:'#FCA5A5', fontWeight:600 }}>Please select both reading frame and strand to enable mutation classification.</span>
        </div>
      )}
    </div>

    {/* ═══ SEQUENCES ═══ */}
    <div className="seq-grid">
      {[['Reference Sequence', seq1, setSeq1], ['Alternate Sequence', seq2, setSeq2]].map(([label, val, setter], i) => (
        <div key={i}>
          <label className="lbl" style={{ margin:'0 0 .42rem' }}>{label}</label>
          <textarea rows={4} value={val} onChange={e=>setter(e.target.value)} placeholder={`Paste ${i===0?'reference':'alternate'} DNA sequence (ATGC)…`} />
          <div style={{ marginTop:'.32rem', fontSize:'.8rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace' }}>
            {val.replace(/\s/g,'').length} bp
          </div>
        </div>
      ))}
    </div>

    {error && (
      <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'.6rem .8rem', marginBottom:'.9rem', display:'flex', alignItems:'center', gap:'.45rem' }}>
        <span style={{ fontSize:'.88rem' }}>⚠️</span>
        <span style={{ fontSize:'.84rem', color:'#F87171' }}>{error}</span>
      </div>
    )}

    {/* ═══ SUBMIT ═══ */}
    <button className="btn-p" onClick={handleFind} disabled={loading || !readingFrame || !strand} style={{ marginTop:'.3rem' }}>
      {loading ? <><span className="spin"></span> Analyzing sequences…</> : <><span>🔍</span> Find Mutations</>}
    </button>

    {/* ═══════════════════════════════════════════════════════════════════
        RESULTS
        ═══════════════════════════════════════════════════════════════════ */}
    {mutations && (<>

      {/* analysis params strip */}
      <div className="pc" style={{ marginTop:'1.2rem', borderColor:'rgba(139,92,246,.22)', background:'rgba(139,92,246,.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.5rem', flexWrap:'wrap' }}>
          <span style={{ fontSize:'.82rem', color:'#a78bfa', fontWeight:600 }}>📋 Analysis Parameters</span>
          <span style={{ fontSize:'.84rem', color:'#8a8f9e' }}>Frame: <strong style={{ color:'#a78bfa' }}>+{readingFrame}</strong></span>
          <span style={{ fontSize:'.84rem', color:'#8a8f9e' }}>Strand: <strong style={{ color:'#a78bfa' }}>{strand.charAt(0).toUpperCase()+strand.slice(1)}</strong></span>
        </div>
      </div>

      {/* AI button */}
      <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
        {loadingAI ? <><span className="spin"></span> Generating AI Analysis…</> : <><span>🤖</span> Get AI Explanation</>}
      </button>

      {/* AI result */}
      {aiExplanation && (
        <div className="ai-box">
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.6rem' }}>
            <span style={{ fontSize:'1rem' }}>🤖</span>
            <span style={{ fontSize:'.86rem', fontWeight:600, color:'#a78bfa' }}>AI Analysis</span>
          </div>
          <div style={{ fontSize:'.88rem', color:'#e2e4e9', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:440, overflowY:'auto', background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.75rem', border:'1px solid #24272f' }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* SUMMARY STATS */}
      {mutations.summary && (
        <div className="pc" style={{ marginTop:'.6rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'.6rem' }}>
            <span style={{ fontSize:'.92rem' }}>📊</span>
            <span style={{ fontSize:'.86rem', fontWeight:600, color:'#c8cad4' }}>Summary</span>
          </div>
          <div className="summary-grid">
            {[
              { l:'Total',     v:mutations.summary.total_mutations||0,     c:'#fff' },
              { l:'SNPs',      v:mutations.summary.snps||0,                c:'#60A5FA' },
              { l:'Insertions',v:mutations.summary.insertions||0,          c:'#F59E0B' },
              { l:'Deletions', v:mutations.summary.deletions||0,           c:'#EF4444' },
              { l:'Silent',    v:mutations.summary.silent_mutations||0,    c:'#10B981' },
              { l:'Missense',  v:mutations.summary.missense_mutations||0,  c:'#F59E0B' },
              { l:'Nonsense',  v:mutations.summary.nonsense_mutations||0,  c:'#EF4444' }
            ].map((s,i) => (
              <div key={i} className="stat-b">
                <div className="stat-v" style={{ color:s.c }}>{s.v}</div>
                <div className="stat-l">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAILED MUTATIONS */}
      {mutations.mutations?.length > 0 && (
        <div className="pc" style={{ marginTop:'.6rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.7rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'.92rem' }}>📋</span>
            <span style={{ fontSize:'.86rem', fontWeight:600, color:'#c8cad4' }}>Detailed Mutation Analysis</span>
            <span style={{ background:'rgba(139,92,246,.18)', color:'#a78bfa', fontSize:'.7rem', fontWeight:600, padding:'.15rem .42rem', borderRadius:8 }}>{mutations.mutations.length} found</span>
          </div>

          {mutations.mutations.slice(0, 50).map((mut, idx) => {
            const refC  = mut.reference_codon || mut.reference || '---';
            const altC  = mut.alternate_codon || mut.alternate || mut.inserted_sequence || '---';
            const refAA = refC.length === 3 ? translateCodon(refC) : '–';
            const altAA = altC.length === 3 ? translateCodon(altC) : '–';
            const conf  = getConfidence(mut);
            const exp   = MUT_EXP[mut.mutation_class] || {};
            const confCol = conf.level === 'High' ? '#10B981' : '#F59E0B';

            return (
              <div key={idx} className="mut-card">
                {/* header row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.55rem', flexWrap:'wrap', gap:'.4rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'.84rem', color:'#8a8f9e', fontWeight:600 }}>Position {mut.position}</span>
                    <span style={{ background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.25)', color:'#a78bfa', fontSize:'.78rem', fontWeight:600, padding:'.18rem .52rem', borderRadius:6 }}>{mut.type}</span>
                  </div>
                  <div style={{ display:'flex', gap:'.42rem', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ background:`${confCol}15`, color:confCol, border:`1px solid ${confCol}40`, fontSize:'.72rem', fontWeight:600, padding:'.18rem .48rem', borderRadius:6 }}>{conf.level} Confidence</span>
                    {exp.color && (
                      <span style={{ background:`${exp.color}18`, color:exp.color, border:`1px solid ${exp.color}45`, fontSize:'.78rem', fontWeight:600, padding:'.18rem .52rem', borderRadius:6 }}>
                        {exp.icon} {mut.mutation_class || 'Unknown'}
                      </span>
                    )}
                  </div>
                </div>

                {/* codon alignment */}
                <div className="align-box">
                  {[
                    { label:'Reference', codon:refC, aa:refAA, codonBg:'rgba(96,165,250,.15)', codonBorder:'#3B82F6', codonGlow:'rgba(59,130,246,.25)', aaBg:'rgba(96,165,250,.15)', aaBorder:'rgba(96,165,250,.3)', aaColor:'#60A5FA' },
                    { label:'Mutant',    codon:altC, aa:altAA, codonBg:'rgba(239,68,68,.15)',   codonBorder:'#EF4444', codonGlow:'rgba(239,68,68,.25)',  aaBg:'rgba(251,191,36,.15)',  aaBorder:'rgba(251,191,36,.3)', aaColor:'#FBBF24' }
                  ].map((r, i) => (
                    <div key={i} className="align-row">
                      <span className="align-lbl">{r.label}</span>
                      <span className="codon-chip" style={{ background:r.codonBg, border:`2px solid ${r.codonBorder}`, color:'#f1f5f9', boxShadow:`0 2px 8px ${r.codonGlow}` }}>{r.codon}</span>
                      <span style={{ color:'#6b7080', fontSize:'1.1rem', fontWeight:300 }}>→</span>
                      <span className="aa-chip" style={{ background:r.aaBg, border:`1px solid ${r.aaBorder}`, color:r.aaColor }}>{r.aa}</span>
                    </div>
                  ))}
                </div>

                {/* biological consequence */}
                {exp.long && (
                  <div className="consequence-box" style={{ background:`${exp.color}0d`, border:`1px solid ${exp.color}35` }}>
                    <div style={{ fontSize:'.82rem', fontWeight:600, color:exp.color, marginBottom:'.28rem' }}>Biological Consequence</div>
                    <div style={{ fontSize:'.86rem', color:'#8a8f9e', lineHeight:1.7 }}>{exp.long}</div>
                  </div>
                )}

                {/* confidence note */}
                <div className="note-box">ℹ️ Confidence reflects interpretation certainty, not biological effect.{conf.reason && ` (${conf.reason})`}</div>
              </div>
            );
          })}

          {mutations.mutations.length > 50 && (
            <div style={{ textAlign:'center', fontSize:'.84rem', color:'#8a8f9e', padding:'.7rem', background:'rgba(100,116,139,.08)', borderRadius:8 }}>
              Showing 50 of {mutations.mutations.length} mutations
            </div>
          )}
        </div>
      )}

      {/* NO MUTATIONS */}
      {mutations.mutations?.length === 0 && (
        <div className="pc" style={{ marginTop:'.6rem', textAlign:'center', padding:'2rem 1.5rem', borderColor:'rgba(16,185,129,.3)', background:'rgba(16,185,129,.06)' }}>
          <div style={{ fontSize:'1.6rem', marginBottom:'.35rem' }}>✅</div>
          <div style={{ fontSize:'.92rem', color:'#10B981', fontWeight:700 }}>No mutations detected — sequences are identical!</div>
        </div>
      )}
    </>)}

  </div>
  </div>
  );
}