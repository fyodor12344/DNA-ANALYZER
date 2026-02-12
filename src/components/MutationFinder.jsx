import React, { useState, useEffect } from 'react';

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
const API_URL = import.meta.env?.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

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

/* ─── IMPROVED MUTATION DETECTION ────────────────────────────────────────── */
/**
 * Detects mutations between two sequences with STRICT frameshift handling
 * 
 * CRITICAL BEHAVIOR:
 * - Detects FIRST frameshift event (indel where length % 3 !== 0)
 * - IMMEDIATELY STOPS scanning after frameshift detection
 * - Returns ONLY the single frameshift mutation
 * - Does NOT report downstream misalignments as separate mutations
 * 
 * @param {string} ref - Reference sequence
 * @param {string} alt - Alternate sequence
 * @param {number} frame - Reading frame (1, 2, or 3)
 * @param {string} strand - Strand direction ('forward' or 'reverse')
 * @returns {object} - Mutation analysis results
 */
const detectMutationsImproved = (ref, alt, frame, strand) => {
  // ═══════════════════════════════════════════════════════════════════════
  // STEP 1: Prepare sequences
  // ═══════════════════════════════════════════════════════════════════════
  let seq1 = ref.toUpperCase().replace(/\s/g, '');
  let seq2 = alt.toUpperCase().replace(/\s/g, '');
  
  if (strand === 'reverse') {
    seq1 = revComp(seq1);
    seq2 = revComp(seq2);
  }

  const mutations = [];
  const frameshiftEvents = [];
  let frameshiftDetected = false;
  let i = 0, j = 0;

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 2: Scan sequences for mutations
  // ═══════════════════════════════════════════════════════════════════════
  while ((i < seq1.length || j < seq2.length) && !frameshiftDetected) {
    
    // Handle end-of-sequence cases
    if (i >= seq1.length) {
      // Remaining bases in seq2 = insertion at end
      const inserted = seq2.substring(j);
      const isFrameshift = inserted.length % 3 !== 0;
      
      mutations.push({
        type: 'Insertion',
        position: i,
        inserted_sequence: inserted,
        length: inserted.length,
        is_frameshift: isFrameshift,
        mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Insertion',
        reference_codon: '---',
        alternate_codon: inserted.substring(0, 3)
      });
      
      if (isFrameshift) {
        frameshiftDetected = true;
        frameshiftEvents.push({
          type: 'Insertion',
          position: i,
          length: inserted.length,
          indel_length: inserted.length,
          affected_region: `${i} to end`,
          downstream_effect: 'Reading frame altered - all downstream codons shifted',
          predicted_effect: 'Altered reading frame leading to premature stop codon',
          stop_codon_prediction: true
        });
      }
      break;
    }
    
    if (j >= seq2.length) {
      // Remaining bases in seq1 = deletion at end
      const deleted = seq1.substring(i);
      const isFrameshift = deleted.length % 3 !== 0;
      
      mutations.push({
        type: 'Deletion',
        position: i,
        deleted_sequence: deleted,
        length: deleted.length,
        is_frameshift: isFrameshift,
        mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Deletion',
        reference_codon: deleted.substring(0, 3),
        alternate_codon: '---'
      });
      
      if (isFrameshift) {
        frameshiftDetected = true;
        frameshiftEvents.push({
          type: 'Deletion',
          position: i,
          length: deleted.length,
          indel_length: deleted.length,
          affected_region: `${i} to end`,
          downstream_effect: 'Reading frame altered - all downstream codons shifted',
          predicted_effect: 'Altered reading frame leading to premature stop codon',
          stop_codon_prediction: true
        });
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Bases match - continue
    // ─────────────────────────────────────────────────────────────────────
    if (seq1[i] === seq2[j]) {
      i++;
      j++;
      continue;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Mismatch detected - check if it's an indel or SNP
    // ─────────────────────────────────────────────────────────────────────
    let foundIndel = false;
    
    // Check for DELETION (bases missing in seq2)
    // Look ahead in seq1 to find where alignment resumes
    for (let k = 1; k <= Math.min(20, seq1.length - i); k++) {
      if (i + k < seq1.length && seq1[i + k] === seq2[j]) {
        // Found deletion of k bases
        const deleted = seq1.substring(i, i + k);
        const isFrameshift = k % 3 !== 0;
        
        mutations.push({
          type: 'Deletion',
          position: i,
          deleted_sequence: deleted,
          length: k,
          is_frameshift: isFrameshift,
          mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Deletion',
          reference_codon: seq1.substring(i, i + 3),
          alternate_codon: '---'
        });
        
        if (isFrameshift) {
          // ★★★ FRAMESHIFT DETECTED - STOP SCANNING ★★★
          frameshiftDetected = true;
          frameshiftEvents.push({
            type: 'Deletion',
            position: i,
            length: k,
            indel_length: k,
            affected_region: `${i} to end`,
            downstream_effect: 'Reading frame altered - all downstream codons shifted',
            predicted_effect: 'Altered reading frame leading to premature stop codon',
            stop_codon_prediction: true
          });
        } else {
          // In-frame deletion - continue scanning
          i += k;
        }
        
        foundIndel = true;
        break;
      }
    }
    
    // If frameshift was just detected, break immediately
    if (frameshiftDetected) break;
    
    if (!foundIndel) {
      // Check for INSERTION (extra bases in seq2)
      // Look ahead in seq2 to find where alignment resumes
      for (let k = 1; k <= Math.min(20, seq2.length - j); k++) {
        if (j + k < seq2.length && seq1[i] === seq2[j + k]) {
          // Found insertion of k bases
          const inserted = seq2.substring(j, j + k);
          const isFrameshift = k % 3 !== 0;
          
          mutations.push({
            type: 'Insertion',
            position: i,
            inserted_sequence: inserted,
            length: k,
            is_frameshift: isFrameshift,
            mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Insertion',
            reference_codon: '---',
            alternate_codon: seq2.substring(j, j + 3)
          });
          
          if (isFrameshift) {
            // ★★★ FRAMESHIFT DETECTED - STOP SCANNING ★★★
            frameshiftDetected = true;
            frameshiftEvents.push({
              type: 'Insertion',
              position: i,
              length: k,
              indel_length: k,
              affected_region: `${i} to end`,
              downstream_effect: 'Reading frame altered - all downstream codons shifted',
              predicted_effect: 'Altered reading frame leading to premature stop codon',
              stop_codon_prediction: true
            });
          } else {
            // In-frame insertion - continue scanning
            j += k;
          }
          
          foundIndel = true;
          break;
        }
      }
    }
    
    // If frameshift was just detected, break immediately
    if (frameshiftDetected) break;
    
    if (!foundIndel) {
      // ─────────────────────────────────────────────────────────────────
      // Simple SNP (single nucleotide polymorphism)
      // ─────────────────────────────────────────────────────────────────
      const offset = parseInt(frame) - 1;
      const codonStart1 = Math.floor((i - offset) / 3) * 3 + offset;
      const codonStart2 = Math.floor((j - offset) / 3) * 3 + offset;
      
      const refCodon = seq1.substring(codonStart1, codonStart1 + 3);
      const altCodon = seq2.substring(codonStart2, codonStart2 + 3);
      
      if (refCodon.length === 3 && altCodon.length === 3) {
        const refAA = translateCodon(refCodon);
        const altAA = translateCodon(altCodon);
        
        let mutClass = 'Missense';
        if (refAA === altAA) mutClass = 'Silent';
        else if (altAA === '*') mutClass = 'Nonsense';
        
        mutations.push({
          type: 'SNP',
          position: i,
          reference: seq1[i],
          alternate: seq2[j],
          reference_codon: refCodon,
          alternate_codon: altCodon,
          reference_amino_acid: refAA,
          alternate_amino_acid: altAA,
          mutation_class: mutClass
        });
      }
      
      i++;
      j++;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 3: Find first stop codon after frameshift (if detected)
  // ═══════════════════════════════════════════════════════════════════════
  let frameshiftStopInfo = null;
  if (frameshiftDetected && frameshiftEvents.length > 0) {
    const frameshiftPos = frameshiftEvents[0].position;
    const offset = parseInt(frame) - 1;
    
    // Search for first stop codon in shifted frame
    for (let pos = frameshiftPos + offset; pos < seq2.length; pos += 3) {
      const codon = seq2.substring(pos, pos + 3);
      if (codon.length === 3 && translateCodon(codon) === '*') {
        frameshiftStopInfo = {
          position: pos,
          codon: codon,
          distance_from_frameshift: pos - frameshiftPos
        };
        break;
      }
    }
    
    // If no stop codon found, indicate run-through
    if (!frameshiftStopInfo) {
      frameshiftStopInfo = {
        position: null,
        codon: null,
        distance_from_frameshift: null,
        note: 'No stop codon found - frameshift continues to end of sequence'
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 4: Calculate summary statistics
  // ═══════════════════════════════════════════════════════════════════════
  const summary = {
    total_mutations: mutations.length,
    snps: mutations.filter(m => m.type === 'SNP').length,
    insertions: mutations.filter(m => m.type === 'Insertion').length,
    deletions: mutations.filter(m => m.type === 'Deletion').length,
    frameshift_mutations: mutations.filter(m => m.is_frameshift).length,
    silent_mutations: mutations.filter(m => m.mutation_class === 'Silent').length,
    missense_mutations: mutations.filter(m => m.mutation_class === 'Missense').length,
    nonsense_mutations: mutations.filter(m => m.mutation_class === 'Nonsense').length
  };

  // ═══════════════════════════════════════════════════════════════════════
  // STEP 5: Return structured results
  // ═══════════════════════════════════════════════════════════════════════
  return {
    mutations,
    summary,
    frameshift_detected: frameshiftDetected,
    frameshift_events: frameshiftEvents,
    frameshift_stop_info: frameshiftStopInfo,
    sequences: {
      reference: seq1,
      alternate: seq2,
      reading_frame: frame,
      strand: strand
    }
  };
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
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
  const [generatingPDF, setGeneratingPDF]       = useState(false);

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
    if (!data?.frameshift_detected) {
      setFrameshiftDetected(false);
      setFrameshiftInfo(null);
      return;
    }

    setFrameshiftDetected(true);
    setFrameshiftInfo({
      events: data.frameshift_events,
      stop_info: data.frameshift_stop_info
    });
  };

  useEffect(() => { if (mutations) detectFrameshift(mutations); }, [mutations]);

  /* ── confidence ── */
  const getConfidence = mut => {
    if (mut.type === 'SNP' && mut.reference_codon?.length === 3 && mut.alternate_codon?.length === 3)
      return { level:'High', reason:'Clear codon change' };
    if (mut.type === 'Insertion' || mut.type === 'Deletion')
      return { level:'Moderate', reason:'Frame-dependent interpretation' };
    return { level:'Moderate', reason:'Frame-dependent interpretation' };
  };

  /* ── submit - using improved local detection ── */
  const handleFind = async () => {
    if (!seq1.trim() || !seq2.trim()) { setError('Please enter both sequences'); return; }
    if (!readingFrame || !strand) { setError('Please select both Reading Frame and Strand before analyzing'); return; }
    const v1 = validate(seq1), v2 = validate(seq2);
    if (!v1.valid) { setError(`Reference: ${v1.error}`); return; }
    if (!v2.valid) { setError(`Alternate: ${v2.error}`); return; }
    
    setLoading(true); setError(''); setAiExplanation(''); setMutations(null);
    setFrameshiftDetected(false); setFrameshiftInfo(null);
    
    try {
      // Use improved local detection
      const result = detectMutationsImproved(v1.cleaned, v2.cleaned, parseInt(readingFrame), strand);
      setMutations(result);
    } catch (e) {
      setError(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
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

  /* ── PDF Export ── */
  const handleExportPDF = async () => {
    if (!mutations) return;
    
    setGeneratingPDF(true);
    setError('');
    
    try {
      // Send request to generate PDF
      const response = await fetch(`${API_URL}/api/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutations: mutations,
          sequences: { reference: seq1, alternate: seq2 },
          parameters: { readingFrame, strand },
          aiExplanation: aiExplanation || null
        })
      });
      
      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mutation-analysis-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setError(`PDF export failed: ${e.message}`);
    } finally {
      setGeneratingPDF(false);
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════════════ */
  return (
  <div style={{ minHeight:'100vh', background:'#0c0e14', color:'#e2e4e9', fontFamily:'"Sora",sans-serif', fontSize:'1.05em' }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{ box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar{ width:5px; }
    ::-webkit-scrollbar-track{ background:#131518; }
    ::-webkit-scrollbar-thumb{ background:#2a2d3a; border-radius:3px; }

    .pc{ background:#141720; border:1px solid #24272f; border-radius:12px; padding:1.5rem; margin-bottom:1.2rem; 
         animation: fadeSlideIn 0.4s ease-out; }
    .lbl{ display:block; font-size:.95rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.5rem; }

    select, textarea{
      width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px;
      color:#e2e4e9; font-family:'Sora',sans-serif; font-size:1.05rem;
      padding:.8rem .95rem; outline:none; transition:all .3s ease;
    }
    select:focus, textarea:focus{ border-color:#06B6D4; box-shadow: 0 0 0 3px rgba(6,182,212,0.1); }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:.95rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }
    select option{ background:#0f1117; }

    /* ── buttons ── */
    .btn-p{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:1rem 1.35rem;
      background:linear-gradient(135deg,#06B6D4,#0891B2);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.1rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-p::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-p:hover::before{ left:100%; }
    .btn-p:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(6,182,212,.4); }
    .btn-p:active{ transform:translateY(0); }
    .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-ai{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:.95rem 1.35rem;
      background:linear-gradient(135deg,#14B8A6,#0D9488);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-ai::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-ai:hover::before{ left:100%; }
    .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(20,184,166,.4); }
    .btn-ai:active{ transform:translateY(0); }
    .btn-ai:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-pdf{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:.95rem 1.35rem;
      background:linear-gradient(135deg,#8B5CF6,#7C3AED);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-pdf::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-pdf:hover::before{ left:100%; }
    .btn-pdf:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(139,92,246,.4); }
    .btn-pdf:active{ transform:translateY(0); }
    .btn-pdf:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }

    .btn-g{
      display:inline-flex; align-items:center; gap:.42rem;
      padding:.52rem 1rem; background:transparent;
      border:1px solid #24272f; border-radius:7px;
      color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500;
      cursor:pointer; transition:all .25s ease;
    }
    .btn-g:hover{ border-color:#06B6D4; color:#06B6D4; background:rgba(6,182,212,.06); transform:translateY(-1px); }

    .btn-sample{
      display:inline-flex; align-items:center; gap:.42rem;
      padding:.5rem 1rem; background:rgba(6,182,212,.1);
      border:1px solid rgba(6,182,212,.3); border-radius:7px;
      color:#67E8F9; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500;
      cursor:pointer; transition:all .25s ease; position:relative;
    }
    .btn-sample:hover{ background:rgba(6,182,212,.18); border-color:rgba(6,182,212,.55); transform:translateY(-1px); }

    /* ── sample dropdown ── */
    .sample-menu{
      position:absolute; top:calc(100% + .35rem); left:0;
      background:#141720; border:1px solid #24272f; border-radius:10px;
      box-shadow:0 12px 32px rgba(0,0,0,.45); padding:.6rem;
      z-index:100; min-width:280px; max-width:90vw;
      animation: dropdownSlide 0.25s ease-out;
    }
    .sample-item{
      padding:.8rem .9rem; border-radius:8px; cursor:pointer;
      border:1px solid transparent; margin-bottom:.32rem; transition:all .2s ease;
    }
    .sample-item:hover{ border-color:#06B6D4; background:rgba(6,182,212,.07); transform:translateX(4px); }
    .sample-item:last-child{ margin-bottom:0; }

    /* ── info panel ── */
    .info-wrap{ overflow:hidden; transition:max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; }
    .info-wrap.closed{ max-height:0; opacity:0; }
    .info-wrap.open{ max-height:1200px; opacity:1; }

    /* ── step ── */
    .step-row{ display:flex; gap:.6rem; align-items:flex-start; margin-bottom:.7rem; animation: fadeIn 0.3s ease-out; }
    .step-num{ flex-shrink:0; width:28px; height:28px; border-radius:50%; background:#06B6D4; color:#fff; font-size:.75rem; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:.08rem;
               animation: pulse 2s ease-in-out infinite; }

    /* ── stat ── */
    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:.9rem .7rem; text-align:center; 
             transition:all .3s ease; animation: fadeIn 0.4s ease-out; }
    .stat-b:hover{ transform:translateY(-3px); box-shadow:0 4px 12px rgba(6,182,212,.15); border-color:#06B6D4; }
    .stat-v{ font-size:1.6rem; font-weight:700; line-height:1.2; }
    .stat-l{ font-size:.85rem; color:#6b7080; text-transform:uppercase; letter-spacing:.06em; margin-top:.3rem; }

    /* ── codon alignment ── */
    .align-box{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1.1rem 1.2rem; margin-top:.8rem; 
                animation: fadeIn 0.3s ease-out; }
    .align-row{ display:flex; align-items:center; gap:.8rem; margin-bottom:.6rem; }
    .align-row:last-child{ margin-bottom:0; }
    .align-lbl{ width:80px; font-size:.95rem; font-weight:600; color:#8a8f9e; flex-shrink:0; }
    .codon-chip{
      font-family:'JetBrains Mono',monospace; font-size:1.05rem; font-weight:700;
      padding:.38rem .8rem; border-radius:7px; letter-spacing:2px;
      transition:transform .2s ease;
    }
    .codon-chip:hover{ transform:scale(1.05); }
    .aa-chip{ font-size:1rem; font-weight:700; padding:.32rem .7rem; border-radius:6px; 
              transition:transform .2s ease; }
    .aa-chip:hover{ transform:scale(1.05); }

    /* ── mutation card ── */
    .mut-card{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1.25rem; margin-bottom:.8rem; 
               animation: fadeSlideIn 0.3s ease-out; transition:all .3s ease; }
    .mut-card:hover{ transform:translateX(4px); box-shadow:0 4px 16px rgba(6,182,212,.1); border-color:#24272f; }

    /* ── tip / consequence ── */
    .consequence-box{ border-radius:9px; padding:.9rem; margin-top:.7rem; animation: fadeIn 0.4s ease-out; }
    .note-box{ background:rgba(100,116,139,.08); border-left:3px solid #24272f; border-radius:6px; padding:.7rem .8rem; margin-top:.6rem; font-style:italic; font-size:.92rem; color:#6b7080; line-height:1.6; }

    /* ── frameshift banner ── */
    .fs-banner{ background:linear-gradient(135deg,#7f1d1d,#991B1B); border:1px solid #dc2626; border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; 
                animation: warningPulse 0.6s ease-out, fadeSlideIn 0.4s ease-out; }

    /* ── AI box ── */
    .ai-box{ background:rgba(6,182,212,.08); border:1px solid rgba(6,182,212,.3); border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; 
             animation: fadeSlideIn 0.4s ease-out; }

    /* ── grids / responsive ── */
    .stat-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }
    .seq-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .config-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .summary-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }

    @media(max-width:640px){
      .seq-grid{ grid-template-columns:1fr; }
      .config-grid{ grid-template-columns:1fr; }
      .stat-grid{ grid-template-columns:repeat(2,1fr); }
      .summary-grid{ grid-template-columns:repeat(2,1fr); }
      .pc{ padding:1.1rem; }
      .align-box{ padding:.85rem .8rem; }
    }
    @media(max-width:380px){
      .stat-grid{ grid-template-columns:1fr 1fr; gap:.45rem; }
      .summary-grid{ grid-template-columns:1fr 1fr; gap:.45rem; }
    }

    /* ── animations ── */
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite; }

    @keyframes fadeIn {
      from { opacity:0; }
      to { opacity:1; }
    }

    @keyframes fadeSlideIn {
      from { opacity:0; transform:translateY(10px); }
      to { opacity:1; transform:translateY(0); }
    }

    @keyframes dropdownSlide {
      from { opacity:0; transform:translateY(-10px); }
      to { opacity:1; transform:translateY(0); }
    }

    @keyframes warningPulse {
      0%, 100% { box-shadow:0 0 0 0 rgba(220,38,38,0.4); }
      50% { box-shadow:0 0 0 10px rgba(220,38,38,0); }
    }

    @keyframes pulse {
      0%, 100% { transform:scale(1); }
      50% { transform:scale(1.05); }
    }
  `}</style>

  {/* ═══ HEADER ═══ */}
  <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.65rem 1.3rem 1.3rem' }}>
    <div style={{ maxWidth:860, margin:'0 auto' }}>
      {/* Boxed Title */}
      <div style={{ 
        background:'linear-gradient(135deg, #164E63 0%, #083344 100%)', 
        border:'2px solid rgba(6, 182, 212, 0.3)', 
        borderRadius:'14px', 
        padding:'1.1rem 1.3rem',
        marginBottom:'.6rem',
        boxShadow:'0 8px 32px rgba(6, 182, 212, 0.15)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.75rem', flexWrap:'wrap' }}>
          <span style={{ fontSize:'1.75rem' }}>🧬</span>
          <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.75rem', color:'#fff', margin:0 }}>Mutation Finder</h1>
          <span style={{ background:'rgba(6,182,212,.2)', border:'1px solid rgba(6,182,212,.4)', color:'#67E8F9', fontSize:'.75rem', fontWeight:600, padding:'.25rem .6rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Research Grade</span>
        </div>
      </div>
      <p style={{ color:'#6b7080', fontSize:'1.05rem', lineHeight:1.6, maxWidth:560, margin:0 }}>
        Compare two DNA sequences to identify and classify SNPs, insertions, deletions, and frameshift mutations with codon-level resolution.
      </p>
    </div>
  </div>

  <div style={{ maxWidth:860, margin:'0 auto', padding:'1.25rem 1.2rem 3rem' }}>

    {/* ═══ INFO TOGGLE ═══ */}
    <button className="btn-g" onClick={()=>setInfoOpen(v=>!v)} style={{ width:'100%', justifyContent:'space-between', marginBottom:'1.1rem' }}>
      <span style={{ display:'flex', alignItems:'center', gap:'.45rem' }}>
        <span style={{ fontSize:'1.05rem' }}>💡</span>
        <span style={{ fontSize:'1rem' }}>Why This Tool Matters &amp; How to Use It</span>
      </span>
      <span style={{ fontSize:'.82rem', color:'#6b7080', transition:'transform .25s', transform:infoOpen?'rotate(180deg)':'rotate(0)', display:'inline-block' }}>▼</span>
    </button>

    <div className={`info-wrap ${infoOpen?'open':'closed'}`}>
      <div className="pc" style={{ padding:'1.45rem' }}>
        {/* WHY */}
        <div style={{ marginBottom:'1.2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.55rem' }}>
            <span style={{ fontSize:'1.05rem' }}>🎯</span>
            <span style={{ fontSize:'.95rem', fontWeight:600, color:'#06B6D4', textTransform:'uppercase', letterSpacing:'.07em' }}>Why This Tool Matters</span>
          </div>
          <p style={{ fontSize:'1.05rem', color:'#8a8f9e', lineHeight:1.75, margin:0 }}>
            Manually comparing two DNA sequences base-by-base is tedious and error-prone — especially when you need to know <strong style={{color:'#c8cad4'}}>what the mutation does at the protein level</strong>. This tool aligns your reference and alternate sequences, pinpoints every variation, and classifies each one as a
            <strong style={{color:'#c8cad4'}}> Silent </strong>,
            <strong style={{color:'#c8cad4'}}> Missense </strong>, or
            <strong style={{color:'#c8cad4'}}> Nonsense </strong>
            mutation — and flags any <strong style={{color:'#EF4444'}}>frameshift</strong> events that could destroy the entire downstream reading frame.
          </p>
        </div>
        <div style={{ borderTop:'1px solid #24272f', margin:'1.1rem 0' }}></div>
        {/* WORKFLOW */}
        <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.7rem' }}>
          <span style={{ fontSize:'1.05rem' }}>📖</span>
          <span style={{ fontSize:'.95rem', fontWeight:600, color:'#60A5FA', textTransform:'uppercase', letterSpacing:'.07em' }}>Workflow &amp; Next Steps</span>
        </div>
        {[
          ['Pick Your Settings',         'Select the reading frame (+1, +2, or +3) and strand direction. These determine how codons are grouped — different settings produce different protein translations.'],
          ['Load or Paste Sequences',    'Use the sample dropdown to explore pre-built mutation scenarios, or paste your own reference and alternate sequences. Only A, T, G, C characters are accepted.'],
          ['Run the Analysis',           'Hit Find Mutations. The tool aligns both sequences, detects every SNP / indel, classifies each by biological consequence, and flags any frameshifts with a prominent banner.'],
          ['Interpret the Results',      'Each mutation card shows a before/after codon alignment, the amino acid change, a confidence score, and a plain-English explanation of the biological impact. Use this to prioritise which variants need further investigation.'],
          ['Export PDF Report',          'Download a comprehensive PDF report containing all mutation details, statistics, and AI analysis for documentation and sharing.']
        ].map(([title, desc], i) => (
          <div key={i} className="step-row">
            <div className="step-num">{i+1}</div>
            <div>
              <div style={{ fontSize:'1.02rem', fontWeight:600, color:'#c8cad4', marginBottom:'.12rem' }}>{title}</div>
              <div style={{ fontSize:'.97rem', color:'#6b7080', lineHeight:1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* ═══ LOAD SAMPLE ═══ */}
    <div style={{ position:'relative', marginBottom:'1.1rem' }}>
      <button className="btn-sample" onClick={e=>{ e.stopPropagation(); setShowSampleMenu(v=>!v); }}>
        <span style={{ fontSize:'1.02rem' }}>📋</span>
        <span>Load Sample Mutations</span>
        <span style={{ fontSize:'.82rem', color:'#6b7080', marginLeft:'.25rem' }}>▼</span>
      </button>
      {showSampleMenu && (
        <div className="sample-menu" onClick={e=>e.stopPropagation()}>
          {Object.entries(MUTATION_SAMPLES).map(([k, s]) => (
            <div key={k} className="sample-item" onClick={()=>loadSample(k)} style={{ background:`${s.color}0a` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.22rem' }}>
                <span style={{ fontSize:'1.25rem' }}>{s.icon}</span>
                <span style={{ fontSize:'1rem', fontWeight:600, color:s.color }}>{s.name}</span>
              </div>
              <div style={{ fontSize:'.9rem', color:'#8a8f9e', lineHeight:1.45 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* ═══ SAMPLE EXPLANATION BANNER ═══ */}
    {sampleBannerVisible && currentSample && (
      <div className="pc" style={{ borderColor:currentSample.color+'55', background:`${currentSample.color}08`, marginBottom:'1.1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.65rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            <span style={{ fontSize:'1.6rem' }}>{currentSample.icon}</span>
            <div>
              <div style={{ fontSize:'1.05rem', fontWeight:700, color:currentSample.color }}>Sample Loaded: {currentSample.name}</div>
              <div style={{ fontSize:'.95rem', color:'#8a8f9e', marginTop:'.12rem' }}>{currentSample.description}</div>
            </div>
          </div>
          <button onClick={()=>setSampleBannerVisible(false)} style={{ background:'none', border:'none', color:'#6b7080', fontSize:'1.4rem', cursor:'pointer', padding:'.1rem' }}>×</button>
        </div>
        <div style={{ background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.95rem', border:`1px solid ${currentSample.color}30` }}>
          <div style={{ fontSize:'.95rem', fontWeight:600, color:'#60A5FA', marginBottom:'.4rem' }}>📚 Educational Explanation</div>
          <p style={{ fontSize:'1rem', color:'#8a8f9e', lineHeight:1.7, margin:'0 0 .55rem' }}>{currentSample.explanation}</p>
          <div style={{ fontSize:'.95rem', color:'#8a8f9e', lineHeight:1.6 }}>
            <span style={{ color:'#60A5FA', fontWeight:600 }}>🔬 Biological Context: </span>{currentSample.biologicalContext}
          </div>
          <div style={{ marginTop:'.6rem', display:'flex', gap:'1.65rem', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:'.88rem', color:'#6b7080', textTransform:'uppercase', letterSpacing:'.05em' }}>Expected Result</div>
              <div style={{ fontSize:'.97rem', color:currentSample.color, fontWeight:600, marginTop:'.14rem' }}>{currentSample.expectedResult}</div>
            </div>
            {currentSample.mutationDetails && (
              <div>
                <div style={{ fontSize:'.88rem', color:'#6b7080', textTransform:'uppercase', letterSpacing:'.05em' }}>Details</div>
                <div style={{ fontSize:'.95rem', color:'#8a8f9e', marginTop:'.14rem' }}>
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
    {frameshiftDetected && frameshiftInfo && frameshiftInfo.events.length > 0 && (
      <div className="fs-banner">
        <div style={{ display:'flex', alignItems:'center', gap:'.7rem', marginBottom:'.6rem' }}>
          <span style={{ fontSize:'1.5rem' }}>⚠️</span>
          <div>
            <div style={{ fontSize:'1.05rem', fontWeight:700, color:'#FEF2F2' }}>Critical: Frameshift Mutation Detected!</div>
            <div style={{ fontSize:'.95rem', color:'#FCA5A5', marginTop:'.1rem' }}>
              {frameshiftInfo.events[0].type} of {frameshiftInfo.events[0].indel_length} base(s) at position {frameshiftInfo.events[0].position}
            </div>
          </div>
        </div>
        <div style={{ background:'rgba(0,0,0,.35)', borderRadius:8, padding:'.85rem', border:'1px solid rgba(254,202,202,.2)' }}>
          <div style={{ fontSize:'.97rem', color:'#FEF2F2', lineHeight:1.75 }}>
            <div style={{ marginBottom:'.5rem', padding:'.6rem', background:'rgba(254,202,202,.15)', borderRadius:6, borderLeft:'3px solid #FCA5A5' }}>
              <strong>🛑 Analysis Stopped:</strong> Downstream sequence scanning halted to prevent false mutation reporting due to frame misalignment.
            </div>
            <div style={{ marginBottom:'.4rem' }}>
              <strong>📍 Affected Region: </strong>
              <span style={{ fontFamily:'"JetBrains Mono",monospace', background:'rgba(254,202,202,.2)', padding:'.25rem .6rem', borderRadius:5, fontSize:'1.02rem', fontWeight:700, marginLeft:'.45rem' }}>
                {frameshiftInfo.events[0].affected_region}
              </span>
            </div>
            {frameshiftInfo.stop_info && frameshiftInfo.stop_info.position && (
              <div style={{ marginBottom:'.4rem' }}>
                <strong>🛑 First premature stop at position {frameshiftInfo.stop_info.position}: </strong>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', background:'rgba(254,202,202,.2)', padding:'.25rem .6rem', borderRadius:5, fontSize:'1.02rem', fontWeight:700, letterSpacing:'2px', marginLeft:'.45rem' }}>
                  {frameshiftInfo.stop_info.codon}
                </span>
                <span style={{ marginLeft:'.5rem', fontSize:'.95rem', color:'#FCA5A5' }}>
                  ({frameshiftInfo.stop_info.distance_from_frameshift} bases downstream)
                </span>
              </div>
            )}
            {frameshiftInfo.stop_info && frameshiftInfo.stop_info.note && (
              <div style={{ marginBottom:'.4rem', color:'#FCA5A5', fontStyle:'italic' }}>
                ℹ️ {frameshiftInfo.stop_info.note}
              </div>
            )}
            <div style={{ fontSize:'.95rem', color:'#FCA5A5', fontStyle:'italic', borderTop:'1px solid rgba(254,202,202,.2)', paddingTop:'.5rem', marginTop:'.35rem' }}>
              💡 <strong>Biological Impact:</strong> {frameshiftInfo.events[0].downstream_effect}. This typically results in a non-functional protein due to premature termination or completely altered amino acid sequence.
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ═══ CONFIG ═══ */}
    <div className="pc" style={{ borderColor:'rgba(6,182,212,.3)', background:'rgba(6,182,212,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'1.05rem' }}>⚙️</span>
        <span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>Analysis Configuration</span>
        <span style={{ background:'#EF4444', color:'#fff', fontSize:'.72rem', fontWeight:700, padding:'.18rem .48rem', borderRadius:8, letterSpacing:'.04em', textTransform:'uppercase', marginLeft:'.35rem' }}>Required</span>
      </div>
      <div className="config-grid">
        <div>
          <label className="lbl">Reading Frame <span style={{ textTransform:'none', color:'#6b7080', fontWeight:400, letterSpacing:0 }}>(codon boundaries)</span></label>
          <select value={readingFrame} onChange={e=>{ setReadingFrame(e.target.value); setShowCodonPreview(!!e.target.value); }} style={{ borderColor: readingFrame ? '#06B6D4' : '#EF4444' }}>
            <option value="">Select reading frame…</option>
            <option value="1">+1  (start at position 1)</option>
            <option value="2">+2  (start at position 2)</option>
            <option value="3">+3  (start at position 3)</option>
          </select>
        </div>
        <div>
          <label className="lbl">Strand</label>
          <select value={strand} onChange={e=>setStrand(e.target.value)} style={{ borderColor: strand ? '#06B6D4' : '#EF4444' }}>
            <option value="">Select strand…</option>
            <option value="forward">Forward  (5′ → 3′)</option>
            <option value="reverse">Reverse  (3′ → 5′)</option>
          </select>
        </div>
      </div>

      {/* codon preview */}
      {showCodonPreview && previewSequence && readingFrame && (
        <div style={{ marginTop:'1rem', background:'#0f1117', border:'1px solid #1e2130', borderRadius:9, padding:'.9rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.55rem' }}>
            <span style={{ fontSize:'1.02rem' }}>🔬</span>
            <span style={{ fontSize:'.95rem', color:'#8a8f9e', fontWeight:600 }}>Codon Preview — Frame +{readingFrame}, {strand}</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'.4rem' }}>
            {parseIntoCodons(previewSequence, readingFrame).map((cd, i) => (
              <span key={i} style={{ display:'inline-flex', flexDirection:'column', alignItems:'center' }}>
                <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem', background:'rgba(6,182,212,.15)', border:'1px solid #06B6D4', borderRadius:5, padding:'.22rem .45rem', color:'#e2e4e9', letterSpacing:'1.5px', fontWeight:600 }}>{cd.codon}</span>
                <span style={{ fontSize:'.8rem', color:'#67E8F9', fontWeight:700, marginTop:'.1rem' }}>{cd.aminoAcid}</span>
              </span>
            ))}
          </div>
          <div className="note-box" style={{ marginTop:'.6rem' }}>💡 Codon grouping depends on the selected reading frame. Change the frame to see different translations.</div>
        </div>
      )}

      {/* why it matters mini */}
      <div style={{ marginTop:'.95rem', background:'rgba(0,0,0,.2)', borderRadius:8, padding:'.8rem .9rem', border:'1px solid #24272f' }}>
        <div style={{ fontSize:'.97rem', color:'#8a8f9e', lineHeight:1.7 }}>
          <strong style={{ color:'#67E8F9' }}>ℹ️ Why this matters:</strong> DNA is read in triplets (codons). The reading frame sets where each triplet starts; the strand sets the direction. Different combinations produce different proteins.
        </div>
      </div>

      {(!readingFrame || !strand) && (
        <div style={{ marginTop:'.8rem', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'.6rem .8rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
          <span style={{ fontSize:'1.02rem' }}>⚠️</span>
          <span style={{ fontSize:'.95rem', color:'#FCA5A5', fontWeight:600 }}>Please select both reading frame and strand to enable mutation classification.</span>
        </div>
      )}
    </div>

    {/* ═══ SEQUENCES ═══ */}
    <div className="seq-grid">
      {[['Reference Sequence', seq1, setSeq1], ['Alternate Sequence', seq2, setSeq2]].map(([label, val, setter], i) => (
        <div key={i}>
          <label className="lbl" style={{ margin:'0 0 .48rem' }}>{label}</label>
          <textarea rows={4} value={val} onChange={e=>setter(e.target.value)} placeholder={`Paste ${i===0?'reference':'alternate'} DNA sequence (ATGC)…`} />
          <div style={{ marginTop:'.38rem', fontSize:'.92rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace' }}>
            {val.replace(/\s/g,'').length} bp
          </div>
        </div>
      ))}
    </div>

    {error && (
      <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'.7rem .9rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:'.5rem' }}>
        <span style={{ fontSize:'1.02rem' }}>⚠️</span>
        <span style={{ fontSize:'.97rem', color:'#F87171' }}>{error}</span>
      </div>
    )}

    {/* ═══ SUBMIT ═══ */}
    <button className="btn-p" onClick={handleFind} disabled={loading || !readingFrame || !strand} style={{ marginTop:'.35rem' }}>
      {loading ? <><span className="spin"></span> Analyzing sequences…</> : <><span>🔍</span> Find Mutations</>}
    </button>

    {/* ═══════════════════════════════════════════════════════════════════
        RESULTS
        ═══════════════════════════════════════════════════════════════════ */}
    {mutations && (<>

      {/* analysis params strip */}
      <div className="pc" style={{ marginTop:'1.35rem', borderColor:'rgba(6,182,212,.22)', background:'rgba(6,182,212,.04)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.65rem', flexWrap:'wrap' }}>
          <span style={{ fontSize:'.95rem', color:'#67E8F9', fontWeight:600 }}>📋 Analysis Parameters</span>
          <span style={{ fontSize:'.97rem', color:'#8a8f9e' }}>Frame: <strong style={{ color:'#67E8F9' }}>+{readingFrame}</strong></span>
          <span style={{ fontSize:'.97rem', color:'#8a8f9e' }}>Strand: <strong style={{ color:'#67E8F9' }}>{strand.charAt(0).toUpperCase()+strand.slice(1)}</strong></span>
        </div>
      </div>

      {/* Action buttons row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.8rem', marginBottom:'.8rem' }}>
        <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
          {loadingAI ? <><span className="spin"></span> Generating AI Analysis…</> : <><span>🤖</span> Get AI Explanation</>}
        </button>
        
        <button className="btn-pdf" onClick={handleExportPDF} disabled={generatingPDF}>
          {generatingPDF ? <><span className="spin"></span> Generating PDF…</> : <><span>📄</span> Export PDF Report</>}
        </button>
      </div>

      {/* AI result */}
      {aiExplanation && (
        <div className="ai-box">
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.65rem' }}>
            <span style={{ fontSize:'1.15rem' }}>🤖</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>AI Analysis</span>
          </div>
          <div style={{ fontSize:'1.02rem', color:'#e2e4e9', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:440, overflowY:'auto', background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.85rem', border:'1px solid #24272f' }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* SUMMARY STATS */}
      {mutations.summary && (
        <div className="pc" style={{ marginTop:'.7rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.65rem' }}>
            <span style={{ fontSize:'1.05rem' }}>📊</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Summary</span>
          </div>
          <div className="summary-grid">
            {[
              { l:'Total',     v:mutations.summary.total_mutations||0,        c:'#fff' },
              { l:'SNPs',      v:mutations.summary.snps||0,                   c:'#60A5FA' },
              { l:'Insertions',v:mutations.summary.insertions||0,             c:'#F59E0B' },
              { l:'Deletions', v:mutations.summary.deletions||0,              c:'#EF4444' },
              { l:'Frameshift',v:mutations.summary.frameshift_mutations||0,   c:'#DC2626' },
              { l:'Silent',    v:mutations.summary.silent_mutations||0,       c:'#10B981' },
              { l:'Missense',  v:mutations.summary.missense_mutations||0,     c:'#F59E0B' },
              { l:'Nonsense',  v:mutations.summary.nonsense_mutations||0,     c:'#EF4444' }
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
        <div className="pc" style={{ marginTop:'.7rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'1.05rem' }}>📋</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Detailed Mutation Analysis</span>
            <span style={{ background:'rgba(6,182,212,.18)', color:'#67E8F9', fontSize:'.8rem', fontWeight:600, padding:'.18rem .48rem', borderRadius:8 }}>{mutations.mutations.length} found</span>
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
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'.6rem', flexWrap:'wrap', gap:'.45rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.55rem', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'.97rem', color:'#8a8f9e', fontWeight:600 }}>Position {mut.position}</span>
                    <span style={{ background:'rgba(6,182,212,.12)', border:'1px solid rgba(6,182,212,.25)', color:'#67E8F9', fontSize:'.9rem', fontWeight:600, padding:'.2rem .58rem', borderRadius:6 }}>{mut.type}</span>
                    {mut.is_frameshift && (
                      <span style={{ background:'rgba(220,38,38,.15)', border:'1px solid rgba(220,38,38,.4)', color:'#FCA5A5', fontSize:'.85rem', fontWeight:700, padding:'.2rem .52rem', borderRadius:6 }}>
                        🔴 FRAMESHIFT
                      </span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:'.48rem', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ background:`${confCol}15`, color:confCol, border:`1px solid ${confCol}40`, fontSize:'.82rem', fontWeight:600, padding:'.2rem .52rem', borderRadius:6 }}>{conf.level} Confidence</span>
                    {exp.color && (
                      <span style={{ background:`${exp.color}18`, color:exp.color, border:`1px solid ${exp.color}45`, fontSize:'.9rem', fontWeight:600, padding:'.2rem .58rem', borderRadius:6 }}>
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
                      <span style={{ color:'#6b7080', fontSize:'1.25rem', fontWeight:300 }}>→</span>
                      <span className="aa-chip" style={{ background:r.aaBg, border:`1px solid ${r.aaBorder}`, color:r.aaColor }}>{r.aa}</span>
                    </div>
                  ))}
                </div>

                {/* biological consequence */}
                {exp.long && (
                  <div className="consequence-box" style={{ background:`${exp.color}0d`, border:`1px solid ${exp.color}35` }}>
                    <div style={{ fontSize:'.95rem', fontWeight:600, color:exp.color, marginBottom:'.32rem' }}>Biological Consequence</div>
                    <div style={{ fontSize:'1rem', color:'#8a8f9e', lineHeight:1.7 }}>{exp.long}</div>
                  </div>
                )}

                {/* Additional info for indels */}
                {(mut.type === 'Insertion' || mut.type === 'Deletion') && (
                  <div className="note-box">
                    ℹ️ {mut.type === 'Insertion' ? 'Inserted' : 'Deleted'} sequence: <strong>{mut.inserted_sequence || mut.deleted_sequence}</strong> ({mut.length} bp)
                    {mut.is_frameshift && <span style={{ color:'#EF4444', fontWeight:700 }}> — Causes reading frame shift!</span>}
                  </div>
                )}

                {/* confidence note */}
                <div className="note-box">ℹ️ Confidence reflects interpretation certainty, not biological effect.{conf.reason && ` (${conf.reason})`}</div>
              </div>
            );
          })}

          {mutations.mutations.length > 50 && (
            <div style={{ textAlign:'center', fontSize:'.97rem', color:'#8a8f9e', padding:'.8rem', background:'rgba(100,116,139,.08)', borderRadius:8 }}>
              Showing 50 of {mutations.mutations.length} mutations
            </div>
          )}
        </div>
      )}

      {/* NO MUTATIONS */}
      {mutations.mutations?.length === 0 && (
        <div className="pc" style={{ marginTop:'.7rem', textAlign:'center', padding:'2.2rem 1.65rem', borderColor:'rgba(16,185,129,.3)', background:'rgba(16,185,129,.06)' }}>
          <div style={{ fontSize:'1.85rem', marginBottom:'.4rem' }}>✅</div>
          <div style={{ fontSize:'1.05rem', color:'#10B981', fontWeight:700 }}>No mutations detected — sequences are identical!</div>
        </div>
      )}
    </>)}

    </div>
  </div>
  );
}