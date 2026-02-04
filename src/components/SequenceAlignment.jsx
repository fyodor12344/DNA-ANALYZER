import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';

// Sample sequence pairs for alignment demonstration
const ALIGNMENT_SAMPLES = {
  identical: {
    name: '✓ Identical Sequences',
    icon: '✓',
    color: '#10B981',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    algorithm: 'global',
    description: '100% Match - Perfect Alignment',
    explanation: 'These sequences are completely identical, demonstrating perfect sequence conservation. This would result in 100% similarity with no gaps or mismatches.',
    expectedResult: 'Score: High | Similarity: 100% | Gaps: 0',
    biologicalContext: 'Identical sequences might represent the same gene from the same organism, duplicated genes with no divergence, or highly conserved functional domains.'
  },
  snp: {
    name: '⚠ SNP Variation',
    icon: '⚠',
    color: '#F59E0B',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATCGTTCGATCGATCGATCGATCG',
    //                      ^^ A→T at position 14
    algorithm: 'global',
    description: 'Single Nucleotide Polymorphism',
    explanation: 'Two sequences differing by a single nucleotide substitution (A→T at position 14). This demonstrates how alignment algorithms detect and score point mutations.',
    expectedResult: 'Score: High | Similarity: ~97% | 1 Mismatch',
    biologicalContext: 'SNPs are the most common type of genetic variation. This could represent allelic differences, population variants, or evolutionary changes between related sequences.'
  },
  indel: {
    name: '➕ Insertion/Deletion',
    icon: '➕',
    color: '#3B82F6',
    sequence1: 'ATGCGATCGATCGATCGATCGATCGATCGATCG',
    sequence2: 'ATGCGATCGATC---CGATCGATCGATCGATCG',
    //                    ^^^  3bp deletion
    algorithm: 'global',
    description: 'Gap Introduction (Indel)',
    explanation: 'One sequence has a 3-nucleotide deletion (or insertion, depending on perspective). Alignment algorithms introduce gaps to maximize overall similarity while accounting for insertions/deletions.',
    expectedResult: 'Score: Moderate | Similarity: ~91% | 3 Gaps',
    biologicalContext: 'Insertions and deletions (indels) are common in evolution and can affect protein length if occurring in coding regions. Gap penalties in alignment reflect the biological cost of indels.'
  },
  localMatch: {
    name: '🎯 Local Similarity',
    icon: '🎯',
    color: '#8B5CF6',
    sequence1: 'AAAAAATGCGATCGATCGAAAAAAA',
    sequence2: 'TTTTTTGCGATCGATCGTTTTTTT',
    //             ^^^^^^^^^^^^^^  conserved middle region
    algorithm: 'local',
    description: 'Conserved Region Detection',
    explanation: 'Sequences with a highly conserved central region flanked by unrelated sequences. Local alignment (Smith-Waterman) will identify the conserved middle section while ignoring mismatched ends.',
    expectedResult: 'Local alignment finds conserved region',
    biologicalContext: 'Local alignment is ideal for finding conserved domains, motifs, or functional regions within otherwise divergent sequences - common when comparing genes from distantly related organisms.'
  },
  divergent: {
    name: '🔄 Divergent Sequences',
    icon: '🔄',
    color: '#EF4444',
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
  const [sampleExplanationVisible, setSampleExplanationVisible] = useState(false);

  // Load sample function
  const loadSample = (sampleKey) => {
    const sample = ALIGNMENT_SAMPLES[sampleKey];
    setSequence1(sample.sequence1);
    setSequence2(sample.sequence2);
    setAlgorithm(sample.algorithm);
    setCurrentSample(sample);
    setSampleExplanationVisible(true);
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
        icon: '🧬',
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
          icon: '📍',
          title: 'Insertion/Deletion Events',
          description: `${gapRegions.length} gap region(s) detected, possibly indicating insertion/deletion events that may affect protein length or structure.`,
          regions: gapRegions
        });
      }
      
      if (subRegions.length > 0) {
        insights.push({
          type: 'substitutions',
          icon: '🔄',
          title: 'Variable Regions',
          description: `${subRegions.length} substitution region(s) found, representing sequence divergence that may result from mutations or evolutionary changes.`,
          regions: subRegions
        });
      }
    }

    if (similarity >= 95) {
      insights.push({
        type: 'similarity',
        icon: '✨',
        title: 'High Sequence Identity',
        description: 'These sequences are highly similar, suggesting they may be from closely related organisms, same gene family, or recent evolutionary divergence.'
      });
    } else if (similarity < 50) {
      insights.push({
        type: 'divergence',
        icon: '⚠️',
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

  // Export normal report (concise)
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
${insight.icon} ${insight.title}
${'-'.repeat(80)}
${insight.description}
${insight.regions ? `
Detected Regions:
${insight.regions.map(r => `  - Position ${r.start + 1} to ${r.start + r.length} (${r.length} bp)${r.type ? ` [${r.type}]` : ''}`).join('\n')}
` : ''}
`).join('\n')}

${'='.repeat(80)}
CONSERVED REGIONS SUMMARY
${'='.repeat(80)}
${biologicalInterpretation.conservedRegions.length > 0 ? 
  biologicalInterpretation.conservedRegions.map((r, i) => 
    `Region ${i + 1}: Position ${r.start + 1}-${r.start + r.length} (${r.length} bp)`
  ).join('\n') :
  'No conserved regions found (minimum 10 bp required)'
}

${'='.repeat(80)}
VARIABLE REGIONS SUMMARY
${'='.repeat(80)}
${biologicalInterpretation.variableRegions.length > 0 ?
  biologicalInterpretation.variableRegions.map((r, i) =>
    `Region ${i + 1}: Position ${r.start + 1}-${r.start + r.length} (${r.length} bp) - Type: ${r.type}`
  ).join('\n') :
  'No major variable regions found (minimum 5 bp required)'
}

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
        fontSize: 'clamp(0.65rem, 2vw, 0.9rem)',
        background: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)',
        padding: '1.5rem',
        borderRadius: '12px',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box',
        border: '2px solid #E5E7EB'
      }}>
        {chunks.map((chunk, idx) => {
          // Check if this chunk contains conserved or variable regions
          const hasConserved = biologicalInterpretation.conservedRegions.some(
            r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start
          );
          const hasVariable = biologicalInterpretation.variableRegions.some(
            r => r.start < chunk.start + chunkSize && r.start + r.length > chunk.start
          );

          return (
            <div key={idx} style={{ marginBottom: '2rem' }}>
              <div style={{ 
                color: '#6B7280', 
                fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)', 
                marginBottom: '0.75rem', 
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontWeight: 600
              }}>
                <span style={{ color: '#374151' }}>Position {chunk.start + 1} - {Math.min(chunk.start + chunkSize, align1.length)}</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {hasConserved && (
                    <span style={{
                      background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                      color: '#065F46',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                      fontWeight: 700,
                      border: '1px solid #10B981'
                    }}>
                      ✓ Conserved
                    </span>
                  )}
                  {hasVariable && (
                    <span style={{
                      background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                      color: '#92400E',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: 'clamp(0.65rem, 1.5vw, 0.75rem)',
                      fontWeight: 700,
                      border: '1px solid #F59E0B'
                    }}>
                      ⚠ Variable
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                <span style={{ color: '#3B82F6', fontWeight: 700 }}>Seq1: </span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? 'linear-gradient(135deg, #FEE2E2, #FCA5A5)' : 
                               char === chunk.seq2[i] ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : 
                               'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    padding: '3px 2px',
                    color: char === '-' ? '#991B1B' :
                           char === chunk.seq2[i] ? '#065F46' : '#92400E',
                    fontWeight: 600,
                    borderRadius: '2px',
                    margin: '0 1px'
                  }}>
                    {char}
                  </span>
                ))}
              </div>

              <div style={{ marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                <span style={{ color: '#6B7280', fontWeight: 700 }}>      </span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    color: char === chunk.seq2[i] && char !== '-' ? '#10B981' : '#E5E7EB',
                    fontWeight: 800,
                    padding: '3px 2px',
                    margin: '0 1px'
                  }}>
                    {char === chunk.seq2[i] && char !== '-' ? '|' : ' '}
                  </span>
                ))}
              </div>

              <div style={{ wordBreak: 'break-all' }}>
                <span style={{ color: '#8B5CF6', fontWeight: 700 }}>Seq2: </span>
                {chunk.seq2.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? 'linear-gradient(135deg, #FEE2E2, #FCA5A5)' : 
                               char === chunk.seq1[i] ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : 
                               'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    padding: '3px 2px',
                    color: char === '-' ? '#991B1B' :
                           char === chunk.seq1[i] ? '#065F46' : '#92400E',
                    fontWeight: 600,
                    borderRadius: '2px',
                    margin: '0 1px'
                  }}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ 
          marginTop: '2rem', 
          padding: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff, #F9FAFB)',
          borderRadius: '10px',
          fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
          fontFamily: 'Inter, sans-serif',
          border: '2px solid #E5E7EB'
        }}>
          <div style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#374151', fontSize: '1rem' }}>
            🎨 Color Legend:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)', 
                border: '2px solid #10B981',
                borderRadius: '6px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#374151', fontWeight: 600 }}>Match</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', 
                border: '2px solid #F59E0B',
                borderRadius: '6px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#374151', fontWeight: 600 }}>Mismatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                background: 'linear-gradient(135deg, #FEE2E2, #FCA5A5)', 
                border: '2px solid #EF4444',
                borderRadius: '6px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#374151', fontWeight: 600 }}>Gap</span>
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
      padding: 'clamp(1rem, 3vw, 2rem)', 
      fontFamily: 'Inter, sans-serif',
      width: '100%',
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      minHeight: '100vh'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .slide-down {
          animation: slideDown 0.3s ease-out;
        }

        .sample-menu {
          position: absolute;
          top: 100%;
          left: 0;
          background: #1e293b;
          border: 2px solid #475569;
          borderRadius: 12px;
          boxShadow: 0 8px 24px rgba(0,0,0,0.4);
          padding: 0.75rem;
          zIndex: 100;
          minWidth: 300px;
          marginTop: 0.5rem;
        }

        .sample-menu-item {
          padding: 1rem;
          cursor: pointer;
          borderRadius: 8px;
          transition: all 0.2s ease;
          fontSize: 0.9rem;
          color: #e2e8f0;
          border: 2px solid transparent;
          marginBottom: 0.5rem;
        }

        .sample-menu-item:hover {
          background: #334155;
          border-color: #60A5FA;
          transform: translateX(4px);
        }

        .sample-menu-item:last-child {
          marginBottom: 0;
        }

        /* Mobile-specific styles */
        @media (max-width: 768px) {
          .mobile-stack {
            flex-direction: column !important;
          }
          
          .mobile-full-width {
            width: 100% !important;
            flex: 1 !important;
          }
        }
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        borderRadius: '16px',
        padding: 'clamp(1.5rem, 4vw, 2.5rem)',
        marginBottom: '2rem',
        color: '#fff',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', 
          fontWeight: 800, 
          fontFamily: 'Montserrat, sans-serif',
          letterSpacing: '-1px'
        }}>
          🧬 Sequence Alignment
        </h1>
        <p style={{ margin: '0.75rem 0 0 0', opacity: 0.95, fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)', fontWeight: 500 }}>
          Compare DNA sequences using global or local alignment algorithms
        </p>
      </div>

      {/* Load Sample Button */}
      <div style={{ 
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSampleMenu(!showSampleMenu);
            }}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>📋</span>
            <span>Load Sample Alignments</span>
            <span style={{ fontSize: '0.9rem' }}>▼</span>
          </button>

          {showSampleMenu && (
            <div className="sample-menu slide-down" onClick={(e) => e.stopPropagation()}>
              {Object.entries(ALIGNMENT_SAMPLES).map(([key, sample]) => (
                <div
                  key={key}
                  className="sample-menu-item"
                  onClick={() => loadSample(key)}
                  style={{
                    background: `linear-gradient(135deg, ${sample.color}15, ${sample.color}08)`
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{sample.icon}</span>
                    <strong style={{ color: sample.color, fontSize: '1rem' }}>
                      {sample.name}
                    </strong>
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#cbd5e1',
                    lineHeight: '1.4'
                  }}>
                    {sample.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sample Explanation Banner */}
      {sampleExplanationVisible && currentSample && (
        <div className="slide-down" style={{
          background: `linear-gradient(135deg, ${currentSample.color}20, ${currentSample.color}10)`,
          border: `2px solid ${currentSample.color}`,
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: `0 8px 24px ${currentSample.color}30`
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '2.5rem' }}>{currentSample.icon}</span>
              <div>
                <h3 style={{ 
                  color: currentSample.color, 
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: 800
                }}>
                  Sample Loaded: {currentSample.name}
                </h3>
                <p style={{ 
                  color: '#cbd5e1', 
                  margin: '0.5rem 0 0 0',
                  fontSize: '0.95rem'
                }}>
                  {currentSample.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSampleExplanationVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: `1px solid ${currentSample.color}40`
          }}>
            <h4 style={{ 
              color: '#e2e8f0', 
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.1rem',
              fontWeight: 700
            }}>
              📚 Educational Explanation
            </h4>
            <p style={{ 
              color: '#cbd5e1', 
              lineHeight: '1.8',
              marginBottom: '1.25rem',
              fontSize: '0.95rem'
            }}>
              {currentSample.explanation}
            </p>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <strong style={{ color: '#60A5FA', fontSize: '0.9rem' }}>
                🔬 Biological Context:
              </strong>
              <p style={{ 
                color: '#cbd5e1', 
                margin: '0.5rem 0 0 0',
                fontSize: '0.9rem',
                lineHeight: '1.7'
              }}>
                {currentSample.biologicalContext}
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              fontSize: '0.9rem'
            }}>
              <div>
                <strong style={{ color: '#94a3b8' }}>Expected Result:</strong>
                <div style={{ 
                  color: currentSample.color,
                  fontWeight: 700,
                  marginTop: '0.25rem'
                }}>
                  {currentSample.expectedResult}
                </div>
              </div>
              <div>
                <strong style={{ color: '#94a3b8' }}>Algorithm:</strong>
                <div style={{ 
                  color: '#cbd5e1',
                  fontWeight: 700,
                  marginTop: '0.25rem'
                }}>
                  {currentSample.algorithm === 'global' ? 'Global (Needleman-Wunsch)' : 'Local (Smith-Waterman)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '16px',
        padding: 'clamp(1.25rem, 3vw, 2rem)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        marginBottom: '2rem',
        width: '100%',
        boxSizing: 'border-box',
        border: '2px solid #475569'
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: 700, 
            color: '#f1f5f9',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)'
          }}>
            First Sequence
          </label>
          <textarea
            value={sequence1}
            onChange={(e) => setSequence1(e.target.value.toUpperCase())}
            placeholder="Enter first DNA sequence&#10;e.g., ATGCGATCG..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '1rem',
              border: '2px solid #475569',
              borderRadius: '12px',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: '#0f172a',
              color: '#f1f5f9',
              lineHeight: '1.6'
            }}
          />
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#94a3b8', 
            marginTop: '0.5rem',
            fontWeight: 600 
          }}>
            Length: {sequence1.replace(/\s/g, '').length} bp
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: 700, 
            color: '#f1f5f9',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)'
          }}>
            Second Sequence
          </label>
          <textarea
            value={sequence2}
            onChange={(e) => setSequence2(e.target.value.toUpperCase())}
            placeholder="Enter second DNA sequence&#10;e.g., ATGCAATCG..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '1rem',
              border: '2px solid #475569',
              borderRadius: '12px',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              resize: 'vertical',
              boxSizing: 'border-box',
              background: '#0f172a',
              color: '#f1f5f9',
              lineHeight: '1.6'
            }}
          />
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#94a3b8', 
            marginTop: '0.5rem',
            fontWeight: 600
          }}>
            Length: {sequence2.replace(/\s/g, '').length} bp
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: 700, 
            color: '#f1f5f9',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.1rem)'
          }}>
            Alignment Algorithm
          </label>
          <div className="mobile-stack" style={{ display: 'flex', gap: '1.5rem' }}>
            <label className="mobile-full-width" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: 'clamp(1rem, 2vw, 1.25rem)',
              border: `2px solid ${algorithm === 'global' ? '#10B981' : '#475569'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              background: algorithm === 'global' ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : '#0f172a',
              flex: 1,
              transition: 'all 0.3s ease',
              minWidth: 0,
              boxSizing: 'border-box'
            }}>
              <input
                type="radio"
                value="global"
                checked={algorithm === 'global'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '0.75rem', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 700, 
                  color: algorithm === 'global' ? '#065F46' : '#f1f5f9', 
                  fontSize: 'clamp(0.9rem, 2vw, 1.05rem)' 
                }}>
                  Global Alignment
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: algorithm === 'global' ? '#047857' : '#94a3b8', 
                  marginTop: '0.25rem',
                  fontWeight: 600
                }}>
                  Needleman-Wunsch
                </div>
              </div>
            </label>

            <label className="mobile-full-width" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: 'clamp(1rem, 2vw, 1.25rem)',
              border: `2px solid ${algorithm === 'local' ? '#10B981' : '#475569'}`,
              borderRadius: '12px',
              cursor: 'pointer',
              background: algorithm === 'local' ? 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' : '#0f172a',
              flex: 1,
              transition: 'all 0.3s ease',
              minWidth: 0,
              boxSizing: 'border-box'
            }}>
              <input
                type="radio"
                value="local"
                checked={algorithm === 'local'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '0.75rem', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 700, 
                  color: algorithm === 'local' ? '#065F46' : '#f1f5f9', 
                  fontSize: 'clamp(0.9rem, 2vw, 1.05rem)' 
                }}>
                  Local Alignment
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: algorithm === 'local' ? '#047857' : '#94a3b8', 
                  marginTop: '0.25rem',
                  fontWeight: 600
                }}>
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
            padding: 'clamp(1rem, 2.5vw, 1.25rem)',
            background: loading ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(16, 185, 129, 0.4)'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Aligning sequences...' : '🔍 Align Sequences'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, #991B1B 100%)',
          border: '2px solid #dc2626',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          color: '#fecaca',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          wordBreak: 'break-word',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>⚠️</span>
          <div>
            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '0.5rem' }}>Error:</strong>
            <span style={{ fontSize: '0.95rem' }}>{error}</span>
          </div>
        </div>
      )}

      {alignment && biologicalInterpretation && (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '16px',
          padding: 'clamp(1.25rem, 3vw, 2rem)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          width: '100%',
          boxSizing: 'border-box',
          border: '2px solid #475569'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2rem' 
          }}>
            <h2 style={{ 
              color: '#f1f5f9', 
              margin: 0, 
              fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.5px'
            }}>
              📊 Alignment Results
            </h2>
            
            {/* Confidence Badge */}
            <div style={{
              background: `${biologicalInterpretation.confidenceColor}20`,
              border: `2px solid ${biologicalInterpretation.confidenceColor}`,
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              alignSelf: 'flex-start',
              width: '100%',
              maxWidth: '350px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', flexShrink: 0 }}>
                {biologicalInterpretation.confidence === 'High' ? '🎯' : 
                 biologicalInterpretation.confidence === 'Moderate' ? '⚖️' : '⚠️'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 800, 
                  color: biologicalInterpretation.confidenceColor,
                  fontSize: 'clamp(0.95rem, 2vw, 1.1rem)'
                }}>
                  {biologicalInterpretation.confidence} Confidence
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', 
                  color: '#94a3b8',
                  marginTop: '0.25rem',
                  fontWeight: 600
                }}>
                  Alignment Quality
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Explanation */}
          <div style={{
            background: `${biologicalInterpretation.confidenceColor}10`,
            border: `2px solid ${biologicalInterpretation.confidenceColor}40`,
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '2rem',
            fontSize: 'clamp(0.9rem, 2vw, 1rem)',
            color: '#e2e8f0',
            wordBreak: 'break-word',
            fontWeight: 500
          }}>
            <strong style={{ color: biologicalInterpretation.confidenceColor }}>Assessment:</strong> {biologicalInterpretation.confidenceReason}
          </div>

          {/* Algorithm Info */}
          <div style={{
            background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
            border: '2px solid #10B981',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '2rem'
          }}>
            <div style={{ fontWeight: 700, color: '#065F46', marginBottom: '0.5rem', fontSize: 'clamp(0.95rem, 2vw, 1.1rem)' }}>
              {alignment.algorithm}
            </div>
            <div style={{ color: '#047857', fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', fontWeight: 600 }}>
              Alignment Score: {alignment.score}
            </div>
          </div>

          {/* Statistics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1.25rem)',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10B98125, #10B98110)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: '12px',
              border: '2px solid #10B981',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, color: '#10B981' }}>
                {alignment.matches}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', marginTop: '0.5rem', fontWeight: 600 }}>
                Matches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #F59E0B25, #F59E0B10)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: '12px',
              border: '2px solid #F59E0B',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, color: '#F59E0B' }}>
                {alignment.mismatches}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', marginTop: '0.5rem', fontWeight: 600 }}>
                Mismatches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #EF444425, #EF444410)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: '12px',
              border: '2px solid #EF4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, color: '#EF4444' }}>
                {alignment.gaps}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', marginTop: '0.5rem', fontWeight: 600 }}>
                Gaps ({biologicalInterpretation.gapFrequency}%)
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #3B82F625, #2563EB25)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              borderRadius: '12px',
              border: '2px solid #3B82F6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 800, color: '#3B82F6' }}>
                {alignment.similarity_percentage}%
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', marginTop: '0.5rem', fontWeight: 600 }}>
                Similarity
              </div>
            </div>
          </div>

          {/* Biological Interpretation */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.1))',
            border: '2px solid #6366F1',
            borderRadius: '16px',
            padding: 'clamp(1.25rem, 3vw, 2rem)',
            marginBottom: '2rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ 
              color: '#A5B4FC', 
              marginBottom: '1.5rem', 
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', 
              fontFamily: 'Montserrat, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              fontWeight: 800,
              letterSpacing: '-0.5px'
            }}>
              🔬 Biological Interpretation
            </h3>

            {biologicalInterpretation.insights.map((insight, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: 'clamp(1rem, 2vw, 1.25rem)',
                marginBottom: idx < biologicalInterpretation.insights.length - 1 ? '1.25rem' : 0,
                border: '2px solid rgba(199, 210, 254, 0.5)'
              }}>
                <div style={{ 
                  fontSize: 'clamp(0.9rem, 2vw, 1.05rem)', 
                  fontWeight: 700, 
                  color: '#4338CA',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ flexShrink: 0, fontSize: '1.25rem' }}>{insight.icon}</span>
                  <span>{insight.title}</span>
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
                  color: '#374151',
                  lineHeight: '1.7',
                  wordBreak: 'break-word',
                  fontWeight: 500
                }}>
                  {insight.description}
                </div>
                {insight.regions && insight.regions.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
                    color: '#6B7280',
                    fontFamily: 'JetBrains Mono, Consolas, monospace',
                    background: '#F9FAFB',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    wordBreak: 'break-word',
                    border: '1px solid #E5E7EB',
                    fontWeight: 600
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
            background: 'rgba(15, 23, 42, 0.7)',
            border: '2px solid #475569',
            borderRadius: '12px',
            padding: 'clamp(1rem, 2vw, 1.25rem)',
            marginBottom: '2rem'
          }}>
            <div style={{ 
              fontWeight: 700, 
              color: '#f1f5f9',
              marginBottom: '1rem',
              fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '1.25rem' }}>📥</span>
              <span>Export Options</span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={exportFASTA}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}
              >
                💾 FASTA
              </button>
              
              <button
                onClick={exportNormalReport}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                }}
              >
                📄 Normal Report
              </button>

              <button
                onClick={exportDetailedReport}
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}
              >
                📋 Detailed Report
              </button>
            </div>
          </div>

          {/* AI Button */}
          <div style={{ marginBottom: '2rem' }}>
            <button 
              onClick={handleExplainWithAI}
              disabled={loadingAI}
              style={{
                width: '100%',
                padding: 'clamp(1rem, 2.5vw, 1.25rem)',
                background: loadingAI ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)',
                fontWeight: 700,
                cursor: loadingAI ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                fontFamily: 'Inter, sans-serif',
                boxSizing: 'border-box',
                boxShadow: loadingAI ? 'none' : '0 4px 16px rgba(139, 92, 246, 0.4)'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : '🤖 Get AI Explanation'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))',
              border: '2px solid #8B5CF6',
              borderRadius: '16px',
              padding: 'clamp(1.25rem, 3vw, 2rem)',
              marginBottom: '2rem',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
            }}>
              <h3 style={{ 
                color: '#c4b5fd', 
                marginBottom: '1.5rem', 
                fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', 
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontFamily: 'Montserrat, sans-serif',
                letterSpacing: '-0.5px'
              }}>
                <span style={{ fontSize: '1.75rem' }}>🤖</span>
                <span>AI Analysis</span>
              </h3>
              <div style={{ 
                color: '#f1f5f9',
                background: 'rgba(15, 23, 42, 0.7)',
                padding: 'clamp(1rem, 2vw, 1.5rem)',
                borderRadius: '10px',
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                wordBreak: 'break-word',
                border: '1px solid #475569',
                fontWeight: 500
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Alignment Visualization */}
          <div>
            <h3 style={{ 
              color: '#f1f5f9', 
              marginBottom: '1.5rem', 
              fontSize: 'clamp(1.1rem, 3vw, 1.4rem)', 
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🔬</span>
              <span>Alignment Visualization</span>
            </h3>
            {renderAlignment()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceAlignment;