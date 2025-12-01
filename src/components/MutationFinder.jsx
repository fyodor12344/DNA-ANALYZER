import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';

export default function MutationFinder() {
  const [seq1, setSeq1] = useState('');
  const [seq2, setSeq2] = useState('');
  const [mutations, setMutations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const handleFindMutations = async () => {
    if (!seq1.trim() || !seq2.trim()) {
      setError('Please enter both sequences');
      return;
    }

    // Validate sequences
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

    const response = await findMutations(validation1.cleaned, validation2.cleaned);

    setLoading(false);

    if (response.success) {
      setMutations(response.data);
    } else {
      setError(response.error);
    }
  };

  const handleExplainWithAI = async () => {
    if (!mutations) return;
    
    setLoadingAI(true);
    
    const response = await getAIExplanation('Mutation Finder', mutations);
    
    setLoadingAI(false);
    
    if (response.success) {
      setAiExplanation(response.data.explanation);
    } else {
      setError(response.error);
    }
  };

  const getMutationColor = (type) => {
    if (type.includes('Silent')) return '#10B981';
    if (type.includes('Missense')) return '#F59E0B';
    if (type.includes('Nonsense')) return '#EF4444';
    return '#6B7280';
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="analysis-section">
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
      
      <h2 style={{ fontFamily: 'Montserrat, sans-serif' }} className="section-title">
        Mutation / SNP Finder
      </h2>
      
      <div className="dual-sequence-input">
        <div className="sequence-input-group">
          <label className="input-label">Reference Sequence</label>
          <textarea
            value={seq1}
            onChange={(e) => setSeq1(e.target.value)}
            placeholder="Enter reference DNA sequence..."
            className="dna-input"
            rows={5}
          />
        </div>

        <div className="sequence-input-group">
          <label className="input-label">Alternate Sequence</label>
          <textarea
            value={seq2}
            onChange={(e) => setSeq2(e.target.value)}
            placeholder="Enter alternate DNA sequence..."
            className="dna-input"
            rows={5}
          />
        </div>
      </div>

      <button 
        onClick={handleFindMutations} 
        className="analyze-btn"
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
      >
        {loading && <span className="loading-spinner"></span>}
        {loading ? 'Analyzing...' : 'Find Mutations'}
      </button>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {mutations && (
        <div className="results-container">
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
                gap: '0.5rem',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : 'Get AI Explanation'}
            </button>
          </div>

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
                fontSize: '0.95rem'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          <div className="mutation-summary">
            <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
              Summary
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Mutations</div>
                <div className="stat-value">{mutations.summary.total_mutations}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">SNPs</div>
                <div className="stat-value">{mutations.summary.snps}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Insertions</div>
                <div className="stat-value">{mutations.summary.insertions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Deletions</div>
                <div className="stat-value">{mutations.summary.deletions}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Silent</div>
                <div className="stat-value" style={{ color: '#10B981' }}>
                  {mutations.summary.silent_mutations}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Missense</div>
                <div className="stat-value" style={{ color: '#F59E0B' }}>
                  {mutations.summary.missense_mutations}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Nonsense</div>
                <div className="stat-value" style={{ color: '#EF4444' }}>
                  {mutations.summary.nonsense_mutations}
                </div>
              </div>
            </div>
          </div>

          {mutations.mutations.length > 0 && (
            <div className="mutation-table-container">
              <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
                Detailed Mutations
              </h3>
              <div className="table-wrapper">
                <table className="mutation-table">
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Type</th>
                      <th>Reference</th>
                      <th>Alternate</th>
                      <th>Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mutations.mutations.map((mut, idx) => (
                      <tr key={idx}>
                        <td className="position-cell">{mut.position}</td>
                        <td className="type-cell">
                          <span className="type-badge">{mut.type}</span>
                        </td>
                        <td className="base-cell">{mut.reference || mut.deleted_sequence}</td>
                        <td className="base-cell">{mut.alternate || mut.inserted_sequence}</td>
                        <td className="classification-cell">
                          <span 
                            className="classification-badge"
                            style={{ 
                              backgroundColor: getMutationColor(mut.mutation_class) + '20',
                              color: getMutationColor(mut.mutation_class),
                              border: `1px solid ${getMutationColor(mut.mutation_class)}50`
                            }}
                          >
                            {mut.mutation_class}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mutations.mutations.length === 0 && (
            <div className="no-mutations">
              No mutations detected - sequences are identical
            </div>
          )}
        </div>
      )}
    </div>
  );
}