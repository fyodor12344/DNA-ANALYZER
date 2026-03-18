import { useState } from 'react';
import { getAIExplanation } from '../utils/apiUtils';

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
    setAiExplanation('');

    console.log('Starting AI analysis...');
    console.log('Analysis data:', {
      length: result.length,
      gc_content: result.gc,
      at_content: result.at,
      tm: result.tm,
      molecular_weight: result.molecularWeight,
      nucleotides: result.nucleotides,
      orfs_found: result.nORFs
    });

    const analysisData = {
      length: result.length,
      gc_content: result.gc,
      at_content: result.at,
      tm: result.tm,
      molecular_weight: result.molecularWeight,
      nucleotides: result.nucleotides,
      orfs_found: result.nORFs,
      longest_orf: result.longestORF,
      restriction_sites_count: result.restrictionSites?.length || 0
    };

    try {
      const response = await getAIExplanation('DNA Sequence Analyzer', analysisData);

      if (response.success) {
        setAiExplanation(response.data.explanation || 'Analysis completed but no explanation provided.');
      } else {
        const fallbackExplanation = generateFallbackExplanation(result);
        setAiExplanation(`[NOTICE] Backend API unavailable. Here is a local analysis:\n\n${fallbackExplanation}\n\n(For AI-powered insights, please ensure the backend server is running.)`);
      }
    } catch (error) {
      console.error('Exception caught:', error);
      const fallbackExplanation = generateFallbackExplanation(result);
      setAiExplanation(`[NOTICE] Could not connect to AI service.\n\n${fallbackExplanation}\n\n(For AI-powered insights, please ensure the backend server is running at the configured endpoint.)`);
    } finally {
      setLoadingAI(false);
    }
  };

  const generateFallbackExplanation = (data) => {
    let explanation = `SEQUENCE ANALYSIS SUMMARY\n\n`;

    explanation += `Sequence Length: ${data.length} bp\n`;
    if (data.length < 100) {
      explanation += `   Short sequence - suitable for primers or short DNA fragments\n`;
    } else if (data.length < 500) {
      explanation += `   Medium-length sequence - typical for PCR products or small genes\n`;
    } else {
      explanation += `   Long sequence - may represent a gene or genomic region\n`;
    }
    explanation += `\n`;

    explanation += `GC Content: ${data.gc}%\n`;
    if (data.gc < 40) {
      explanation += `   AT-rich sequence. Common in intergenic regions and regulatory elements.\n`;
      explanation += `   Lower melting temperature - may require adjusted PCR conditions.\n`;
    } else if (data.gc > 60) {
      explanation += `   GC-rich sequence. Often found in promoters and coding regions.\n`;
      explanation += `   Higher melting temperature - very stable DNA structure.\n`;
      explanation += `   May benefit from DMSO or betaine in PCR reactions.\n`;
    } else {
      explanation += `   Balanced composition - optimal for most molecular biology applications.\n`;
    }
    explanation += `\n`;

    explanation += `Melting Temperature: ${data.tm} C\n`;
    if (data.tm < 60) {
      explanation += `   Lower Tm suggests weaker base pairing strength.\n`;
      explanation += `   Use annealing temperature around ${(data.tm - 5).toFixed(1)} C for PCR.\n`;
    } else if (data.tm > 80) {
      explanation += `   High Tm indicates very stable DNA structure.\n`;
      explanation += `   May require higher denaturation temperatures in PCR.\n`;
    } else {
      explanation += `   Moderate Tm - suitable for standard PCR protocols.\n`;
      explanation += `   Suggested annealing temperature: ${(data.tm - 5).toFixed(1)} C\n`;
    }
    explanation += `\n`;

    explanation += `Base Composition:\n`;
    explanation += `   A: ${data.nucleotides.A} | T: ${data.nucleotides.T} | G: ${data.nucleotides.G} | C: ${data.nucleotides.C}\n`;
    const purine = data.nucleotides.A + data.nucleotides.G;
    const pyrimidine = data.nucleotides.C + data.nucleotides.T;
    explanation += `   Purines (A+G): ${purine} | Pyrimidines (C+T): ${pyrimidine}\n`;
    explanation += `\n`;

    explanation += `Open Reading Frames: ${data.nORFs}\n`;
    if (data.nORFs === 0) {
      explanation += `   No ORFs detected - likely a non-coding region, intron, or regulatory sequence.\n`;
      explanation += `   This sequence may not code for proteins.\n`;
    } else if (data.nORFs === 1) {
      explanation += `   Single ORF detected - could represent a simple coding sequence.\n`;
      if (data.longestORF) {
        explanation += `   Longest ORF: ${data.longestORF.length_nt} nt (${data.longestORF.aa_seq?.length || 0} amino acids)\n`;
      }
    } else {
      explanation += `   Multiple ORFs detected across different reading frames.\n`;
      explanation += `   This is common in genomic DNA with multiple potential start codons.\n`;
      if (data.longestORF) {
        explanation += `   Longest ORF: ${data.longestORF.length_nt} nt in ${data.longestORF.frame}\n`;
      }
    }
    explanation += `\n`;

    explanation += `Molecular Weight: ${data.molecularWeight} g/mol\n`;
    explanation += `   Useful for calculations in DNA quantification and molecular cloning.\n`;

    return explanation;
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
    report += `Melting Temperature: ${result.tm} C\n`;
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

    if (aiExplanation && !aiExplanation.startsWith('[ERROR]')) {
      report += 'AI ANALYSIS\n';
      report += '-'.repeat(80) + '\n';
      report += aiExplanation + '\n\n';
    }

    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80);

    return report;
  };

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

  const detectORFsForVisualization = () => {
    if (!originalSequence) return [];

    const startCodon = 'ATG';
    const stopCodons = ['TAA', 'TAG', 'TGA'];
    const orfs = [];

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

    return orfs.sort((a, b) => a.start - b.start);
  };

  const metrics = calculateAdvancedMetrics();
  const visualORFs = detectORFsForVisualization();

  return (
    <div style={{
      padding: '1.25rem 1.2rem 3rem',
      maxWidth: '900px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: '"Sora", sans-serif',
      color: '#e2e4e9'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .ov-card {
          background: #141720;
          border: 1px solid #24272f;
          border-radius: 12px;
          padding: 1.35rem;
          margin-bottom: 1.1rem;
          transition: all .3s ease;
        }
        .ov-card:hover {
          border-color: rgba(99,102,241,.3);
          box-shadow: 0 4px 20px rgba(0,0,0,.25);
        }
        .ov-card-header {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin-bottom: 1rem;
        }
        .ov-card-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: .75rem;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
          letter-spacing: .03em;
        }
        .ov-card-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #c8cad4;
        }
        .ov-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: .65rem;
        }
        .ov-stat {
          background: #0f1117;
          border: 1px solid #1e2130;
          border-radius: 10px;
          padding: .85rem .7rem;
          text-align: center;
          transition: all .3s ease;
        }
        .ov-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(6,182,212,.12);
          border-color: rgba(6,182,212,.3);
        }
        .ov-stat-label {
          font-size: .78rem;
          color: #6b7080;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: .35rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ov-stat-value {
          font-size: 1.4rem;
          font-weight: 700;
          line-height: 1.2;
          word-break: break-word;
        }
        .ov-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          width: 100%;
          padding: .9rem 1.2rem;
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'Sora', sans-serif;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all .3s ease;
        }
        .ov-btn:hover {
          filter: brightness(1.12);
          transform: translateY(-2px);
        }
        .ov-btn:disabled {
          filter: brightness(.55);
          cursor: not-allowed;
          transform: none;
        }
        .ov-mono {
          background: #0b0e18;
          border: 1px solid #1a1d2a;
          padding: .85rem;
          border-radius: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: .78rem;
          color: #8a8f9e;
          word-break: break-all;
          white-space: pre-wrap;
          overflow-wrap: break-word;
          max-height: 220px;
          overflow-y: auto;
          line-height: 1.65;
        }
        .ov-insight {
          background: #0f1117;
          border: 1px solid #1e2130;
          border-radius: 10px;
          padding: 1rem 1.1rem;
          transition: all .3s ease;
        }
        .ov-insight:hover {
          border-color: rgba(16,185,129,.3);
          box-shadow: 0 2px 10px rgba(16,185,129,.08);
        }
        .ov-gauge-track {
          height: 6px;
          background: #1e2130;
          border-radius: 3px;
          overflow: hidden;
          margin-top: .5rem;
        }
        .ov-gauge-fill {
          height: 100%;
          border-radius: 3px;
          transition: width .8s ease;
        }
        @keyframes ovFadeIn {
          from { opacity:0; transform:translateY(8px); }
          to { opacity:1; transform:translateY(0); }
        }
        .ov-animate { animation: ovFadeIn .4s ease-out; }
        @keyframes ovSpin { to { transform: rotate(360deg); } }
        .ov-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: ovSpin .5s linear infinite;
        }
        @media(max-width:640px) {
          .ov-stat-grid { grid-template-columns: repeat(2, 1fr); }
          .ov-btn { font-size: .9rem; padding: .75rem; }
        }
      `}</style>

      {/* Copied Message Toast */}
      {copiedMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          color: 'white',
          padding: '0.75rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(16,185,129,.35)',
          zIndex: 1000,
          fontWeight: 600,
          fontSize: '0.88rem',
          fontFamily: '"Sora", sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '.4rem'
        }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 800 }}>OK</span>
          {copiedMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '.65rem',
        marginBottom: '1.2rem'
      }}>
        <button
          className="ov-btn"
          onClick={downloadPDF}
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
          }}
        >
          Download Report
        </button>

        <button
          className="ov-btn"
          onClick={explainWithAI}
          disabled={loadingAI}
          style={{
            background: loadingAI ? '#3a3d4a' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
          }}
        >
          {loadingAI ? <><span className="ov-spinner"></span>Generating...</> : 'Get AI Analysis'}
        </button>
      </div>

      {/* AI Explanation Display */}
      {aiExplanation && (
        <div className="ov-card ov-animate" style={{
          borderColor: aiExplanation.startsWith('[ERROR]')
            ? 'rgba(239,68,68,.4)'
            : 'rgba(139,92,246,.35)',
          background: aiExplanation.startsWith('[ERROR]')
            ? 'rgba(239,68,68,.06)'
            : 'rgba(139,92,246,.06)'
        }}>
          <div className="ov-card-header">
            <div className="ov-card-icon" style={{ background: aiExplanation.startsWith('[ERROR]') ? '#EF4444' : '#8B5CF6' }}>AI</div>
            <span className="ov-card-title" style={{ color: aiExplanation.startsWith('[ERROR]') ? '#fca5a5' : '#A78BFA' }}>
              AI Analysis Report
            </span>
          </div>
          <div style={{
            background: '#0b0e18',
            border: '1px solid #1a1d2a',
            padding: '1rem',
            borderRadius: '8px',
            lineHeight: '1.75',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            fontSize: '.88rem',
            fontFamily: '"JetBrains Mono", monospace',
            maxHeight: '380px',
            overflowY: 'auto',
            color: '#8a8f9e'
          }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* Sequence Statistics */}
      <div className="ov-card ov-animate" data-tour="overview-stats">
        <div className="ov-card-header">
          <div className="ov-card-icon" style={{ background: '#3B82F6' }}>SEQ</div>
          <span className="ov-card-title">Sequence Statistics</span>
        </div>
        <div className="ov-stat-grid">
          <StatCard label="Length" value={`${result.length} bp`} color="#3B82F6" />
          <StatCard label="GC Content" value={`${result.gc}%`} color="#10B981" />
          <StatCard label="AT Content" value={`${result.at}%`} color="#F59E0B" />
          <StatCard label="Melting Temp" value={`${result.tm} C`} color="#EF4444" />
          <StatCard label="Mol. Weight" value={`${result.molecularWeight}`} color="#8B5CF6" />
          <StatCard label="ORFs Found" value={result.nORFs} color="#06B6D4" />
        </div>
      </div>

      {/* Biological Insights */}
      <div className="ov-card ov-animate" style={{ borderColor: 'rgba(16,185,129,.25)', background: 'rgba(16,185,129,.04)' }}>
        <div className="ov-card-header">
          <div className="ov-card-icon" style={{ background: '#10B981' }}>BIO</div>
          <span className="ov-card-title" style={{ color: '#6EE7B7' }}>Biological Insights</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <InsightCard
            title="GC Content Analysis"
            value={`${result.gc}%`}
            interpretation={
              result.gc < 40 ? 'AT-rich region - common in intergenic spaces and regulatory elements' :
                result.gc < 60 ? 'Balanced composition - typical for many coding sequences' :
                  'GC-rich region - often found in promoters and gene-dense areas'
            }
            color="#10B981"
            percentage={result.gc}
          />

          <InsightCard
            title="Melting Temperature"
            value={`${result.tm} C`}
            interpretation={
              result.tm < 50 ? 'Lower Tm - weaker hydrogen bonding, suitable for low-temperature PCR' :
                result.tm < 70 ? 'Moderate Tm - typical range for standard PCR applications' :
                  'Higher Tm - strong hydrogen bonding, requires higher annealing temperatures'
            }
            color="#EF4444"
            percentage={Math.min(100, (result.tm / 100) * 100)}
          />

          <InsightCard
            title="Open Reading Frames"
            value={`${result.nORFs} ORF${result.nORFs !== 1 ? 's' : ''}`}
            interpretation={
              result.nORFs === 0 ? 'No ORFs detected - may be a non-coding region or regulatory sequence' :
                result.nORFs === 1 ? 'Single ORF found - could indicate a simple coding sequence' :
                  result.nORFs < 5 ? 'Multiple ORFs - suggests potential coding region with alternative start sites' :
                    'Many ORFs detected - complex region with multiple potential translation frames'
            }
            color="#06B6D4"
            percentage={Math.min(100, result.nORFs * 12)}
          />
        </div>
      </div>

      {/* ORF Visualization */}
      {originalSequence && (
        <div className="ov-card ov-animate">
          <div className="ov-card-header">
            <div className="ov-card-icon" style={{ background: '#06B6D4' }}>ORF</div>
            <span className="ov-card-title">ORF Visualization (Forward Frames)</span>
          </div>

          {visualORFs.length === 0 ? (
            <div style={{
              background: '#0f1117',
              border: '1px solid #1e2130',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7080',
              fontSize: '0.88rem'
            }}>
              <div style={{ fontSize: '1rem', marginBottom: '0.5rem', fontWeight: 600, color: '#4a4d5a' }}>No ORFs detected</div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#3a3d4a' }}>
                ORFs require a start codon (ATG) followed by a stop codon (TAA, TAG, or TGA) in the same frame
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                fontSize: '0.82rem',
                color: '#6b7080',
                marginBottom: '1rem',
                padding: '0.7rem .85rem',
                background: '#0f1117',
                borderRadius: '7px',
                border: '1px solid #1e2130'
              }}>
                Found {visualORFs.length} ORF{visualORFs.length !== 1 ? 's' : ''} across 3 forward reading frames.
                Each colored block represents a potential coding region.
              </div>

              <ORFFrameVisualization
                frame={1}
                orfs={visualORFs.filter(orf => orf.frame === 1)}
                sequenceLength={originalSequence.length}
              />
              <ORFFrameVisualization
                frame={2}
                orfs={visualORFs.filter(orf => orf.frame === 2)}
                sequenceLength={originalSequence.length}
              />
              <ORFFrameVisualization
                frame={3}
                orfs={visualORFs.filter(orf => orf.frame === 3)}
                sequenceLength={originalSequence.length}
              />

              {/* Legend */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginTop: '.85rem',
                padding: '0.65rem .85rem',
                background: '#0f1117',
                borderRadius: '7px',
                border: '1px solid #1e2130',
                fontSize: '0.78rem',
                flexWrap: 'wrap'
              }}>
                {[
                  { col: '#3B82F6', l: 'Frame 1' },
                  { col: '#10B981', l: 'Frame 2' },
                  { col: '#F59E0B', l: 'Frame 3' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: 12, height: 12, background: item.col, borderRadius: 3, boxShadow: `0 0 6px ${item.col}55` }}></div>
                    <span style={{ color: '#8a8f9e' }}>{item.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Base Composition & Skew Analysis */}
      <div className="ov-card ov-animate">
        <div className="ov-card-header">
          <div className="ov-card-icon" style={{ background: '#8B5CF6' }}>DNA</div>
          <span className="ov-card-title">Base Composition & Skew Analysis</span>
        </div>

        {/* Individual Bases */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h4 style={{
            fontSize: '0.82rem',
            color: '#6b7080',
            marginBottom: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '.06em'
          }}>
            Nucleotide Distribution
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '0.65rem'
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
            fontSize: '0.82rem',
            color: '#6b7080',
            marginBottom: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '.06em'
          }}>
            Chemical Groups
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.65rem'
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
            fontSize: '0.82rem',
            color: '#6b7080',
            marginBottom: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '.06em'
          }}>
            Compositional Skew
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.65rem'
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

      {/* Reverse Complement */}
      <div className="ov-card ov-animate">
        <div className="ov-card-header">
          <div className="ov-card-icon" style={{ background: '#06B6D4' }}>RC</div>
          <span className="ov-card-title">Reverse Complement</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          <button
            className="ov-btn"
            onClick={() => copyToClipboard(result.revcomp, 'Reverse complement')}
            style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', padding: '.65rem', fontSize: '.88rem' }}
          >
            Copy to Clipboard
          </button>
          <button
            className="ov-btn"
            onClick={() => downloadFASTA(result.revcomp, 'reverse_complement.fasta')}
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', padding: '.65rem', fontSize: '.88rem' }}
          >
            Download FASTA
          </button>
        </div>

        <div className="ov-mono">
          {result.revcomp}
        </div>
      </div>

      {/* Longest ORF */}
      {result.longestORF && (
        <div className="ov-card ov-animate" style={{ borderLeft: '3px solid #F59E0B' }}>
          <div className="ov-card-header">
            <div className="ov-card-icon" style={{ background: '#F59E0B' }}>ORF</div>
            <span className="ov-card-title">Longest Open Reading Frame</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.65rem',
            marginBottom: '1rem'
          }}>
            <InfoItem label="Frame" value={result.longestORF.frame} />
            <InfoItem label="Length" value={`${result.longestORF.length_nt} nt`} />
            <InfoItem label="Type" value={result.longestORF.type} />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <strong style={{
              color: '#6b7080',
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '.82rem',
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              DNA Sequence
            </strong>
            <div className="ov-mono">
              {result.longestORF.dna_seq}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <strong style={{
              color: '#6b7080',
              display: 'block',
              marginBottom: '0.4rem',
              fontSize: '.82rem',
              textTransform: 'uppercase',
              letterSpacing: '.06em'
            }}>
              Amino Acid Sequence
            </strong>
            <div className="ov-mono">
              {result.longestORF.aa_seq}
            </div>
          </div>
        </div>
      )}

      {/* All ORFs */}
      {result.allORFs && result.allORFs.length > 0 && (
        <div className="ov-card ov-animate">
          <div className="ov-card-header">
            <div className="ov-card-icon" style={{ background: '#3B82F6' }}>ALL</div>
            <span className="ov-card-title">All Open Reading Frames</span>
            <span style={{
              background: 'rgba(59,130,246,.18)',
              color: '#60A5FA',
              fontSize: '.78rem',
              fontWeight: 600,
              padding: '.18rem .48rem',
              borderRadius: 8,
              marginLeft: '.3rem'
            }}>{result.nORFs} total</span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            maxHeight: '450px',
            overflowY: 'auto'
          }}>
            {result.allORFs.slice(0, 20).map((orf, idx) => (
              <div key={idx} style={{
                background: '#0f1117',
                border: '1px solid #1e2130',
                borderRadius: '8px',
                padding: '0.85rem',
                width: '100%',
                boxSizing: 'border-box',
                borderLeft: '3px solid #3B82F6',
                transition: 'all .2s ease'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  fontSize: '0.82rem'
                }}>
                  <span style={{
                    background: 'rgba(59,130,246,.2)',
                    border: '1px solid rgba(59,130,246,.4)',
                    color: '#60A5FA',
                    padding: '0.18rem 0.55rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: '#6b7080' }}>Frame {orf.frame}</span>
                  <span style={{ color: '#6b7080', fontFamily: '"JetBrains Mono", monospace' }}>{orf.length_nt} nt</span>
                  <span style={{ color: '#6b7080' }}>{orf.type}</span>
                </div>
                <div className="ov-mono" style={{ maxHeight: '120px' }}>
                  {orf.aa_seq}
                </div>
              </div>
            ))}
            {result.allORFs.length > 20 && (
              <div style={{
                textAlign: 'center',
                color: '#4a4d5a',
                padding: '1rem',
                background: '#0f1117',
                borderRadius: '8px',
                border: '1px solid #1e2130',
                fontSize: '0.88rem'
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

// Insight Card Component (no emoji)
function InsightCard({ title, value, interpretation, color, percentage }) {
  return (
    <div className="ov-insight">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}88`, flexShrink: 0 }}></div>
        <strong style={{ color, fontSize: '0.88rem' }}>{title}</strong>
        <span style={{
          marginLeft: 'auto',
          color,
          fontWeight: 700,
          fontSize: '.95rem',
          fontFamily: '"JetBrains Mono", monospace'
        }}>
          {value}
        </span>
      </div>
      <div className="ov-gauge-track">
        <div className="ov-gauge-fill" style={{ width: `${Math.min(100, percentage || 0)}%`, background: color }}></div>
      </div>
      <p style={{
        margin: '.5rem 0 0',
        fontSize: '0.82rem',
        color: '#6b7080',
        lineHeight: '1.55'
      }}>
        {interpretation}
      </p>
    </div>
  );
}

