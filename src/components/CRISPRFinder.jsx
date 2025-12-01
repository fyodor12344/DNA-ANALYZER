import { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function CRISPRFinder() {
  const [sequence, setSequence] = useState('');
  const [pamSites, setPamSites] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSite, setSelectedSite] = useState(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const findPAMSites = async () => {
    if (!sequence.trim()) {
      setError('Please enter a DNA sequence');
      return;
    }

    setLoading(true);
    setError('');
    setAiExplanation('');

    try {
      const response = await axios.post(`${API_URL}/api/crispr`, {
        sequence: sequence
      });

      setPamSites(response.data);
      setSelectedSite(null);
    } catch (err) {
      console.error('CRISPR API Error:', err);
      setError(err.response?.data?.error || err.message || 'Error finding PAM sites. Check if backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const explainWithAI = async () => {
    if (!pamSites) return;
    
    setLoadingAI(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/explain`, {
        tool: 'CRISPR Finder',
        data: pamSites
      });

      setAiExplanation(response.data.explanation);
      
    } catch (err) {
      console.error('AI Error:', err);
      setAiExplanation('Error generating AI explanation. Please check backend connection.');
    } finally {
      setLoadingAI(false);
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
              body { font-family: 'Inter', sans-serif; padding: 20px; }
              h1, h2 { color: #00A389; font-family: 'Montserrat', sans-serif; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
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
    let report = '='.repeat(80) + '\n';
    report += 'CRISPR PAM SITE ANALYSIS REPORT\n';
    report += '='.repeat(80) + '\n\n';
    report += `Generated: ${new Date().toLocaleString()}\n`;
    report += `Sequence Length: ${sequence.replace(/[^ATGC]/gi, '').length} bp\n\n`;
    
    report += 'SUMMARY\n';
    report += '-'.repeat(80) + '\n';
    report += `Total PAM Sites Found: ${pamSites.total_sites}\n`;
    report += `Forward Strand Sites: ${pamSites.forward_strand_sites}\n`;
    report += `Reverse Strand Sites: ${pamSites.reverse_strand_sites}\n\n`;
    
    if (pamSites.sites.length > 0) {
      report += 'DETAILED PAM SITES\n';
      report += '-'.repeat(80) + '\n\n';
      
      pamSites.sites.forEach((site, idx) => {
        report += `Site ${idx + 1}:\n`;
        report += `  Position: ${site.position}\n`;
        report += `  PAM Sequence: ${site.pam_sequence}\n`;
        report += `  Strand: ${site.strand}\n`;
        report += `  Target Efficiency: ${site.target_efficiency}\n`;
        report += `  Guide RNA: ${site.guide_rna || 'N/A'}\n`;
        report += `  Guide Length: ${site.guide_length} bp\n`;
        report += `  Context: ${site.context}\n\n`;
      });
    }
    
    report += '='.repeat(80) + '\n';
    report += 'END OF REPORT\n';
    report += '='.repeat(80) + '\n';
    
    return report;
  };

  const highlightPAMInSequence = () => {
    if (!pamSites || !sequence) return null;

    const seq = sequence.toUpperCase().replace(/[^ATGC]/g, '');
    const highlighted = [];
    let lastIndex = 0;

    const pamPositions = new Set(pamSites.sites.map(site => site.position));

    for (let i = 0; i < seq.length; i++) {
      const isPAM = pamPositions.has(i + 1);
      
      if (isPAM !== (highlighted.length > 0 && highlighted[highlighted.length - 1].isPAM)) {
        if (lastIndex < i) {
          highlighted.push({
            text: seq.substring(lastIndex, i),
            isPAM: !isPAM
          });
        }
        lastIndex = i;
      }
    }

    if (lastIndex < seq.length) {
      const isPAM = pamPositions.has(lastIndex + 1);
      highlighted.push({
        text: seq.substring(lastIndex),
        isPAM: isPAM
      });
    }

    return (
      <div className="sequence-box">
        {highlighted.map((segment, idx) => (
          <span
            key={idx}
            style={{
              backgroundColor: segment.isPAM ? '#00A38930' : 'transparent',
              padding: '2px 4px',
              borderRadius: '3px',
              fontWeight: segment.isPAM ? '700' : '400'
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

    const highEfficiency = pamSites.sites.filter(s => s.target_efficiency === 'High').length;
    const mediumEfficiency = pamSites.sites.filter(s => s.target_efficiency === 'Medium').length;
    const lowEfficiency = pamSites.sites.filter(s => s.target_efficiency === 'Low').length;

    return (
      <div className="charts-container">
        <div className="chart-card">
          <h4 className="chart-title">Strand Distribution</h4>
          <div className="bar-chart">
            <div className="bar-item">
              <div className="bar-label">
                <span>Forward Strand</span>
                <span className="bar-value">{forwardCount}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${forwardPercent}%`,
                    background: 'linear-gradient(90deg, #00A389, #00BFA5)'
                  }}
                />
              </div>
              <span className="bar-percent">{forwardPercent.toFixed(1)}%</span>
            </div>
            <div className="bar-item">
              <div className="bar-label">
                <span>Reverse Strand</span>
                <span className="bar-value">{reverseCount}</span>
              </div>
              <div className="bar-track">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${reversePercent}%`,
                    background: 'linear-gradient(90deg, #1E90FF, #4DA6FF)'
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

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="analysis-section">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap');
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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
        CRISPR PAM Site Finder
      </h2>
      
      <div className="info-box">
        <p>
          <strong>About PAM Sites:</strong> This tool identifies Cas9 PAM (Protospacer Adjacent Motif) 
          sites with the NGG pattern. These sites are essential for CRISPR-Cas9 gene editing.
        </p>
      </div>

      <div className="sequence-input-group">
        <label className="input-label">DNA Sequence</label>
        <textarea
          value={sequence}
          onChange={(e) => setSequence(e.target.value)}
          placeholder="Enter DNA sequence to scan for PAM sites..."
          className="dna-input"
          rows={6}
        />
      </div>

      <button 
        onClick={findPAMSites} 
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
        {loading ? 'Scanning...' : 'Find PAM Sites'}
      </button>

      {error && (
        <div className="error-alert">
          <span className="error-icon">Warning</span>
          <div>
            <div>{error}</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.8 }}>
              Backend server required at {API_URL}
            </div>
          </div>
        </div>
      )}

      {pamSites && (
        <div className="results-container">
          <div className="action-buttons" style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => downloadReport('txt')} className="export-btn">
              Download TXT Report
            </button>
            <button onClick={() => downloadReport('pdf')} className="export-btn">
              Download PDF Report
            </button>
          </div>

          <div className="pam-summary">
            <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
              Summary
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total PAM Sites</div>
                <div className="stat-value">{pamSites.total_sites}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Forward Strand</div>
                <div className="stat-value" style={{ color: '#00A389' }}>
                  {pamSites.forward_strand_sites}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Reverse Strand</div>
                <div className="stat-value" style={{ color: '#1E90FF' }}>
                  {pamSites.reverse_strand_sites}
                </div>
              </div>
            </div>
          </div>

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
              {loadingAI ? 'Generating AI Analysis...' : 'Get AI Guidance'}
            </button>
          </div>

          {aiExplanation && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(124, 58, 237, 0.08))',
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
                AI Guidance
              </h3>
              <div style={{ 
                color: '#1F2937',
                lineHeight: '1.8', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
                background: '#ffffff',
                padding: '1rem',
                borderRadius: '6px',
                fontFamily: 'Inter, sans-serif'
              }}>
                {aiExplanation}
              </div>
            </div>
          )}

          {renderChart()}

          <div className="highlighted-sequence-section">
            <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
              Sequence with PAM Sites Highlighted
            </h3>
            {highlightPAMInSequence()}
          </div>

          {pamSites.sites.length > 0 && (
            <div className="pam-sites-list">
              <h3 style={{ fontFamily: 'Montserrat, sans-serif' }} className="subsection-title">
                PAM Site Details ({pamSites.sites.length} sites)
              </h3>
              <div className="sites-grid">
                {pamSites.sites.map((site, idx) => (
                  <div 
                    key={idx} 
                    className="pam-site-card"
                    onClick={() => setSelectedSite(selectedSite === idx ? null : idx)}
                  >
                    <div className="pam-card-header">
                      <span className="pam-position">Position {site.position}</span>
                      <span 
                        className="strand-badge"
                        style={{
                          backgroundColor: site.strand === 'forward' ? '#00A38920' : '#1E90FF20',
                          color: site.strand === 'forward' ? '#00A389' : '#1E90FF'
                        }}
                      >
                        {site.strand === 'forward' ? 'Forward' : 'Reverse'}
                      </span>
                    </div>
                    
                    <div className="pam-details">
                      <div className="pam-detail-row">
                        <span className="detail-label">PAM:</span>
                        <span className="pam-sequence">{site.pam_sequence}</span>
                      </div>
                      <div className="pam-detail-row">
                        <span className="detail-label">Efficiency:</span>
                        <span 
                          className="efficiency-badge"
                          style={{ 
                            color: getEfficiencyColor(site.target_efficiency),
                            borderColor: getEfficiencyColor(site.target_efficiency)
                          }}
                        >
                          {site.target_efficiency}
                        </span>
                      </div>
                      {selectedSite === idx && (
                        <>
                          <div className="pam-detail-row">
                            <span className="detail-label">Guide RNA:</span>
                            <span className="guide-rna">{site.guide_rna || 'N/A'}</span>
                          </div>
                          <div className="pam-detail-row">
                            <span className="detail-label">Guide Length:</span>
                            <span className="guide-rna">{site.guide_length} bp</span>
                          </div>
                          <div className="pam-detail-row">
                            <span className="detail-label">Context:</span>
                            <span className="context-seq">{site.context}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pamSites.sites.length === 0 && (
            <div className="no-mutations">
              No PAM sites (NGG) found in this sequence
            </div>
          )}
        </div>
      )}
    </div>
  );
}