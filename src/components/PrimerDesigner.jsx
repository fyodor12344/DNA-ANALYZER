import { useState } from 'react';
import { designPrimers, getAIExplanation, validateSequence } from '../utils/apiUtils';

// Application modes with specific requirements
const APPLICATION_MODES = {
  diagnostic: {
    name: 'Diagnostic PCR',
    description: 'Standard PCR for detection and identification',
    icon: '🔬',
    requirements: {
      productSizeMin: 200,
      productSizeMax: 800,
      primerLengthMin: 18,
      primerLengthMax: 25,
      gcContentMin: 40,
      gcContentMax: 60,
      tmMin: 55,
      tmMax: 65,
      tmDifferenceMax: 5,
      strictDimer: false,
      requireGcClamp: false
    }
  },
  cloning: {
    name: 'Cloning',
    description: 'PCR for gene cloning and subcloning',
    icon: '🧬',
    requirements: {
      productSizeMin: 100,
      productSizeMax: 3000,
      primerLengthMin: 20,
      primerLengthMax: 30,
      gcContentMin: 45,
      gcContentMax: 65,
      tmMin: 58,
      tmMax: 68,
      tmDifferenceMax: 3,
      strictDimer: false,
      requireGcClamp: true
    }
  },
  qpcr: {
    name: 'qPCR (Real-Time)',
    description: 'Quantitative real-time PCR',
    icon: '📊',
    requirements: {
      productSizeMin: 70,
      productSizeMax: 200,
      primerLengthMin: 18,
      primerLengthMax: 22,
      gcContentMin: 45,
      gcContentMax: 55,
      tmMin: 58,
      tmMax: 62,
      tmDifferenceMax: 2,
      strictDimer: true,
      requireGcClamp: false
    }
  },
  mutation: {
    name: 'Mutation Detection',
    description: 'PCR for SNP detection and mutagenesis',
    icon: '🎯',
    requirements: {
      productSizeMin: 150,
      productSizeMax: 500,
      primerLengthMin: 20,
      primerLengthMax: 30,
      gcContentMin: 40,
      gcContentMax: 60,
      tmMin: 60,
      tmMax: 68,
      tmDifferenceMax: 3,
      strictDimer: false,
      requireGcClamp: true
    }
  }
};

export default function PrimerDesigner() {
  const [sequence, setSequence] = useState('');
  const [applicationMode, setApplicationMode] = useState('diagnostic');
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

    const validation = validateSequence(sequence);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    const cleanSeq = validation.cleaned;
    const mode = APPLICATION_MODES[applicationMode];
    
    let productSizeRange = [mode.requirements.productSizeMin, mode.requirements.productSizeMax];
    if (cleanSeq.length < 150) {
      const adjustedMin = 50;
      const adjustedMax = Math.max(60, cleanSeq.length - 30);
      productSizeRange = [adjustedMin, adjustedMax];
    }

    setLoading(true);
    setError('');
    setAiExplanation('');
    setPrimers(null);

    console.log('📤 Designing primers for:', mode.name, 'Sequence length:', cleanSeq.length);

    const response = await designPrimers(cleanSeq, 60, 20, productSizeRange);

    setLoading(false);

    if (response.success) {
      console.log('✅ Primers designed successfully');
      // Enhance primers with application-specific analysis
      const enhancedPrimers = enhancePrimersWithAnalysis(response.data, mode, cleanSeq);
      setPrimers(enhancedPrimers);
    } else {
      console.error('❌ Primer design failed:', response.error);
      setError(response.error);
    }
  };

  const enhancePrimersWithAnalysis = (primerData, mode, sequence) => {
    // Add application-specific warnings and optimization tips
    const enhanced = { ...primerData, applicationMode: mode.name };
    
    // Analyze forward primer
    if (enhanced.forward_primer) {
      enhanced.forward_primer = analyzePrimer(enhanced.forward_primer, mode, sequence);
    }
    
    // Analyze reverse primer
    if (enhanced.reverse_primer) {
      enhanced.reverse_primer = analyzePrimer(enhanced.reverse_primer, mode, sequence);
    }
    
    // Generate PCR optimization tips
    enhanced.optimization_tips = generateOptimizationTips(enhanced, mode);
    
    return enhanced;
  };

  const analyzePrimer = (primer, mode, sequence) => {
    const analyzed = { ...primer };
    analyzed.detailed_analysis = [];
    
    // Hairpin analysis
    if (primer.hairpin) {
      const hairpinDetail = analyzeHairpin(primer.hairpin, primer);
      if (hairpinDetail) analyzed.detailed_analysis.push(hairpinDetail);
    }
    
    // GC clamp analysis
    if (primer.gc_clamp) {
      const gcClampDetail = analyzeGcClamp(primer.gc_clamp, mode);
      if (gcClampDetail) analyzed.detailed_analysis.push(gcClampDetail);
    }
    
    // GC content analysis
    const gcDetail = analyzeGcContent(primer.gc_content, mode);
    if (gcDetail) analyzed.detailed_analysis.push(gcDetail);
    
    // Tm analysis
    const tmDetail = analyzeTm(primer.tm, mode);
    if (tmDetail) analyzed.detailed_analysis.push(tmDetail);
    
    // Self-complementarity
    const selfCompDetail = analyzeSelfComplementarity(primer);
    if (selfCompDetail) analyzed.detailed_analysis.push(selfCompDetail);
    
    // 3' end stability
    const endStabilityDetail = analyze3PrimeEnd(primer);
    if (endStabilityDetail) analyzed.detailed_analysis.push(endStabilityDetail);
    
    return analyzed;
  };

  const analyzeHairpin = (hairpin, primer) => {
    if (hairpin.risk_level === 'low') return null;
    
    return {
      type: hairpin.risk_level === 'high' ? 'error' : 'warning',
      icon: '🔄',
      title: 'Hairpin Formation Risk',
      issue: `Primer may form secondary hairpin structure with ΔG = ${hairpin.delta_g || 'N/A'} kcal/mol`,
      impact: 'Hairpin structures reduce primer availability for target binding, leading to reduced PCR efficiency, lower yields, and potentially failed amplification. The primer may bind to itself instead of the template.',
      fixes: [
        'Redesign primer by shifting 2-3 bases upstream or downstream',
        'Avoid runs of complementary bases (e.g., AAAA paired with TTTT)',
        'Add DMSO (3-5%) or betaine (1M) to PCR mix to destabilize secondary structures',
        'Increase annealing temperature by 2-3°C if hairpin is weak',
        'Consider using a hot-start polymerase'
      ]
    };
  };

  const analyzeGcClamp = (gcClamp, mode) => {
    if (mode.requirements.requireGcClamp && !gcClamp.has_clamp) {
      return {
        type: 'warning',
        icon: '🔗',
        title: 'Missing GC Clamp',
        issue: `No G or C within last 5 bases of 3' end (current: ${gcClamp.clamp_strength || 0} G/C)`,
        impact: 'GC clamps at the 3\' end improve primer binding stability and extension efficiency. Without a GC clamp, the primer may dissociate during PCR, especially important for cloning applications.',
        fixes: [
          'Add 1-2 G or C bases at the 3\' end',
          'Shift primer binding site to include natural G/C at 3\' end',
          'For cloning: Essential for high-fidelity amplification',
          'For qPCR: Less critical, avoid if it creates other issues'
        ]
      };
    }
    
    if (gcClamp.has_clamp && gcClamp.clamp_strength > 3) {
      return {
        type: 'warning',
        icon: '🔗',
        title: 'Excessive GC Clamp',
        issue: `Too many G/C bases at 3' end (${gcClamp.clamp_strength} G/C in last 5 bases)`,
        impact: 'Excessive GC content at 3\' end can cause non-specific binding and primer-dimer formation. May lead to false positive bands and reduced specificity.',
        fixes: [
          'Reduce GC content at 3\' end to 2-3 G/C bases',
          'Shift primer by 1-2 bases to balance GC distribution',
          'Use touchdown PCR to improve specificity'
        ]
      };
    }
    
    return null;
  };

  const analyzeGcContent = (gcContent, mode) => {
    const { gcContentMin, gcContentMax } = mode.requirements;
    
    if (gcContent < gcContentMin) {
      return {
        type: 'warning',
        icon: '🧬',
        title: 'Low GC Content',
        issue: `GC content ${gcContent}% is below optimal range (${gcContentMin}-${gcContentMax}%)`,
        impact: 'Low GC content results in weak primer-template binding due to fewer hydrogen bonds. This causes reduced PCR specificity, lower melting temperature, and potential mispriming.',
        fixes: [
          'Extend primer length by 2-3 bases into GC-rich regions',
          'Shift primer binding site to more GC-rich area',
          'Lower annealing temperature by 2-3°C',
          'Use hot-start polymerase to reduce non-specific binding'
        ]
      };
    }
    
    if (gcContent > gcContentMax) {
      return {
        type: 'warning',
        icon: '🧬',
        title: 'High GC Content',
        issue: `GC content ${gcContent}% exceeds optimal range (${gcContentMin}-${gcContentMax}%)`,
        impact: 'High GC content can cause secondary structures and non-specific binding. GC-rich primers are prone to forming dimers and may require specialized PCR conditions.',
        fixes: [
          'Add DMSO (3-5%) or betaine (1M) to PCR reaction',
          'Increase denaturation temperature to 98°C',
          'Use GC-rich PCR buffer or specialized polymerase',
          'Reduce primer length slightly to lower overall GC%',
          'Consider two-step PCR protocol'
        ]
      };
    }
    
    return null;
  };

  const analyzeTm = (tm, mode) => {
    const { tmMin, tmMax } = mode.requirements;
    
    if (tm < tmMin) {
      return {
        type: 'warning',
        icon: '🌡️',
        title: 'Low Melting Temperature',
        issue: `Tm ${tm}°C is below optimal range (${tmMin}-${tmMax}°C)`,
        impact: 'Low Tm increases risk of non-specific binding at lower temperatures. The primer may bind to off-target sequences, leading to spurious PCR products and reduced specificity.',
        fixes: [
          'Increase primer length by 2-4 bases',
          'Shift to more GC-rich region',
          'Use lower annealing temperature (Tm - 5°C)',
          'Add MgCl₂ to increase ionic strength (try 2.5-3.5 mM)'
        ]
      };
    }
    
    if (tm > tmMax) {
      return {
        type: 'info',
        icon: '🌡️',
        title: 'High Melting Temperature',
        issue: `Tm ${tm}°C exceeds optimal range (${tmMin}-${tmMax}°C)`,
        impact: 'While high Tm generally improves specificity, it may require higher annealing temperatures that could reduce polymerase activity. May also increase secondary structure formation.',
        fixes: [
          'Acceptable if within 5°C of optimal range',
          'Use high-temperature PCR protocol if needed',
          'Verify polymerase is compatible with high annealing temps',
          'If too high: reduce primer length by 2-3 bases'
        ]
      };
    }
    
    return null;
  };

  const analyzeSelfComplementarity = (primer) => {
    // Check for self-complementary regions
    const seq = primer.sequence;
    const hasRuns = /([ATGC])\1{3,}/.test(seq); // 4+ repeated bases
    const hasPalindrome = checkPalindrome(seq);
    
    if (hasRuns || hasPalindrome) {
      return {
        type: 'warning',
        icon: '↔️',
        title: 'Self-Complementarity Detected',
        issue: hasRuns 
          ? 'Primer contains runs of repeated bases (4+ identical bases)'
          : 'Primer contains self-complementary regions',
        impact: 'Self-complementary sequences increase primer-dimer formation and reduce available primers for target amplification. Can lead to low yields and high background.',
        fixes: [
          'Avoid runs of >3 identical bases',
          'Redesign primer to eliminate palindromic sequences',
          'Use hot-start polymerase to minimize primer interactions',
          'Optimize primer concentration (reduce to 0.2-0.4 µM)',
          'Increase primer:template ratio'
        ]
      };
    }
    
    return null;
  };

  const analyze3PrimeEnd = (primer) => {
    const seq = primer.sequence;
    const last3Bases = seq.slice(-3);
    const lastBase = seq.slice(-1);
    
    // Check for poly-AT at 3' end
    if (/[AT]{3,}$/.test(seq)) {
      return {
        type: 'warning',
        icon: '3️⃣',
        title: 'Weak 3\' End',
        issue: '3\' end contains poly-A/T stretch which is thermally unstable',
        impact: 'AT-rich 3\' ends have weak binding due to only 2 hydrogen bonds per base pair. This reduces extension efficiency and can cause stuttering or early termination.',
        fixes: [
          'Shift primer by 1-2 bases to avoid AT stretch at 3\' end',
          'Add 1-2 G/C bases at 3\' end if possible',
          'Increase extension time by 50%',
          'Use polymerase with strong processivity'
        ]
      };
    }
    
    // Check if ends with G (very stable)
    if (lastBase === 'G') {
      // This is actually good for most applications
      return null;
    }
    
    return null;
  };

  const checkPalindrome = (seq) => {
    // Simple palindrome check (reverse complement)
    const complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'};
    const revComp = seq.split('').reverse().map(b => complement[b]).join('');
    
    // Check for significant overlap
    for (let i = 4; i <= Math.min(8, seq.length / 2); i++) {
      if (seq.includes(revComp.substring(0, i))) {
        return true;
      }
    }
    return false;
  };

  const generateOptimizationTips = (primers, mode) => {
    const tips = [];
    
    if (!primers.forward_primer || !primers.reverse_primer) {
      return tips;
    }
    
    const fwd = primers.forward_primer;
    const rev = primers.reverse_primer;
    const tmDiff = Math.abs(fwd.tm - rev.tm);
    
    // Tm difference tips
    if (tmDiff > 5) {
      tips.push({
        category: 'Temperature',
        icon: '🌡️',
        title: 'Large Tm Difference Detected',
        recommendation: `Use gradient PCR to find optimal annealing temperature between ${Math.min(fwd.tm, rev.tm) - 5}°C and ${Math.max(fwd.tm, rev.tm) - 3}°C. Start at ${((fwd.tm + rev.tm) / 2 - 5).toFixed(1)}°C.`,
        urgency: 'high'
      });
    }
    
    // GC content tips
    const avgGC = (fwd.gc_content + rev.gc_content) / 2;
    if (avgGC > 60) {
      tips.push({
        category: 'Additives',
        icon: '🧪',
        title: 'High GC Content - Add PCR Enhancers',
        recommendation: 'Add DMSO (3-5% final concentration) or betaine (1M) to help denature GC-rich regions. Consider using a GC-rich PCR kit or increasing denaturation temperature to 98°C.',
        urgency: 'medium'
      });
    } else if (avgGC < 40) {
      tips.push({
        category: 'Specificity',
        icon: '🎯',
        title: 'Low GC Content - Improve Specificity',
        recommendation: 'Use hot-start polymerase and touchdown PCR (start 5°C above calculated Tm, decrease 1°C per cycle for 5 cycles). This improves specificity despite weak primer binding.',
        urgency: 'medium'
      });
    }
    
    // Dimer risk tips
    if (primers.dimer_analysis && primers.dimer_analysis.risk_level !== 'low') {
      tips.push({
        category: 'Dimer Prevention',
        icon: '🔗',
        title: 'Primer-Dimer Risk Detected',
        recommendation: mode.name === 'qPCR (Real-Time)' 
          ? 'CRITICAL for qPCR: Reduce primer concentration to 0.2 µM (from standard 0.4 µM). Use hot-start polymerase and consider redesigning primers if dimer Tm is >50°C.'
          : 'Use hot-start polymerase and optimize primer concentration (try 0.2-0.4 µM). Set up reactions on ice and use a heated lid.',
        urgency: mode.name === 'qPCR (Real-Time)' ? 'high' : 'medium'
      });
    }
    
    // Application-specific tips
    if (mode.name === 'qPCR (Real-Time)') {
      tips.push({
        category: 'qPCR Optimization',
        icon: '📊',
        title: 'qPCR Best Practices',
        recommendation: 'Keep amplicon 70-150 bp. Use ROX or another passive reference dye. Run standard curve to determine efficiency (should be 90-110%). Perform melt curve analysis to verify single product.',
        urgency: 'low'
      });
    } else if (mode.name === 'Cloning') {
      tips.push({
        category: 'Cloning Considerations',
        icon: '🧬',
        title: 'Cloning Protocol Tips',
        recommendation: 'Use high-fidelity polymerase (Phusion, Q5, or similar). Keep extension time at 15-30 sec/kb. Consider adding restriction sites to primers for cloning. Verify product by sequencing before cloning.',
        urgency: 'low'
      });
    }
    
    // Product size tips
    if (primers.expected_product_size > 2000) {
      tips.push({
        category: 'Extension',
        icon: '⏱️',
        title: 'Long Amplicon - Extend PCR Times',
        recommendation: `Increase extension time to ${Math.ceil(primers.expected_product_size / 1000)} minutes (1 min/kb). Use polymerase with strong processivity. Consider two-step PCR with combined annealing/extension at 68-72°C.`,
        urgency: 'medium'
      });
    }
    
    return tips;
  };

  const handleExplainWithAI = async () => {
    if (!primers) return;
    
    setLoadingAI(true);
    
    const enrichedData = {
      ...primers,
      applicationMode: APPLICATION_MODES[applicationMode].name,
      sequenceLength: sequence.replace(/[^ATGC]/gi, '').length
    };
    
    const response = await getAIExplanation('PCR Primer Designer', enrichedData);
    
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

  const renderDetailedAnalysis = (analysis) => {
    if (!analysis || analysis.length === 0) return null;
    
    return (
      <div style={{ marginTop: '1rem' }}>
        <div style={{ 
          color: '#94a3b8', 
          fontSize: '0.9rem', 
          marginBottom: '0.75rem', 
          fontWeight: 600 
        }}>
          📋 Detailed Quality Analysis:
        </div>
        {analysis.map((item, idx) => (
          <AnalysisDetailCard key={idx} {...item} />
        ))}
      </div>
    );
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
              Quick Metrics:
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

        {primer.detailed_analysis && renderDetailedAnalysis(primer.detailed_analysis)}

        {(primer.issues?.length > 0 || primer.warnings?.length > 0) && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
              Legacy Warnings:
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

  const currentMode = APPLICATION_MODES[applicationMode];

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
            🧬 Research-Grade PCR Primer Designer
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>
            Application-specific primer design with comprehensive quality analysis
          </p>
        </div>

        {/* Application Mode Selector */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            color: '#cbd5e1', 
            fontWeight: 600,
            fontSize: '1.05rem'
          }}>
            🎯 Select Application Mode
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            {Object.entries(APPLICATION_MODES).map(([key, mode]) => (
              <ApplicationModeCard
                key={key}
                mode={mode}
                isSelected={applicationMode === key}
                onClick={() => setApplicationMode(key)}
              />
            ))}
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 255, 198, 0.1)',
          border: '1px solid #00FFC6',
          borderRadius: '12px',
          padding: '1rem 1.5rem',
          marginBottom: '2rem'
        }}>
          <p style={{ margin: 0, color: '#e2e8f0' }}>
            <strong style={{ color: '#00FFC6' }}>{currentMode.icon} {currentMode.name}:</strong> {currentMode.description}
            <br />
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              Optimized for amplicons {currentMode.requirements.productSizeMin}-{currentMode.requirements.productSizeMax} bp, 
              Tm {currentMode.requirements.tmMin}-{currentMode.requirements.tmMax}°C
            </span>
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
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}
        >
          {loading && <span className="loading-spinner"></span>}
          {loading ? 'Designing Primers...' : '🚀 Design Primers'}
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
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {primers && (
          <div>
            {/* Summary Stats */}
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

            {/* Optimization Tips */}
            {primers.optimization_tips && primers.optimization_tips.length > 0 && (
              <OptimizationTipsSection tips={primers.optimization_tips} />
            )}

            {/* AI Analysis Button */}
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
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {loadingAI && <span className="loading-spinner"></span>}
              {loadingAI ? 'Generating AI Analysis...' : '🤖 Get AI Explanation'}
            </button>

            {/* AI Explanation */}
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
                  borderRadius: '8px',
                  maxHeight: '600px',
                  overflowY: 'auto'
                }}>
                  {aiExplanation}
                </div>
              </div>
            )}

            {/* Primers */}
            <h3 style={{ color: '#00FFC6', marginBottom: '1rem', fontSize: '1.3rem' }}>Recommended Primers</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
              {renderPrimer(primers.forward_primer, 'Forward')}
              {renderPrimer(primers.reverse_primer, 'Reverse')}
            </div>

            {/* PCR Protocol */}
            {primers.pcr_protocol && (
              <PCRProtocol protocol={primers.pcr_protocol} />
            )}

            {/* Alternative Candidates */}
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

// Component for Application Mode Selection Card
function ApplicationModeCard({ mode, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected 
          ? 'linear-gradient(135deg, rgba(0, 255, 198, 0.2), rgba(0, 163, 137, 0.1))'
          : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        border: isSelected ? '2px solid #00FFC6' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#00FFC6';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: '#00FFC6',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0f172a',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          ✓
        </div>
      )}
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{mode.icon}</div>
      <h4 style={{ 
        color: isSelected ? '#00FFC6' : '#cbd5e1', 
        margin: '0 0 0.5rem 0',
        fontSize: '1.05rem',
        fontWeight: 600
      }}>
        {mode.name}
      </h4>
      <p style={{ 
        color: '#94a3b8', 
        fontSize: '0.85rem', 
        margin: 0,
        lineHeight: '1.4'
      }}>
        {mode.description}
      </p>
    </div>
  );
}

// Component for Detailed Analysis Cards
function AnalysisDetailCard({ type, icon, title, issue, impact, fixes }) {
  const colors = {
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6'
  };
  
  const color = colors[type] || '#6B7280';
  
  return (
    <div style={{
      background: `${color}15`,
      border: `1px solid ${color}`,
      borderRadius: '10px',
      padding: '1rem',
      marginBottom: '0.75rem'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        <span style={{ fontSize: '1.5rem' }}>{icon}</span>
        <strong style={{ color, fontSize: '1rem' }}>{title}</strong>
      </div>
      
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ 
          color: '#cbd5e1', 
          fontSize: '0.85rem', 
          marginBottom: '0.25rem',
          fontWeight: 600
        }}>
          ⚠️ Issue:
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '0.85rem', lineHeight: '1.5' }}>
          {issue}
        </div>
      </div>
      
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ 
          color: '#cbd5e1', 
          fontSize: '0.85rem', 
          marginBottom: '0.25rem',
          fontWeight: 600
        }}>
          🔬 Impact in PCR:
        </div>
        <div style={{ color: '#e2e8f0', fontSize: '0.85rem', lineHeight: '1.5' }}>
          {impact}
        </div>
      </div>
      
      <div>
        <div style={{ 
          color: '#cbd5e1', 
          fontSize: '0.85rem', 
          marginBottom: '0.5rem',
          fontWeight: 600
        }}>
          🛠 Suggested Fixes:
        </div>
        {fixes.map((fix, idx) => (
          <div key={idx} style={{
            color: '#00FFC6',
            fontSize: '0.8rem',
            marginBottom: '0.35rem',
            paddingLeft: '1rem',
            position: 'relative',
            lineHeight: '1.4'
          }}>
            <span style={{ position: 'absolute', left: 0 }}>•</span>
            {fix}
          </div>
        ))}
      </div>
    </div>
  );
}

