import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function OverviewTab({ result, originalSequence }) {
  const [showCodonTable, setShowCodonTable] = useState(false);
  const [showSixFrame, setShowSixFrame] = useState(false);
  const [showRestrictionSites, setShowRestrictionSites] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const explainWithAI = async () => {
    if (!result) return;
    
    setLoadingAI(true);
    
    try {
      const response = await fetch(`${API_URL}/api/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'DNA Sequence Analyzer',
          data: {
            length: result.length,
            gc_content: result.gc,
            at_content: result.at,
            tm: result.tm,
            molecular_weight: result.molecularWeight,
            nucleotides: result.nucleotides,
            orfs_found: result.nORFs,
            longest_orf: result.longestORF,
            restriction_sites_count: result.restrictionSites?.length || 0
          }
        })
      });

      const data = await response.json();
      setAiExplanation(data.explanation || 'No explanation available');
      
    } catch (err) {
      console.error('AI Error:', err);
      setAiExplanation('Error generating AI explanation. Please check backend connection.');
    } finally {
      setLoadingAI(false);
    }
  };

  const downloadPDF = () => {
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DNA_Analysis_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReport = () => {
    let report = '='.repeat(80) + '\n';
    report += 'DNA SEQUENCE ANALYSIS REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Sequence Length: ${result.length} bp\n\n`;

    report += 'BASIC STATISTICS\n';
    report += '-'.repeat(80) + '\n';
    report += `Sequence Length: ${result.length} bp\n`;
    report += `GC Content: ${result.gc}%\n`;
    report += `AT Content: ${result.at}%\n`;
    report += `Melting Temperature: ${result.tm}°C\n`;
    report += `Molecular Weight: ${result.molecularWeight} g/mol\n\n`;

    report += 'NUCLEOTIDE COMPOSITION\n';
    report += '-'.repeat(80) + '\n';
    report += `Adenine (A): ${result.nucleotides.A}\n`;
    report += `Thymine (T): ${result.nucleotides.T}\n`;
    report += `Guanine (G): ${result.nucleotides.G}\n`;
    report += `Cytosine (C): ${result.nucleotides.C}\n\n`;

    if (result.longestORF) {
      report += 'LONGEST ORF\n';
      report += '-'.repeat(80) + '\n';
      report += `Frame: ${result.longestORF.frame}\n`;
      report += `Length: ${result.longestORF.length_nt} nt (${result.longestORF.aa_seq.length} aa)\n`;
      report += `Type: ${result.longestORF.type}\n\n`;
    }

    if (aiExplanation && aiExplanation !== 'Error generating AI explanation. Please check backend connection.') {
      report += 'AI ANALYSIS\n';
      report += '-'.repeat(80) + '\n';
      report += aiExplanation + '\n\n';
    }

    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80);

    return report;
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={downloadPDF}
          style={{
            flex: 1,
            padding: '1rem',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          📄 Download Report (TXT)
        </button>
      </div>

      {/* AI Explanation Button */}
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
          marginBottom: '1.5rem'
        }}
      >
        {loadingAI ? '🔄 Generating AI Analysis...' : '🤖 Get AI Analysis'}
      </button>

      {/* AI Explanation Display - FIXED VISIBILITY */}
      {aiExplanation && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.08))',
          border: '2px solid #8B5CF6',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 4px 6px rgba(139, 92, 246, 0.1)'
        }}>
          <h3 style={{ 
            color: '#8B5CF6', 
            marginBottom: '1rem', 
            fontSize: '1.2rem', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🧠 AI Analysis
          </h3>
          <div style={{ 
            color: '#1F2937',
            background: 'white',
            padding: '1.25rem',
            borderRadius: '8px',
            lineHeight: '1.8', 
            whiteSpace: 'pre-wrap',
            fontSize: '0.95rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* Basic Statistics */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#1F2937', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
          📊 Sequence Statistics
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem' 
        }}>
          <StatCard label="Length" value={`${result.length} bp`} color="#3B82F6" />
          <StatCard label="GC Content" value={`${result.gc}%`} color="#10B981" />
          <StatCard label="AT Content" value={`${result.at}%`} color="#F59E0B" />
          <StatCard label="Melting Temp" value={`${result.tm}°C`} color="#EF4444" />
          <StatCard label="Molecular Weight" value={`${result.molecularWeight} g/mol`} color="#8B5CF6" />
          <StatCard label="ORFs Found" value={result.nORFs} color="#06B6D4" />
        </div>
      </div>

      {/* Nucleotide Composition */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#1F2937', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
          🧬 Base Composition
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <BaseCard label="Adenine (A)" count={result.nucleotides.A} total={result.length} color="#10B981" />
          <BaseCard label="Thymine (T)" count={result.nucleotides.T} total={result.length} color="#F59E0B" />
          <BaseCard label="Guanine (G)" count={result.nucleotides.G} total={result.length} color="#3B82F6" />
          <BaseCard label="Cytosine (C)" count={result.nucleotides.C} total={result.length} color="#EF4444" />
        </div>
      </div>

      {/* Reverse Complement - FIXED TEXT WRAPPING */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1.5rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#1F2937', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
          🔄 Reverse Complement
        </h3>
        <div style={{
          background: '#F3F4F6',
          padding: '1rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: '#1F2937',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {result.revcomp}
        </div>
      </div>

      {/* Longest ORF */}
      {result.longestORF && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#1F2937', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
            🎯 Longest Open Reading Frame
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <InfoItem label="Frame" value={result.longestORF.frame} />
            <InfoItem label="Length" value={`${result.longestORF.length_nt} nt (${result.longestORF.aa_seq.length} aa)`} />
            <InfoItem label="Type" value={result.longestORF.type} />
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ color: '#1F2937', display: 'block', marginBottom: '0.5rem' }}>DNA Sequence:</strong>
            <div style={{
              background: '#F3F4F6',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#1F2937',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word'
            }}>
              {result.longestORF.dna_seq}
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ color: '#1F2937', display: 'block', marginBottom: '0.5rem' }}>Amino Acid Sequence:</strong>
            <div style={{
              background: '#F3F4F6',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: '#1F2937',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word'
            }}>
              {result.longestORF.aa_seq}
            </div>
          </div>
        </div>
      )}

      {/* All ORFs - IMPROVED LAYOUT */}
      {result.allORFs && result.allORFs.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ color: '#1F2937', marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 700 }}>
            📋 All Open Reading Frames ({result.nORFs})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '500px', overflowY: 'auto' }}>
            {result.allORFs.slice(0, 20).map((orf, idx) => (
              <div key={idx} style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  <span style={{ 
                    background: '#3B82F6', 
                    color: '#fff', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>Frame {orf.frame}</span>
                  <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>{orf.length_nt} nt</span>
                  <span style={{ color: '#6B7280', fontSize: '0.9rem' }}>{orf.type}</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  color: '#1F2937',
                  background: '#fff',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word'
                }}>
                  {orf.aa_seq}
                </div>
              </div>
            ))}
            {result.allORFs.length > 20 && (
              <div style={{ 
                textAlign: 'center', 
                color: '#6B7280', 
                padding: '1rem',
                background: '#F3F4F6',
                borderRadius: '8px'
              }}>
                ...and {result.allORFs.length - 20} more ORFs
              </div>
            )}
          </div>
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
      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ color, fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function BaseCard({ label, count, total, color }) {
  const percentage = ((count / total) * 100).toFixed(1);
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '1rem',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ color, fontSize: '1.75rem', fontWeight: 700 }}>{count}</div>
      <div style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>{percentage}%</div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '0.75rem',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{ color: '#6B7280', fontSize: '0.85rem', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ color: '#1F2937', fontWeight: 600 }}>{value}</div>
    </div>
  );
}