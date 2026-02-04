import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';

// Sample sequence pairs for alignment demonstration
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
    explanation: 'Two sequences differing by a single nucleotide substitution (A→T at position 14). This demonstrates how alignment algorithms detect and score point mutations.',
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
  
  // Sample loading
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [currentSample, setCurrentSample] = useState(null);

  // Load sample function
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

  // Calculate biological interpretation
  const generateBiologicalInterpretation = (alignmentData) => {
    const align1 = alignmentData.alignment1;
    const align2 = alignmentData.alignment2;
    
    // Find conserved regions (continuous matches >= 10 bp)
    const conservedRegions = [];
    let currentConserved = { start: null, length: 0 };
    
    for (let i = 0; i < align1.length; i++) {
      if (align1[i] === align2[i] && align1[i] !== '-') {
        if (currentConserved.start === null) {
          currentConserved.start = i;
          currentConserved.length = 1;
        } else {
          currentConserved.length++;
        }
      } else {
        if (currentConserved.length >= 10) {
          conservedRegions.push({ ...currentConserved });
        }
        currentConserved = { start: null, length: 0 };
      }
    }
    if (currentConserved.length >= 10) {
      conservedRegions.push({ ...currentConserved });
    }

    // Find variable regions (continuous mismatches/gaps >= 5 bp)
    const variableRegions = [];
    let currentVariable = { start: null, length: 0, type: '' };
    
    for (let i = 0; i < align1.length; i++) {
      if (align1[i] !== align2[i]) {
        if (currentVariable.start === null) {
          currentVariable.start = i;
          currentVariable.length = 1;
          currentVariable.type = (align1[i] === '-' || align2[i] === '-') ? 'gap' : 'substitution';
        } else {
          currentVariable.length++;
        }
      } else {
        if (currentVariable.length >= 5) {
          variableRegions.push({ ...currentVariable });
        }
        currentVariable = { start: null, length: 0, type: '' };
      }
    }
    if (currentVariable.length >= 5) {
      variableRegions.push({ ...currentVariable });
    }

    // Calculate confidence level
    const similarity = parseFloat(alignmentData.similarity_percentage);
    const gapFrequency = (alignmentData.gaps / align1.length) * 100;
    
    let confidence;
    let confidenceColor;
    let confidenceReason;
    
    if (similarity >= 90 && gapFrequency < 5) {
      confidence = 'High';
      confidenceColor = '#10B981';
      confidenceReason = 'Excellent sequence similarity with minimal gaps';
    } else if (similarity >= 70 && gapFrequency < 15) {
      confidence = 'Moderate';
      confidenceColor = '#F59E0B';
      confidenceReason = 'Good sequence similarity with acceptable gap frequency';
    } else {
      confidence = 'Low';
      confidenceColor = '#EF4444';
      confidenceReason = 'Low similarity or high gap frequency may indicate distant relationship';
    }

    // Generate biological insights
    const insights = [];
    
    if (conservedRegions.length > 0) {
      insights.push({
        type: 'conserved',
        title: 'Conserved Regions Detected',
        description: `${conservedRegions.length} conserved region(s) found, suggesting functionally important sequences that are preserved across variations.`,
        regions: conservedRegions
      });
    }

    if (variableRegions.length > 0) {
      const gapRegions = variableRegions.filter(r => r.type === 'gap');
      const subRegions = variableRegions.filter(r => r.type === 'substitution');
      
      if (gapRegions.length > 0) {
        insights.push({
          type: 'gaps',
          title: 'Insertion/Deletion Events',
          description: `${gapRegions.length} gap region(s) detected, possibly indicating insertion/deletion events that may affect protein length or structure.`,
          regions: gapRegions
        });
      }
      
      if (subRegions.length > 0) {
        insights.push({
          type: 'substitutions',
          title: 'Variable Regions',
          description: `${subRegions.length} substitution region(s) found, representing sequence divergence that may result from mutations or evolutionary changes.`,
          regions: subRegions
        });
      }
    }

    if (similarity >= 95) {
      insights.push({
        type: 'similarity',
        title: 'High Sequence Identity',
        description: 'These sequences are highly similar, suggesting they may be from closely related organisms, same gene family, or recent evolutionary divergence.'
      });
    } else if (similarity < 50) {
      insights.push({
        type: 'divergence',
        title: 'Significant Sequence Divergence',
        description: 'Low similarity indicates these sequences may be distantly related or from different functional domains. Consider validating alignment parameters.'
      });
    }

    return {
      confidence,
      confidenceColor,
      confidenceReason,
      conservedRegions,
      variableRegions,
      insights,
      gapFrequency: gapFrequency.toFixed(2)
    };
  };

  const handlePerformAlignment = async () => {
    if (!sequence1 || !sequence2) {
      setError('Please enter both sequences');
      return;
    }

    const validation1 = validateSequence(sequence1);
    const validation2 = validateSequence(sequence2);

    if (!validation1.valid) {
      setError(`Sequence 1: ${validation1.error}`);
      return;
    }

    if (!validation2.valid) {
      setError(`Sequence 2: ${validation2.error}`);
      return;
    }

    setLoading(true);
    setError('');
    setAlignment(null);
    setAiExplanation('');
    setBiologicalInterpretation(null);

    const response = await performAlignment(validation1.cleaned, validation2.cleaned, algorithm);

    setLoading(false);

    if (response.success) {
      setAlignment(response.data);
      const interpretation = generateBiologicalInterpretation(response.data);
      setBiologicalInterpretation(interpretation);
    } else {
      setError(response.error);
    }
  };

  const handleExplainWithAI = async () => {
    if (!alignment) return;
    
    setLoadingAI(true);
    
    const response = await getAIExplanation('Sequence Alignment', alignment);
    
    setLoadingAI(false);
    
    if (response.success) {
      setAiExplanation(response.data.explanation);
    } else {
      setError(response.error);
    }
  };

  // Export to FASTA format
  const exportFASTA = () => {
    if (!alignment) return;

    const fastaContent = `>Sequence1_aligned
${alignment.alignment1}
>Sequence2_aligned
${alignment.alignment2}
`;

    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignment.fasta';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export normal report
  const exportNormalReport = () => {
    if (!alignment || !biologicalInterpretation) return;

    const reportContent = `SEQUENCE ALIGNMENT REPORT
${'='.repeat(60)}

Algorithm: ${alignment.algorithm}
Alignment Score: ${alignment.score}
Similarity: ${alignment.similarity_percentage}%

Statistics:
- Matches: ${alignment.matches}
- Mismatches: ${alignment.mismatches}
- Gaps: ${alignment.gaps}
- Gap Frequency: ${biologicalInterpretation.gapFrequency}%

Confidence Level: ${biologicalInterpretation.confidence}

${'='.repeat(60)}
ALIGNMENT VISUALIZATION
${'='.repeat(60)}

Seq1: ${alignment.alignment1}
      ${alignment.alignment1.split('').map((c, i) => c === alignment.alignment2[i] && c !== '-' ? '|' : ' ').join('')}
Seq2: ${alignment.alignment2}

${'='.repeat(60)}
Generated: ${new Date().toLocaleString()}
${'='.repeat(60)}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignment_report_normal.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export detailed report
  const exportDetailedReport = () => {
    if (!alignment || !biologicalInterpretation) return;

    const reportContent = `DETAILED SEQUENCE ALIGNMENT REPORT
${'='.repeat(80)}

ANALYSIS INFORMATION
${'='.repeat(80)}
Generated: ${new Date().toLocaleString()}
Algorithm: ${alignment.algorithm}
Alignment Score: ${alignment.score}
Similarity Percentage: ${alignment.similarity_percentage}%

ALIGNMENT STATISTICS
${'='.repeat(80)}
Total Positions: ${alignment.alignment1.length}
Matches: ${alignment.matches}
Mismatches: ${alignment.mismatches}
Gaps: ${alignment.gaps}
Gap Frequency: ${biologicalInterpretation.gapFrequency}%

QUALITY ASSESSMENT
${'='.repeat(80)}
Confidence Level: ${biologicalInterpretation.confidence}
Assessment: ${biologicalInterpretation.confidenceReason}

${'='.repeat(80)}
BIOLOGICAL INTERPRETATION
${'='.repeat(80)}

${biologicalInterpretation.insights.map(insight => `
${insight.title}
${'-'.repeat(80)}
${insight.description}
${insight.regions ? `
Detected Regions:
${insight.regions.map(r => `  - Position ${r.start + 1} to ${r.start + r.length} (${r.length} bp)${r.type ? ` [${r.type}]` : ''}`).join('\n')}
` : ''}
`).join('\n')}

${'='.repeat(80)}
ALIGNMENT VISUALIZATION
${'='.repeat(80)}

${(() => {
  const chunkSize = 60;
  const chunks = [];
  for (let i = 0; i < alignment.alignment1.length; i += chunkSize) {
    const seq1Chunk = alignment.alignment1.slice(i, i + chunkSize);
    const seq2Chunk = alignment.alignment2.slice(i, i + chunkSize);
    const match = seq1Chunk.split('').map((c, idx) => c === seq2Chunk[idx] && c !== '-' ? '|' : ' ').join('');
    chunks.push(`Position ${i + 1}-${Math.min(i + chunkSize, alignment.alignment1.length)}:
Seq1: ${seq1Chunk}
      ${match}
Seq2: ${seq2Chunk}
`);
  }
  return chunks.join('\n');
})()}

${'='.repeat(80)}
${aiExplanation ? `
AI ANALYSIS
${'='.repeat(80)}
${aiExplanation}

${'='.repeat(80)}
` : ''}
END OF REPORT
${'='.repeat(80)}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alignment_report_detailed.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderAlignment = () => {
    if (!alignment || !biologicalInterpretation) return null;

    const align1 = alignment.alignment1;
    const align2 = alignment.alignment2;
    const chunkSize = 60;
    const chunks = [];

    for (let i = 0; i < align1.length; i += chunkSize) {
      chunks.push({
        seq1: align1.slice(i, i + chunkSize),
        seq2: align2.slice(i, i + chunkSize),
        start: i
      });
    }

    return (
      <div style={{ 
        fontFamily: 'JetBrains Mono, Consolas, monospace', 
        fontSize: '14px',
        background: '#0A0E1A',
        padding: '24px',
        borderRadius: '8px',
        overflowX: 'auto',
        border: '1px solid #1E293B'
      }}>
        {chunks.map((chunk, idx) => {
          const hasConserved = biologicalInterpretation.conservedRegions.some(
            r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start
          );
          const hasVariable = biologicalInterpretation.variableRegions.some(
            r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start
          );

          return (
            <div key={idx} style={{ marginBottom: '24px' }}>
              <div style={{ 
                color: '#94A3B8', 
                fontSize: '13px', 
                marginBottom: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}>
                <span style={{ color: '#CBD5E1' }}>Position {chunk.start + 1} - {Math.min(chunk.start + chunkSize, align1.length)}</span>
                {hasConserved && (
                  <span style={{
                    background: '#166534',
                    color: '#86EFAC',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Conserved
                  </span>
                )}
                {hasVariable && (
                  <span style={{
                    background: '#713F12',
                    color: '#FDE047',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Variable
                  </span>
                )}
              </div>
              
              <div style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                <span style={{ color: '#60A5FA', fontWeight: '600', marginRight: '8px' }}>Seq1:</span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? '#7F1D1D' : 
                               char === chunk.seq2[i] ? '#166534' : 
                               '#713F12',
                    padding: '2px 4px',
                    color: char === '-' ? '#FCA5A5' :
                           char === chunk.seq2[i] ? '#86EFAC' : '#FDE047',
                    fontWeight: '500',
                    borderRadius: '2px',
                    marginRight: '1px'
                  }}>
                    {char}
                  </span>
                ))}
              </div>

              <div style={{ marginBottom: '4px', wordBreak: 'break-all', paddingLeft: '54px' }}>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    color: char === chunk.seq2[i] && char !== '-' ? '#22C55E' : 'transparent',
                    fontWeight: '700',
                    marginRight: '5px'
                  }}>
                    {char === chunk.seq2[i] && char !== '-' ? '|' : '.'}
                  </span>
                ))}
              </div>

              <div style={{ wordBreak: 'break-all' }}>
                <span style={{ color: '#A78BFA', fontWeight: '600', marginRight: '8px' }}>Seq2:</span>
                {chunk.seq2.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? '#7F1D1D' : 
                               char === chunk.seq1[i] ? '#166534' : 
                               '#713F12',
                    padding: '2px 4px',
                    color: char === '-' ? '#FCA5A5' :
                           char === chunk.seq1[i] ? '#86EFAC' : '#FDE047',
                    fontWeight: '500',
                    borderRadius: '2px',
                    marginRight: '1px'
                  }}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ 
          marginTop: '24px', 
          padding: '16px',
          background: '#0F172A',
          borderRadius: '8px',
          fontSize: '13px',
          border: '1px solid #1E293B'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '12px', color: '#E2E8F0' }}>
            Color Legend:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#166534',
                borderRadius: '4px'
              }}></div>
              <span style={{ color: '#CBD5E1' }}>Match</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#713F12',
                borderRadius: '4px'
              }}></div>
              <span style={{ color: '#CBD5E1' }}>Mismatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#7F1D1D',
                borderRadius: '4px'
              }}></div>
              <span style={{ color: '#CBD5E1' }}>Gap</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '1400px', 
      margin: '0 auto', 
      padding: '32px 24px', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0A0E1A',
      minHeight: '100vh'
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .animate-fade-in {
          animation: fadeInUp 0.6s ease-out;
        }

        .animate-slide-in {
          animation: slideIn 0.5s ease-out;
        }

        .workflow-step {
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .workflow-step:nth-child(1) { animation-delay: 0.1s; }
        .workflow-step:nth-child(2) { animation-delay: 0.2s; }
        .workflow-step:nth-child(3) { animation-delay: 0.3s; }
        .workflow-step:nth-child(4) { animation-delay: 0.4s; }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .sample-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: #1E293B;
          border: 1px solid #334155;
          borderRadius: 8px;
          boxShadow: 0 10px 40px rgba(0,0,0,0.5);
          padding: 8px;
          zIndex: 100;
          minWidth: 280px;
          marginTop: 8px;
          animation: fadeInUp 0.3s ease-out;
        }

        .sample-menu-item {
          padding: 12px 16px;
          cursor: pointer;
          borderRadius: 6px;
          transition: all 0.2s ease;
          fontSize: 14px;
          color: #E2E8F0;
          marginBottom: 4px;
        }

        .sample-menu-item:hover {
          background: #334155;
          transform: translateX(4px);
        }

        .sample-menu-item:last-child {
          marginBottom: 0;
        }

        .step-number {
          transition: all 0.3s ease;
        }

        .workflow-step:hover .step-number {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }

        .highlight-text {
          background: linear-gradient(120deg, #10B981 0%, #059669 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 700;
        }

        /* Custom scrollbar styling */
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        *::-webkit-scrollbar-track {
          background: #0F172A;
          borderRadius: 4px;
        }

        *::-webkit-scrollbar-thumb {
          background: #475569;
          borderRadius: 4px;
        }

        *::-webkit-scrollbar-thumb:hover {
          background: #64748B;
        }

        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: #475569 #0F172A;
        }

        @media (max-width: 768px) {
          .workflow-step {
            animation-delay: 0s !important;
          }
        }
      `}</style>
      
      {/* Header */}
      <div style={{
        marginBottom: '40px'
      }} className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: 'clamp(28px, 6vw, 42px)', 
            fontWeight: '800', 
            color: '#F8FAFC',
            letterSpacing: '-0.02em'
          }}>
            Sequence Alignment
          </h1>
          <span className="badge" style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>RESEARCH GRADE</span>
        </div>
        <p style={{ margin: 0, color: '#94A3B8', fontSize: 'clamp(14px, 3vw, 17px)', fontWeight: '400', lineHeight: '1.6' }}>
          Compare DNA sequences using global or local alignment algorithms
        </p>
      </div>

      {/* Why This Tool Matters Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }} className="animate-fade-in">
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}></div>

        <h2 style={{
          color: '#10B981',
          fontSize: 'clamp(18px, 4vw, 22px)',
          fontWeight: '700',
          marginBottom: '24px',
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            width: '4px',
            height: '24px',
            background: 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
            borderRadius: '2px'
          }}></span>
          Why This Tool Matters
        </h2>

        <p style={{
          color: '#CBD5E1',
          fontSize: 'clamp(14px, 2.8vw, 16px)',
          lineHeight: '1.8',
          marginBottom: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          Designing primers by hand is slow and error-prone. A single mismatch at the <span className="highlight-text">3' end</span> can silently kill your entire PCR run. This tool automates every critical check — <span className="highlight-text">melting temperature</span>, <span className="highlight-text">GC content</span>, <span className="highlight-text">hairpin & dimer risk</span>, and <span className="highlight-text">3' GC-clamp stability</span> — so you get a reliable, optimised primer pair in seconds. Each application mode enforces the exact parameter windows that matter most for that specific workflow.
        </p>

        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {[
              { label: 'Melting Temperature', icon: '🌡️' },
              { label: 'GC Content', icon: '🧬' },
              { label: 'Hairpin & Dimer Risk', icon: '🔗' },
              { label: "3' GC-Clamp Stability", icon: '🎯' }
            ].map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.15)';
              }}>
                <span style={{ fontSize: '24px' }}>{item.icon}</span>
                <span style={{
                  color: '#86EFAC',
                  fontSize: 'clamp(12px, 2.5vw, 14px)',
                  fontWeight: '600'
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow & Next Steps Section */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '32px',
        border: '1px solid #334155',
        position: 'relative',
        overflow: 'hidden'
      }} className="animate-fade-in">
        <div style={{
          position: 'absolute',
          top: '-30%',
          left: '-10%',
          width: '350px',
          height: '350px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}></div>

        <h2 style={{
          color: '#60A5FA',
          fontSize: 'clamp(18px, 4vw, 22px)',
          fontWeight: '700',
          marginBottom: '28px',
          letterSpacing: '-0.01em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            width: '4px',
            height: '24px',
            background: 'linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%)',
            borderRadius: '2px'
          }}></span>
          Workflow & Next Steps
        </h2>

        <div style={{
          display: 'grid',
          gap: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          {[
            {
              number: '1',
              title: 'Pick Your Application',
              description: 'Choose the PCR type below. Each mode pre-tunes amplicon size, Tm window, and strictness — Diagnostic is the broadest; qPCR is the tightest.',
              color: '#10B981'
            },
            {
              number: '2',
              title: 'Paste Your Target Sequence',
              description: 'Drop in your gene region (FASTA body or plain text). The tool strips headers, line-breaks, and numbers for you automatically.',
              color: '#F59E0B'
            },
            {
              number: '3',
              title: 'Run the Analysis',
              description: 'Hit Design Primers. The engine scores every candidate on Tm balance, GC%, hairpin ΔG, dimer risk, and 3\' clamp — then surfaces the best pair.',
              color: '#8B5CF6'
            },
            {
              number: '4',
              title: 'Use the Results Downstream',
              description: 'Copy the oligo sequences straight into a synthesis order or clone them into an expression vector. The protocol block gives you annealing temp, extension time, and cycle count ready to go.',
              color: '#EC4899'
            }
          ].map((step, idx) => (
            <div key={idx} className="workflow-step" style={{
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-start',
              padding: '24px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = `${step.color}40`;
              e.currentTarget.style.transform = 'translateX(8px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}>
              <div className="step-number" style={{
                minWidth: '48px',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${step.color} 0%, ${step.color}dd 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '800',
                color: '#fff',
                boxShadow: `0 4px 16px ${step.color}40`,
                flexShrink: 0
              }}>
                {step.number}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{
                  color: '#F8FAFC',
                  fontSize: 'clamp(15px, 3vw, 17px)',
                  fontWeight: '700',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em'
                }}>
                  {step.title}
                </h3>
                <p style={{
                  color: '#94A3B8',
                  fontSize: 'clamp(13px, 2.5vw, 15px)',
                  lineHeight: '1.7',
                  margin: 0
                }}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Load Sample Button */}
      <div style={{ 
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'center'
      }} className="animate-fade-in">
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSampleMenu(!showSampleMenu);
            }}
            style={{
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3)';
            }}
          >
            <span>📚 Load Sample</span>
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>

          {showSampleMenu && (
            <div className="sample-menu" onClick={(e) => e.stopPropagation()}>
              {Object.entries(ALIGNMENT_SAMPLES).map(([key, sample]) => (
                <div
                  key={key}
                  className="sample-menu-item"
                  onClick={() => loadSample(key)}
                >
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#F8FAFC' }}>
                    {sample.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {sample.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Sample Info */}
      {currentSample && (
        <div style={{
          background: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '24px'
        }} className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h3 style={{ color: '#F8FAFC', margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                Sample Loaded: {currentSample.name}
              </h3>
              <p style={{ color: '#94A3B8', margin: 0, fontSize: '14px' }}>
                {currentSample.description}
              </p>
            </div>
          </div>

          <div style={{
            background: '#0F172A',
            borderRadius: '6px',
            padding: '16px',
            border: '1px solid #1E293B'
          }}>
            <h4 style={{ color: '#E2E8F0', marginTop: 0, marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
              Educational Explanation
            </h4>
            <p style={{ color: '#CBD5E1', lineHeight: '1.7', marginBottom: '16px', fontSize: '13px' }}>
              {currentSample.explanation}
            </p>

            <div style={{
              background: '#1E293B',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <strong style={{ color: '#60A5FA', fontSize: '13px' }}>Biological Context:</strong>
              <p style={{ color: '#CBD5E1', margin: '8px 0 0 0', fontSize: '13px', lineHeight: '1.7' }}>
                {currentSample.biologicalContext}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
              <div>
                <strong style={{ color: '#94A3B8' }}>Expected Result:</strong>
                <div style={{ color: '#22C55E', fontWeight: '600', marginTop: '4px' }}>
                  {currentSample.expectedResult}
                </div>
              </div>
              <div>
                <strong style={{ color: '#94A3B8' }}>Algorithm:</strong>
                <div style={{ color: '#CBD5E1', fontWeight: '600', marginTop: '4px' }}>
                  {currentSample.algorithm === 'global' ? 'Global (Needleman-Wunsch)' : 'Local (Smith-Waterman)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div style={{
        background: '#1E293B',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid #334155'
      }} className="animate-fade-in">
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: '500', 
            color: '#E2E8F0',
            fontSize: '14px'
          }}>
            First Sequence
          </label>
          <textarea
            value={sequence1}
            onChange={(e) => setSequence1(e.target.value.toUpperCase())}
            placeholder="Enter first DNA sequence (e.g., ATGCGATCG...)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '14px',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: '#0F172A',
              color: '#E2E8F0'
            }}
          />
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
            Length: {sequence1.replace(/\s/g, '').length} bp
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: '500', 
            color: '#E2E8F0',
            fontSize: '14px'
          }}>
            Second Sequence
          </label>
          <textarea
            value={sequence2}
            onChange={(e) => setSequence2(e.target.value.toUpperCase())}
            placeholder="Enter second DNA sequence (e.g., ATGCAATCG...)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '14px',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '14px',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: '#0F172A',
              color: '#E2E8F0'
            }}
          />
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
            Length: {sequence2.replace(/\s/g, '').length} bp
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '10px', 
            fontWeight: '500', 
            color: '#E2E8F0',
            fontSize: '14px'
          }}>
            Alignment Algorithm
          </label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '16px',
              border: `1px solid ${algorithm === 'global' ? '#22C55E' : '#334155'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              background: algorithm === 'global' ? '#166534' : '#0F172A',
              flex: '1',
              minWidth: '200px'
            }}>
              <input
                type="radio"
                value="global"
                checked={algorithm === 'global'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '12px' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: algorithm === 'global' ? '#86EFAC' : '#E2E8F0', fontSize: '14px' }}>
                  Global Alignment
                </div>
                <div style={{ fontSize: '12px', color: algorithm === 'global' ? '#BBF7D0' : '#64748B', marginTop: '4px' }}>
                  Needleman-Wunsch
                </div>
              </div>
            </label>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '16px',
              border: `1px solid ${algorithm === 'local' ? '#22C55E' : '#334155'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              background: algorithm === 'local' ? '#166534' : '#0F172A',
              flex: '1',
              minWidth: '200px'
            }}>
              <input
                type="radio"
                value="local"
                checked={algorithm === 'local'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '12px' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: algorithm === 'local' ? '#86EFAC' : '#E2E8F0', fontSize: '14px' }}>
                  Local Alignment
                </div>
                <div style={{ fontSize: '12px', color: algorithm === 'local' ? '#BBF7D0' : '#64748B', marginTop: '4px' }}>
                  Smith-Waterman
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={handlePerformAlignment}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px',
            background: loading ? '#475569' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Aligning sequences...' : 'Align Sequences'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#7F1D1D',
          border: '1px solid #991B1B',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: '#FCA5A5',
          fontSize: '14px'
        }} className="animate-fade-in">
          <strong style={{ display: 'block', marginBottom: '4px' }}>Error:</strong>
          {error}
        </div>
      )}

      {/* Results */}
      {alignment && biologicalInterpretation && (
        <div style={{
          background: '#1E293B',
          borderRadius: '8px',
          padding: '24px',
          border: '1px solid #334155'
        }} className="animate-fade-in">
          <h2 style={{ 
            color: '#F8FAFC', 
            margin: '0 0 20px 0', 
            fontSize: 'clamp(18px, 4vw, 24px)', 
            fontWeight: '600' 
          }}>
            Alignment Results
          </h2>
          
          {/* Confidence Badge */}
          <div style={{
            background: '#0F172A',
            border: `1px solid ${biologicalInterpretation.confidenceColor}40`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'inline-block'
          }}>
            <div style={{ 
              fontWeight: '600', 
              color: biologicalInterpretation.confidenceColor,
              fontSize: '16px'
            }}>
              {biologicalInterpretation.confidence} Confidence
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>
              Alignment Quality
            </div>
          </div>

          {/* Confidence Explanation */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            fontSize: '14px',
            color: '#CBD5E1'
          }}>
            <strong style={{ color: biologicalInterpretation.confidenceColor }}>Assessment:</strong> {biologicalInterpretation.confidenceReason}
          </div>

          {/* Algorithm Info */}
          <div style={{
            background: '#166534',
            border: '1px solid #22C55E',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ fontWeight: '600', color: '#86EFAC', marginBottom: '6px', fontSize: '14px' }}>
              {alignment.algorithm}
            </div>
            <div style={{ color: '#BBF7D0', fontSize: '14px' }}>
              Alignment Score: {alignment.score}
            </div>
          </div>

          {/* Statistics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: '#166534',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #22C55E',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#86EFAC' }}>
                {alignment.matches}
              </div>
              <div style={{ color: '#BBF7D0', fontSize: '13px', marginTop: '6px' }}>
                Matches
              </div>
            </div>

            <div style={{
              background: '#713F12',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #CA8A04',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#FDE047' }}>
                {alignment.mismatches}
              </div>
              <div style={{ color: '#FEF08A', fontSize: '13px', marginTop: '6px' }}>
                Mismatches
              </div>
            </div>

            <div style={{
              background: '#7F1D1D',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #DC2626',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#FCA5A5' }}>
                {alignment.gaps}
              </div>
              <div style={{ color: '#FECACA', fontSize: '13px', marginTop: '6px' }}>
                Gaps ({biologicalInterpretation.gapFrequency}%)
              </div>
            </div>

            <div style={{
              background: '#1E3A8A',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #3B82F6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#93C5FD' }}>
                {alignment.similarity_percentage}%
              </div>
              <div style={{ color: '#BFDBFE', fontSize: '13px', marginTop: '6px' }}>
                Similarity
              </div>
            </div>
          </div>

          {/* Biological Interpretation */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <h3 style={{ 
              color: '#E2E8F0', 
              marginBottom: '20px', 
              fontSize: 'clamp(16px, 3.5vw, 18px)', 
              fontWeight: '600' 
            }}>
              Biological Interpretation
            </h3>

            {biologicalInterpretation.insights.map((insight, idx) => (
              <div key={idx} style={{
                background: '#1E293B',
                borderRadius: '6px',
                padding: '16px',
                marginBottom: idx < biologicalInterpretation.insights.length - 1 ? '16px' : 0,
                border: '1px solid #334155'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#F8FAFC', marginBottom: '8px' }}>
                  {insight.title}
                </div>
                <div style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: '1.7' }}>
                  {insight.description}
                </div>
                {insight.regions && insight.regions.length > 0 && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#94A3B8',
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    background: '#0A0E1A',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid #1E293B'
                  }}>
                    <strong>Locations:</strong> {insight.regions.slice(0, 5).map(r => 
                      `${r.start + 1}-${r.start + r.length}`
                    ).join(', ')}
                    {insight.regions.length > 5 && ` +${insight.regions.length - 5} more`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Export Options */}
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ fontWeight: '600', color: '#E2E8F0', marginBottom: '12px', fontSize: '14px' }}>
              Export Options
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={exportFASTA}
                style={{
                  padding: '10px 18px',
                  background: '#1E40AF',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#BFDBFE',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                FASTA
              </button>
              
              <button
                onClick={exportNormalReport}
                style={{
                  padding: '10px 18px',
                  background: '#065F46',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#86EFAC',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Normal Report
              </button>

              <button
                onClick={exportDetailedReport}
                style={{
                  padding: '10px 18px',
                  background: '#5B21B6',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#DDD6FE',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Detailed Report
              </button>
            </div>
          </div>

          {/* AI Button */}
          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={handleExplainWithAI}
              disabled={loadingAI}
              style={{
                width: '100%',
                padding: '14px',
                background: loadingAI ? '#475569' : 'rgba(109, 40, 217, 0.2)',
                border: '1px solid rgba(109, 40, 217, 0.4)',
                borderRadius: '6px',
                color: loadingAI ? '#94A3B8' : '#C4B5FD',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loadingAI ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : 'Get AI Explanation'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div style={{
              background: 'rgba(109, 40, 217, 0.1)',
              border: '1px solid rgba(109, 40, 217, 0.3)',
              borderRadius: '8px',
              padding: '20px',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                color: '#C4B5FD', 
                marginBottom: '16px', 
                fontSize: 'clamp(14px, 3vw, 16px)', 
                fontWeight: '600' 
              }}>
                AI Analysis
              </h3>
              <div style={{ 
                color: '#E2E8F0',
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                fontSize: 'clamp(13px, 2.5vw, 14px)',
                maxHeight: '400px',
                overflowY: 'auto',
                paddingRight: '8px'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Alignment Visualization */}
          <div>
            <h3 style={{ 
              color: '#E2E8F0', 
              marginBottom: '16px', 
              fontSize: 'clamp(16px, 3.5vw, 18px)', 
              fontWeight: '600' 
            }}>
              Alignment Visualization
            </h3>
            {renderAlignment()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceAlignment;