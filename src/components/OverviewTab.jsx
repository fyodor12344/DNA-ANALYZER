import { useState } from 'react';
import { API_ENDPOINTS } from '../utils/config';

export default function OverviewTab({ result, originalSequence }) {
  const [showCodonTable, setShowCodonTable] = useState(false);
  const [showSixFrame, setShowSixFrame] = useState(false);
  const [showRestrictionSites, setShowRestrictionSites] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState('');
  const [activeTooltip, setActiveTooltip] = useState(null);

  const explainWithAI = async () => {
    if (!result) return;
    
    setLoadingAI(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.explain, {
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.explanation) {
        setAiExplanation(data.explanation);
      } else {
        setAiExplanation('No explanation available from AI.');
      }
      
    } catch (err) {
      console.error('AI Error:', err);
      
      if (err.message.includes('Failed to fetch')) {
        setAiExplanation('❌ Cannot connect to backend server. Please ensure the backend is running on Render and accessible.');
      } else if (err.message.includes('500')) {
        setAiExplanation('❌ Server error occurred. The backend may be experiencing issues.');
      } else {
        setAiExplanation(`❌ Error: ${err.message}`);
      }
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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessage(`${label} copied!`);
      setTimeout(() => setCopiedMessage(''), 2000);
    });
  };

  const downloadFASTA = (sequence, filename) => {
    const fasta = `>Reverse_Complement\n${sequence}`;
    const blob = new Blob([fasta], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
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

    if (aiExplanation && !aiExplanation.startsWith('❌')) {
      report += 'AI ANALYSIS\n';
      report += '-'.repeat(80) + '\n';
      report += aiExplanation + '\n\n';
    }

    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80);

    return report;
  };

  // Calculate advanced base composition metrics
  const calculateAdvancedMetrics = () => {
    const A = result.nucleotides.A;
    const T = result.nucleotides.T;
    const G = result.nucleotides.G;
    const C = result.nucleotides.C;
    
    const purine = A + G;
    const pyrimidine = C + T;
    const atSkew = (A - T) / (A + T);
    const gcSkew = (G - C) / (G + C);
    
    return {
      purine,
      pyrimidine,
      purinePercent: ((purine / result.length) * 100).toFixed(1),
      pyrimidinePercent: ((pyrimidine / result.length) * 100).toFixed(1),
      atSkew: atSkew.toFixed(3),
      gcSkew: gcSkew.toFixed(3)
    };
  };

  // Detect ORFs for visualization
  const detectORFsForVisualization = () => {
    if (!originalSequence) return [];
    
    const startCodon = 'ATG';
    const stopCodons = ['TAA', 'TAG', 'TGA'];
    const orfs = [];
    
    // Check all 3 forward reading frames
    for (let frame = 0; frame < 3; frame++) {
      let inORF = false;
      let orfStart = -1;
      
      for (let i = frame; i < originalSequence.length - 2; i += 3) {
        const codon = originalSequence.substring(i, i + 3).toUpperCase();
        
        if (codon === startCodon && !inORF) {
          inORF = true;
          orfStart = i;
        } else if (stopCodons.includes(codon) && inORF) {
          orfs.push({
            frame: frame + 1,
            start: orfStart,
            end: i + 3,
            length: i + 3 - orfStart
          });
          inORF = false;
        }
      }
    }
    
    return orfs.sort((a, b) => a.start - a.start);
  };

  const metrics = calculateAdvancedMetrics();
  const visualORFs = detectORFsForVisualization();

  return (
    <div style={{ 
      padding: '1rem', 
      maxWidth: '1400px', 
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Copied Message Toast */}
      {copiedMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#10B981',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          ✓ {copiedMessage}
        </div>
      )}

      {/* Action Buttons - Mobile Responsive */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '0.75rem', 
        marginBottom: '1.5rem' 
      }}>
        <button 
          onClick={downloadPDF}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxSizing: 'border-box'
          }}
        >
          📄 Download Report (TXT)
        </button>

        {/* AI Explanation Button */}
        <button 
          onClick={explainWithAI}
          disabled={loadingAI}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: loadingAI ? '#6B7280' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: loadingAI ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box'
          }}
        >
          {loadingAI ? '🔄 Generating AI Analysis...' : '🤖 Get AI Analysis'}
        </button>
      </div>

      {/* AI Explanation Display - MOBILE OPTIMIZED */}
      {aiExplanation && (
        <div style={{
          background: aiExplanation.startsWith('❌') 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.08))'
            : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.08))',
          border: aiExplanation.startsWith('❌') ? '2px solid #EF4444' : '2px solid #8B5CF6',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          boxShadow: aiExplanation.startsWith('❌')
            ? '0 4px 6px rgba(239, 68, 68, 0.1)'
            : '0 4px 6px rgba(139, 92, 246, 0.1)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            color: aiExplanation.startsWith('❌') ? '#EF4444' : '#8B5CF6',
            marginBottom: '0.75rem', 
            fontSize: '1.1rem', 
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {aiExplanation.startsWith('❌') ? '⚠️ AI Analysis' : '🧠 AI Analysis'}
          </h3>
          <div style={{ 
            color: '#1F2937',
            background: 'white',
            padding: '1rem',
            borderRadius: '8px',
            lineHeight: '1.7', 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            fontSize: '0.9rem',
            border: aiExplanation.startsWith('❌') 
              ? '1px solid rgba(239, 68, 68, 0.2)'
              : '1px solid rgba(139, 92, 246, 0.2)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* Basic Statistics - Mobile Grid */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ 
          color: '#1F2937', 
          marginBottom: '1rem', 
          fontSize: '1.1rem', 
          fontWeight: 700 
        }}>
          📊 Sequence Statistics
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
          gap: '0.75rem' 
        }}>
          <StatCard label="Length" value={`${result.length} bp`} color="#3B82F6" />
          <StatCard label="GC Content" value={`${result.gc}%`} color="#10B981" />
          <StatCard label="AT Content" value={`${result.at}%`} color="#F59E0B" />
          <StatCard label="Melting Temp" value={`${result.tm}°C`} color="#EF4444" />
          <StatCard label="Mol. Weight" value={`${result.molecularWeight} g/mol`} color="#8B5CF6" />
          <StatCard label="ORFs Found" value={result.nORFs} color="#06B6D4" />
        </div>
      </div>

      {/* NEW: Biological Insights Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.05))', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '2px solid rgba(16, 185, 129, 0.2)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ 
          color: '#059669', 
          marginBottom: '1rem', 
          fontSize: '1.1rem', 
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          💡 Biological Insights
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* GC Content Insight */}
          <InsightCard
            icon="🧬"
            title="GC Content Analysis"
            value={`${result.gc}%`}
            interpretation={
              result.gc < 40 ? 'AT-rich region - common in intergenic spaces and regulatory elements' :
              result.gc < 60 ? 'Balanced composition - typical for many coding sequences' :
              'GC-rich region - often found in promoters and gene-dense areas'
            }
            color="#10B981"
          />
          
          {/* Melting Temperature Insight */}
          <InsightCard
            icon="🌡️"
            title="Melting Temperature"
            value={`${result.tm}°C`}
            interpretation={
              result.tm < 50 ? 'Lower Tm - weaker hydrogen bonding, suitable for low-temperature PCR' :
              result.tm < 70 ? 'Moderate Tm - typical range for standard PCR applications' :
              'Higher Tm - strong hydrogen bonding, requires higher annealing temperatures'
            }
            color="#EF4444"
          />
          
          {/* ORF Insight */}
          <InsightCard
            icon="🎯"
            title="Open Reading Frames"
            value={`${result.nORFs} ORF${result.nORFs !== 1 ? 's' : ''}`}
            interpretation={
              result.nORFs === 0 ? 'No ORFs detected - may be a non-coding region or regulatory sequence' :
              result.nORFs === 1 ? 'Single ORF found - could indicate a simple coding sequence' :
              result.nORFs < 5 ? 'Multiple ORFs - suggests potential coding region with alternative start sites' :
              'Many ORFs detected - complex region with multiple potential translation frames'
            }
            color="#06B6D4"
          />
        </div>
      </div>

      {/* NEW: ORF Visualization */}
      {originalSequence && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            color: '#1F2937', 
            marginBottom: '1rem', 
            fontSize: '1.1rem', 
            fontWeight: 700 
          }}>
            🔬 ORF Visualization (Forward Frames)
          </h3>
          
          {visualORFs.length === 0 ? (
            <div style={{
              background: '#F3F4F6',
              padding: '1.5rem',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: '0.9rem'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <p style={{ margin: 0, fontWeight: 600 }}>No ORFs detected in forward reading frames</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem' }}>
                ORFs require a start codon (ATG) followed by a stop codon (TAA, TAG, or TGA) in the same frame
              </p>
            </div>
          ) : (
            <div>
              <div style={{ 
                fontSize: '0.85rem', 
                color: '#6B7280', 
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#F9FAFB',
                borderRadius: '6px'
              }}>
                Found {visualORFs.length} ORF{visualORFs.length !== 1 ? 's' : ''} across 3 forward reading frames. 
                Each colored block represents a potential coding region.
              </div>
              
              {/* Frame 1 */}
              <ORFFrameVisualization 
                frame={1} 
                orfs={visualORFs.filter(orf => orf.frame === 1)}
                sequenceLength={originalSequence.length}
              />
              
              {/* Frame 2 */}
              <ORFFrameVisualization 
                frame={2} 
                orfs={visualORFs.filter(orf => orf.frame === 2)}
                sequenceLength={originalSequence.length}
              />
              
              {/* Frame 3 */}
              <ORFFrameVisualization 
                frame={3} 
                orfs={visualORFs.filter(orf => orf.frame === 3)}
                sequenceLength={originalSequence.length}
              />
              
              {/* Legend */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#F9FAFB',
                borderRadius: '6px',
                fontSize: '0.8rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '16px', height: '16px', background: '#3B82F6', borderRadius: '3px' }}></div>
                  <span>Frame 1</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '16px', height: '16px', background: '#10B981', borderRadius: '3px' }}></div>
                  <span>Frame 2</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '16px', height: '16px', background: '#F59E0B', borderRadius: '3px' }}></div>
                  <span>Frame 3</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ENHANCED: Base Composition with Advanced Metrics */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ 
          color: '#1F2937', 
          marginBottom: '1rem', 
          fontSize: '1.1rem', 
          fontWeight: 700 
        }}>
          🧬 Base Composition & Skew Analysis
        </h3>
        
        {/* Individual Bases */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: '#6B7280', 
            marginBottom: '0.75rem',
            fontWeight: 600 
          }}>
            Nucleotide Distribution
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '0.75rem' 
          }}>
            <BaseCard label="Adenine (A)" count={result.nucleotides.A} total={result.length} color="#10B981" />
            <BaseCard label="Thymine (T)" count={result.nucleotides.T} total={result.length} color="#F59E0B" />
            <BaseCard label="Guanine (G)" count={result.nucleotides.G} total={result.length} color="#3B82F6" />
            <BaseCard label="Cytosine (C)" count={result.nucleotides.C} total={result.length} color="#EF4444" />
          </div>
        </div>
        
        {/* Purine vs Pyrimidine */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: '#6B7280', 
            marginBottom: '0.75rem',
            fontWeight: 600 
          }}>
            Chemical Groups
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '0.75rem' 
          }}>
            <MetricCard
              label="Purines (A+G)"
              value={metrics.purine}
              percentage={metrics.purinePercent}
              tooltip="Larger bases with double-ring structure"
              color="#8B5CF6"
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              tooltipId="purine"
            />
            <MetricCard
              label="Pyrimidines (C+T)"
              value={metrics.pyrimidine}
              percentage={metrics.pyrimidinePercent}
              tooltip="Smaller bases with single-ring structure"
              color="#EC4899"
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              tooltipId="pyrimidine"
            />
          </div>
        </div>
        
        {/* Skew Analysis */}
        <div>
          <h4 style={{ 
            fontSize: '0.9rem', 
            color: '#6B7280', 
            marginBottom: '0.75rem',
            fontWeight: 600 
          }}>
            Compositional Skew
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '0.75rem' 
          }}>
            <SkewCard
              label="AT Skew"
              value={metrics.atSkew}
              tooltip="Measures strand bias: (A-T)/(A+T). Positive = more A, negative = more T"
              color="#F59E0B"
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              tooltipId="atskew"
            />
            <SkewCard
              label="GC Skew"
              value={metrics.gcSkew}
              tooltip="Measures strand bias: (G-C)/(G+C). Used to identify replication origins"
              color="#10B981"
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              tooltipId="gcskew"
            />
          </div>
        </div>
      </div>

      {/* ENHANCED: Reverse Complement with Utilities */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '12px', 
        padding: '1rem', 
        marginBottom: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        <h3 style={{ 
          color: '#1F2937', 
          marginBottom: '1rem', 
          fontSize: '1.1rem', 
          fontWeight: 700 
        }}>
          🔄 Reverse Complement
        </h3>
        
        {/* Utility Buttons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => copyToClipboard(result.revcomp, 'Reverse complement')}
            style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📋 Copy
          </button>
          <button
            onClick={() => downloadFASTA(result.revcomp, 'reverse_complement.fasta')}
            style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            💾 FASTA
          </button>
          <button
            onClick={() => alert('Send to Primer Design tool - Integration pending')}
            style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            🧪 Primer Design
          </button>
          <button
            onClick={() => alert('Alignment view - Feature coming soon')}
            style={{
              padding: '0.625rem',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ↔️ Align
          </button>
        </div>
        
        <div style={{
          background: '#F3F4F6',
          padding: '0.875rem',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.8rem',
          color: '#1F2937',
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          maxHeight: '250px',
          overflowY: 'auto',
          lineHeight: '1.5'
        }}>
          {result.revcomp}
        </div>
      </div>

      {/* Longest ORF - Mobile Optimized */}
      {result.longestORF && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            color: '#1F2937', 
            marginBottom: '1rem', 
            fontSize: '1.1rem', 
            fontWeight: 700 
          }}>
            🎯 Longest Open Reading Frame
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '0.75rem', 
            marginBottom: '1rem' 
          }}>
            <InfoItem label="Frame" value={result.longestORF.frame} />
            <InfoItem label="Length" value={`${result.longestORF.length_nt} nt`} />
            <InfoItem label="Type" value={result.longestORF.type} />
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ 
              color: '#1F2937', 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              DNA Sequence:
            </strong>
            <div style={{
              background: '#F3F4F6',
              padding: '0.875rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#1F2937',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              maxHeight: '200px',
              overflowY: 'auto',
              lineHeight: '1.5'
            }}>
              {result.longestORF.dna_seq}
            </div>
          </div>
          
          <div style={{ marginTop: '1rem' }}>
            <strong style={{ 
              color: '#1F2937', 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem'
            }}>
              Amino Acid Sequence:
            </strong>
            <div style={{
              background: '#F3F4F6',
              padding: '0.875rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#1F2937',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
              maxHeight: '200px',
              overflowY: 'auto',
              lineHeight: '1.5'
            }}>
              {result.longestORF.aa_seq}
            </div>
          </div>
        </div>
      )}

      {/* All ORFs - Mobile Optimized */}
      {result.allORFs && result.allORFs.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '12px', 
          padding: '1rem', 
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            color: '#1F2937', 
            marginBottom: '1rem', 
            fontSize: '1.1rem', 
            fontWeight: 700 
          }}>
            📋 All Open Reading Frames ({result.nORFs})
          </h3>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem', 
            maxHeight: '500px', 
            overflowY: 'auto' 
          }}>
            {result.allORFs.slice(0, 20).map((orf, idx) => (
              <div key={idx} style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '0.875rem',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}>
                  <span style={{ 
                    background: '#3B82F6', 
                    color: '#fff', 
                    padding: '0.25rem 0.6rem', 
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: '#6B7280' }}>Frame {orf.frame}</span>
                  <span style={{ color: '#6B7280' }}>{orf.length_nt} nt</span>
                  <span style={{ color: '#6B7280' }}>{orf.type}</span>
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: '#1F2937',
                  background: '#fff',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  lineHeight: '1.5',
                  maxHeight: '150px',
                  overflowY: 'auto'
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
                borderRadius: '8px',
                fontSize: '0.9rem'
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

// NEW: Insight Card Component
function InsightCard({ icon, title, value, interpretation, color }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1rem',
      border: '1px solid #E5E7EB'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        marginBottom: '0.5rem' 
      }}>
        <span style={{ fontSize: '1.25rem' }}>{icon}</span>
        <strong style={{ color, fontSize: '0.9rem' }}>{title}</strong>
        <span style={{ 
          marginLeft: 'auto', 
          color, 
          fontWeight: 700,
          fontSize: '1rem'
        }}>
          {value}
        </span>
      </div>
      <p style={{ 
        margin: 0, 
        fontSize: '0.85rem', 
        color: '#4B5563',
        lineHeight: '1.5'
      }}>
        {interpretation}
      </p>
    </div>
  );
}

// NEW: ORF Frame Visualization Component
function ORFFrameVisualization({ frame, orfs, sequenceLength }) {
  const frameColors = {
    1: '#3B82F6',
    2: '#10B981',
    3: '#F59E0B'
  };
  
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ 
        fontSize: '0.8rem', 
        color: '#6B7280', 
        marginBottom: '0.25rem',
        fontWeight: 600
      }}>
        Frame {frame}
      </div>
      <div style={{
        position: 'relative',
        height: '30px',
        background: '#F3F4F6',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        {orfs.length === 0 ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.75rem',
            color: '#9CA3AF'
          }}>
            No ORFs
          </div>
        ) : (
          orfs.map((orf, idx) => {
            const left = (orf.start / sequenceLength) * 100;
            const width = ((orf.end - orf.start) / sequenceLength) * 100;
            
            return (
              <div
                key={idx}
                title={`${orf.start}-${orf.end} (${orf.length} bp)`}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  width: `${width}%`,
                  height: '100%',
                  background: frameColors[frame],
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: 0.85
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.85}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// NEW: Metric Card with Tooltip
function MetricCard({ label, value, percentage, tooltip, color, activeTooltip, setActiveTooltip, tooltipId }) {
  return (
    <div 
      style={{
        background: '#F9FAFB',
        borderRadius: '8px',
        padding: '0.875rem',
        border: '1px solid #E5E7EB',
        textAlign: 'center',
        position: 'relative',
        cursor: 'help'
      }}
      onMouseEnter={() => setActiveTooltip(tooltipId)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div style={{ 
        color: '#6B7280', 
        fontSize: '0.8rem', 
        marginBottom: '0.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem'
      }}>
        {label}
        <span style={{ fontSize: '0.7rem' }}>ℹ️</span>
      </div>
      <div style={{ 
        color, 
        fontSize: '1.5rem', 
        fontWeight: 700 
      }}>
        {value}
      </div>
      <div style={{ 
        color: '#9CA3AF', 
        fontSize: '0.85rem' 
      }}>
        {percentage}%
      </div>
      
      {activeTooltip === tooltipId && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#1F2937',
          color: 'white',
          borderRadius: '6px',
          fontSize: '0.75rem',
          whiteSpace: 'normal',
          width: '200px',
          zIndex: 10,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// NEW: Skew Card with Tooltip
function SkewCard({ label, value, tooltip, color, activeTooltip, setActiveTooltip, tooltipId }) {
  const numValue = parseFloat(value);
  const isPositive = numValue > 0;
  
  return (
    <div 
      style={{
        background: '#F9FAFB',
        borderRadius: '8px',
        padding: '0.875rem',
        border: '1px solid #E5E7EB',
        textAlign: 'center',
        position: 'relative',
        cursor: 'help'
      }}
      onMouseEnter={() => setActiveTooltip(tooltipId)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div style={{ 
        color: '#6B7280', 
        fontSize: '0.8rem', 
        marginBottom: '0.4rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem'
      }}>
        {label}
        <span style={{ fontSize: '0.7rem' }}>ℹ️</span>
      </div>
      <div style={{ 
        color: isPositive ? '#10B981' : '#EF4444', 
        fontSize: '1.5rem', 
        fontWeight: 700 
      }}>
        {isPositive ? '+' : ''}{value}
      </div>
      <div style={{ 
        color: '#9CA3AF', 
        fontSize: '0.75rem' 
      }}>
        {isPositive ? 'Positive bias' : numValue < 0 ? 'Negative bias' : 'Balanced'}
      </div>
      
      {activeTooltip === tooltipId && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: '#1F2937',
          color: 'white',
          borderRadius: '6px',
          fontSize: '0.75rem',
          whiteSpace: 'normal',
          width: '220px',
          zIndex: 10,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Mobile-optimized StatCard
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '0.875rem',
      textAlign: 'center',
      border: '1px solid #E5E7EB',
      minWidth: '0'
    }}>
      <div style={{ 
        color: '#6B7280', 
        fontSize: '0.8rem', 
        marginBottom: '0.4rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {label}
      </div>
      <div style={{ 
        color, 
        fontSize: '1.3rem', 
        fontWeight: 700,
        wordBreak: 'break-word'
      }}>
        {value}
      </div>
    </div>
  );
}

// Mobile-optimized BaseCard
function BaseCard({ label, count, total, color }) {
  const percentage = ((count / total) * 100).toFixed(1);
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '0.875rem',
      border: '1px solid #E5E7EB',
      textAlign: 'center',
      minWidth: '0'
    }}>
      <div style={{ 
        color: '#6B7280', 
        fontSize: '0.8rem', 
        marginBottom: '0.4rem' 
      }}>
        {label}
      </div>
      <div style={{ 
        color, 
        fontSize: '1.5rem', 
        fontWeight: 700 
      }}>
        {count}
      </div>
      <div style={{ 
        color: '#9CA3AF', 
        fontSize: '0.85rem' 
      }}>
        {percentage}%
      </div>
    </div>
  );
}

// Mobile-optimized InfoItem
function InfoItem({ label, value }) {
  return (
    <div style={{
      background: '#F9FAFB',
      borderRadius: '8px',
      padding: '0.75rem',
      border: '1px solid #E5E7EB',
      minWidth: '0'
    }}>
      <div style={{ 
        color: '#6B7280', 
        fontSize: '0.8rem', 
        marginBottom: '0.25rem' 
      }}>
        {label}
      </div>
      <div style={{ 
        color: '#1F2937', 
        fontWeight: 600,
        fontSize: '0.9rem',
        wordBreak: 'break-word'
      }}>
        {value}
      </div>
    </div>
  );
}