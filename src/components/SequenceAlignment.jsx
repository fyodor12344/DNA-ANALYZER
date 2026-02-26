import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';

const ALIGNMENT_SAMPLES = {
  identical: {
    name: 'Identical Sequences',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    algorithm: 'global',
    description: '100% Match - Perfect Alignment',
    explanation: 'These sequences are completely identical, demonstrating perfect sequence conservation. This would result in 100% similarity with no gaps or mismatches.',
    expectedResult: 'Score: High | Similarity: 100% | Gaps: 0',
    biologicalContext: 'Identical sequences might represent the same gene from the same organism, duplicated genes with no divergence, or highly conserved functional domains.'
  },
  snp: {
    name: 'SNP Variation',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATCGTTCGATCGATCGATCGATCG',
    algorithm: 'global',
    description: 'Single Nucleotide Polymorphism',
    explanation: 'Two sequences differing by a single nucleotide substitution (A to T at position 14). This demonstrates how alignment algorithms detect and score point mutations.',
    expectedResult: 'Score: High | Similarity: ~97% | 1 Mismatch',
    biologicalContext: 'SNPs are the most common type of genetic variation. This could represent allelic differences, population variants, or evolutionary changes between related sequences.'
  },
  indel: {
    name: 'Insertion/Deletion',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATC---CGATCGATCGATCGATCG',
    algorithm: 'global',
    description: 'Gap Introduction (Indel)',
    explanation: 'One sequence has a 3-nucleotide deletion (or insertion, depending on perspective). Alignment algorithms introduce gaps to maximize overall similarity while accounting for insertions/deletions.',
    expectedResult: 'Score: Moderate | Similarity: ~91% | 3 Gaps',
    biologicalContext: 'Insertions and deletions (indels) are common in evolution and can affect protein length if occurring in coding regions. Gap penalties in alignment reflect the biological cost of indels.'
  },
  localMatch: {
    name: 'Local Similarity',
    sequence1: 'AAAAAATGCGATCGATCGAAAAAAA',
    sequence2: 'TTTTTTGCGATCGATCGTTTTTTT',
    algorithm: 'local',
    description: 'Conserved Region Detection',
    explanation: 'Sequences with a highly conserved central region flanked by unrelated sequences. Local alignment (Smith-Waterman) will identify the conserved middle section while ignoring mismatched ends.',
    expectedResult: 'Local alignment finds conserved region',
    biologicalContext: 'Local alignment is ideal for finding conserved domains, motifs, or functional regions within otherwise divergent sequences - common when comparing genes from distantly related organisms.'
  },
  divergent: {
    name: 'Divergent Sequences',
    sequence1: 'ATGCGATCGATCGATCGATCGATC',
    sequence2: 'GCTAGCTAGCTAGCTAGCTAGCTA',
    algorithm: 'global',
    description: 'High Sequence Divergence',
    explanation: 'Two sequences with significant differences throughout. This demonstrates how alignment algorithms handle sequences with low similarity, useful for detecting distant evolutionary relationships or assessing alignment quality.',
    expectedResult: 'Score: Low | Similarity: <50% | Many mismatches',
    biologicalContext: 'Highly divergent sequences may represent distantly related genes, different functional domains, or unrelated sequences. Low alignment scores indicate poor sequence relationship.'
  }
};

