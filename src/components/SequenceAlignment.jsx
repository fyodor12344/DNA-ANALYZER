import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';

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

  // Export alignment report
  const exportReport = () => {
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
Reason: ${biologicalInterpretation.confidenceReason}

${'='.repeat(60)}
BIOLOGICAL INTERPRETATION
${'='.repeat(60)}

${biologicalInterpretation.insights.map(insight => `
${insight.icon} ${insight.title}
${insight.description}
${insight.regions ? `Found at positions: ${insight.regions.map(r => `${r.start}-${r.start + r.length}`).join(', ')}` : ''}
`).join('\n')}

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
    a.download = 'alignment_report.txt';
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
        fontFamily: 'monospace', 
        fontSize: 'clamp(0.65rem, 2vw, 0.9rem)',
        background: '#F9FAFB',
        padding: '1rem',
        borderRadius: '8px',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box'
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
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                color: '#6B7280', 
                fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)', 
                marginBottom: '0.5rem', 
                fontFamily: 'Inter, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span>Position {chunk.start + 1} - {Math.min(chunk.start + chunkSize, align1.length)}</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {hasConserved && (
                    <span style={{
                      background: '#D1FAE5',
                      color: '#065F46',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)',
                      fontWeight: 600
                    }}>
                      Conserved
                    </span>
                  )}
                  {hasVariable && (
                    <span style={{
                      background: '#FEF3C7',
                      color: '#92400E',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: 'clamp(0.65rem, 1.5vw, 0.7rem)',
                      fontWeight: 600
                    }}>
                      Variable
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                <span style={{ color: '#3B82F6', fontWeight: 600 }}>Seq1: </span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? '#FEE2E2' : 
                               char === chunk.seq2[i] ? '#D1FAE5' : '#FEF3C7',
                    padding: '2px 1px',
                    color: char === '-' ? '#991B1B' :
                           char === chunk.seq2[i] ? '#065F46' : '#92400E'
                  }}>
                    {char}
                  </span>
                ))}
              </div>

              <div style={{ marginBottom: '0.25rem', wordBreak: 'break-all' }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>      </span>
                {chunk.seq1.split('').map((char, i) => (
                  <span key={i}>
                    {char === chunk.seq2[i] && char !== '-' ? '|' : ' '}
                  </span>
                ))}
              </div>

              <div style={{ wordBreak: 'break-all' }}>
                <span style={{ color: '#8B5CF6', fontWeight: 600 }}>Seq2: </span>
                {chunk.seq2.split('').map((char, i) => (
                  <span key={i} style={{
                    background: char === '-' ? '#FEE2E2' : 
                               char === chunk.seq1[i] ? '#D1FAE5' : '#FEF3C7',
                    padding: '2px 1px',
                    color: char === '-' ? '#991B1B' :
                           char === chunk.seq1[i] ? '#065F46' : '#92400E'
                  }}>
                    {char}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem',
          background: '#fff',
          borderRadius: '6px',
          fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
            Legend:
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#D1FAE5', 
                border: '1px solid #10B981',
                borderRadius: '4px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#6B7280' }}>Match</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#FEF3C7', 
                border: '1px solid #F59E0B',
                borderRadius: '4px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#6B7280' }}>Mismatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#FEE2E2', 
                border: '1px solid #EF4444',
                borderRadius: '4px',
                flexShrink: 0
              }}></div>
              <span style={{ color: '#6B7280' }}>Gap</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: 'clamp(1rem, 3vw, 2rem)', 
      fontFamily: 'Inter, sans-serif',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap');
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #ffffff40;
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
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
        borderRadius: '12px',
        padding: 'clamp(1.5rem, 4vw, 2rem)',
        marginBottom: '1.5rem',
        color: '#fff'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: 'clamp(1.5rem, 5vw, 2rem)', 
          fontWeight: 700, 
          fontFamily: 'Montserrat, sans-serif' 
        }}>
          Sequence Alignment
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}>
          Compare DNA sequences using global or local alignment
        </p>
      </div>

      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: 'clamp(1rem, 3vw, 1.5rem)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#374151',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
          }}>
            First Sequence
          </label>
          <textarea
            value={sequence1}
            onChange={(e) => setSequence1(e.target.value.toUpperCase())}
            placeholder="Enter first DNA sequence&#10;e.g., ATGCGATCG..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#374151',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
          }}>
            Second Sequence
          </label>
          <textarea
            value={sequence2}
            onChange={(e) => setSequence2(e.target.value.toUpperCase())}
            placeholder="Enter second DNA sequence&#10;e.g., ATGCAATCG..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: 'clamp(0.85rem, 2.5vw, 0.95rem)',
              fontFamily: 'monospace',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#374151',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)'
          }}>
            Alignment Algorithm
          </label>
          <div className="mobile-stack" style={{ display: 'flex', gap: '1rem' }}>
            <label className="mobile-full-width" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              border: `2px solid ${algorithm === 'global' ? '#10B981' : '#E5E7EB'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: algorithm === 'global' ? '#D1FAE5' : '#fff',
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
                style={{ marginRight: '0.5rem', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                  Global
                </div>
                <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', color: '#6B7280', marginTop: '0.25rem' }}>
                  Needleman-Wunsch
                </div>
              </div>
            </label>

            <label className="mobile-full-width" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              border: `2px solid ${algorithm === 'local' ? '#10B981' : '#E5E7EB'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: algorithm === 'local' ? '#D1FAE5' : '#fff',
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
                style={{ marginRight: '0.5rem', flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1F2937', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
                  Local
                </div>
                <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 0.85rem)', color: '#6B7280', marginTop: '0.25rem' }}>
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
            padding: 'clamp(0.875rem, 2.5vw, 1rem)',
            background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontFamily: 'Inter, sans-serif',
            boxSizing: 'border-box'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Aligning...' : 'Align Sequences'}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #EF4444',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#991B1B',
          fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
          wordBreak: 'break-word'
        }}>
          {error}
        </div>
      )}

      {alignment && biologicalInterpretation && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: 'clamp(1rem, 3vw, 1.5rem)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '1.5rem' 
          }}>
            <h2 style={{ 
              color: '#1F2937', 
              margin: 0, 
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)', 
              fontFamily: 'Montserrat, sans-serif' 
            }}>
              Alignment Results
            </h2>
            
            {/* Confidence Badge */}
            <div style={{
              background: `${biologicalInterpretation.confidenceColor}20`,
              border: `2px solid ${biologicalInterpretation.confidenceColor}`,
              borderRadius: '8px',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              alignSelf: 'flex-start',
              width: '100%',
              maxWidth: '300px',
              boxSizing: 'border-box'
            }}>
              <span style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', flexShrink: 0 }}>
                {biologicalInterpretation.confidence === 'High' ? '🎯' : 
                 biologicalInterpretation.confidence === 'Moderate' ? '⚖️' : '⚠️'}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ 
                  fontWeight: 700, 
                  color: biologicalInterpretation.confidenceColor,
                  fontSize: 'clamp(0.85rem, 2vw, 0.9rem)'
                }}>
                  {biologicalInterpretation.confidence} Confidence
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.7rem, 1.8vw, 0.75rem)', 
                  color: '#6B7280',
                  marginTop: '0.125rem'
                }}>
                  Alignment Quality
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Explanation */}
          <div style={{
            background: `${biologicalInterpretation.confidenceColor}10`,
            border: `1px solid ${biologicalInterpretation.confidenceColor}40`,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: 'clamp(0.85rem, 2vw, 0.9rem)',
            color: '#374151',
            wordBreak: 'break-word'
          }}>
            <strong>Assessment:</strong> {biologicalInterpretation.confidenceReason}
          </div>

          {/* Algorithm Info */}
          <div style={{
            background: '#F0FDF4',
            border: '2px solid #10B981',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontWeight: 600, color: '#065F46', marginBottom: '0.5rem', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
              {alignment.algorithm}
            </div>
            <div style={{ color: '#065F46', fontSize: 'clamp(0.85rem, 2vw, 0.9rem)' }}>
              Score: {alignment.score}
            </div>
          </div>

          {/* Statistics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10B98120, #10B98110)',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: '8px',
              border: '2px solid #10B981',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#10B981' }}>
                {alignment.matches}
              </div>
              <div style={{ color: '#6B7280', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', marginTop: '0.25rem' }}>
                Matches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #F59E0B20, #F59E0B10)',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: '8px',
              border: '2px solid #F59E0B',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#F59E0B' }}>
                {alignment.mismatches}
              </div>
              <div style={{ color: '#6B7280', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', marginTop: '0.25rem' }}>
                Mismatches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #EF444420, #EF444410)',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: '8px',
              border: '2px solid #EF4444',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#EF4444' }}>
                {alignment.gaps}
              </div>
              <div style={{ color: '#6B7280', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', marginTop: '0.25rem' }}>
                Gaps ({biologicalInterpretation.gapFrequency}%)
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #3B82F620, #2563EB20)',
              padding: 'clamp(0.75rem, 2vw, 1rem)',
              borderRadius: '8px',
              border: '2px solid #3B82F6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 700, color: '#3B82F6' }}>
                {alignment.similarity_percentage}%
              </div>
              <div style={{ color: '#6B7280', fontSize: 'clamp(0.75rem, 2vw, 0.9rem)', marginTop: '0.25rem' }}>
                Similarity
              </div>
            </div>
          </div>

          {/* Biological Interpretation */}
          <div style={{
            background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)',
            border: '2px solid #6366F1',
            borderRadius: '12px',
            padding: 'clamp(1rem, 3vw, 1.5rem)',
            marginBottom: '1.5rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ 
              color: '#4F46E5', 
              marginBottom: '1rem', 
              fontSize: 'clamp(1rem, 3vw, 1.2rem)', 
              fontFamily: 'Montserrat, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap'
            }}>
              🔬 Biological Interpretation
            </h3>

            {biologicalInterpretation.insights.map((insight, idx) => (
              <div key={idx} style={{
                background: '#fff',
                borderRadius: '8px',
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                marginBottom: idx < biologicalInterpretation.insights.length - 1 ? '1rem' : 0,
                border: '1px solid #C7D2FE'
              }}>
                <div style={{ 
                  fontSize: 'clamp(0.85rem, 2vw, 0.95rem)', 
                  fontWeight: 600, 
                  color: '#4338CA',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ flexShrink: 0 }}>{insight.icon}</span>
                  <span>{insight.title}</span>
                </div>
                <div style={{ 
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)', 
                  color: '#4B5563',
                  lineHeight: '1.6',
                  wordBreak: 'break-word'
                }}>
                  {insight.description}
                </div>
                {insight.regions && insight.regions.length > 0 && (
                  <div style={{
                    marginTop: '0.75rem',
                    fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
                    color: '#6B7280',
                    fontFamily: 'monospace',
                    background: '#F9FAFB',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    wordBreak: 'break-word'
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
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: 'clamp(0.75rem, 2vw, 1rem)',
            marginBottom: '1.5rem'
          }}>
            <div style={{ 
              fontWeight: 600, 
              color: '#1E293B',
              marginBottom: '0.75rem',
              fontSize: 'clamp(0.85rem, 2vw, 0.95rem)'
            }}>
              📥 Export Options
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={exportFASTA}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  border: '2px solid #3B82F6',
                  borderRadius: '6px',
                  color: '#3B82F6',
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                💾 FASTA
              </button>
              
              <button
                onClick={exportReport}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#fff',
                  border: '2px solid #10B981',
                  borderRadius: '6px',
                  color: '#10B981',
                  fontSize: 'clamp(0.8rem, 2vw, 0.9rem)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                📄 Report
              </button>
            </div>
          </div>

          {/* AI Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              onClick={handleExplainWithAI}
              disabled={loadingAI}
              style={{
                width: '100%',
                padding: 'clamp(0.875rem, 2.5vw, 1rem)',
                background: loadingAI ? '#6B7280' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: 'clamp(0.9rem, 2.5vw, 1rem)',
                fontWeight: 600,
                cursor: loadingAI ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'Inter, sans-serif',
                boxSizing: 'border-box'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Analyzing...' : '🤖 Get AI Analysis'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))',
              border: '1px solid #8B5CF6',
              borderRadius: '8px',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ 
                color: '#8B5CF6', 
                marginBottom: '1rem', 
                fontSize: 'clamp(1rem, 3vw, 1.1rem)', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                🤖 AI Analysis
              </h3>
              <div style={{ 
                color: '#1F2937',
                background: '#ffffff',
                padding: 'clamp(0.75rem, 2vw, 1rem)',
                borderRadius: '6px',
                lineHeight: '1.7', 
                whiteSpace: 'pre-wrap',
                fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
                wordBreak: 'break-word'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Alignment Visualization */}
          <div>
            <h3 style={{ 
              color: '#374151', 
              marginBottom: '1rem', 
              fontSize: 'clamp(1rem, 3vw, 1.1rem)', 
              fontFamily: 'Montserrat, sans-serif' 
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