// Component for Optimization Tips Section
function OptimizationTipsSection({ tips }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(245, 158, 11, 0.05))',
      border: '2px solid #F59E0B',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '2rem'
    }}>
      <h3 style={{ 
        color: '#FCD34D', 
        marginBottom: '1.25rem',
        fontSize: '1.2rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        💡 PCR Optimization Recommendations
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {tips.map((tip, idx) => (
          <OptimizationTipCard key={idx} {...tip} />
        ))}
      </div>
    </div>
  );
}

// Component for Individual Optimization Tip
function OptimizationTipCard({ category, icon, title, recommendation, urgency }) {
  const urgencyColors = {
    high: '#EF4444',
    medium: '#F59E0B',
    low: '#10B981'
  };
  
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '10px',
      padding: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>{icon}</span>
          <div>
            <div style={{ 
              color: '#cbd5e1', 
              fontSize: '0.75rem',
              marginBottom: '0.15rem'
            }}>
              {category}
            </div>
            <div style={{ color: '#FCD34D', fontWeight: 600, fontSize: '0.95rem' }}>
              {title}
            </div>
          </div>
        </div>
        <span style={{
          background: `${urgencyColors[urgency]}20`,
          color: urgencyColors[urgency],
          padding: '0.25rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.7rem',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}>
          {urgency}
        </span>
      </div>
      <div style={{ 
        color: '#e2e8f0', 
        fontSize: '0.85rem',
        lineHeight: '1.6'
      }}>
        {recommendation}
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