const SequenceAlignment = () => {
  const [sequence1, setSequence1] = useState('');
  const [sequence2, setSequence2] = useState('');
  const [algorithm, setAlgorithm] = useState('global');
  const [alignment, setAlignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [biologicalInterpretation, setBiologicalInterpretation] = useState(null);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [currentSample, setCurrentSample] = useState(null);

  const loadSample = (sampleKey) => {
    const sample = ALIGNMENT_SAMPLES[sampleKey];
    setSequence1(sample.sequence1);
    setSequence2(sample.sequence2);
    setAlgorithm(sample.algorithm);
    setCurrentSample(sample);
    setShowSampleMenu(false);
    setAlignment(null);
    setError('');
    setAiExplanation('');
    setBiologicalInterpretation(null);
  };

  const generateBiologicalInterpretation = (alignmentData) => {
    const align1 = alignmentData.alignment1;
    const align2 = alignmentData.alignment2;
    const conservedRegions = [];
    let currentConserved = { start: null, length: 0 };
    for (let i = 0; i < align1.length; i++) {
      if (align1[i] === align2[i] && align1[i] !== '-') {
        if (currentConserved.start === null) { currentConserved.start = i; currentConserved.length = 1; }
        else { currentConserved.length++; }
      } else {
        if (currentConserved.length >= 10) conservedRegions.push({ ...currentConserved });
        currentConserved = { start: null, length: 0 };
      }
    }
    if (currentConserved.length >= 10) conservedRegions.push({ ...currentConserved });

    const variableRegions = [];
    let currentVariable = { start: null, length: 0, type: '' };
    for (let i = 0; i < align1.length; i++) {
      if (align1[i] !== align2[i]) {
        if (currentVariable.start === null) { currentVariable.start = i; currentVariable.length = 1; currentVariable.type = (align1[i] === '-' || align2[i] === '-') ? 'gap' : 'substitution'; }
        else { currentVariable.length++; }
      } else {
        if (currentVariable.length >= 5) variableRegions.push({ ...currentVariable });
        currentVariable = { start: null, length: 0, type: '' };
      }
    }
    if (currentVariable.length >= 5) variableRegions.push({ ...currentVariable });

    const similarity = parseFloat(alignmentData.similarity_percentage);
    const gapFrequency = (alignmentData.gaps / align1.length) * 100;
    let confidence, confidenceColor, confidenceReason;
    if (similarity >= 90 && gapFrequency < 5) { confidence = 'High'; confidenceColor = '#10B981'; confidenceReason = 'Excellent sequence similarity with minimal gaps'; }
    else if (similarity >= 70 && gapFrequency < 15) { confidence = 'Moderate'; confidenceColor = '#F59E0B'; confidenceReason = 'Good sequence similarity with acceptable gap frequency'; }
    else { confidence = 'Low'; confidenceColor = '#EF4444'; confidenceReason = 'Low similarity or high gap frequency may indicate distant relationship'; }

    const insights = [];
    if (conservedRegions.length > 0) {
      insights.push({ type: 'conserved', title: 'Conserved Regions Detected', description: `${conservedRegions.length} conserved region(s) found, suggesting functionally important sequences that are preserved across variations.`, regions: conservedRegions });
    }
    if (variableRegions.length > 0) {
      const gapRegions = variableRegions.filter(r => r.type === 'gap');
      const subRegions = variableRegions.filter(r => r.type === 'substitution');
      if (gapRegions.length > 0) { insights.push({ type: 'gaps', title: 'Insertion/Deletion Events', description: `${gapRegions.length} gap region(s) detected, possibly indicating insertion/deletion events that may affect protein length or structure.`, regions: gapRegions }); }
      if (subRegions.length > 0) { insights.push({ type: 'substitutions', title: 'Variable Regions', description: `${subRegions.length} substitution region(s) found, representing sequence divergence that may result from mutations or evolutionary changes.`, regions: subRegions }); }
    }
    if (similarity >= 95) { insights.push({ type: 'similarity', title: 'High Sequence Identity', description: 'These sequences are highly similar, suggesting they may be from closely related organisms, same gene family, or recent evolutionary divergence.' }); }
    else if (similarity < 50) { insights.push({ type: 'divergence', title: 'Significant Sequence Divergence', description: 'Low similarity indicates these sequences may be distantly related or from different functional domains. Consider validating alignment parameters.' }); }

    return { confidence, confidenceColor, confidenceReason, conservedRegions, variableRegions, insights, gapFrequency: gapFrequency.toFixed(2) };
  };

  const handlePerformAlignment = async () => {
    if (!sequence1 || !sequence2) { setError('Please enter both sequences'); return; }
    const validation1 = validateSequence(sequence1);
    const validation2 = validateSequence(sequence2);
    if (!validation1.valid) { setError(`Sequence 1: ${validation1.error}`); return; }
    if (!validation2.valid) { setError(`Sequence 2: ${validation2.error}`); return; }
    setLoading(true); setError(''); setAlignment(null); setAiExplanation(''); setBiologicalInterpretation(null);
    const response = await performAlignment(validation1.cleaned, validation2.cleaned, algorithm);
    setLoading(false);
    if (response.success) { setAlignment(response.data); setBiologicalInterpretation(generateBiologicalInterpretation(response.data)); }
    else { setError(response.error); }
  };

  const handleExplainWithAI = async () => {
    if (!alignment) return;
    setLoadingAI(true);
    const response = await getAIExplanation('Sequence Alignment', alignment);
    setLoadingAI(false);
    if (response.success) { setAiExplanation(response.data.explanation); }
    else { setError(response.error); }
  };

  const exportFASTA = () => {
    if (!alignment) return;
    const fastaContent = `>Sequence1_aligned\n${alignment.alignment1}\n>Sequence2_aligned\n${alignment.alignment2}\n`;
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alignment.fasta'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportNormalReport = () => {
    if (!alignment || !biologicalInterpretation) return;
    const reportContent = `SEQUENCE ALIGNMENT REPORT\n${'='.repeat(60)}\n\nAlgorithm: ${alignment.algorithm}\nAlignment Score: ${alignment.score}\nSimilarity: ${alignment.similarity_percentage}%\n\nStatistics:\n- Matches: ${alignment.matches}\n- Mismatches: ${alignment.mismatches}\n- Gaps: ${alignment.gaps}\n- Gap Frequency: ${biologicalInterpretation.gapFrequency}%\n\nConfidence Level: ${biologicalInterpretation.confidence}\n\n${'='.repeat(60)}\nALIGNMENT VISUALIZATION\n${'='.repeat(60)}\n\nSeq1: ${alignment.alignment1}\n      ${alignment.alignment1.split('').map((c, i) => c === alignment.alignment2[i] && c !== '-' ? '|' : ' ').join('')}\nSeq2: ${alignment.alignment2}\n\n${'='.repeat(60)}\nGenerated: ${new Date().toLocaleString()}\n${'='.repeat(60)}\n`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alignment_report_normal.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportDetailedReport = () => {
    if (!alignment || !biologicalInterpretation) return;
    const chunkSize = 60;
    let alignChunks = '';
    for (let i = 0; i < alignment.alignment1.length; i += chunkSize) {
      const s1 = alignment.alignment1.slice(i, i + chunkSize);
      const s2 = alignment.alignment2.slice(i, i + chunkSize);
      const m = s1.split('').map((c, idx) => c === s2[idx] && c !== '-' ? '|' : ' ').join('');
      alignChunks += `Position ${i + 1}-${Math.min(i + chunkSize, alignment.alignment1.length)}:\nSeq1: ${s1}\n      ${m}\nSeq2: ${s2}\n\n`;
    }
    const reportContent = `DETAILED SEQUENCE ALIGNMENT REPORT\n${'='.repeat(80)}\n\nGenerated: ${new Date().toLocaleString()}\nAlgorithm: ${alignment.algorithm}\nScore: ${alignment.score}\nSimilarity: ${alignment.similarity_percentage}%\n\nSTATISTICS\n${'='.repeat(80)}\nMatches: ${alignment.matches}\nMismatches: ${alignment.mismatches}\nGaps: ${alignment.gaps}\nGap Frequency: ${biologicalInterpretation.gapFrequency}%\nConfidence: ${biologicalInterpretation.confidence}\nAssessment: ${biologicalInterpretation.confidenceReason}\n\nALIGNMENT\n${'='.repeat(80)}\n\n${alignChunks}\n${aiExplanation ? `AI ANALYSIS\n${'='.repeat(80)}\n${aiExplanation}\n\n` : ''}END OF REPORT\n${'='.repeat(80)}\n`;
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alignment_report_detailed.txt'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const renderAlignment = () => {
    if (!alignment || !biologicalInterpretation) return null;
    const align1 = alignment.alignment1;
    const align2 = alignment.alignment2;
    const chunkSize = 60;
    const chunks = [];
    for (let i = 0; i < align1.length; i += chunkSize) {
      chunks.push({ seq1: align1.slice(i, i + chunkSize), seq2: align2.slice(i, i + chunkSize), start: i });
    }

    return (
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '.82rem',
        background: '#0b0e18',
        padding: '1.1rem',
        borderRadius: '10px',
        overflowX: 'auto',
        border: '1px solid #1a1d2a'
      }}>
        {chunks.map((chunk, idx) => {
          const hasConserved = biologicalInterpretation.conservedRegions.some(r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start);
          const hasVariable = biologicalInterpretation.variableRegions.some(r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start);
          return (
            <div key={idx} style={{ marginBottom: '1.3rem' }}>
              <div style={{ color: '#6b7080', fontSize: '.76rem', marginBottom: '.55rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: '#8a8f9e', fontWeight: 600 }}>Position {chunk.start + 1} - {Math.min(chunk.start + chunkSize, align1.length)}</span>
                {hasConserved && <span style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.35)', color: '#6EE7B7', padding: '2px 8px', borderRadius: 5, fontSize: '.7rem', fontWeight: 700 }}>Conserved</span>}
                {hasVariable && <span style={{ background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', color: '#FCD34D', padding: '2px 8px', borderRadius: 5, fontSize: '.7rem', fontWeight: 700 }}>Variable</span>}
              </div>
              <div style={{ marginBottom: '2px', wordBreak: 'break-all', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#60A5FA', fontWeight: 700, marginRight: '6px', fontSize: '.74rem' }}>Seq1:</span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? 'rgba(239,68,68,.2)' : char === chunk.seq2[i] ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                    padding: '1px 3px',
                    color: char === '-' ? '#fca5a5' : char === chunk.seq2[i] ? '#6EE7B7' : '#FCD34D',
                    fontWeight: 500,
                    borderRadius: '2px',
                    marginRight: '1px'
                  }}>{char}</span>
                ))}
              </div>
              <div style={{ marginBottom: '2px', wordBreak: 'break-all', paddingLeft: '44px', whiteSpace: 'nowrap' }}>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    color: char === chunk.seq2[i] && char !== '-' ? '#10B981' : 'transparent',
                    fontWeight: 700,
                    marginRight: '5px'
                  }}>
                    {char === chunk.seq2[i] && char !== '-' ? '|' : '.'}
                  </span>
                ))}
              </div>
              <div style={{ wordBreak: 'break-all', whiteSpace: 'nowrap' }}>
                <span style={{ color: '#A78BFA', fontWeight: 700, marginRight: '6px', fontSize: '.74rem' }}>Seq2:</span>
                {chunk.seq2.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? 'rgba(239,68,68,.2)' : char === chunk.seq1[i] ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                    padding: '1px 3px',
                    color: char === '-' ? '#fca5a5' : char === chunk.seq1[i] ? '#6EE7B7' : '#FCD34D',
                    fontWeight: 500,
                    borderRadius: '2px',
                    marginRight: '1px'
                  }}>{char}</span>
                ))}
              </div>
            </div>
          );
        })}

        {/* Legend */}
        <div style={{ marginTop: '1rem', padding: '.75rem', background: '#0f1117', borderRadius: '8px', border: '1px solid #1e2130', display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '.76rem' }}>
          <span style={{ color: '#8a8f9e', fontWeight: 600 }}>Legend:</span>
          {[
            { bg: 'rgba(16,185,129,.15)', col: '#6EE7B7', label: 'Match' },
            { bg: 'rgba(245,158,11,.15)', col: '#FCD34D', label: 'Mismatch' },
            { bg: 'rgba(239,68,68,.2)', col: '#fca5a5', label: 'Gap' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
              <div style={{ width: 14, height: 14, background: l.bg, borderRadius: 3, border: `1px solid ${l.col}44` }}></div>
              <span style={{ color: l.col }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '1.25rem 1.2rem 3rem',
      fontFamily: '"Sora", sans-serif',
      color: '#e2e4e9',
      overflowX: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .sa-card {
          background: #141720;
          border: 1px solid #24272f;
          border-radius: 12px;
          padding: 1.35rem;
          margin-bottom: 1.1rem;
          transition: all .3s ease;
        }
        .sa-card:hover {
          border-color: rgba(99,102,241,.25);
          box-shadow: 0 4px 20px rgba(0,0,0,.2);
        }
        .sa-hdr {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin-bottom: 1rem;
        }
        .sa-icon {
          width: 28px; height: 28px;
          border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          font-size: .7rem; font-weight: 800; color: #fff; flex-shrink: 0; letter-spacing: .03em;
        }
        .sa-title { font-size: 1.05rem; font-weight: 700; color: #c8cad4; }
        .sa-btn {
          display: flex; align-items: center; justify-content: center; gap: .5rem;
          width: 100%; padding: .9rem 1.2rem; border: none; border-radius: 10px;
          color: #fff; font-family: 'Sora', sans-serif; font-weight: 600; font-size: 1rem;
          cursor: pointer; transition: all .3s ease;
        }
        .sa-btn:hover { filter: brightness(1.12); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,.3); }
        .sa-btn:disabled { filter: brightness(.55); cursor: not-allowed; transform: none; box-shadow: none; }
        .sa-stat {
          background: #0f1117; border: 1px solid #1e2130; border-radius: 10px;
          padding: .85rem .7rem; text-align: center; transition: all .3s ease;
        }
        .sa-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(6,182,212,.1); border-color: rgba(6,182,212,.25); }
        .sa-mono {
          background: #0b0e18; border: 1px solid #1a1d2a; padding: .85rem;
          border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: .78rem;
          color: #8a8f9e; word-break: break-all; white-space: pre-wrap; overflow-wrap: break-word;
          max-height: 220px; overflow-y: auto; line-height: 1.65;
        }
        @keyframes saFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .sa-anim { animation: saFadeIn .4s ease-out; }
        @keyframes saSpin { to { transform: rotate(360deg); } }
        .sa-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: saSpin .5s linear infinite; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #131518; }
        ::-webkit-scrollbar-thumb { background: #2a2d3a; border-radius: 3px; }
        .sa-sample-menu {
          position: absolute; top: calc(100% + .35rem); left: 0;
          background: #141720; border: 1px solid #24272f; border-radius: 10px;
          box-shadow: 0 12px 32px rgba(0,0,0,.45); padding: .5rem; z-index: 100;
          min-width: 300px; max-width: calc(100vw - 2rem);
        }
        .sa-sample-item {
          padding: .7rem .85rem; cursor: pointer; border-radius: 7px; transition: all .2s ease;
          border: 1px solid transparent; margin-bottom: 2px;
        }
        .sa-sample-item:hover { background: rgba(6,182,212,.06); border-color: rgba(6,182,212,.2); }
        @media(max-width:640px) {
          .sa-card { padding: .95rem; }
          .sa-btn { font-size: .9rem; padding: .75rem; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom: '1px solid #1e2130', padding: '1.65rem 1.3rem 1.3rem', margin: '-1.25rem -1.2rem 0', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 5vw, 1.7rem)', fontWeight: 800, color: '#e2e4e9', letterSpacing: '-0.02em' }}>
            Sequence Alignment
          </h1>
          <span style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: '#fff', padding: '.28rem .7rem', borderRadius: 7, fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Research Grade</span>
        </div>
        <p style={{ margin: 0, color: '#6b7080', fontSize: '.9rem', lineHeight: 1.6 }}>
          Compare DNA sequences using Needleman-Wunsch (global) or Smith-Waterman (local) alignment algorithms
        </p>
      </div>

      {/* About Section */}
      <div className="sa-card sa-anim" style={{ borderColor: 'rgba(16,185,129,.2)', background: 'rgba(16,185,129,.03)' }}>
        <div className="sa-hdr">
          <div className="sa-icon" style={{ background: '#10B981' }}>ALN</div>
          <span className="sa-title" style={{ color: '#6EE7B7' }}>About Sequence Alignment</span>
        </div>
        <p style={{ color: '#8a8f9e', fontSize: '.88rem', lineHeight: 1.75, margin: '0 0 1rem' }}>
          Sequence alignment is a fundamental technique in bioinformatics used to identify regions of similarity between DNA, RNA, or protein sequences. It reveals functional, structural, and evolutionary relationships by optimally arranging sequences to highlight conserved regions, substitutions, and insertion/deletion events.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '.55rem' }}>
          {[
            { label: 'Similarity Detection', desc: 'Quantify sequence conservation' },
            { label: 'Gap Analysis', desc: 'Identify insertions and deletions' },
            { label: 'Conserved Regions', desc: 'Find functional domains' },
            { label: 'Evolutionary Insight', desc: 'Assess divergence patterns' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', padding: '.65rem .75rem', background: '#0f1117', borderRadius: 8, border: '1px solid #1e2130', transition: 'all .2s ease' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', marginTop: '.35rem', flexShrink: 0, boxShadow: '0 0 6px #10B98188' }}></div>
              <div>
                <div style={{ color: '#6EE7B7', fontSize: '.82rem', fontWeight: 700 }}>{item.label}</div>
                <div style={{ color: '#4a4d5a', fontSize: '.73rem', marginTop: '.1rem' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load Sample */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.1rem', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button className="sa-btn" onClick={(e) => { e.stopPropagation(); setShowSampleMenu(!showSampleMenu); }}
            style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)', width: 'auto', padding: '.7rem 1.4rem', fontSize: '.9rem' }}>
            <span>Load Sample</span>
            <span style={{ fontSize: '.7rem', opacity: .7 }}>{showSampleMenu ? '\u25B2' : '\u25BC'}</span>
          </button>

          {showSampleMenu && (
            <div className="sa-sample-menu sa-anim" onClick={(e) => e.stopPropagation()}>
              {Object.entries(ALIGNMENT_SAMPLES).map(([key, sample]) => (
                <div key={key} className="sa-sample-item" onClick={() => loadSample(key)}>
                  <div style={{ fontWeight: 700, marginBottom: '.15rem', color: '#c8cad4', fontSize: '.88rem' }}>{sample.name}</div>
                  <div style={{ fontSize: '.75rem', color: '#6b7080' }}>{sample.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sample Info */}
      {currentSample && (
        <div className="sa-card sa-anim" style={{ borderColor: 'rgba(59,130,246,.25)' }}>
          <div className="sa-hdr">
            <div className="sa-icon" style={{ background: '#3B82F6' }}>SMP</div>
            <span className="sa-title">Sample: {currentSample.name}</span>
          </div>
          <p style={{ color: '#8a8f9e', fontSize: '.85rem', lineHeight: 1.7, margin: '0 0 .85rem' }}>{currentSample.explanation}</p>
          <div style={{ background: '#0f1117', borderRadius: 8, padding: '.85rem', border: '1px solid #1e2130', marginBottom: '.75rem' }}>
            <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#60A5FA', marginBottom: '.3rem' }}>Biological Context</div>
            <p style={{ color: '#8a8f9e', margin: 0, fontSize: '.82rem', lineHeight: 1.7 }}>{currentSample.biologicalContext}</p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '.82rem' }}>
            <div>
              <span style={{ color: '#6b7080' }}>Expected: </span>
              <span style={{ color: '#6EE7B7', fontWeight: 600 }}>{currentSample.expectedResult}</span>
            </div>
            <div>
              <span style={{ color: '#6b7080' }}>Algorithm: </span>
              <span style={{ color: '#c8cad4', fontWeight: 600 }}>{currentSample.algorithm === 'global' ? 'Global (Needleman-Wunsch)' : 'Local (Smith-Waterman)'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="sa-card sa-anim">
        <div className="sa-hdr">
          <div className="sa-icon" style={{ background: '#8B5CF6' }}>IN</div>
          <span className="sa-title">Input Sequences</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '.4rem', fontWeight: 600, color: '#8a8f9e', fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>First Sequence</label>
          <textarea
            value={sequence1}
            onChange={(e) => setSequence1(e.target.value.toUpperCase())}
            placeholder="Enter first DNA sequence (e.g., ATGCGATCG...)"
            style={{ width: '100%', minHeight: '90px', padding: '.75rem', border: '1px solid #24272f', borderRadius: 8, fontSize: '.88rem', fontFamily: '"JetBrains Mono", monospace', resize: 'vertical', boxSizing: 'border-box', background: '#0f1117', color: '#e2e4e9', outline: 'none', transition: 'border-color .3s' }}
            onFocus={(e) => e.target.style.borderColor = '#06B6D4'}
            onBlur={(e) => e.target.style.borderColor = '#24272f'}
          />
          <div style={{ fontSize: '.78rem', color: '#4a4d5a', marginTop: '.3rem', fontFamily: '"JetBrains Mono", monospace' }}>Length: {sequence1.replace(/\s/g, '').length} bp</div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '.4rem', fontWeight: 600, color: '#8a8f9e', fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Second Sequence</label>
          <textarea
            value={sequence2}
            onChange={(e) => setSequence2(e.target.value.toUpperCase())}
            placeholder="Enter second DNA sequence (e.g., ATGCAATCG...)"
            style={{ width: '100%', minHeight: '90px', padding: '.75rem', border: '1px solid #24272f', borderRadius: 8, fontSize: '.88rem', fontFamily: '"JetBrains Mono", monospace', resize: 'vertical', boxSizing: 'border-box', background: '#0f1117', color: '#e2e4e9', outline: 'none', transition: 'border-color .3s' }}
            onFocus={(e) => e.target.style.borderColor = '#06B6D4'}
            onBlur={(e) => e.target.style.borderColor = '#24272f'}
          />
          <div style={{ fontSize: '.78rem', color: '#4a4d5a', marginTop: '.3rem', fontFamily: '"JetBrains Mono", monospace' }}>Length: {sequence2.replace(/\s/g, '').length} bp</div>
        </div>

        <div style={{ marginBottom: '1.2rem' }}>
          <label style={{ display: 'block', marginBottom: '.45rem', fontWeight: 600, color: '#8a8f9e', fontSize: '.85rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>Alignment Algorithm</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.55rem' }}>
            {[
              { val: 'global', name: 'Global Alignment', sub: 'Needleman-Wunsch', col: '#06B6D4' },
              { val: 'local', name: 'Local Alignment', sub: 'Smith-Waterman', col: '#8B5CF6' },
            ].map(opt => (
              <label key={opt.val} style={{
                display: 'flex', alignItems: 'center', padding: '.85rem',
                border: `1px solid ${algorithm === opt.val ? opt.col + '88' : '#24272f'}`,
                borderRadius: 8, cursor: 'pointer',
                background: algorithm === opt.val ? opt.col + '12' : '#0f1117',
                transition: 'all .25s ease'
              }}>
                <input type="radio" value={opt.val} checked={algorithm === opt.val} onChange={(e) => setAlgorithm(e.target.value)} style={{ marginRight: '.55rem', accentColor: opt.col }} />
                <div>
                  <div style={{ fontWeight: 700, color: algorithm === opt.val ? opt.col : '#c8cad4', fontSize: '.88rem' }}>{opt.name}</div>
                  <div style={{ fontSize: '.73rem', color: algorithm === opt.val ? opt.col + 'aa' : '#4a4d5a', marginTop: '.1rem' }}>{opt.sub}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button className="sa-btn" onClick={handlePerformAlignment} disabled={loading}
          style={{ background: loading ? '#3a3d4a' : 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
          {loading && <span className="sa-spinner"></span>}
          {loading ? 'Aligning sequences...' : 'Align Sequences'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="sa-card sa-anim" style={{ borderColor: 'rgba(239,68,68,.4)', background: 'rgba(239,68,68,.06)' }}>
          <strong style={{ display: 'block', marginBottom: '.2rem', color: '#fca5a5', fontSize: '.88rem' }}>Error</strong>
          <span style={{ color: '#f87171', fontSize: '.85rem' }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {alignment && biologicalInterpretation && (
        <div className="sa-anim">
          {/* Results Header */}
          <div className="sa-card" style={{ borderColor: 'rgba(6,182,212,.3)', background: 'rgba(6,182,212,.04)' }}>
            <div className="sa-hdr">
              <div className="sa-icon" style={{ background: '#06B6D4' }}>RES</div>
              <span className="sa-title" style={{ color: '#67E8F9' }}>Alignment Results</span>
              <span style={{
                marginLeft: 'auto', background: biologicalInterpretation.confidenceColor + '20',
                border: `1px solid ${biologicalInterpretation.confidenceColor}55`,
                color: biologicalInterpretation.confidenceColor,
                fontSize: '.75rem', fontWeight: 700, padding: '.2rem .6rem', borderRadius: 6,
                textTransform: 'uppercase', letterSpacing: '.04em'
              }}>{biologicalInterpretation.confidence} Confidence</span>
            </div>

            <div style={{ fontSize: '.82rem', color: '#8a8f9e', marginBottom: '1rem', padding: '.6rem .8rem', background: '#0f1117', borderRadius: 7, border: '1px solid #1e2130' }}>
              <span style={{ color: biologicalInterpretation.confidenceColor, fontWeight: 600 }}>Assessment:</span> {biologicalInterpretation.confidenceReason}
            </div>

            {/* Algorithm + Score */}
            <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', color: '#6EE7B7', fontSize: '.78rem', fontWeight: 700, padding: '.3rem .7rem', borderRadius: 7 }}>{alignment.algorithm}</span>
              <span style={{ background: '#0f1117', border: '1px solid #1e2130', color: '#c8cad4', fontSize: '.78rem', fontWeight: 600, padding: '.3rem .7rem', borderRadius: 7, fontFamily: '"JetBrains Mono", monospace' }}>Score: {alignment.score}</span>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.55rem', marginBottom: '1rem' }}>
              {[
                { label: 'Matches', value: alignment.matches, color: '#10B981' },
                { label: 'Mismatches', value: alignment.mismatches, color: '#F59E0B' },
                { label: 'Gaps', value: `${alignment.gaps}`, sub: `${biologicalInterpretation.gapFrequency}%`, color: '#EF4444' },
                { label: 'Similarity', value: `${alignment.similarity_percentage}%`, color: '#06B6D4' },
              ].map((s, i) => (
                <div key={i} className="sa-stat">
                  <div style={{ fontSize: '.72rem', color: '#6b7080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.25rem' }}>{s.label}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: s.color, fontFamily: '"JetBrains Mono", monospace' }}>{s.value}</div>
                  {s.sub && <div style={{ fontSize: '.72rem', color: '#4a4d5a', marginTop: '.1rem' }}>{s.sub}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Biological Interpretation */}
          {biologicalInterpretation.insights.length > 0 && (
            <div className="sa-card">
              <div className="sa-hdr">
                <div className="sa-icon" style={{ background: '#F59E0B' }}>BIO</div>
                <span className="sa-title">Biological Interpretation</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
                {biologicalInterpretation.insights.map((insight, idx) => (
                  <div key={idx} style={{ background: '#0f1117', borderRadius: 8, padding: '.85rem', border: '1px solid #1e2130', borderLeft: `3px solid ${insight.type === 'conserved' ? '#10B981' : insight.type === 'gaps' ? '#EF4444' : insight.type === 'similarity' ? '#06B6D4' : '#F59E0B'}` }}>
                    <div style={{ fontSize: '.88rem', fontWeight: 700, color: '#c8cad4', marginBottom: '.3rem' }}>{insight.title}</div>
                    <div style={{ fontSize: '.82rem', color: '#8a8f9e', lineHeight: 1.65 }}>{insight.description}</div>
                    {insight.regions && insight.regions.length > 0 && (
                      <div style={{ marginTop: '.5rem', fontSize: '.73rem', color: '#6b7080', fontFamily: '"JetBrains Mono", monospace', background: '#0b0e18', padding: '.5rem .65rem', borderRadius: 5, border: '1px solid #1a1d2a' }}>
                        <span style={{ fontWeight: 600 }}>Locations: </span>
                        {insight.regions.slice(0, 5).map(r => `${r.start + 1}-${r.start + r.length}`).join(', ')}
                        {insight.regions.length > 5 && ` +${insight.regions.length - 5} more`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="sa-card">
            <div className="sa-hdr">
              <div className="sa-icon" style={{ background: '#8B5CF6' }}>EXP</div>
              <span className="sa-title">Export Options</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
              <button className="sa-btn" onClick={exportFASTA} style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', padding: '.65rem', fontSize: '.85rem' }}>FASTA</button>
              <button className="sa-btn" onClick={exportNormalReport} style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '.65rem', fontSize: '.85rem' }}>Normal Report</button>
              <button className="sa-btn" onClick={exportDetailedReport} style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', padding: '.65rem', fontSize: '.85rem' }}>Detailed Report</button>
            </div>
          </div>

          {/* AI Button */}
          <div className="sa-card">
            <button className="sa-btn" onClick={handleExplainWithAI} disabled={loadingAI}
              style={{ background: loadingAI ? '#3a3d4a' : 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
              {loadingAI && <span className="sa-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : 'Get AI Explanation'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div className="sa-card sa-anim" style={{ borderColor: 'rgba(139,92,246,.35)', background: 'rgba(139,92,246,.05)' }}>
              <div className="sa-hdr">
                <div className="sa-icon" style={{ background: '#8B5CF6' }}>AI</div>
                <span className="sa-title" style={{ color: '#A78BFA' }}>AI Analysis</span>
              </div>
              <div style={{ background: '#0b0e18', border: '1px solid #1a1d2a', padding: '.9rem', borderRadius: 8, lineHeight: 1.75, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '.82rem', fontFamily: '"JetBrains Mono", monospace', maxHeight: '380px', overflowY: 'auto', color: '#8a8f9e' }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Alignment Visualization */}
          <div className="sa-card">
            <div className="sa-hdr">
              <div className="sa-icon" style={{ background: '#06B6D4' }}>VIS</div>
              <span className="sa-title">Alignment Visualization</span>
            </div>
            {renderAlignment()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceAlignment;