import { useState, useEffect } from 'react';

// Configuration for backend URL
const API_URL = import.meta.env.VITE_API_URL || 'https://dna-analyzer-1-ipxr.onrender.com';

// Genetic code table
const CODON_TABLE = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

// Biological consequence explanations
const MUTATION_EXPLANATIONS = {
  'Silent': {
    short: 'No amino acid change',
    long: 'Silent mutations do not change the amino acid sequence due to genetic code redundancy. The protein function is typically preserved.',
    icon: '✓',
    color: '#10B981'
  },
  'Missense': {
    short: 'Amino acid substitution',
    long: 'Amino acid change may alter protein structure or function. Effects range from benign to severe depending on the biochemical properties of the substituted amino acid.',
    icon: '⚠',
    color: '#F59E0B'
  },
  'Nonsense': {
    short: 'Premature termination',
    long: 'Premature stop codon may produce truncated protein. This often results in loss of protein function and can have significant biological consequences.',
    icon: '⛔',
    color: '#EF4444'
  }
};

export default function MutationFinder() {
  const [seq1, setSeq1] = useState('');
  const [seq2, setSeq2] = useState('');
  const [mutations, setMutations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [readingFrame, setReadingFrame] = useState('');
  const [strand, setStrand] = useState('');
  
  const [showCodonPreview, setShowCodonPreview] = useState(false);
  const [previewSequence, setPreviewSequence] = useState('');
  
  // Frameshift detection
  const [frameshiftDetected, setFrameshiftDetected] = useState(false);
  const [frameshiftInfo, setFrameshiftInfo] = useState(null);

  const validateSequence = (seq) => {
    const cleaned = seq.toUpperCase().replace(/\s/g, '');
    if (!cleaned) return { valid: false, error: 'Sequence cannot be empty' };
    if (!/^[ATGC]+$/.test(cleaned)) return { valid: false, error: 'Invalid characters. Only ATGC allowed' };
    return { valid: true, cleaned };
  };

  const dnaToRna = (dna) => {
    return dna.replace(/T/g, 'U');
  };

  const translateCodon = (codon) => {
    const rnaCodon = dnaToRna(codon);
    return CODON_TABLE[rnaCodon] || '?';
  };

  const reverseComplement = (seq) => {
    const complement = { 'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G' };
    return seq.split('').reverse().map(base => complement[base] || base).join('');
  };

  const parseIntoCodons = (sequence, frame) => {
    if (!sequence || !frame) return [];
    
    const offset = parseInt(frame) - 1;
    const codons = [];
    
    for (let i = offset; i < sequence.length; i += 3) {
      const codon = sequence.substring(i, i + 3);
      if (codon.length === 3) {
        codons.push({
          codon: codon,
          position: i,
          aminoAcid: translateCodon(codon)
        });
      }
    }
    
    return codons;
  };

  // Detect frameshift mutations
  const detectFrameshift = (mutationData) => {
    if (!mutationData || !mutationData.mutations) return;

    const indels = mutationData.mutations.filter(
      mut => mut.type === 'Insertion' || mut.type === 'Deletion'
    );

    for (const indel of indels) {
      const length = indel.type === 'Insertion' 
        ? (indel.inserted_sequence?.length || 0)
        : (indel.deleted_sequence?.length || 0);

      if (length % 3 !== 0) {
        // Frameshift detected!
        const validation1 = validateSequence(seq1);
        const validation2 = validateSequence(seq2);
        
        if (validation1.valid && validation2.valid) {
          let seq1Clean = validation1.cleaned;
          let seq2Clean = validation2.cleaned;
          
          if (strand === 'reverse') {
            seq1Clean = reverseComplement(seq1Clean);
            seq2Clean = reverseComplement(seq2Clean);
          }

          // Find first stop codon after frameshift
          const offset = parseInt(readingFrame) - 1;
          const frameshiftPos = indel.position + length;
          
          let firstStopCodon = null;
          for (let i = frameshiftPos + offset; i < seq2Clean.length; i += 3) {
            const codon = seq2Clean.substring(i, i + 3);
            if (codon.length === 3) {
              const aa = translateCodon(codon);
              if (aa === '*') {
                firstStopCodon = { position: i, codon: codon };
                break;
              }
            }
          }

          setFrameshiftDetected(true);
          setFrameshiftInfo({
            position: indel.position,
            type: indel.type,
            length: length,
            codon: indel.type === 'Insertion' 
              ? seq2Clean.substring(indel.position, indel.position + 3)
              : seq1Clean.substring(indel.position, indel.position + 3),
            firstStopCodon: firstStopCodon
          });
          return;
        }
      }
    }

    setFrameshiftDetected(false);
    setFrameshiftInfo(null);
  };

  // Calculate mutation confidence
  const getMutationConfidence = (mutation) => {
    // High confidence: clear SNP with definitive codon change
    if (mutation.type === 'SNP' && mutation.reference_codon && mutation.alternate_codon) {
      const refLength = mutation.reference_codon.length;
      const altLength = mutation.alternate_codon.length;
      if (refLength === 3 && altLength === 3) {
        return { level: 'High', reason: 'Clear codon change' };
      }
    }

    // Moderate confidence: frame-dependent or indels
    if (mutation.type === 'Insertion' || mutation.type === 'Deletion') {
      return { level: 'Moderate', reason: 'Frame-dependent interpretation' };
    }

    // Default moderate
    return { level: 'Moderate', reason: 'Frame-dependent interpretation' };
  };

  useEffect(() => {
    if (readingFrame && seq1) {
      const validation = validateSequence(seq1);
      if (validation.valid) {
        let processedSeq = validation.cleaned;
        if (strand === 'reverse') {
          processedSeq = reverseComplement(processedSeq);
        }
        setPreviewSequence(processedSeq.substring(0, 60));
      }
    }
  }, [readingFrame, strand, seq1]);

  useEffect(() => {
    if (mutations) {
      detectFrameshift(mutations);
    }
  }, [mutations, readingFrame, strand]);

  const handleFindMutations = async () => {
    if (!seq1.trim() || !seq2.trim()) {
      setError('Please enter both sequences');
      return;
    }

    if (!readingFrame || !strand) {
      setError('Please select both Reading Frame and Strand before analyzing mutations');
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
    setFrameshiftDetected(false);
    setFrameshiftInfo(null);

    try {
      console.log('📤 Sending mutation finder request to:', `${API_URL}/api/mutations`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}/api/mutations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sequence1: validation1.cleaned,
          sequence2: validation2.cleaned,
          reading_frame: parseInt(readingFrame),
          strand: strand
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
    setAiExplanation('');

    try {
      console.log('📤 Sending AI explanation request...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_URL}/api/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'Mutation Finder',
          data: mutations
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('AI response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI explanation failed');
      }

      const data = await response.json();
      console.log('📥 AI Response:', data);

      const explanation =
        data.explanation ||
        data.output_text ||
        data.data?.explanation ||
        data.choices?.[0]?.message?.content;

      if (!explanation) {
        throw new Error('AI returned no explanation text');
      }

      setAiExplanation(explanation);
    } catch (err) {
      console.error('💥 AI Exception:', err);
      setError(
        err.name === 'AbortError'
          ? 'AI explanation timed out'
          : err.message || 'Failed to get AI explanation'
      );
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

  // Render Before/After Codon Alignment
  const renderCodonAlignment = (mutation) => {
    const refCodon = mutation.reference_codon || mutation.reference || '---';
    const altCodon = mutation.alternate_codon || mutation.alternate || mutation.inserted_sequence || '---';
    
    const refAA = refCodon.length === 3 ? translateCodon(refCodon) : '-';
    const altAA = altCodon.length === 3 ? translateCodon(altCodon) : '-';
    
    const isMutated = refCodon !== altCodon;

    return (
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '0.5rem'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '100px 1fr',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Reference */}
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#94a3b8',
            fontWeight: 600 
          }}>
            Reference:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              background: isMutated ? 'rgba(59, 130, 246, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `2px solid ${isMutated ? '#3B82F6' : '#64748b'}`,
              borderRadius: '6px',
              padding: '0.25rem 0.75rem',
              color: '#e2e8f0',
              fontWeight: 600,
              letterSpacing: '2px'
            }}>
              {refCodon}
            </span>
            <span style={{ color: '#64748b', fontSize: '1.2rem' }}>→</span>
            <span style={{
              fontSize: '1rem',
              color: '#60A5FA',
              fontWeight: 700,
              background: 'rgba(96, 165, 250, 0.15)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px'
            }}>
              {refAA}
            </span>
          </div>

          {/* Mutant */}
          <div style={{ 
            fontSize: '0.85rem', 
            color: '#94a3b8',
            fontWeight: 600 
          }}>
            Mutant:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              background: isMutated ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              border: `2px solid ${isMutated ? '#EF4444' : '#64748b'}`,
              borderRadius: '6px',
              padding: '0.25rem 0.75rem',
              color: '#e2e8f0',
              fontWeight: 600,
              letterSpacing: '2px'
            }}>
              {altCodon}
            </span>
            <span style={{ color: '#64748b', fontSize: '1.2rem' }}>→</span>
            <span style={{
              fontSize: '1rem',
              color: '#F59E0B',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.15)',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px'
            }}>
              {altAA}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCodonPreview = () => {
    if (!previewSequence || !readingFrame) return null;

    const codons = parseIntoCodons(previewSequence, readingFrame);
    const offset = parseInt(readingFrame) - 1;

    return (
      <div style={{
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1rem'
      }}>
        <div style={{
          fontSize: '0.85rem',
          color: '#94a3b8',
          marginBottom: '0.75rem',
          fontWeight: 600
        }}>
          🔬 Codon Preview (Frame +{readingFrame}, {strand})
        </div>
        
        <div style={{
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          marginBottom: '0.5rem',
          color: '#64748b'
        }}>
          {previewSequence.split('').map((base, idx) => (
            <span key={idx} style={{ marginRight: idx % 10 === 9 ? '8px' : '0' }}>
              {idx % 10 === 0 ? '|' : ''}
            </span>
          ))}
        </div>

        {offset > 0 && (
          <span style={{
            fontFamily: 'monospace',
            fontSize: '1rem',
            color: '#64748b',
            opacity: 0.5
          }}>
            {previewSequence.substring(0, offset)}
          </span>
        )}

        <div style={{ display: 'inline-block' }}>
          {codons.map((codonData, idx) => (
            <span key={idx} style={{ display: 'inline-block', marginRight: '8px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid #3B82F6',
                borderRadius: '4px',
                padding: '2px 4px',
                color: '#e2e8f0',
                letterSpacing: '1px'
              }}>
                {codonData.codon}
              </span>
              <span style={{
                fontSize: '0.75rem',
                color: '#60A5FA',
                marginLeft: '2px',
                fontWeight: 600
              }}>
                {codonData.aminoAcid}
              </span>
            </span>
          ))}
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: '#64748b',
          marginTop: '0.75rem',
          fontStyle: 'italic'
        }}>
          💡 Codon interpretation depends on the selected reading frame. Change the frame to see different groupings.
        </div>
      </div>
    );
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

        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .frameshift-banner {
          animation: slideIn 0.5s ease-out;
        }

        @media (max-width: 768px) {
          .seq-grid {
            grid-template-columns: 1fr !important;
          }
          .config-grid {
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

      {/* Frameshift Detection Banner */}
      {frameshiftDetected && frameshiftInfo && (
        <div className="frameshift-banner" style={{
          background: 'linear-gradient(135deg, #DC2626, #991B1B)',
          border: '2px solid #FCA5A5',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ 
              fontSize: '2rem',
              background: 'rgba(254, 202, 202, 0.2)',
              padding: '0.5rem',
              borderRadius: '8px'
            }}>
              ⚠️
            </div>
            <div>
              <h3 style={{ 
                color: '#FEF2F2', 
                margin: 0,
                fontSize: '1.3rem',
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif'
              }}>
                Frameshift Detected!
              </h3>
              <p style={{ 
                color: '#FCA5A5', 
                margin: '0.25rem 0 0 0',
                fontSize: '0.9rem'
              }}>
                {frameshiftInfo.type} of {frameshiftInfo.length} base(s) at position {frameshiftInfo.position}
              </p>
            </div>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '1rem',
            border: '1px solid rgba(254, 202, 202, 0.2)'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#FEF2F2', lineHeight: '1.7' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>📍 Frameshift begins at codon:</strong> 
                <span style={{
                  marginLeft: '0.5rem',
                  fontFamily: 'monospace',
                  background: 'rgba(254, 202, 202, 0.2)',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  fontWeight: 600
                }}>
                  {frameshiftInfo.codon}
                </span>
              </div>
              
              {frameshiftInfo.firstStopCodon && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <strong>🛑 First premature stop codon at position {frameshiftInfo.firstStopCodon.position}:</strong>
                  <span style={{
                    marginLeft: '0.5rem',
                    fontFamily: 'monospace',
                    background: 'rgba(254, 202, 202, 0.2)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}>
                    {frameshiftInfo.firstStopCodon.codon}
                  </span>
                </div>
              )}

              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid rgba(254, 202, 202, 0.2)',
                fontSize: '0.85rem',
                color: '#FCA5A5',
                fontStyle: 'italic'
              }}>
                💡 <strong>Biological Impact:</strong> Frameshifts alter all downstream codons, 
                typically resulting in completely different amino acid sequences and often premature 
                termination. This usually produces non-functional proteins.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reading Frame & Strand Configuration */}
      <div style={{
        background: '#1e293b',
        border: '2px solid #3B82F6',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ 
          color: '#60A5FA', 
          marginBottom: '1rem',
          fontSize: '1rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>⚙️</span>
          <span>Analysis Configuration (Required)</span>
        </h3>
        
        <div className="config-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#e2e8f0',
              fontSize: '0.9rem'
            }}>
              Reading Frame * <span style={{ 
                fontSize: '0.75rem', 
                color: '#60A5FA',
                fontWeight: 400,
                marginLeft: '0.5rem'
              }}>
                (Affects codon boundaries)
              </span>
            </label>
            <select
              value={readingFrame}
              onChange={(e) => {
                setReadingFrame(e.target.value);
                setShowCodonPreview(!!e.target.value);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: readingFrame ? '1px solid #3B82F6' : '2px solid #EF4444',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.95rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">Select reading frame...</option>
              <option value="1">+1 (Start at position 1)</option>
              <option value="2">+2 (Start at position 2)</option>
              <option value="3">+3 (Start at position 3)</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 600,
              color: '#e2e8f0',
              fontSize: '0.9rem'
            }}>
              Strand *
            </label>
            <select
              value={strand}
              onChange={(e) => setStrand(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: strand ? '1px solid #3B82F6' : '2px solid #EF4444',
                background: '#0f172a',
                color: '#e2e8f0',
                fontSize: '0.95rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">Select strand...</option>
              <option value="forward">Forward (5' → 3')</option>
              <option value="reverse">Reverse (3' → 5')</option>
            </select>
          </div>
        </div>

        {showCodonPreview && previewSequence && renderCodonPreview()}

        <div style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '1rem',
          marginTop: '1rem'
        }}>
          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
            <strong style={{ color: '#60A5FA' }}>ℹ️ Why this matters:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: 0 }}>
              <li>DNA is read in groups of 3 nucleotides (codons) to produce amino acids</li>
              <li>The reading frame determines where these groups start</li>
              <li>The strand determines the direction of reading</li>
              <li>Different frames/strands produce different proteins</li>
            </ul>
          </div>
        </div>

        {(!readingFrame || !strand) && (
          <div style={{
            background: '#7f1d1d',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            padding: '0.75rem',
            marginTop: '1rem',
            fontSize: '0.85rem',
            color: '#fecaca'
          }}>
            ⚠️ Please select both reading frame and strand to enable mutation classification
          </div>
        )}
      </div>
      
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
        disabled={loading || !readingFrame || !strand}
        style={{
          width: '100%',
          padding: '1rem',
          background: (loading || !readingFrame || !strand) ? '#475569' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: (loading || !readingFrame || !strand) ? 'not-allowed' : 'pointer',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s',
          opacity: (!readingFrame || !strand) ? 0.5 : 1
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
        </div>
      )}

      {mutations && (
        <div>
          <div style={{
            background: '#1e293b',
            border: '1px solid #3B82F6',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: '#cbd5e1'
          }}>
            <strong style={{ color: '#60A5FA' }}>📋 Analysis Parameters:</strong>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <span>
                <span style={{ color: '#94a3b8' }}>Reading Frame:</span> 
                <strong style={{ color: '#60A5FA', marginLeft: '0.5rem' }}>+{readingFrame}</strong>
              </span>
              <span>
                <span style={{ color: '#94a3b8' }}>Strand:</span>
                <strong style={{ color: '#60A5FA', marginLeft: '0.5rem' }}>
                  {strand.charAt(0).toUpperCase() + strand.slice(1)}
                </strong>
              </span>
            </div>
            <div style={{ 
              marginTop: '0.75rem', 
              fontSize: '0.8rem', 
              color: '#94a3b8',
              fontStyle: 'italic',
              background: '#0f172a',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #334155'
            }}>
              💡 Codon interpretation depends on the selected reading frame
            </div>
          </div>

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

          {/* Detailed Mutations with Before/After Alignment */}
          {mutations.mutations && mutations.mutations.length > 0 && (
            <div style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              border: '1px solid #334155'
            }}>
              <h3 style={{ marginBottom: '1rem', color: '#e2e8f0', fontWeight: 700 }}>
                📋 Detailed Mutation Analysis ({mutations.mutations.length} found)
              </h3>

              {/* Mutations List */}
              {mutations.mutations.slice(0, 50).map((mut, idx) => {
                const refCodon = mut.reference_codon || mut.reference || '---';
                const altCodon = mut.alternate_codon || mut.alternate || mut.inserted_sequence || '---';
                const refAA = refCodon.length === 3 ? translateCodon(refCodon) : '-';
                const altAA = altCodon.length === 3 ? translateCodon(altCodon) : '-';
                const confidence = getMutationConfidence(mut);
                const explanation = MUTATION_EXPLANATIONS[mut.mutation_class] || {};

                return (
                  <div key={idx} style={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1rem'
                  }}>
                    {/* Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Position {mut.position}</span>
                        <span style={{
                          marginLeft: '1rem',
                          background: '#1e293b',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#cbd5e1',
                          border: '1px solid #334155'
                        }}>
                          {mut.type}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {/* Confidence Tag */}
                        <span style={{
                          background: confidence.level === 'High' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: confidence.level === 'High' ? '#10B981' : '#F59E0B',
                          border: `1px solid ${confidence.level === 'High' ? '#10B981' : '#F59E0B'}40`,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {confidence.level} Confidence
                        </span>

                        {/* Classification */}
                        <span style={{
                          backgroundColor: getMutationColor(mut.mutation_class) + '30',
                          color: getMutationColor(mut.mutation_class),
                          border: `1px solid ${getMutationColor(mut.mutation_class)}60`,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}>
                          {explanation.icon} {mut.mutation_class || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    {/* Before/After Codon Alignment */}
                    {renderCodonAlignment(mut)}

                    {/* Biological Consequence Explanation */}
                    {explanation.long && (
                      <div style={{
                        marginTop: '1rem',
                        background: `${explanation.color}15`,
                        border: `1px solid ${explanation.color}40`,
                        borderRadius: '6px',
                        padding: '0.75rem',
                      }}>
                        <div style={{ 
                          fontSize: '0.8rem',
                          color: '#cbd5e1',
                          lineHeight: '1.6'
                        }}>
                          <strong style={{ color: explanation.color }}>Biological Consequence:</strong>
                          <div style={{ marginTop: '0.25rem' }}>
                            {explanation.long}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Confidence Note */}
                    <div style={{
                      marginTop: '0.75rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      fontStyle: 'italic'
                    }}>
                      ℹ️ Confidence reflects interpretation certainty, not biological effect. 
                      {confidence.reason && ` (${confidence.reason})`}
                    </div>
                  </div>
                );
              })}

              {mutations.mutations.length > 50 && (
                <div style={{
                  marginTop: '1rem',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '0.9rem'
                }}>
                  Showing 50 of {mutations.mutations.length} mutations
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