import { useState } from 'react';

export default function MutationFinder() {
  const [seq1, setSeq1] = useState('');
  const [seq2, setSeq2] = useState('');
  const [mutations, setMutations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const validateSequence = (seq) => {
    const cleaned = seq.toUpperCase().replace(/\s/g, '');
    if (!cleaned) return { valid: false, error: 'Sequence cannot be empty' };
    if (!/^[ATGC]+$/.test(cleaned)) return { valid: false, error: 'Invalid characters. Only ATGC allowed' };
    return { valid: true, cleaned };
  };

  const handleFindMutations = async () => {
    if (!seq1.trim() || !seq2.trim()) {
      setError('Please enter both sequences');
      return;
    }

    const validation1 = validateSequence(seq1);
    const validation2 = validateSequence(seq2);

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
    setAiExplanation('');
    setMutations(null);

    try {
      console.log('📤 Sending mutation finder request...');

      const response = await fetch('http://localhost:5000/api/mutations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence1: validation1.cleaned,
          sequence2: validation2.cleaned
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Mutations Response:', data);

      // Your backend returns: { summary: {...}, mutations: [...] }
      if (data && data.mutations !== undefined) {
        console.log('✅ Mutations received:', data.mutations.length);
        setMutations(data); // Store the full response with summary and mutations
        setError('');
      } else {
        const errorMsg = data.error || 'Invalid response format';
        console.error('❌ Error:', errorMsg);
        setError(errorMsg);
        setMutations(null);
      }
    } catch (err) {
      console.error('💥 Exception:', err);
      const errorMsg = err.message || 'Failed to connect to backend';
      setError(errorMsg);
      setMutations(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainWithAI = async () => {
    if (!mutations) return;
    
    setLoadingAI(true);
    setError('');
    
    try {
      console.log('📤 Sending AI explanation request...');

      const response = await fetch('http://localhost:5000/api/ai-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Mutation Finder',
          data: mutations
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 AI Response:', data);

      if (data.success) {
        const explanation = data.data?.explanation || data.explanation || 'No explanation available';
        setAiExplanation(explanation);
      } else {
        const errorMsg = data.error || 'Failed to generate explanation';
        setError(errorMsg);
      }
    } catch (err) {
      console.error('💥 Exception:', err);
      setError(err.message || 'Failed to get AI explanation');
    } finally {
      setLoadingAI(false);
    }
  };

  const getMutationColor = (type) => {
    if (type.includes('Silent')) return '#10B981';
    if (type.includes('Missense')) return '#F59E0B';
    if (type.includes('Nonsense')) return '#EF4444';
    return '#6B7280';
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
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
      
      <h2 style={{ fontFamily: 'Montserrat, sans-serif', marginBottom: '1.5rem', color: '#1F2937' }}>
        🔍 Mutation / SNP Finder
      </h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#1F2937' 
          }}>
            Reference Sequence
          </label>
          <textarea
            value={seq1}
            onChange={(e) => setSeq1(e.target.value)}
            placeholder="Enter reference DNA sequence (ATGC)..."
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: '200px',
              backgroundColor: '#1F2937',
              color: '#fff'
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#1F2937' 
          }}>
            Alternate Sequence
          </label>
          <textarea
            value={seq2}
            onChange={(e) => setSeq2(e.target.value)}
            placeholder="Enter alternate DNA sequence (ATGC)..."
            style={{
              width: '100%',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: '200px',
              backgroundColor: '#1F2937',
              color: '#fff'
            }}
          />
        </div>
      </div>

      <button 
        onClick={handleFindMutations} 
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          background: loading ? '#6B7280' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s'
        }}
      >
        {loading && <span className="loading-spinner"></span>}
        {loading ? 'Analyzing...' : '🔍 Find Mutations'}
      </button>

      {error && (
        <div style={{
          background: '#FEE2E2',
          border: '2px solid #EF4444',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          color: '#991B1B'
        }}>
          <strong>⚠️ Error:</strong> {error}
          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            <p>Check:</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Backend running on http://localhost:5000</li>
              <li>CORS enabled</li>
              <li>GROQ_API_KEY set in .env</li>
            </ul>
          </div>
        </div>
      )}

      {mutations && (
        <div>
          {/* AI Explanation Button */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              onClick={handleExplainWithAI}
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
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : '🤖 Get AI Explanation'}
            </button>
          </div>

          {/* AI Explanation Display */}
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
                fontFamily: 'Montserrat, sans-serif'
              }}>
                🤖 AI Analysis
              </h3>
              <div style={{ 
                color: '#1F2937',
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '6px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          {mutations.summary && (
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#1F2937', fontWeight: 700 }}>
                📊 Summary
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <StatCard label="Total Mutations" value={mutations.summary.total_mutations} color="#3B82F6" />
                <StatCard label="SNPs" value={mutations.summary.snps} color="#06B6D4" />
                <StatCard label="Insertions" value={mutations.summary.insertions} color="#F59E0B" />
                <StatCard label="Deletions" value={mutations.summary.deletions} color="#EF4444" />
                <StatCard label="Silent" value={mutations.summary.silent_mutations} color="#10B981" />
                <StatCard label="Missense" value={mutations.summary.missense_mutations} color="#F59E0B" />
                <StatCard label="Nonsense" value={mutations.summary.nonsense_mutations} color="#EF4444" />
              </div>
            </div>
          )}

          {/* Detailed Mutations Table */}
          {mutations.mutations && mutations.mutations.length > 0 && (
            <div style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              overflowX: 'auto'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#1F2937', fontWeight: 700 }}>
                📋 Detailed Mutations
              </h3>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#1F2937' }}>Position</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#1F2937' }}>Type</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#1F2937' }}>Reference</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#1F2937' }}>Alternate</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#1F2937' }}>Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {mutations.mutations.slice(0, 50).map((mut, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '0.75rem', color: '#1F2937' }}>{mut.position}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          background: '#F3F4F6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          {mut.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#1F2937' }}>
                        {mut.reference || mut.deleted_sequence || '-'}
                      </td>
                      <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#1F2937' }}>
                        {mut.alternate || mut.inserted_sequence || '-'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          backgroundColor: getMutationColor(mut.mutation_class) + '20',
                          color: getMutationColor(mut.mutation_class),
                          border: `1px solid ${getMutationColor(mut.mutation_class)}50`,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 500
                        }}>
                          {mut.mutation_class}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {mutations.mutations.length > 50 && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: '0.9rem'
                }}>
                  Showing 50 of {mutations.mutations.length} mutations
                </div>
              )}
            </div>
          )}

          {mutations.mutations && mutations.mutations.length === 0 && (
            <div style={{
              background: '#D1FAE5',
              border: '2px solid #10B981',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#065F46',
              textAlign: 'center',
              fontWeight: 600
            }}>
              ✅ No mutations detected - sequences are identical!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ color, fontSize: '1.75rem', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}