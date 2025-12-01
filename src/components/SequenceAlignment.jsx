import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SequenceAlignment = () => {
  const [sequence1, setSequence1] = useState('');
  const [sequence2, setSequence2] = useState('');
  const [algorithm, setAlgorithm] = useState('global');
  const [alignment, setAlignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const performAlignment = async () => {
    if (!sequence1 || !sequence2) {
      setError('Please enter both sequences');
      return;
    }

    setLoading(true);
    setError('');
    setAlignment(null);
    setAiExplanation('');

    try {
      const response = await fetch(`${API_URL}/api/align`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sequence1,
          sequence2,
          algorithm
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error performing alignment');
      }

      setAlignment(data);
    } catch (err) {
      setError(err.message || 'Error performing alignment');
    } finally {
      setLoading(false);
    }
  };

  const explainWithAI = async () => {
    if (!alignment) return;
    
    setLoadingAI(true);
    
    try {
      const response = await fetch(`${API_URL}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'Sequence Alignment',
          data: alignment
        })
      });

      const data = await response.json();
      setAiExplanation(data.explanation);
      
    } catch (err) {
      console.error('AI Error:', err);
      setAiExplanation('Error generating AI explanation. Please check backend connection.');
    } finally {
      setLoadingAI(false);
    }
  };

  const renderAlignment = () => {
    if (!alignment) return null;

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
        fontSize: '0.9rem',
        background: '#F9FAFB',
        padding: '1.5rem',
        borderRadius: '8px',
        overflowX: 'auto'
      }}>
        {chunks.map((chunk, idx) => (
          <div key={idx} style={{ marginBottom: '1.5rem' }}>
            <div style={{ color: '#6B7280', fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
              Position {chunk.start + 1} - {Math.min(chunk.start + chunkSize, align1.length)}
            </div>
            
            <div style={{ marginBottom: '0.25rem' }}>
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

            <div style={{ marginBottom: '0.25rem' }}>
              <span style={{ color: '#6B7280', fontWeight: 600 }}>      </span>
              {chunk.seq1.split('').map((char, i) => (
                <span key={i}>
                  {char === chunk.seq2[i] && char !== '-' ? '|' : ' '}
                </span>
              ))}
            </div>

            <div>
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
        ))}

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem',
          background: '#fff',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
            Legend:
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#D1FAE5', 
                border: '1px solid #10B981',
                borderRadius: '4px' 
              }}></div>
              <span style={{ color: '#6B7280' }}>Match</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#FEF3C7', 
                border: '1px solid #F59E0B',
                borderRadius: '4px' 
              }}></div>
              <span style={{ color: '#6B7280' }}>Mismatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                background: '#FEE2E2', 
                border: '1px solid #EF4444',
                borderRadius: '4px' 
              }}></div>
              <span style={{ color: '#6B7280' }}>Gap</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
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
      `}</style>
      
      <div style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        color: '#fff'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700, fontFamily: 'Montserrat, sans-serif' }}>
          Sequence Alignment
        </h1>
        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
          Compare DNA sequences using global or local alignment algorithms
        </p>
      </div>

      {/* Input Section */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
            First Sequence
          </label>
          <textarea
            value={sequence1}
            onChange={(e) => setSequence1(e.target.value.toUpperCase())}
            placeholder="Enter first DNA sequence (e.g., ATGCGATCG...)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
            Second Sequence
          </label>
          <textarea
            value={sequence2}
            onChange={(e) => setSequence2(e.target.value.toUpperCase())}
            placeholder="Enter second DNA sequence (e.g., ATGCAATCG...)"
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.75rem',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
            Alignment Algorithm
          </label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.75rem 1.5rem',
              border: `2px solid ${algorithm === 'global' ? '#10B981' : '#E5E7EB'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: algorithm === 'global' ? '#D1FAE5' : '#fff',
              flex: 1,
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                value="global"
                checked={algorithm === 'global'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>
                  Global Alignment
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Needleman-Wunsch (end-to-end)
                </div>
              </div>
            </label>

            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0.75rem 1.5rem',
              border: `2px solid ${algorithm === 'local' ? '#10B981' : '#E5E7EB'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              background: algorithm === 'local' ? '#D1FAE5' : '#fff',
              flex: 1,
              transition: 'all 0.3s ease'
            }}>
              <input
                type="radio"
                value="local"
                checked={algorithm === 'local'}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginRight: '0.5rem' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#1F2937' }}>
                  Local Alignment
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Smith-Waterman (best region)
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={performAlignment}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Aligning Sequences...' : 'Align Sequences'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#FEE2E2',
          border: '1px solid #EF4444',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#991B1B'
        }}>
          {error}
        </div>
      )}

      {/* Results Section */}
      {alignment && (
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: '#1F2937', marginBottom: '1.5rem', fontSize: '1.5rem', fontFamily: 'Montserrat, sans-serif' }}>
            Alignment Results
          </h2>

          <div style={{
            background: '#F0FDF4',
            border: '2px solid #10B981',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontWeight: 600, color: '#065F46', marginBottom: '0.5rem' }}>
              {alignment.algorithm}
            </div>
            <div style={{ color: '#065F46', fontSize: '0.9rem' }}>
              Alignment Score: {alignment.score}
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #10B98120, #10B98110)',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #10B981'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10B981' }}>
                {alignment.matches}
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Matches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #F59E0B20, #F59E0B10)',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #F59E0B'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F59E0B' }}>
                {alignment.mismatches}
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Mismatches
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #EF444420, #EF444410)',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #EF4444'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#EF4444' }}>
                {alignment.gaps}
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Gaps
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #3B82F620, #2563EB20)',
              padding: '1rem',
              borderRadius: '8px',
              border: '2px solid #3B82F6'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3B82F6' }}>
                {alignment.similarity_percentage}%
              </div>
              <div style={{ color: '#6B7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                Similarity
              </div>
            </div>
          </div>

          {/* AI Explanation Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              onClick={explainWithAI}
              disabled={loadingAI}
              style={{
                width: '100%',
                padding: '1rem',
                background: loadingAI ? '#6B7280' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loadingAI ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : 'Interpret with AI'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))',
              border: '1px solid #8B5CF6',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ 
                color: '#8B5CF6', 
                marginBottom: '1rem', 
                fontSize: '1.1rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontFamily: 'Montserrat, sans-serif'
              }}>
                AI Interpretation
              </h3>
              <div style={{ 
                color: '#1F2937',
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '6px',
                lineHeight: '1.7', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Alignment Visualization */}
          <div>
            <h3 style={{ color: '#374151', marginBottom: '1rem', fontSize: '1.1rem', fontFamily: 'Montserrat, sans-serif' }}>
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