import { useState } from 'react';
import { performAlignment, getAIExplanation, validateSequence } from '../utils/apiUtils';;

export default function PrimerDesigner() {
  const [sequence, setSequence] = useState('');
  const [primers, setPrimers] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCandidates, setShowCandidates] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const handleDesignPrimers = async () => {
    if (!sequence.trim()) {
      setError('Please enter a DNA sequence');
      return;
    }

    // Validate sequence
    const validation = validateSequence(sequence);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const cleanSeq = validation.cleaned;
    
    let productSizeRange = [200, 500];
    if (cleanSeq.length < 150) {
      const adjustedMin = 50;
      const adjustedMax = Math.max(60, cleanSeq.length - 30);
      productSizeRange = [adjustedMin, adjustedMax];
    }

    setLoading(true);
    setError('');
    setAiExplanation('');
    setPrimers(null);

    const response = await designPrimers(cleanSeq, 60, 20, productSizeRange);

    setLoading(false);

    if (response.success) {
      setPrimers(response.data);
    } else {
      setError(response.error);
    }
  };

  const handleExplainWithAI = async () => {
    if (!primers) return;
    
    setLoadingAI(true);
    
    const response = await getAIExplanation('PCR Primer Designer', primers);
    
    setLoadingAI(false);
    
    if (response.success) {
      setAiExplanation(response.data.explanation);
    } else {
      setError(response.error);
    }
  };

  const getQualityColor = (grade) => {
    const colors = {
      'Excellent': '#10B981',
      'Good': '#00A389',
      'Fair': '#F59E0B',
      'Poor': '#EF4444'
    };
    return colors[grade] || '#6B7280';
  };

  const getRiskColor = (risk) => {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#EF4444'
    };
    return colors[risk] || '#6B7280';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
  };

  const renderPrimer = (primer, type) => {
    if (!primer) {
      return (
        <div style={{ 
          padding: '2rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          borderRadius: '12px',
          color: '#EF4444',
          textAlign: 'center'
        }}>
          No suitable {type} primer found
        </div>
      );
    }

    return (
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '16px',
        padding: '1.5rem',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ color: '#00FFC6', margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
            {type} Primer
          </h4>
          <span style={{
            background: `${getQualityColor(primer.quality_grade)}20`,
            color: getQualityColor(primer.quality_grade),
            border: `1px solid ${getQualityColor(primer.quality_grade)}`,
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 600
          }}>
            {primer.quality_grade} ({primer.quality_score}/100)
          </span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Sequence:</span>
            <button 
              onClick={() => copyToClipboard(primer.sequence)}
              style={{
                background: 'rgba(0, 255, 198, 0.1)',
                border: '1px solid #00FFC6',
                color: '#00FFC6',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              📋 Copy
            </button>
          </div>
          <div style={{
            background: '#0f172a',
            padding: '1rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '1rem',
            color: '#00FFC6',
            wordBreak: 'break-all',
            letterSpacing: '2px'
          }}>
            {primer.sequence}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <PropertyItem label="Length" value={`${primer.length} bp`} />
          <PropertyItem label="Tm" value={`${primer.tm}°C`} />
          <PropertyItem label="GC Content" value={`${primer.gc_content}%`} />
          <PropertyItem label="Position" value={primer.position} />
        </div>

        {primer.hairpin && primer.gc_clamp && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              Advanced Analysis:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <AnalysisItem 
                label="Hairpin Risk" 
                value={primer.hairpin.risk_level}
                color={getRiskColor(primer.hairpin.risk_level)}
              />
              <AnalysisItem 
                label="GC Clamp" 
                value={primer.gc_clamp.has_clamp ? 'Yes' : 'No'}
                color={primer.gc_clamp.has_clamp ? '#10B981' : '#F59E0B'}
              />
            </div>
          </div>
        )}

        {(primer.issues?.length > 0 || primer.warnings?.length > 0) && (
          <div>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              Quality Check:
            </div>
            
            {primer.issues?.length > 0 && (
              <div style={{ marginBottom: '0.5rem' }}>
                {primer.issues.map((issue, idx) => (
                  <div key={idx} style={{
                    color: '#EF4444',
                    fontSize: '0.85rem',
                    padding: '0.25rem 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <span>⚠️</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
            
            {primer.warnings?.length > 0 && (
              <div>
                {primer.warnings.map((warning, idx) => (
                  <div key={idx} style={{
                    color: '#F59E0B',
                    fontSize: '0.85rem',
                    padding: '0.25rem 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <span>ℹ️</span>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      padding: '2rem',
      color: '#fff'
    }}>
      <style>{`
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

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00FFC6 0%, #00A389 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.5rem'
          }}>
            🧬 PCR Primer Designer
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Advanced primer design with AI-powered explanations
          </p>
        </div>

        <div style={{
          background: 'rgba(0, 255, 198, 0.1)',
          border: '1px solid #00FFC6',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: 0, color: '#e2e8f0' }}>
            <strong style={{ color: '#00FFC6' }}>ℹ️ About:</strong> This tool uses nearest-neighbor thermodynamics 
            for accurate Tm calculation, checks for hairpins and primer dimers, and provides PCR protocol recommendations.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontWeight: 500 }}>
            Target DNA Sequence
          </label>
          <textarea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="ATGCTAGGATCGTACCTTGATCGGAATTCGATCGTACGATTAAGCTAGCTT..."
            style={{
              width: '100%',
              minHeight: '120px',
              background: '#1e293b',
              border: '2px solid #334155',
              borderRadius: '12px',
              padding: '1rem',
              color: '#fff',
              fontSize: '1rem',
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Length: {sequence.replace(/[^ATGC]/gi, '').length} bp
            {sequence.replace(/[^ATGC]/gi, '').length < 150 && sequence.replace(/[^ATGC]/gi, '').length > 0 && 
              <span style={{ color: '#F59E0B', marginLeft: '1rem' }}>
                ⚠️ Short sequence - parameters will be auto-adjusted
              </span>
            }
          </div>
        </div>

        <button 
          onClick={handleDesignPrimers}
          disabled={loading}
          style={{
            width: '100%',
            padding: '1rem',
            background: loading ? '#334155' : 'linear-gradient(135deg, #00FFC6 0%, #00A389 100%)',
            border: 'none',
            borderRadius: '12px',
            color: loading ? '#94a3b8' : '#0f172a',
            fontSize: '1.1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Designing...' : '🚀 Design Primers'}
        </button>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#EF4444',
            whiteSpace: 'pre-wrap'
          }}>
            {error}
          </div>
        )}

        {primers && (
          <div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <StatCard label="Product Size" value={`${primers.expected_product_size} bp`} />
              <StatCard label="Tm Difference" value={`${primers.tm_difference?.toFixed(1)}°C`} />
              <StatCard 
                label="Compatibility" 
                value={primers.tm_difference < 5 ? 'Excellent' : 'Acceptable'}
                color={primers.tm_difference < 5 ? '#10B981' : '#F59E0B'}
              />
              {primers.dimer_analysis && (
                <StatCard 
                  label="Dimer Risk" 
                  value={primers.dimer_analysis.risk_level}
                  color={getRiskColor(primers.dimer_analysis.risk_level)}
                />
              )}
            </div>

            <button
              onClick={handleExplainWithAI}
              disabled={loadingAI}
              style={{
                width: '100%',
                padding: '1rem',
                background: loadingAI ? '#334155' : 'rgba(139, 92, 246, 0.2)',
                border: '2px solid #8B5CF6',
                borderRadius: '12px',
                color: loadingAI ? '#94a3b8' : '#C4B5FD',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: loadingAI ? 'not-allowed' : 'pointer',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'AI Analysis in Progress...' : '🤖 Get AI Explanation'}
            </button>

            {aiExplanation && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.08) 100%)',
                border: '2px solid #8B5CF6',
                borderRadius: '16px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}>
                <h3 style={{ 
                  color: '#C4B5FD', 
                  marginBottom: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '1.2rem',
                  fontWeight: 700
                }}>
                  🤖 AI Explanation
                </h3>
                <div style={{ 
                  color: '#F3F4F6',
                  lineHeight: '1.8', 
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.95rem',
                  background: 'rgba(15, 23, 42, 0.5)',
                  padding: '1rem',
                  borderRadius: '8px'
                }}>
                  {aiExplanation}
                </div>
              </div>
            )}

            <h3 style={{ color: '#00FFC6', marginBottom: '1rem', fontSize: '1.3rem' }}>Recommended Primers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {renderPrimer(primers.forward_primer, 'Forward')}
              {renderPrimer(primers.reverse_primer, 'Reverse')}
            </div>

            {primers.pcr_protocol && (
              <PCRProtocol protocol={primers.pcr_protocol} />
            )}

            {primers.all_candidates && primers.all_candidates.length > 0 && (
              <AlternativeCandidates 
                candidates={primers.all_candidates}
                showCandidates={showCandidates}
                setShowCandidates={setShowCandidates}
                getQualityColor={getQualityColor}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertyItem({ label, value }) {
  return (
    <div style={{
      background: '#0f172a',
      padding: '0.75rem',
      borderRadius: '8px'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color: '#fff', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function AnalysisItem({ label, value, color }) {
  return (
    <div style={{
      background: '#0f172a',
      padding: '0.5rem',
      borderRadius: '6px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{label}</span>
      <span style={{ color, fontWeight: 600, fontSize: '0.85rem' }}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color = '#00FFC6' }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: '16px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      textAlign: 'center'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ color, fontSize: '1.75rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function PCRProtocol({ protocol }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: '16px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      marginBottom: '2rem'
    }}>
      <h3 style={{ color: '#00FFC6', marginBottom: '1rem' }}>🧪 Recommended PCR Protocol</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <ProtocolItem label="Annealing Temp" value={`${protocol.annealing_temp}°C`} />
        <ProtocolItem label="Extension Time" value={`${protocol.extension_time}s`} />
        <ProtocolItem label="Cycles" value={protocol.cycles} />
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Polymerase:</div>
        <div style={{ color: '#e2e8f0' }}>{protocol.polymerase}</div>
      </div>
      
      {protocol.notes?.length > 0 && (
        <div>
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Notes:</div>
          {protocol.notes.map((note, idx) => (
            <div key={idx} style={{ color: '#F59E0B', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
              • {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProtocolItem({ label, value }) {
  return (
    <div style={{
      background: '#0f172a',
      padding: '1rem',
      borderRadius: '8px',
      textAlign: 'center'
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ color: '#00FFC6', fontSize: '1.25rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function AlternativeCandidates({ candidates, showCandidates, setShowCandidates, getQualityColor }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: '#00FFC6', margin: 0 }}>Alternative Candidates</h3>
        <button
          onClick={() => setShowCandidates(!showCandidates)}
          style={{
            background: 'transparent',
            border: '1px solid #00FFC6',
            color: '#00FFC6',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          {showCandidates ? 'Hide' : 'Show'} ({candidates.length})
        </button>
      </div>

      {showCandidates && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {candidates.map((primer, idx) => (
            <div key={idx} style={{
              background: '#1e293b',
              borderRadius: '8px',
              padding: '1rem',
              border: '1px solid #334155'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: '#00FFC6', fontWeight: 600 }}>{primer.type}</span>
                <span style={{ color: getQualityColor(primer.quality_grade) }}>
                  {primer.quality_grade}
                </span>
              </div>
              <div style={{ fontFamily: 'monospace', color: '#cbd5e1', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                {primer.sequence}
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                Tm: {primer.tm}°C | GC: {primer.gc_content}% | Len: {primer.length} bp
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}