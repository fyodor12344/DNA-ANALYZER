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
  // Input state
  const [dna, setDna] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const darkMode = true; // Always dark mode
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // ============================================================
  // CENTRALIZED STATE MANAGEMENT FOR ALL TOOL RESULTS
  // ============================================================
  // This is the key architectural change: all tool results are now
  // stored at the App level instead of within individual components.
  // This ensures results persist when switching between tools.
  // ============================================================

  const [overviewResult, setOverviewResult] = useState(null);
  const [mutationResult, setMutationResult] = useState(null);
  const [alignmentResult, setAlignmentResult] = useState(null);
  const [crisprResult, setCrisprResult] = useState(null);
  const [primerResult, setPrimerResult] = useState(null);


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
        setOverviewResult(res); // Store in centralized state
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

  // ============================================================
  // CLEAR FUNCTIONS - Updated to clear all results
  // ============================================================
  const clearSequence = () => {
    setDna("");
    setOverviewResult(null);
    setMutationResult(null);
    setAlignmentResult(null);
    setCrisprResult(null);
    setPrimerResult(null);
    setPrimerEvalResult(null);
    setError("");
    setActiveTab("overview");
  };

  // Individual tool clear functions (optional - for per-tool clearing)
  const clearToolResult = (toolName) => {
    switch (toolName) {
      case 'overview':
        setOverviewResult(null);
        break;
      case 'mutations':
        setMutationResult(null);
        break;
      case 'alignment':
        setAlignmentResult(null);
        break;
      case 'crispr':
        setCrisprResult(null);
        break;
      case 'primers':
        setPrimerResult(null);
        break;

      default:
        break;
    }
  };

  const copySequence = (e) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(dna).then(() => {
        const btn = e.target;
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
        
        /* UPDATED: Professional research-grade dark theme with subtle vertical gradient */
        .dark-mode {
          background: linear-gradient(180deg, #0b1220 0%, #0e1626 50%, #0b1220 100%);
          color: #e2e8f0;
          min-height: 100vh;
        }
        
        .dark-mode .container {
          background: transparent;
        }
        
        /* UPDATED: Header with subtle bottom border for visual separation */
        .dark-mode .header {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 1.5rem;
          margin-bottom: 2rem;
        }
        
        /* UPDATED: Improved contrast for cards */
        .dark-mode .input-section,
        .dark-mode .results-section {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
        }
        
        /* UPDATED: Higher contrast for text inputs */
        .dark-mode .dna-input,
        .dark-mode textarea {
          background: rgba(11, 18, 32, 0.8);
          color: #f1f5f9;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .dark-mode .dna-input:focus,
        .dark-mode textarea:focus {
          border-color: rgba(0, 191, 165, 0.5);
          outline: none;
        }
        
        .dark-mode .tab-btn {
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .dark-mode .tab-btn.active {
          background: linear-gradient(135deg, #00A389, #00BFA5);
          color: white;
          border-color: transparent;
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
        
        /* UPDATED: Tool card with improved contrast */
        .dark-mode .tool-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .dark-mode .tool-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          border-color: rgba(255, 255, 255, 0.12);
        }
        
        /* UPDATED: Quick action buttons with better contrast */
        .quick-action-btn {
          padding: 0.5rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.6);
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          font-family: 'Inter', sans-serif;
          color: #e2e8f0;
        }
        
        .quick-action-btn:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }
        
        .dark-mode .quick-action-btn {
          background: rgba(15, 23, 42, 0.6);
          border-color: rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
        }
        
        .dark-mode .quick-action-btn:hover {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(255, 255, 255, 0.15);
        }
        
        /* UPDATED: Sample menu with improved visibility */
        .sample-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          padding: 0.5rem;
          z-index: 100;
          min-width: 220px;
          margin-top: 0.5rem;
          backdrop-filter: blur(10px);
        }
        
        .dark-mode .sample-menu {
          background: rgba(15, 23, 42, 0.95);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .sample-menu-item {
          padding: 0.75rem 1rem;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s ease;
          font-size: 0.875rem;
          color: #e2e8f0;
        }
        
        .sample-menu-item:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        
        .dark-mode .sample-menu-item {
          color: #e2e8f0;
        }
        
        .dark-mode .sample-menu-item:hover {
          background: rgba(30, 41, 59, 0.8);
        }
        
        /* UPDATED: Help modal with improved readability */
        .help-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 2rem;
          animation: fadeIn 0.3s ease-out;
        }
        
        .help-content {
          background: rgba(15, 23, 42, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2rem;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          animation: slideDown 0.3s ease-out;
        }
        
        .dark-mode .help-content {
          background: rgba(15, 23, 42, 0.98);
          color: #f1f5f9;
        }
        
        /* UPDATED: Stats bar with better contrast */
        .stats-bar {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          background: rgba(11, 18, 32, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-top: 0.5rem;
          font-size: 0.875rem;
          flex-wrap: wrap;
        }
        
        .dark-mode .stats-bar {
          background: rgba(11, 18, 32, 0.6);
          border-color: rgba(255, 255, 255, 0.05);
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
        
        /* UPDATED: Footer with subtle top border */
        .dark-mode .app-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 3rem;
          padding-top: 2rem;
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
          
          .help-content {
            padding: 1.5rem;
            max-width: 95%;
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
                  title="Clear sequence and all results"
                  style={{ color: '#EF4444' }}
                >
                  Clear All
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
              disabled={!overviewResult}
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

          {/* ============================================================ */}
          {/* PERSISTENT RESULT RENDERING */}
          {/* All tool components receive their result state and setter */}
          {/* as props. This ensures results persist across tab switches. */}
          {/* ============================================================ */}
          <div className="tab-content">
            {activeTab === "overview" && overviewResult && (
              <OverviewTab
                result={overviewResult}
                originalSequence={dna}
                onClear={() => clearToolResult('overview')}
              />
            )}
            {activeTab === "overview" && !overviewResult && (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Analyze a DNA sequence to view overview
                </p>
                <p style={{ fontSize: '0.9rem' }}>
                  Enter a sequence above and click "Analyze Sequence"
                </p>
              </div>
            )}
            {activeTab === "mutations" && (
              <MutationFinder
                result={mutationResult}
                setResult={setMutationResult}
                onClear={() => clearToolResult('mutations')}
              />
            )}
            {activeTab === "alignment" && (
              <SequenceAlignment
                result={alignmentResult}
                setResult={setAlignmentResult}
                onClear={() => clearToolResult('alignment')}
              />
            )}
            {activeTab === "crispr" && (
              <CRISPRFinder
                result={crisprResult}
                setResult={setCrisprResult}
                onClear={() => clearToolResult('crispr')}
              />
            )}
            {activeTab === "primers" && (
              <PrimerDesigner
                result={primerResult}
                setResult={setPrimerResult}
                onClear={() => clearToolResult('primers')}
              />
            )}
          </div>
        </div>

        {/* Help Modal - UPDATED */}
        {showHelp && (
          <div className="help-modal" onClick={() => setShowHelp(false)}>
            <div className="help-content" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: 'Montserrat, sans-serif', margin: 0, color: '#00BFA5' }}>
                  🧬 Help & Guide
                </h2>
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
                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00BFA5', marginTop: '1.5rem' }}>
                  Available Tools
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li><strong>Overview:</strong> Comprehensive sequence statistics, GC content, melting temperature, and ORF analysis</li>
                  <li><strong>Mutations:</strong> Compare two sequences to identify SNPs, insertions, and deletions with functional impact</li>
                  <li><strong>Alignment:</strong> Perform global (Needleman-Wunsch) or local (Smith-Waterman) sequence alignment</li>
                  <li><strong>CRISPR:</strong> Find PAM sites for CRISPR-Cas9/Cas12a gene editing with multiple enzyme support</li>
                  <li><strong>Primers:</strong> Design optimized PCR primers with application-specific parameters (qPCR, cloning, diagnostic)</li>

                </ul>

                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00BFA5', marginTop: '1.5rem' }}>
                  Quick Tips
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Use "Load Sample" to quickly test with example sequences (100bp, 300bp, 500bp)</li>
                  <li>Upload FASTA files (.fasta, .fa) or text files for easy sequence input</li>
                  <li><strong>✨ NEW:</strong> Tool results now persist when switching tabs - your work is never lost!</li>
                  <li>Click "Get AI Analysis" in any tool for detailed biological insights and recommendations</li>
                  <li>Download comprehensive reports as TXT or PDF for documentation and sharing</li>
                  <li>Use "Copy" button to quickly copy sequences to clipboard</li>
                  <li>Real-time sequence statistics update as you type (A, T, G, C counts)</li>
                  <li>Use "Clear All" to reset all sequences and results at once</li>
                </ul>

                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00BFA5', marginTop: '1.5rem' }}>
                  Supported Formats
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>Plain DNA sequence (A, T, G, C nucleotides only)</li>
                  <li>FASTA format files (.fasta, .fa)</li>
                  <li>Text files (.txt)</li>
                  <li>Sequences up to 100,000 bp (100 kb)</li>
                </ul>

                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#00BFA5', marginTop: '1.5rem' }}>
                  Pro Tips
                </h3>
                <ul style={{ marginLeft: '1.5rem' }}>
                  <li>For primer design, use application mode selector (Diagnostic, Cloning, qPCR, Mutation Detection)</li>
                  <li>CRISPR tool supports multiple Cas enzymes - choose based on your target organism</li>
                  <li>Alignment tool automatically handles sequences up to 10,000 bp</li>
                  <li>All analyses include actionable recommendations for experimental optimization</li>
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
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '1rem'
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