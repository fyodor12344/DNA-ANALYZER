import { useState } from 'react';
import { getAIExplanation, validateSequence } from "../utils/apiUtils";

// Cas enzyme configurations
const CAS_ENZYMES = {
  spCas9: {
    name: 'SpCas9 (Streptococcus pyogenes)',
    pam: 'NGG',
    pamLength: 3,
    guideLength: 20,
    pamPosition: 'downstream', // PAM is downstream of target
    color: '#10B981'
  },
  saCas9: {
    name: 'SaCas9 (Staphylococcus aureus)',
    pam: 'NNGRRT',
    pamLength: 6,
    guideLength: 21,
    pamPosition: 'downstream',
    color: '#3B82F6'
  },
  cas12a: {
    name: 'Cas12a/Cpf1 (Lachnospiraceae)',
    pam: 'TTTV',
    pamLength: 4,
    guideLength: 20,
    pamPosition: 'upstream', // PAM is upstream of target
    color: '#F59E0B'
  },
  custom: {
    name: 'Custom PAM',
    pam: '',
    pamLength: 0,
    guideLength: 20,
    pamPosition: 'downstream',
    color: '#8B5CF6'
  }
};

export default function CRISPRFinder() {
  const [sequence, setSequence] = useState('');
  const [selectedCas, setSelectedCas] = useState('spCas9');
  const [customPAM, setCustomPAM] = useState('');
  const [customGuideLength, setCustomGuideLength] = useState(20);
  const [customPAMPosition, setCustomPAMPosition] = useState('downstream');
  const [pamSites, setPamSites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  // Get current Cas configuration
  const getCurrentCasConfig = () => {
    if (selectedCas === 'custom') {
      return {
        ...CAS_ENZYMES.custom,
        pam: customPAM.toUpperCase(),
        pamLength: customPAM.length,
        guideLength: customGuideLength,
        pamPosition: customPAMPosition
      };
    }
    return CAS_ENZYMES[selectedCas];
  };

  // Find PAM sites in sequence
  const findPAMSites = (seq, casConfig) => {
    const sites = [];
    const cleanSeq = seq.toUpperCase().replace(/[^ATGC]/g, '');
    
    // Convert PAM pattern to regex
    const pamRegex = pamPatternToRegex(casConfig.pam);
    
    // Search forward strand
    for (let i = 0; i <= cleanSeq.length - casConfig.pamLength; i++) {
      const pamSeq = cleanSeq.substring(i, i + casConfig.pamLength);
      
      if (pamRegex.test(pamSeq)) {
        const site = extractSiteInfo(cleanSeq, i, 'forward', casConfig, pamSeq);
        if (site) sites.push(site);
      }
    }
    
    // Search reverse strand
    const reverseComp = getReverseComplement(cleanSeq);
    for (let i = 0; i <= reverseComp.length - casConfig.pamLength; i++) {
      const pamSeq = reverseComp.substring(i, i + casConfig.pamLength);
      
      if (pamRegex.test(pamSeq)) {
        // Convert position back to forward strand coordinates
        const forwardPos = cleanSeq.length - i - casConfig.pamLength;
        const site = extractSiteInfo(cleanSeq, forwardPos, 'reverse', casConfig, pamSeq);
        if (site) sites.push(site);
      }
    }
    
    // Sort by position
    sites.sort((a, b) => a.position - b.position);
    
    return sites;
  };

  // Convert PAM pattern to regex (N=any, R=A/G, Y=C/T, etc.)
  const pamPatternToRegex = (pattern) => {
    const iupac = {
      'N': '[ATGC]',
      'R': '[AG]',
      'Y': '[CT]',
      'M': '[AC]',
      'K': '[GT]',
      'S': '[GC]',
      'W': '[AT]',
      'H': '[ACT]',
      'B': '[CGT]',
      'V': '[ACG]',
      'D': '[AGT]',
      'A': 'A',
      'T': 'T',
      'G': 'G',
      'C': 'C'
    };
    
    let regex = '^';
    for (let char of pattern.toUpperCase()) {
      regex += iupac[char] || '[ATGC]';
    }
    regex += '$';
    
    return new RegExp(regex);
  };

  // Extract site information
  const extractSiteInfo = (seq, pamStart, strand, casConfig, pamSeq) => {
    let guideStart, guideEnd, pamEnd;
    
    pamEnd = pamStart + casConfig.pamLength;
    
    if (casConfig.pamPosition === 'downstream') {
      // PAM is after the target (SpCas9, SaCas9)
      guideEnd = pamStart;
      guideStart = Math.max(0, guideEnd - casConfig.guideLength);
    } else {
      // PAM is before the target (Cas12a)
      guideStart = pamEnd;
      guideEnd = Math.min(seq.length, guideStart + casConfig.guideLength);
    }
    
    // Extract sequences
    const guideRNA = seq.substring(guideStart, guideEnd);
    
    // Context (±10 bp around PAM + guide)
    const contextStart = Math.max(0, Math.min(guideStart, pamStart) - 10);
    const contextEnd = Math.min(seq.length, Math.max(guideEnd, pamEnd) + 10);
    const context = seq.substring(contextStart, contextEnd);
    
    // Calculate GC content and efficiency
    const gcContent = calculateGCContent(guideRNA);
    const efficiency = estimateEfficiency(guideRNA, gcContent);
    
    return {
      position: pamStart + 1, // 1-indexed
      positionEnd: pamEnd,
      strand: strand,
      pamSequence: pamSeq,
      guideRNA: guideRNA,
      guideLength: guideRNA.length,
      guideStart: guideStart + 1,
      guideEnd: guideEnd,
      context: context,
      contextStart: contextStart + 1,
      gcContent: gcContent.toFixed(1),
      efficiency: efficiency
    };
  };

  // Get reverse complement
  const getReverseComplement = (seq) => {
    const complement = { 'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G' };
    return seq.split('').reverse().map(base => complement[base] || base).join('');
  };

  // Calculate GC content
  const calculateGCContent = (seq) => {
    const gc = (seq.match(/[GC]/g) || []).length;
    return (gc / seq.length) * 100;
  };

  // Estimate targeting efficiency
  const estimateEfficiency = (guide, gcContent) => {
    // Simple heuristic based on GC content and guide length
    if (gcContent < 30 || gcContent > 80) return 'Low';
    if (gcContent >= 40 && gcContent <= 60 && guide.length >= 20) return 'High';
    return 'Medium';
  };

  const handleFindPAMSites = async () => {
    if (!sequence.trim()) {
      setError('Please enter a DNA sequence');
      return;
    }

    const casConfig = getCurrentCasConfig();
    
    if (selectedCas === 'custom' && !customPAM.trim()) {
      setError('Please enter a custom PAM sequence');
      return;
    }

    // Validate sequence
    const validation = validateSequence(sequence);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setLoading(true);
    setError('');
    setAiExplanation('');
    setPamSites(null);

    // Simulate async operation
    setTimeout(() => {
      try {
        const sites = findPAMSites(validation.cleaned, casConfig);
        
        const forwardSites = sites.filter(s => s.strand === 'forward').length;
        const reverseSites = sites.filter(s => s.strand === 'reverse').length;
        
        setPamSites({
          sites: sites,
          total_sites: sites.length,
          forward_strand_sites: forwardSites,
          reverse_strand_sites: reverseSites,
          cas_enzyme: casConfig.name,
          pam_pattern: casConfig.pam,
          sequence_length: validation.cleaned.length
        });
        setSelectedSite(null);
      } catch (err) {
        setError('Error analyzing sequence: ' + err.message);
      }
      setLoading(false);
    }, 500);
  };

  const handleExplainWithAI = async () => {
    if (!pamSites) return;
    
    setLoadingAI(true);
    
    const casConfig = getCurrentCasConfig();
    const analysisData = {
      cas_enzyme: casConfig.name,
      pam_pattern: casConfig.pam,
      total_sites: pamSites.total_sites,
      forward_sites: pamSites.forward_strand_sites,
      reverse_sites: pamSites.reverse_strand_sites,
      sequence_length: pamSites.sequence_length,
      high_efficiency: pamSites.sites.filter(s => s.efficiency === 'High').length,
      medium_efficiency: pamSites.sites.filter(s => s.efficiency === 'Medium').length,
      low_efficiency: pamSites.sites.filter(s => s.efficiency === 'Low').length,
      avg_gc_content: pamSites.sites.length > 0 
        ? (pamSites.sites.reduce((sum, s) => sum + parseFloat(s.gcContent), 0) / pamSites.sites.length).toFixed(1)
        : 0
    };
    
    const response = await getAIExplanation('CRISPR PAM Finder', analysisData);
    
    setLoadingAI(false);
    
    if (response.success) {
      setAiExplanation(response.data.explanation);
    } else {
      setError(response.error);
    }
  };

  const downloadReport = (format = 'txt') => {
    if (!pamSites) return;

    const reportContent = generateReportContent();
    
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>CRISPR PAM Site Analysis Report</title>
            <style>
              body { 
                font-family: 'Inter', -apple-system, sans-serif; 
                padding: 40px;
                line-height: 1.6;
                max-width: 900px;
                margin: 0 auto;
              }
              h1 { 
                color: #10B981; 
                font-size: 24px;
                border-bottom: 3px solid #10B981;
                padding-bottom: 10px;
              }
              h2 { 
                color: #1F2937;
                font-size: 18px;
                margin-top: 30px;
                border-bottom: 1px solid #E5E7EB;
                padding-bottom: 5px;
              }
              .disclaimer {
                background: #FEF3C7;
                border-left: 4px solid #F59E0B;
                padding: 15px;
                margin: 20px 0;
                font-size: 12px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 11px;
              }
              th, td {
                border: 1px solid #E5E7EB;
                padding: 8px;
                text-align: left;
              }
              th {
                background: #F3F4F6;
                font-weight: 600;
              }
              pre { 
                white-space: pre-wrap; 
                word-wrap: break-word;
                font-family: 'Courier New', monospace;
                font-size: 10px;
                background: #F9FAFB;
                padding: 10px;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <pre>${reportContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    } else {
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CRISPR_PAM_Report_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateReportContent = () => {
    const casConfig = getCurrentCasConfig();
    
    let report = '='.repeat(90) + '\n';
    report += 'CRISPR PAM SITE ANALYSIS REPORT - RESEARCH GRADE\n';
    report += '='.repeat(90) + '\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Analysis Tool: BioTools Suite - CRISPR PAM Finder\n\n`;
    
    report += 'DISCLAIMER\n';
    report += '-'.repeat(90) + '\n';
    report += 'This report is for research and educational purposes only. It is not intended for\n';
    report += 'clinical diagnostics or therapeutic applications. All CRISPR designs should be\n';
    report += 'experimentally validated before use. Consult relevant biosafety guidelines and\n';
    report += 'obtain necessary approvals before conducting gene editing experiments.\n\n';
    
    report += 'ANALYSIS PARAMETERS\n';
    report += '-'.repeat(90) + '\n';
    report += `Cas Enzyme: ${casConfig.name}\n`;
    report += `PAM Pattern: ${casConfig.pam}\n`;
    report += `PAM Position: ${casConfig.pamPosition === 'downstream' ? 'Downstream of target' : 'Upstream of target'}\n`;
    report += `Guide RNA Length: ${casConfig.guideLength} bp\n`;
    report += `Sequence Length: ${pamSites.sequence_length} bp\n`;
    report += `Analysis Date: ${new Date().toLocaleDateString()}\n\n`;
    
    report += 'SUMMARY\n';
    report += '-'.repeat(90) + '\n';
    report += `Total PAM Sites Found: ${pamSites.total_sites}\n`;
    report += `Forward Strand (+): ${pamSites.forward_strand_sites}\n`;
    report += `Reverse Strand (-): ${pamSites.reverse_strand_sites}\n`;
    
    if (pamSites.sites.length > 0) {
      const highEff = pamSites.sites.filter(s => s.efficiency === 'High').length;
      const medEff = pamSites.sites.filter(s => s.efficiency === 'Medium').length;
      const lowEff = pamSites.sites.filter(s => s.efficiency === 'Low').length;
      
      report += `\nEfficiency Distribution:\n`;
      report += `  High Efficiency: ${highEff} (${((highEff/pamSites.total_sites)*100).toFixed(1)}%)\n`;
      report += `  Medium Efficiency: ${medEff} (${((medEff/pamSites.total_sites)*100).toFixed(1)}%)\n`;
      report += `  Low Efficiency: ${lowEff} (${((lowEff/pamSites.total_sites)*100).toFixed(1)}%)\n`;
    }
    report += '\n';
    
    if (pamSites.sites.length > 0) {
      report += 'DETAILED PAM SITES\n';
      report += '-'.repeat(90) + '\n\n';
      
      // Table header
      report += String.prototype.padEnd.call('Site', 6);
      report += String.prototype.padEnd.call('Position', 12);
      report += String.prototype.padEnd.call('Strand', 8);
      report += String.prototype.padEnd.call('PAM', 10);
      report += String.prototype.padEnd.call('GC%', 6);
      report += String.prototype.padEnd.call('Efficiency', 12);
      report += 'sgRNA\n';
      report += '-'.repeat(90) + '\n';
      
      pamSites.sites.forEach((site, idx) => {
        report += String.prototype.padEnd.call(`${idx + 1}`, 6);
        report += String.prototype.padEnd.call(`${site.position}-${site.positionEnd}`, 12);
        report += String.prototype.padEnd.call(site.strand === 'forward' ? '(+)' : '(-)', 8);
        report += String.prototype.padEnd.call(site.pamSequence, 10);
        report += String.prototype.padEnd.call(site.gcContent, 6);
        report += String.prototype.padEnd.call(site.efficiency, 12);
        report += site.guideRNA + '\n';
      });
      report += '\n';
      
      report += 'COMPLETE SITE DETAILS\n';
      report += '-'.repeat(90) + '\n\n';
      
      pamSites.sites.forEach((site, idx) => {
        report += `Site ${idx + 1}:\n`;
        report += `  PAM Position: ${site.position}-${site.positionEnd} (${site.strand === 'forward' ? 'forward strand +' : 'reverse strand -'})\n`;
        report += `  PAM Sequence: ${site.pamSequence}\n`;
        report += `  Guide RNA (sgRNA): ${site.guideRNA}\n`;
        report += `  Guide Position: ${site.guideStart}-${site.guideEnd}\n`;
        report += `  Guide Length: ${site.guideLength} bp\n`;
        report += `  GC Content: ${site.gcContent}%\n`;
        report += `  Target Efficiency: ${site.efficiency}\n`;
        report += `  Context (±10bp): ${site.context}\n`;
        report += `  Context Position: ${site.contextStart}-${site.contextStart + site.context.length - 1}\n\n`;
      });
    }
    
    if (aiExplanation && !aiExplanation.startsWith('❌')) {
      report += 'AI GUIDANCE & RECOMMENDATIONS\n';
      report += '-'.repeat(90) + '\n';
      report += aiExplanation + '\n\n';
    }
    
    report += '='.repeat(90) + '\n';
    report += 'END OF REPORT\n';
    report += 'Generated by BioTools Suite - For Research Use Only\n';
    report += '='.repeat(90) + '\n';
    
    return report;
  };

  const highlightPAMInSequence = () => {
    if (!pamSites || !sequence) return null;

    const seq = sequence.toUpperCase().replace(/[^ATGC]/g, '');
    const elements = [];
    let lastIndex = 0;

    pamSites.sites.forEach((site, siteIdx) => {
      const pamStart = site.position - 1; // Convert to 0-indexed
      const pamEnd = site.positionEnd;
      const guideStart = site.guideStart - 1;
      const guideEnd = site.guideEnd;

      // Add any sequence before this site
      if (lastIndex < Math.min(pamStart, guideStart)) {
        elements.push({
          text: seq.substring(lastIndex, Math.min(pamStart, guideStart)),
          type: 'normal'
        });
      }

      // Determine order based on PAM position
      const casConfig = getCurrentCasConfig();
      if (casConfig.pamPosition === 'downstream') {
        // Guide first, then PAM
        if (lastIndex < guideEnd) {
          elements.push({
            text: seq.substring(Math.max(lastIndex, guideStart), guideEnd),
            type: 'guide',
            strand: site.strand
          });
        }
        elements.push({
          text: seq.substring(pamStart, pamEnd),
          type: 'pam',
          strand: site.strand
        });
        lastIndex = pamEnd;
      } else {
        // PAM first, then guide
        elements.push({
          text: seq.substring(pamStart, pamEnd),
          type: 'pam',
          strand: site.strand
        });
        elements.push({
          text: seq.substring(guideStart, guideEnd),
          type: 'guide',
          strand: site.strand
        });
        lastIndex = guideEnd;
      }
    });

    // Add remaining sequence
    if (lastIndex < seq.length) {
      elements.push({
        text: seq.substring(lastIndex),
        type: 'normal'
      });
    }

    return (
      <div className="sequence-box">
        {elements.map((segment, idx) => (
          <span
            key={idx}
            style={{
              backgroundColor: 
                segment.type === 'pam' 
                  ? (segment.strand === 'forward' ? '#10B98130' : '#3B82F630')
                  : 'transparent',
              textDecoration: segment.type === 'guide' ? 'underline' : 'none',
              textDecorationColor: segment.strand === 'forward' ? '#10B981' : '#3B82F6',
              textDecorationThickness: '2px',
              textUnderlineOffset: '3px',
              padding: segment.type !== 'normal' ? '2px 4px' : '0',
              borderRadius: '3px',
              fontWeight: segment.type === 'pam' ? '700' : '400',
              fontFamily: 'monospace'
            }}
          >
            {segment.text}
          </span>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    if (!pamSites || pamSites.sites.length === 0) return null;

    const forwardCount = pamSites.forward_strand_sites;
    const reverseCount = pamSites.reverse_strand_sites;
    const total = pamSites.total_sites;

    const forwardPercent = total > 0 ? (forwardCount / total) * 100 : 0;
    const reversePercent = total > 0 ? (reverseCount / total) * 100 : 0;

    const highEfficiency = pamSites.sites.filter(s => s.efficiency === 'High').length;
    const mediumEfficiency = pamSites.sites.filter(s => s.efficiency === 'Medium').length;
    const lowEfficiency = pamSites.sites.filter(s => s.efficiency === 'Low').length;

    return (
      <div className="charts-container">
        <div className="chart-card">
          <h4 className="chart-title">Strand Distribution</h4>
          <div className="bar-chart">
            <div className="bar-item">
              <div className="bar-label">
                <span>Forward Strand (+)</span>
                <span className="bar-value">{forwardCount}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${forwardPercent}%`,
                    background: 'linear-gradient(90deg, #10B981, #34D399)'
                  }}
                />
              </div>
              <span className="bar-percent">{forwardPercent.toFixed(1)}%</span>
            </div>
            <div className="bar-item">
              <div className="bar-label">
                <span>Reverse Strand (-)</span>
                <span className="bar-value">{reverseCount}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${reversePercent}%`,
                    background: 'linear-gradient(90deg, #3B82F6, #60A5FA)'
                  }}
                />
              </div>
              <span className="bar-percent">{reversePercent.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h4 className="chart-title">Target Efficiency Distribution</h4>
          <div className="bar-chart">
            <div className="bar-item">
              <div className="bar-label">
                <span>High Efficiency</span>
                <span className="bar-value">{highEfficiency}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(highEfficiency / total) * 100}%`,
                    background: 'linear-gradient(90deg, #10B981, #34D399)'
                  }}
                />
              </div>
              <span className="bar-percent">{((highEfficiency / total) * 100).toFixed(1)}%</span>
            </div>
            <div className="bar-item">
              <div className="bar-label">
                <span>Medium Efficiency</span>
                <span className="bar-value">{mediumEfficiency}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(mediumEfficiency / total) * 100}%`,
                    background: 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                  }}
                />
              </div>
              <span className="bar-percent">{((mediumEfficiency / total) * 100).toFixed(1)}%</span>
            </div>
            <div className="bar-item">
              <div className="bar-label">
                <span>Low Efficiency</span>
                <span className="bar-value">{lowEfficiency}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${(lowEfficiency / total) * 100}%`,
                    background: 'linear-gradient(90deg, #EF4444, #F87171)'
                  }}
                />
              </div>
              <span className="bar-percent">{((lowEfficiency / total) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getEfficiencyColor = (efficiency) => {
    if (efficiency === 'High') return '#10B981';
    if (efficiency === 'Medium') return '#F59E0B';
    return '#EF4444';
  };

  const casConfig = getCurrentCasConfig();

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

        .legend-box {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .legend-items {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          font-size: 0.85rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .legend-sample {
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.85rem;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .results-table th {
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.8rem;
        }

        .results-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #E5E7EB;
        }

        .results-table tr:last-child td {
          border-bottom: none;
        }

        .results-table tr:hover {
          background: #F9FAFB;
        }

        .strand-indicator {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .pam-seq-cell {
          font-family: monospace;
          font-weight: 600;
          color: #10B981;
        }

        .guide-seq-cell {
          font-family: monospace;
          font-size: 0.75rem;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .context-seq-cell {
          font-family: monospace;
          font-size: 0.7rem;
          color: #6B7280;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .results-table {
            font-size: 0.75rem;
          }
          
          .results-table th,
          .results-table td {
            padding: 0.5rem;
          }
        }
      `}</style>
      
      <h2 style={{ fontFamily: 'Montserrat, sans-serif' }} className="section-title">
        🧬 CRISPR PAM Site Finder - Research Grade
      </h2>
      
      <div className="info-box">
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>Research-Grade CRISPR Analysis:</strong> Identify PAM (Protospacer Adjacent Motif) 
          sites for CRISPR-Cas gene editing with support for multiple Cas enzymes.
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
          ⚠️ For research and educational purposes only. Not for clinical diagnostics.
        </p>
      </div>

      {/* Cas Enzyme Selection */}
      <div className="sequence-input-group">
        <label className="input-label">Cas Enzyme Selection</label>
        <select
          value={selectedCas}
          onChange={(e) => setSelectedCas(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontFamily: 'Inter, sans-serif',
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="spCas9">SpCas9 - NGG (Standard, S. pyogenes)</option>
          <option value="saCas9">SaCas9 - NNGRRT (Compact, S. aureus)</option>
          <option value="cas12a">Cas12a/Cpf1 - TTTV (T-rich PAM)</option>
          <option value="custom">Custom PAM Pattern</option>
        </select>
      </div>

      {/* Custom PAM Input */}
      {selectedCas === 'custom' && (
        <div style={{ 
          background: '#F9FAFB', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          border: '1px solid #E5E7EB'
        }}>
          <div className="sequence-input-group" style={{ marginBottom: '0.75rem' }}>
            <label className="input-label">
              Custom PAM Pattern (IUPAC codes: N=any, R=A/G, Y=C/T, etc.)
            </label>
            <input
              type="text"
              value={customPAM}
              onChange={(e) => setCustomPAM(e.target.value.toUpperCase())}
              placeholder="e.g., NGG, NNNNGATT, TTTN"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontFamily: 'monospace'
              }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="sequence-input-group">
              <label className="input-label">Guide RNA Length (bp)</label>
              <input
                type="number"
                value={customGuideLength}
                onChange={(e) => setCustomGuideLength(parseInt(e.target.value) || 20)}
                min="15"
                max="25"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
            
            <div className="sequence-input-group">
              <label className="input-label">PAM Position</label>
              <select
                value={customPAMPosition}
                onChange={(e) => setCustomPAMPosition(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              >
                <option value="downstream">Downstream (3' of target)</option>
                <option value="upstream">Upstream (5' of target)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="sequence-input-group">
        <label className="input-label">DNA Sequence</label>
        <textarea
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
          placeholder="Enter DNA sequence to scan for PAM sites...&#10;&#10;Example: ATGCGATCGTAGCTAGCTAGCTAGCTGATCGTAGCTAGC"
          className="dna-input"
          rows={6}
        />
      </div>

      <button 
        onClick={handleFindPAMSites} 
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
        {loading ? 'Scanning Sequence...' : '🔍 Find PAM Sites'}
      </button>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {pamSites && (
        <div className="results-container">
          {/* Action Buttons */}
          <div className="action-buttons" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button onClick={() => downloadReport('txt')} className="export-btn">
              📄 Download TXT Report
            </button>
            <button onClick={() => downloadReport('pdf')} className="export-btn">
              🖨️ Print/PDF Report
            </button>
            <button 
              onClick={() => setShowLegend(!showLegend)} 
              className="export-btn"
              style={{ marginLeft: 'auto' }}
            >
              {showLegend ? '🔽 Hide Legend' : '🔼 Show Legend'}
            </button>
          </div>

          {/* Summary Cards */}
          <div className="pam-summary">
            <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
              Analysis Summary
            </h3>
            <div style={{ 
              background: '#F0FDF4', 
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#166534'
            }}>
              <strong>Cas Enzyme:</strong> {casConfig.name} | <strong>PAM:</strong> {casConfig.pam} | 
              <strong> Position:</strong> {casConfig.pamPosition === 'downstream' ? 'Downstream (3\')' : 'Upstream (5\')'} | 
              <strong> Guide Length:</strong> {casConfig.guideLength} bp
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total PAM Sites</div>
                <div className="stat-value">{pamSites.total_sites}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Forward Strand (+)</div>
                <div className="stat-value" style={{ color: '#10B981' }}>
                  {pamSites.forward_strand_sites}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Reverse Strand (-)</div>
                <div className="stat-value" style={{ color: '#3B82F6' }}>
                  {pamSites.reverse_strand_sites}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Sequence Length</div>
                <div className="stat-value" style={{ color: '#6B7280' }}>
                  {pamSites.sequence_length} bp
                </div>
              </div>
            </div>
          </div>

          {/* AI Guidance Button */}
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
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : '🤖 Get AI Guidance & Recommendations'}
            </button>
          </div>

          {/* AI Explanation */}
          {aiExplanation && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.08))',
              border: '2px solid #8B5CF6',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{ 
                color: '#8B5CF6', 
                marginBottom: '1rem', 
                fontSize: '1.1rem', 
                fontWeight: 700,
                fontFamily: 'Montserrat, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🤖 AI Guidance & Recommendations
              </h3>
              <div style={{ 
                color: '#1F2937',
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                fontFamily: 'Inter, sans-serif'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Charts */}
          {renderChart()}

          {/* Legend */}
          {showLegend && (
            <div className="legend-box">
              <h4 style={{ 
                margin: '0 0 0.75rem 0', 
                fontSize: '0.9rem',
                color: '#1F2937',
                fontWeight: 600
              }}>
                📖 Visualization Legend
              </h4>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-sample" style={{ background: '#10B98130', color: '#10B981', fontWeight: 700 }}>
                    PAM
                  </span>
                  <span>Forward PAM (highlighted green)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-sample" style={{ background: '#3B82F630', color: '#3B82F6', fontWeight: 700 }}>
                    PAM
                  </span>
                  <span>Reverse PAM (highlighted blue)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-sample" style={{ textDecoration: 'underline', textDecorationColor: '#10B981', textDecorationThickness: '2px' }}>
                    ATGC
                  </span>
                  <span>Forward sgRNA (green underline)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-sample" style={{ textDecoration: 'underline', textDecorationColor: '#3B82F6', textDecorationThickness: '2px' }}>
                    ATGC
                  </span>
                  <span>Reverse sgRNA (blue underline)</span>
                </div>
              </div>
            </div>
          )}

          {/* Highlighted Sequence */}
          <div className="highlighted-sequence-section">
            <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
              Sequence with PAM Sites & Guide RNAs Highlighted
            </h3>
            {highlightPAMInSequence()}
          </div>

          {/* Results Table */}
          {pamSites.sites.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
                📋 Detailed PAM Site Results ({pamSites.sites.length} sites)
              </h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Position</th>
                      <th>Strand</th>
                      <th>PAM</th>
                      <th>sgRNA (Guide RNA)</th>
                      <th>GC%</th>
                      <th>Efficiency</th>
                      <th>Context (±10bp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pamSites.sites.map((site, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {site.position}-{site.positionEnd}
                        </td>
                        <td>
                          <span 
                            className="strand-indicator"
                            style={{
                              background: site.strand === 'forward' ? '#10B98120' : '#3B82F620',
                              color: site.strand === 'forward' ? '#10B981' : '#3B82F6'
                            }}
                          >
                            {site.strand === 'forward' ? '(+)' : '(-)'}
                          </span>
                        </td>
                        <td className="pam-seq-cell">{site.pamSequence}</td>
                        <td className="guide-seq-cell" title={site.guideRNA}>
                          {site.guideRNA}
                        </td>
                        <td>{site.gcContent}%</td>
                        <td>
                          <span style={{ 
                            color: getEfficiencyColor(site.efficiency),
                            fontWeight: 600,
                            fontSize: '0.85rem'
                          }}>
                            {site.efficiency}
                          </span>
                        </td>
                        <td className="context-seq-cell" title={site.context}>
                          {site.context}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Sites Message */}
          {pamSites.sites.length === 0 && (
            <div className="no-mutations">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <p style={{ margin: '0.5rem 0', fontWeight: 600 }}>
                No PAM sites found with pattern "{casConfig.pam}"
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#6B7280' }}>
                Try selecting a different Cas enzyme or checking your sequence
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}