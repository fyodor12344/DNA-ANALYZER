import { useState } from 'react';

// Configuration for backend URL
const API_URL = import.meta.env.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

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
      console.log('📤 Sending mutation finder request to:', `${API_URL}/api/mutations`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${API_URL}/api/mutations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence1: validation1.cleaned,
          sequence2: validation2.cleaned
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📥 Mutations Response:', data);

      // Your backend returns: { summary: {...}, mutations: [...] }
      if (data && data.mutations !== undefined) {
        console.log('✅ Mutations received:', data.mutations.length);
        setMutations(data);
        setError('');
      } else {
        const errorMsg = data.error || 'Invalid response format';
        console.error('❌ Error:', errorMsg);
        setError(errorMsg);
        setMutations(null);
      }
    } catch (err) {
      console.error('💥 Exception:', err);
      let errorMsg = 'An unexpected error occurred';
      
      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out. The sequences might be too long or the server is slow. Try with shorter sequences.';
      } else if (err.message.includes('fetch')) {
        errorMsg = `Cannot connect to backend at ${API_URL}. Please check if the backend is running.`;
      } else {
        errorMsg = err.message;
      }
      
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for AI

      const response = await fetch(`${API_URL}/api/ai-explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'Mutation Finder',
          data: mutations
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
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
      let errorMsg = 'Failed to get AI explanation';
      
      if (err.name === 'AbortError') {
        errorMsg = 'AI explanation timed out. Please try again.';
      } else if (err.message.includes('fetch')) {
        errorMsg = 'Cannot connect to backend for AI explanation';
      } else {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
    } finally {
      setLoadingAI(false);
    }
  };

  const getMutationColor = (type) => {
    if (!type) return '#6B7280';
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .loading-text {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @media (max-width: 768px) {
          .seq-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      
      <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          <strong style={{ color: '#e2e8f0' }}>Backend URL:</strong> {API_URL}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
          Set VITE_API_URL in your .env file to change this
        </div>
      </div>

      <h2 style={{ fontFamily: 'Montserrat, sans-serif', marginBottom: '1.5rem', color: '#e2e8f0' }}>
        🔍 Mutation / SNP Finder
      </h2>
      
      <div className="seq-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#e2e8f0' 
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
              border: '1px solid #334155',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: '200px',
              background: '#1e293b',
              color: '#e2e8f0'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Length: {seq1.replace(/\s/g, '').length} bp
          </div>
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 600, 
            color: '#e2e8f0' 
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
              border: '1px solid #334155',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: '200px',
              background: '#1e293b',
              color: '#e2e8f0'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Length: {seq2.replace(/\s/g, '').length} bp
          </div>
        </div>
      </div>

      <button 
        onClick={handleFindMutations} 
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          background: loading ? '#475569' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
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
        <span className={loading ? 'loading-text' : ''}>
          {loading ? 'Analyzing sequences... This may take a moment on Render free tier' : '🔍 Find Mutations'}
        </span>
      </button>

      {error && (
        <div style={{
          background: '#7f1d1d',
          border: '2px solid #dc2626',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          color: '#fecaca'
        }}>
          <strong>⚠️ Error:</strong> {error}
          <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
            <p>Common issues:</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>Render free tier can be slow on first request (cold start)</li>
              <li>Check if backend URL is correct: {API_URL}</li>
              <li>Ensure CORS is enabled in your backend</li>
              <li>For large sequences, try breaking them into smaller chunks</li>
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
                background: loadingAI ? '#475569' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
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
              <span className={loadingAI ? 'loading-text' : ''}>
                {loadingAI ? 'Generating AI Analysis... This can take 30-60 seconds' : '🤖 Get AI Explanation'}
              </span>
            </button>
          </div>

          {/* AI Explanation Display */}
          {aiExplanation && (
            <div style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid #8B5CF6',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ 
                color: '#a78bfa', 
                marginBottom: '1rem',
                fontSize: '1.1rem',
                fontWeight: 600,
                fontFamily: 'Montserrat, sans-serif'
              }}>
                🤖 AI Analysis
              </h3>
              <div style={{ 
                color: '#e2e8f0',
                background: '#1e293b',
                padding: '1rem',
                borderRadius: '6px',
                lineHeight: '1.7',
                whiteSpace: 'pre-wrap',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.95rem',
                maxHeight: '400px',
                overflowY: 'auto',
                border: '1px solid #334155'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          {mutations.summary && (
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              border: '1px solid #334155'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#e2e8f0', fontWeight: 700 }}>
                📊 Summary
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <StatCard label="Total Mutations" value={mutations.summary.total_mutations || 0} color="#3B82F6" />
                <StatCard label="SNPs" value={mutations.summary.snps || 0} color="#06B6D4" />
                <StatCard label="Insertions" value={mutations.summary.insertions || 0} color="#F59E0B" />
                <StatCard label="Deletions" value={mutations.summary.deletions || 0} color="#EF4444" />
                <StatCard label="Silent" value={mutations.summary.silent_mutations || 0} color="#10B981" />
                <StatCard label="Missense" value={mutations.summary.missense_mutations || 0} color="#F59E0B" />
                <StatCard label="Nonsense" value={mutations.summary.nonsense_mutations || 0} color="#EF4444" />
              </div>
            </div>
          )}

          {/* Detailed Mutations Table */}
          {mutations.mutations && mutations.mutations.length > 0 && (
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              overflowX: 'auto',
              border: '1px solid #334155'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#e2e8f0', fontWeight: 700 }}>
                📋 Detailed Mutations ({mutations.mutations.length} found)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                  minWidth: '600px'
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #334155' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>Position</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>Type</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>Reference</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>Alternate</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, color: '#e2e8f0' }}>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutations.mutations.slice(0, 100).map((mut, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '0.75rem', color: '#cbd5e1' }}>{mut.position}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            background: '#0f172a',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            color: '#94a3b8',
                            border: '1px solid #334155'
                          }}>
                            {mut.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                          {mut.reference || mut.deleted_sequence || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                          {mut.alternate || mut.inserted_sequence || '-'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            backgroundColor: getMutationColor(mut.mutation_class) + '30',
                            color: getMutationColor(mut.mutation_class),
                            border: `1px solid ${getMutationColor(mut.mutation_class)}60`,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: 500
                          }}>
                            {mut.mutation_class || 'Unknown'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mutations.mutations.length > 100 && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.9rem'
                }}>
                  Showing 100 of {mutations.mutations.length} mutations
                </div>
              )}
            </div>
          )}

          {mutations.mutations && mutations.mutations.length === 0 && (
            <div style={{
              background: '#064e3b',
              border: '2px solid #10B981',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#6ee7b7',
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
      background: '#0f172a',
      borderRadius: '8px',
      padding: '1rem',
      textAlign: 'center',
      border: '1px solid #334155'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ color, fontSize: '1.75rem', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}