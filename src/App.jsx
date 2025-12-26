import { useState, useEffect } from "react";
import { summary } from "./utils/dnaUtils";
import "./App.css";

// Import components
import OverviewTab from './components/OverviewTab';
import MutationFinder from './components/MutationFinder';
import SequenceAlignment from './components/SequenceAlignment';
import CRISPRFinder from './components/CRISPRFinder';
import PrimerDesigner from './components/PrimerDesigner';

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="loading-spinner"></div>
);

// Sample sequences for quick testing
const SAMPLE_SEQUENCES = {
  short: {
    name: "Short Sample (100bp)",
    sequence: "ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGA"
  },
  medium: {
    name: "Medium Sample (300bp)",
    sequence: "ATGCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGA"
  },
  gene: {
    name: "Gene Fragment (500bp)",
    sequence: "ATGGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAG"
  }
};

function App() {
  const [dna, setDna] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const darkMode = true; // Always dark mode
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Close sample menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSampleMenu(false);
    if (showSampleMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSampleMenu]);

  const handleAnalyze = () => {
    setError("");
    setLoading(true);
    
    if (!dna.trim()) {
      setError("Please enter a DNA sequence");
      setLoading(false);
      return;
    }

    const cleaned = dna.toUpperCase().replace(/[^ATGC]/g, "");
    if (cleaned.length === 0) {
      setError("No valid DNA nucleotides (A, T, G, C) found");
      setLoading(false);
      return;
    }

    if (cleaned.length < 3) {
      setError("Sequence too short for analysis (minimum 3 nucleotides)");
      setLoading(false);
      return;
    }

    try {
      setTimeout(() => {
       const res = summary(cleaned);
        setResult(res);
        setActiveTab("overview");
        setLoading(false);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }, 600);
    } catch (err) {
      setError("Error analyzing DNA: " + err.message);
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        let content = event.target.result;
        if (content.startsWith('>')) {
          content = content.split('\n').slice(1).join('').replace(/\s/g, '');
        }
        setDna(content);
      };
      reader.readAsText(file);
    }
  };

  const loadSampleSequence = (key) => {
    setDna(SAMPLE_SEQUENCES[key].sequence);
    setShowSampleMenu(false);
  };

  const clearSequence = () => {
    setDna("");
    setResult(null);
    setError("");
    setActiveTab("overview");
  };

  const copySequence = (e) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(dna).then(() => {
      const btn = e.target;   // ✅ now works
      const originalText = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 2000);
    });
  }
};


  const downloadSequence = () => {
    const blob = new Blob([dna], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dna_sequence_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSequenceStats = () => {
    const cleaned = dna.toUpperCase().replace(/[^ATGC]/g, "");
    return {
      length: cleaned.length,
      a: (cleaned.match(/A/g) || []).length,
      t: (cleaned.match(/T/g) || []).length,
      g: (cleaned.match(/G/g) || []).length,
      c: (cleaned.match(/C/g) || []).length
    };
  };

  const stats = getSequenceStats();

  return (
    <div className="app dark-mode" style={{ fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap');
        
        .app {
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        .dark-mode {
          background: linear-gradient(to bottom, #0f172a, #1e293b);
          color: #e2e8f0;
        }
        
        .dark-mode .container {
          background: #1e293b;
        }
        
        .dark-mode .input-section,
        .dark-mode .results-section {
          background: #0f172a;
          border-color: #334155;
        }
        
        .dark-mode .dna-input,
        .dark-mode textarea {
          background: #1e293b;
          color: #e2e8f0;
          border-color: #334155;
        }
        
        .dark-mode .tab-btn {
          background: #1e293b;
          color: #94a3b8;
          border-color: #334155;
        }
        
        .dark-mode .tab-btn.active {
          background: linear-gradient(135deg, #00A389, #00BFA5);
          color: white;
        }
        
        .dark-mode .tab-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .fade-in {
          animation: fadeIn 0.5s ease-out;
        }
        
        .slide-down {
          animation: slideDown 0.3s ease-out;
        }
        
        .tool-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .tool-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .dark-mode .tool-card {
          background: #1e293b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .dark-mode .tool-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        
        .quick-action-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
        }
        
        .quick-action-btn:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }
        
        .dark-mode .quick-action-btn {
          background: #1e293b;
          border-color: #334155;
          color: #e2e8f0;
        }
        
        .dark-mode .quick-action-btn:hover {
          background: #334155;
        }
        
        .sample-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          padding: 0.5rem;
          z-index: 100;
          min-width: 220px;
          margin-top: 0.5rem;
        }
        
        .dark-mode .sample-menu {
          background: #1e293b;
          border-color: #334155;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .sample-menu-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s ease;
          font-size: 0.875rem;
          color: #1f2937;
        }
        
        .sample-menu-item:hover {
          background: #f3f4f6;
        }
        
        .dark-mode .sample-menu-item {
          color: #e2e8f0;
        }
        
        .dark-mode .sample-menu-item:hover {
          background: #334155;
        }
        
        .help-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.3s ease-out;
        }
        
        .help-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2);
          animation: slideDown 0.3s ease-out;
        }
        
        .dark-mode .help-content {
          background: #1e293b;
          color: #e2e8f0;
        }
        
        .stats-bar {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 8px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          flex-wrap: wrap;
        }
        
        .dark-mode .stats-bar {
          background: #1e293b;
        }
        
        .stat-item {
          display: flex;
          gap: 0.25rem;
          align-items: center;
        }
        
        .success-toast {
          position: fixed;
          top: 2rem;
          right: 2rem;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          animation: slideInRight 0.3s ease-out;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .dark-mode .help-content h3 {
          color: #00BFA5;
        }
        
        .dark-mode .help-content ul {
          color: #cbd5e1;
        }
        
        @media (max-width: 768px) {
          .stats-bar {
            font-size: 0.75rem;
            gap: 0.5rem;
          }
          
          .success-toast {
            top: 1rem;
            right: 1rem;
            left: 1rem;
          }
          
          .sample-menu {
            right: auto;
            left: 0;
          }
        }
      `}</style>
      
      <div className="container">
        <header className="header fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="title" style={{ fontFamily: 'Montserrat, sans-serif', margin: 0 }}>
                DNA Sequence Analyzer
              </h1>
              <p className="subtitle" style={{ margin: '0.5rem 0 0 0' }}>
                Professional Bioinformatics Analysis Tool
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={() => setShowHelp(true)}
                className="quick-action-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                Help
              </button>
            </div>
          </div>
        </header>

        <div className="input-section fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="input-header">
            <label className="input-label" style={{ fontFamily: 'Inter, sans-serif' }}>
              DNA Sequence Input
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSampleMenu(!showSampleMenu);
                }}
                className="quick-action-btn"
              >
                Load Sample
              </button>
              {showSampleMenu && (
                <div className="sample-menu slide-down" onClick={(e) => e.stopPropagation()}>
                  {Object.entries(SAMPLE_SEQUENCES).map(([key, sample]) => (
                    <div
                      key={key}
                      className="sample-menu-item"
                      onClick={() => loadSampleSequence(key)}
                    >
                      {sample.name}
                    </div>
                  ))}
                </div>
              )}
              <label htmlFor="file-upload" className="upload-btn">
                Upload FASTA
                <input
                  id="file-upload"
                  type="file"
                  accept=".fasta,.fa,.txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
          
          <textarea
            value={dna}
            onChange={(e) => setDna(e.target.value)}
            placeholder="Paste your DNA sequence here (A, T, G, C)..."
            className="dna-input"
            rows={6}
            disabled={loading}
            style={{ fontFamily: 'monospace' }}
          />
          
          {dna && (
            <div className="stats-bar slide-down">
              <div className="stat-item">
                <strong>Length:</strong> {stats.length} bp
              </div>
              <div className="stat-item" style={{ color: '#10B981' }}>
                <strong>A:</strong> {stats.a}
              </div>
              <div className="stat-item" style={{ color: '#F59E0B' }}>
                <strong>T:</strong> {stats.t}
              </div>
              <div className="stat-item" style={{ color: '#3B82F6' }}>
                <strong>G:</strong> {stats.g}
              </div>
              <div className="stat-item" style={{ color: '#EF4444' }}>
                <strong>C:</strong> {stats.c}
              </div>
            </div>
          )}
          
          <div className="input-footer" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleAnalyze} 
              className="analyze-btn"
              disabled={loading}
              style={{ flex: 1, minWidth: '200px' }}
            >
              {loading && <LoadingSpinner />}
              {loading ? 'Analyzing Sequence...' : 'Analyze Sequence'}
            </button>
            {dna && (
              <>
                <button 
                  onClick={copySequence}
                  className="quick-action-btn"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
                <button 
                  onClick={downloadSequence}
                  className="quick-action-btn"
                  title="Download sequence"
                >
                  Download
                </button>
                <button 
                  onClick={clearSequence}
                  className="quick-action-btn"
                  title="Clear sequence"
                  style={{ color: '#EF4444' }}
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="error-alert slide-down">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {showSuccessMessage && (
          <div className="success-toast">
            <span>✓</span>
            <span>Analysis completed successfully!</span>
          </div>
        )}

        {/* Tools Section - Always Visible */}
        <div className="results-section fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="tab-nav">
            <button
              onClick={() => setActiveTab("overview")}
              className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
              disabled={!result}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("mutations")}
              className={`tab-btn ${activeTab === "mutations" ? "active" : ""}`}
            >
              Mutations
            </button>
            <button
              onClick={() => setActiveTab("alignment")}
              className={`tab-btn ${activeTab === "alignment" ? "active" : ""}`}
            >
              Alignment
            </button>
            <button
              onClick={() => setActiveTab("crispr")}
              className={`tab-btn ${activeTab === "crispr" ? "active" : ""}`}
            >
              CRISPR
            </button>
            <button
              onClick={() => setActiveTab("primers")}
              className={`tab-btn ${activeTab === "primers" ? "active" : ""}`}
            >
              Primers
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "overview" && result && <OverviewTab result={result} originalSequence={dna} />}
            {activeTab === "overview" && !result && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Analyze a DNA sequence to view overview
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  Enter a sequence above and click "Analyze Sequence"
                </p>
              </div>
            )}
            {activeTab === "mutations" && <MutationFinder />}
            {activeTab === "alignment" && <SequenceAlignment />}
            {activeTab === "crispr" && <CRISPRFinder />}
            {activeTab === "primers" && <PrimerDesigner />}
          </div>
        </div>

        {/* Help Modal */}
        {showHelp && (
          <div className="help-modal" onClick={() => setShowHelp(false)}>
            <div className="help-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'Montserrat, sans-serif', margin: 0 }}>Help & Guide</h2>
                <button 
                  onClick={() => setShowHelp(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    fontSize: '1.5rem', 
                    cursor: 'pointer',
                    color: '#94a3b8'
                  }}
                >
                  ×
                </button>
              </div>
              
              <div style={{ lineHeight: '1.8' }}>
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00A389', marginTop: '1.5rem' }}>
                  Available Tools
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li><strong>Overview:</strong> Basic sequence statistics, GC content, melting temperature, and ORF analysis</li>
                  <li><strong>Mutations:</strong> Compare two sequences to find SNPs, insertions, and deletions</li>
                  <li><strong>Alignment:</strong> Perform global or local sequence alignment</li>
                  <li><strong>CRISPR:</strong> Find PAM sites for CRISPR-Cas9 gene editing</li>
                  <li><strong>Primers:</strong> Design PCR primers with optimal parameters</li>
                </ul>
                
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00A389', marginTop: '1.5rem' }}>
                  Quick Tips
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Use "Load Sample" to quickly test with example sequences</li>
                  <li>Upload FASTA files for easy sequence input</li>
                  <li>Most tools work independently - no need to analyze first</li>
                  <li>Dark Mode is enabled for comfortable viewing</li>
                  <li>Use AI explanations for detailed insights</li>
                </ul>
                
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00A389', marginTop: '1.5rem' }}>
                  Supported Formats
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Plain DNA sequence (A, T, G, C)</li>
                  <li>FASTA format files (.fasta, .fa)</li>
                  <li>Text files (.txt)</li>
                </ul>
              </div>
              
              <button 
                onClick={() => setShowHelp(false)}
                style={{
                  width: '100%',
                  marginTop: '1.5rem',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #00A389, #00BFA5)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif'
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        <footer className="app-footer">
          <div className="footer-content">
            <p className="footer-text" style={{ fontFamily: 'Inter, sans-serif' }}>
              DNA Sequence Analyzer | Professional Bioinformatics Tool
            </p>
            <p className="footer-text" style={{ fontFamily: 'Inter, sans-serif' }}>
              Developed by Pushkar Barsagade | <a href="mailto:barsagadepushkar26@gmail.com" className="footer-link">
                barsagadepushkar26@gmail.com
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