// ORF Frame Visualization Component
function ORFFrameVisualization({ frame, orfs, sequenceLength }) {
  const frameColors = {
    1: '#3B82F6',
    2: '#10B981',
    3: '#F59E0B'
  };

  return (
    <div style={{ marginBottom: '0.7rem' }}>
      <div style={{
        fontSize: '0.78rem',
        color: '#6b7080',
        marginBottom: '0.25rem',
        fontWeight: 600,
        letterSpacing: '.04em'
      }}>
        Frame {frame}
      </div>
      <div style={{
        position: 'relative',
        height: '28px',
        background: '#0f1117',
        border: '1px solid #1e2130',
        borderRadius: '5px',
        overflow: 'hidden'
      }}>
        {orfs.length === 0 ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '0.72rem',
            color: '#3a3d4a'
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
                  width: `${Math.max(width, 1)}%`,
                  height: '100%',
                  background: frameColors[frame],
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                  opacity: 0.82,
                  boxShadow: `0 0 8px ${frameColors[frame]}55`
                }}
                onMouseEnter={(e) => e.target.style.opacity = 1}
                onMouseLeave={(e) => e.target.style.opacity = 0.82}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// Metric Card with Tooltip (dark theme, no emoji)
function MetricCard({ label, value, percentage, tooltip, color, activeTooltip, setActiveTooltip, tooltipId }) {
  return (
    <div
      style={{
        background: '#0f1117',
        borderRadius: '8px',
        padding: '0.85rem',
        border: '1px solid #1e2130',
        textAlign: 'center',
        position: 'relative',
        cursor: 'help',
        transition: 'all .3s ease'
      }}
      onMouseEnter={() => setActiveTooltip(tooltipId)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div style={{
        color: '#6b7080',
        fontSize: '0.78rem',
        marginBottom: '0.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem'
      }}>
        {label}
        <span style={{ fontSize: '0.65rem', color: '#4a4d5a', fontWeight: 700 }}>[?]</span>
      </div>
      <div style={{
        color,
        fontSize: '1.4rem',
        fontWeight: 700,
        fontFamily: '"JetBrains Mono", monospace'
      }}>
        {value}
      </div>
      <div style={{
        color: '#4a4d5a',
        fontSize: '0.8rem'
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
          background: '#1a1d2a',
          border: '1px solid #2a2d3a',
          color: '#c8cad4',
          borderRadius: '7px',
          fontSize: '0.73rem',
          whiteSpace: 'normal',
          width: '200px',
          zIndex: 10,
          boxShadow: '0 8px 20px rgba(0,0,0,.4)'
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Skew Card with Tooltip (dark theme, no emoji)
function SkewCard({ label, value, tooltip, color, activeTooltip, setActiveTooltip, tooltipId }) {
  const numValue = parseFloat(value);
  const isPositive = numValue > 0;

  return (
    <div
      style={{
        background: '#0f1117',
        borderRadius: '8px',
        padding: '0.85rem',
        border: '1px solid #1e2130',
        textAlign: 'center',
        position: 'relative',
        cursor: 'help',
        transition: 'all .3s ease'
      }}
      onMouseEnter={() => setActiveTooltip(tooltipId)}
      onMouseLeave={() => setActiveTooltip(null)}
    >
      <div style={{
        color: '#6b7080',
        fontSize: '0.78rem',
        marginBottom: '0.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.25rem'
      }}>
        {label}
        <span style={{ fontSize: '0.65rem', color: '#4a4d5a', fontWeight: 700 }}>[?]</span>
      </div>
      <div style={{
        color: isPositive ? '#10B981' : '#EF4444',
        fontSize: '1.4rem',
        fontWeight: 700,
        fontFamily: '"JetBrains Mono", monospace'
      }}>
        {isPositive ? '+' : ''}{value}
      </div>
      <div style={{
        color: '#4a4d5a',
        fontSize: '0.73rem'
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
          background: '#1a1d2a',
          border: '1px solid #2a2d3a',
          color: '#c8cad4',
          borderRadius: '7px',
          fontSize: '0.73rem',
          whiteSpace: 'normal',
          width: '220px',
          zIndex: 10,
          boxShadow: '0 8px 20px rgba(0,0,0,.4)'
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// Dark theme StatCard (no emoji)
function StatCard({ label, value, color }) {
  return (
    <div className="ov-stat">
      <div className="ov-stat-label">
        {label}
      </div>
      <div className="ov-stat-value" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

// Dark theme BaseCard (no emoji)
function BaseCard({ label, count, total, color }) {
  const percentage = ((count / total) * 100).toFixed(1);
  return (
    <div className="ov-stat">
      <div className="ov-stat-label">
        {label}
      </div>
      <div className="ov-stat-value" style={{ color }}>
        {count}
      </div>
      <div style={{ color: '#4a4d5a', fontSize: '0.8rem', marginTop: '.15rem' }}>
        {percentage}%
      </div>
      <div className="ov-gauge-track" style={{ marginTop: '.4rem' }}>
        <div className="ov-gauge-fill" style={{ width: `${percentage}%`, background: color }}></div>
      </div>
    </div>
  );
}

// Dark theme InfoItem (no emoji)
function InfoItem({ label, value }) {
  return (
    <div style={{
      background: '#0f1117',
      borderRadius: '8px',
      padding: '0.7rem .85rem',
      border: '1px solid #1e2130',
      minWidth: '0'
    }}>
      <div style={{
        color: '#6b7080',
        fontSize: '0.78rem',
        marginBottom: '0.2rem',
        textTransform: 'uppercase',
        letterSpacing: '.06em'
      }}>
        {label}
      </div>
      <div style={{
        color: '#c8cad4',
        fontWeight: 600,
        fontSize: '0.92rem',
        wordBreak: 'break-word',
        fontFamily: '"JetBrains Mono", monospace'
      }}>
        {value}
      </div>
    </div>
  );
}