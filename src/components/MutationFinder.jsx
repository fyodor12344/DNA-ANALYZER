import React, { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   CANCER GENE MUTATION ANALYZER - RESEARCH GRADE
   Multi-Gene Panel: TP53 · BRCA1 · KRAS · EGFR
   
   UPDATES:
   1. Added VCF file upload support (removes limitation #4)
   2. Parses standard VCF format: CHROM, POS, ID, REF, ALT columns
   3. Supports single & multi-variant VCF files
   4. Multi-gene panel support — TP53, BRCA1, KRAS, EGFR (removes limitation #1)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── MULTI-GENE PANEL REGISTRY ──────────────────────────────────────────────
   Each gene has: transcript ID, protein length, domain map, clinical context,
   cancer associations, and gene-specific biological note generator.
   ─────────────────────────────────────────────────────────────────────────── */
const GENE_PANEL = {
  TP53: {
    id: 'NM_000546.6',
    symbol: 'TP53',
    name: 'Tumor Protein p53',
    fullName: 'Human TP53 tumor protein p53 transcript variant 1',
    type: 'Tumor Suppressor',
    chromosome: '17p13.1',
    proteinLength: 393,
    color: '#06B6D4',
    icon: '🧬',
    cancerAssociations: ['Lung cancer', 'Colorectal cancer', 'Breast cancer', 'Li-Fraumeni syndrome', 'Ovarian cancer', 'Leukemia'],
    clinicalContext: 'Most frequently mutated gene in human cancers (~50% of all tumors). Loss of p53 function abrogates cell cycle arrest and apoptosis in response to DNA damage.',
    domains: [
      { name: 'Transactivation Domain', start: 1,   end: 93,  functionalRegion: 'Critical',    description: 'Required for p53-mediated transcriptional activation' },
      { name: 'Proline-Rich Domain',    start: 64,  end: 92,  functionalRegion: 'Structural',  description: 'Important for p53 apoptotic function' },
      { name: 'DNA Binding Domain',     start: 102, end: 292, functionalRegion: 'Critical',    description: 'Essential for sequence-specific DNA binding and tumor suppression' },
      { name: 'Nuclear Localization Signal', start: 316, end: 325, functionalRegion: 'Critical', description: 'Directs p53 to nucleus' },
      { name: 'Oligomerization Domain', start: 323, end: 356, functionalRegion: 'Structural',  description: 'Required for p53 tetramerization' },
      { name: 'Regulatory Domain',      start: 356, end: 393, functionalRegion: 'Regulatory',  description: 'Negatively regulates p53 DNA binding' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `TP53 missense mutations in the ${domainName} are among the most oncogenic alterations in human cancer. Gain-of-function p53 mutants may actively promote tumor progression beyond simple loss-of-function.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating TP53 mutations result in complete loss of tumor suppressor activity. Cells with these mutations fail to arrest the cell cycle or undergo apoptosis in response to DNA damage.';
      return 'TP53 variants should be evaluated in the context of the full mutational landscape and patient clinical history.';
    }
  },

  BRCA1: {
    id: 'NM_007294.4',
    symbol: 'BRCA1',
    name: 'Breast Cancer Gene 1',
    fullName: 'Human BRCA1 DNA repair associated transcript variant 1',
    type: 'Tumor Suppressor',
    chromosome: '17q21.31',
    proteinLength: 1863,
    color: '#EC4899',
    icon: '🎀',
    cancerAssociations: ['Hereditary breast cancer', 'Ovarian cancer', 'Fallopian tube cancer', 'Peritoneal cancer', 'Pancreatic cancer'],
    clinicalContext: 'Germline BRCA1 mutations confer 57–65% lifetime risk of breast cancer and 39–46% risk of ovarian cancer. BRCA1 is essential for homologous recombination DNA repair.',
    domains: [
      { name: 'RING Domain',           start: 1,    end: 109,  functionalRegion: 'Critical',   description: 'E3 ubiquitin ligase activity; interacts with BARD1' },
      { name: 'RING-NBD Linker',       start: 110,  end: 202,  functionalRegion: 'Structural', description: 'Connects RING domain to nuclear export signals' },
      { name: 'Nuclear Export Signal', start: 22,   end: 30,   functionalRegion: 'Regulatory', description: 'Controls BRCA1 nuclear-cytoplasmic shuttling' },
      { name: 'Coiled-Coil Domain',    start: 1364, end: 1437, functionalRegion: 'Structural', description: 'Mediates interaction with PALB2 for HR repair' },
      { name: 'BRCT Domain 1',         start: 1642, end: 1736, functionalRegion: 'Critical',   description: 'Phosphoprotein binding; essential for DNA damage response' },
      { name: 'BRCT Domain 2',         start: 1756, end: 1855, functionalRegion: 'Critical',   description: 'Tandem BRCT repeat; recruits repair factors to DSBs' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `BRCA1 missense mutations in the ${domainName} may disrupt homologous recombination repair, leading to genomic instability. BRCT domain missense variants are classified as pathogenic when they disrupt phosphopeptide binding.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating BRCA1 mutations are the most common pathogenic variants and are strongly associated with hereditary breast and ovarian cancer syndrome (HBOC). These mutations abolish homologous recombination capacity.';
      return 'BRCA1 variants require clinical classification using multifactorial likelihood models incorporating family history, co-occurrence data, and functional assay results.';
    }
  },

  KRAS: {
    id: 'NM_004985.5',
    symbol: 'KRAS',
    name: 'Kirsten RAS Proto-Oncogene',
    fullName: 'Human KRAS proto-oncogene GTPase transcript variant b',
    type: 'Oncogene',
    chromosome: '12p12.1',
    proteinLength: 189,
    color: '#F59E0B',
    icon: '⚡',
    cancerAssociations: ['Pancreatic ductal adenocarcinoma (>90%)', 'Colorectal cancer', 'Non-small cell lung cancer', 'Thyroid cancer', 'Biliary tract cancer'],
    clinicalContext: 'KRAS is the most commonly mutated oncogene in human cancer. Activating mutations lock KRAS in the GTP-bound active state, constitutively stimulating cell proliferation via RAF-MEK-ERK and PI3K-AKT pathways.',
    domains: [
      { name: 'P-loop (G1)',          start: 10,  end: 17,  functionalRegion: 'Critical',   description: 'GTP/GDP phosphate binding; hotspot for G12 and G13 mutations' },
      { name: 'Switch I (G2)',        start: 30,  end: 40,  functionalRegion: 'Critical',   description: 'Effector binding region; changes conformation upon GTP hydrolysis' },
      { name: 'Switch II (G3)',       start: 57,  end: 76,  functionalRegion: 'Critical',   description: 'GAP interaction site; Q61 is a major mutation hotspot' },
      { name: 'G4 Motif',            start: 116, end: 119, functionalRegion: 'Structural', description: 'Guanine base recognition' },
      { name: 'G5 Motif',            start: 145, end: 147, functionalRegion: 'Structural', description: 'Guanine base specificity' },
      { name: 'Hypervariable Region',start: 167, end: 189, functionalRegion: 'Regulatory', description: 'Membrane anchoring; CAAX motif for farnesylation' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('P-loop')) return 'Mutations at KRAS G12 and G13 (P-loop) are the most clinically significant, impairing GAP-mediated GTP hydrolysis. G12C is targetable by sotorasib (AMG 510), the first approved KRAS inhibitor.';
      if (domainName.includes('Switch')) return `KRAS ${domainName} mutations constitutively activate downstream RAS signaling. Q61 mutations (Switch II) are particularly resistant to current therapeutic approaches.`;
      if (mutClass === 'Missense') return `KRAS missense mutations in the ${domainName} may constitutively activate RAS-MAPK signaling. Patients with KRAS-mutant tumors typically show resistance to anti-EGFR therapies.`;
      return 'KRAS mutations predict resistance to EGFR-targeted therapies. Tumor mutational burden and co-occurring mutations (e.g., STK11, KEAP1) further modulate therapeutic response.';
    }
  },

  EGFR: {
    id: 'NM_005228.5',
    symbol: 'EGFR',
    name: 'Epidermal Growth Factor Receptor',
    fullName: 'Human EGFR epidermal growth factor receptor transcript variant 1',
    type: 'Oncogene',
    chromosome: '7p11.2',
    proteinLength: 1210,
    color: '#8B5CF6',
    icon: '🔬',
    cancerAssociations: ['Non-small cell lung cancer (NSCLC)', 'Glioblastoma', 'Colorectal cancer', 'Head and neck squamous cell carcinoma'],
    clinicalContext: 'Activating EGFR mutations are found in ~15% of NSCLC (higher in Asian populations: ~50%). These mutations predict sensitivity to EGFR tyrosine kinase inhibitors (gefitinib, erlotinib, osimertinib).',
    domains: [
      { name: 'Signal Peptide',         start: 1,    end: 24,   functionalRegion: 'Structural', description: 'Directs EGFR to cell membrane' },
      { name: 'Extracellular Domain I', start: 25,   end: 310,  functionalRegion: 'Regulatory', description: 'Ligand binding domain; EGF interaction site' },
      { name: 'Extracellular Domain II',start: 311,  end: 481,  functionalRegion: 'Structural', description: 'Dimerization arm; receptor activation interface' },
      { name: 'Transmembrane Domain',   start: 646,  end: 667,  functionalRegion: 'Structural', description: 'Membrane spanning helix' },
      { name: 'Kinase Domain',          start: 712,  end: 979,  functionalRegion: 'Critical',   description: 'ATP binding and catalytic activity; major mutation hotspot (exons 18-21)' },
      { name: 'C-terminal Domain',      start: 980,  end: 1210, functionalRegion: 'Regulatory', description: 'Autophosphorylation sites; signal transduction scaffolding' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('Kinase')) return 'EGFR kinase domain mutations are the primary predictive biomarker for TKI therapy in NSCLC. Exon 19 deletions and L858R (exon 21) are sensitizing mutations; T790M (exon 20) is the most common resistance mutation, targetable by osimertinib.';
      if (mutClass === 'Missense') return `EGFR missense mutations in the ${domainName} may alter receptor kinase activity. Sensitizing mutations result in constitutive EGFR activation independent of EGF ligand binding.`;
      return 'EGFR mutation status is a mandatory biomarker test in newly diagnosed advanced NSCLC. Testing should include exons 18-21 for comprehensive assessment of TKI eligibility.';
    }
  }
};

// Keep backward-compatible alias
const TP53_CANONICAL = GENE_PANEL.TP53;

// Sample Mutations
const MUTATION_SAMPLES = {
  normal: {
    name:'✓ Normal (Wild-Type)', icon:'✓', color:'#10B981',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'🧬 Identical Sequences – No Mutations',
  },
  snp: {
    name:'⚠ SNP (Missense)', icon:'⚠', color:'#F59E0B',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG'.replace('CGC','CGT'),
    readingFrame:'1', strand:'forward',
    description:'⚠️ Single Nucleotide Polymorphism (SNP)',
  },
  insertion: {
    name:'➕ Insertion', icon:'➕', color:'#3B82F6',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAAACAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'➕ Insertion Mutation (3 nucleotides)',
  },
  frameshiftInsertion: {
    name:'🔴 Frameshift (Insertion)', icon:'🔴', color:'#DC2626',
    reference:'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG',
    alternate:'ATGGCCATTGTAATGGGCCGCTGAACAAGGGTGCCCGATAG',
    readingFrame:'1', strand:'forward',
    description:'🔴 Frameshift Mutation (2 bp Insertion)',
  }
};

const AA_PROPERTIES = {
  'A': { name: 'Alanine',       size: 'small',  polarity: 'nonpolar', charge: 'neutral' },
  'R': { name: 'Arginine',      size: 'large',  polarity: 'polar',    charge: 'positive' },
  'N': { name: 'Asparagine',    size: 'medium', polarity: 'polar',    charge: 'neutral' },
  'D': { name: 'Aspartate',     size: 'medium', polarity: 'polar',    charge: 'negative' },
  'C': { name: 'Cysteine',      size: 'small',  polarity: 'polar',    charge: 'neutral' },
  'E': { name: 'Glutamate',     size: 'medium', polarity: 'polar',    charge: 'negative' },
  'Q': { name: 'Glutamine',     size: 'medium', polarity: 'polar',    charge: 'neutral' },
  'G': { name: 'Glycine',       size: 'small',  polarity: 'nonpolar', charge: 'neutral' },
  'H': { name: 'Histidine',     size: 'large',  polarity: 'polar',    charge: 'positive' },
  'I': { name: 'Isoleucine',    size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'L': { name: 'Leucine',       size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'K': { name: 'Lysine',        size: 'large',  polarity: 'polar',    charge: 'positive' },
  'M': { name: 'Methionine',    size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'F': { name: 'Phenylalanine', size: 'large',  polarity: 'nonpolar', charge: 'neutral' },
  'P': { name: 'Proline',       size: 'small',  polarity: 'nonpolar', charge: 'neutral' },
  'S': { name: 'Serine',        size: 'small',  polarity: 'polar',    charge: 'neutral' },
  'T': { name: 'Threonine',     size: 'small',  polarity: 'polar',    charge: 'neutral' },
  'W': { name: 'Tryptophan',    size: 'large',  polarity: 'nonpolar', charge: 'neutral' },
  'Y': { name: 'Tyrosine',      size: 'large',  polarity: 'polar',    charge: 'neutral' },
  'V': { name: 'Valine',        size: 'small',  polarity: 'nonpolar', charge: 'neutral' },
  '*': { name: 'Stop',          size: 'n/a',    polarity: 'n/a',      charge: 'n/a' }
};

const CODON_TABLE = {
  'TTT':'F','TTC':'F','TTA':'L','TTG':'L','TCT':'S','TCC':'S','TCA':'S','TCG':'S',
  'TAT':'Y','TAC':'Y','TAA':'*','TAG':'*','TGT':'C','TGC':'C','TGA':'*','TGG':'W',
  'CTT':'L','CTC':'L','CTA':'L','CTG':'L','CCT':'P','CCC':'P','CCA':'P','CCG':'P',
  'CAT':'H','CAC':'H','CAA':'Q','CAG':'Q','CGT':'R','CGC':'R','CGA':'R','CGG':'R',
  'ATT':'I','ATC':'I','ATA':'I','ATG':'M','ACT':'T','ACC':'T','ACA':'T','ACG':'T',
  'AAT':'N','AAC':'N','AAA':'K','AAG':'K','AGT':'S','AGC':'S','AGA':'R','AGG':'R',
  'GTT':'V','GTC':'V','GTA':'V','GTG':'V','GCT':'A','GCC':'A','GCA':'A','GCG':'A',
  'GAT':'D','GAC':'D','GAA':'E','GAG':'E','GGT':'G','GGC':'G','GGA':'G','GGG':'G'
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const revComp = seq => {
  const comp = { A:'T', T:'A', G:'C', C:'G' };
  return seq.split('').reverse().map(c => comp[c] || c).join('');
};
const translateCodon = codon => CODON_TABLE[codon] || '?';

/* ─── VCF PARSER ──────────────────────────────────────────────────────────
   Parses standard VCF format lines.
   Returns array of { chrom, pos, id, ref, alt, info }
   ─────────────────────────────────────────────────────────────────────────*/
const parseVCF = (vcfText) => {
  const lines = vcfText.split('\n');
  const variants = [];
  const metaLines = [];
  const errors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Header / meta lines
    if (line.startsWith('##')) {
      metaLines.push(line);
      continue;
    }
    // Column header line
    if (line.startsWith('#CHROM') || line.startsWith('#chrom')) {
      continue;
    }

    // Data lines
    const cols = line.split('\t');
    if (cols.length < 5) {
      errors.push(`Line ${i + 1}: Expected at least 5 tab-separated columns, got ${cols.length}`);
      continue;
    }

    const [chrom, pos, id, ref, altRaw] = cols;
    const alts = altRaw.split(','); // multi-allelic sites

    // Validate REF
    const cleanRef = ref.toUpperCase().replace(/[^ATGCN]/g, '');
    if (!cleanRef) {
      errors.push(`Line ${i + 1}: Invalid REF allele "${ref}"`);
      continue;
    }

    alts.forEach((alt, altIdx) => {
      const cleanAlt = alt.toUpperCase().replace(/[^ATGCN]/g, '');
      if (!cleanAlt) {
        errors.push(`Line ${i + 1}, ALT ${altIdx + 1}: Invalid ALT allele "${alt}"`);
        return;
      }
      variants.push({
        chrom: chrom,
        pos: parseInt(pos),
        id: id === '.' ? `${chrom}:${pos}` : id,
        ref: cleanRef,
        alt: cleanAlt,
        rawLine: line,
        lineNumber: i + 1,
        isMultiAllelic: alts.length > 1,
        altIndex: altIdx
      });
    });
  }

  return { variants, metaLines, errors };
};

/* ─── POSITION CALCULATION ───────────────────────────────────────────────── */
const calculatePositions = (nucleotidePos, frame) => {
  const offset = parseInt(frame) - 1;
  const adjustedPos = nucleotidePos - offset;
  const codonNumber = Math.floor(adjustedPos / 3) + 1;
  return {
    nucleotidePosition: nucleotidePos + 1,
    codonNumber,
    aaPosition: codonNumber,
    literaturePosition: codonNumber
  };
};

/* ─── HGVS NOTATION ──────────────────────────────────────────────────────── */
const generateHGVS = (mutation, positions, refSeq, frame, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  const prefix = `${gene.id}:p.`;
  const wtAA = (litPos) => {
    if (!refSeq || !frame) return undefined;
    const offset = parseInt(frame) - 1;
    const codonStart = (litPos - 1) * 3 + offset;
    if (codonStart < 0 || codonStart + 3 > refSeq.length) return undefined;
    return translateCodon(refSeq.substring(codonStart, codonStart + 3));
  };
  if (mutation.mutation_class === 'Silent') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}=`;
  if (mutation.mutation_class === 'Missense') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}${mutation.alternate_amino_acid}`;
  if (mutation.mutation_class === 'Nonsense') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}*`;
  if (mutation.is_frameshift) {
    const aa = mutation.reference_amino_acid || wtAA(positions.literaturePosition) || '?';
    return `${prefix}${aa}${positions.literaturePosition}fs`;
  }
  if (mutation.type === 'Insertion') {
    const aa = mutation.reference_amino_acid || wtAA(positions.literaturePosition);
    return aa ? `${prefix}${aa}${positions.literaturePosition}_${positions.literaturePosition + 1}ins` : `${prefix}${positions.literaturePosition}_${positions.literaturePosition + 1}ins`;
  }
  if (mutation.type === 'Deletion') {
    const aa = mutation.reference_amino_acid || wtAA(positions.literaturePosition);
    return aa ? `${prefix}${aa}${positions.literaturePosition}del` : `${prefix}${positions.literaturePosition}del`;
  }
  return `${prefix}?`;
};

/* ─── DOMAIN MAPPING ──────────────────────────────────────────────────────── */
const getDomainMapping = (aaPosition, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  for (const domain of gene.domains) {
    if (aaPosition >= domain.start && aaPosition <= domain.end) {
      return { proteinDomain: domain.name, functionalRegion: domain.functionalRegion, interpretation: `Mutation occurs inside functional domain: ${domain.description}`, start: domain.start, end: domain.end, isInterDomain: false };
    }
  }
  return { proteinDomain: 'Inter-domain region', functionalRegion: 'N/A', interpretation: `Mutation in inter-domain linker region of ${gene.symbol}`, isInterDomain: true };
};

/* ─── BIOLOGICAL INTERPRETATION ──────────────────────────────────────────── */
const getBiologicalInterpretation = (mutation, domainMapping, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  let interpretation = { mutationType: mutation.type, functionalEffect: mutation.mutation_class, confidence: 'High', confidenceReason: '', scientificNote: '', biochemicalAnalysis: null };
  if (mutation.mutation_class === 'Missense' && mutation.reference_amino_acid && mutation.alternate_amino_acid) {
    const refProps = AA_PROPERTIES[mutation.reference_amino_acid];
    const altProps = AA_PROPERTIES[mutation.alternate_amino_acid];
    if (refProps && altProps) {
      interpretation.biochemicalAnalysis = { referenceAA: { aa: mutation.reference_amino_acid, ...refProps }, alternateAA: { aa: mutation.alternate_amino_acid, ...altProps }, sizeChange: refProps.size !== altProps.size, polarityChange: refProps.polarity !== altProps.polarity, chargeChange: refProps.charge !== altProps.charge };
      let changes = [];
      if (refProps.charge !== altProps.charge) changes.push(`charge (${refProps.charge} → ${altProps.charge})`);
      if (refProps.polarity !== altProps.polarity) changes.push(`polarity (${refProps.polarity} → ${altProps.polarity})`);
      if (refProps.size !== altProps.size) changes.push(`size (${refProps.size} → ${altProps.size})`);
      const biochemNote = changes.length > 0 ? `Substitution alters biochemical properties: ${changes.join(', ')}.` : 'Conservative substitution with similar biochemical properties.';
      interpretation.scientificNote = `${biochemNote} ${gene.getGeneNote('Missense', domainMapping.proteinDomain)}`;
    }
    interpretation.confidenceReason = 'Clear codon-level substitution with defined amino acid change';
  }
  if (mutation.is_frameshift) {
    interpretation.scientificNote = `Frameshift disrupts downstream reading frame and likely truncates ${gene.symbol} protein. ${gene.getGeneNote('Frameshift', domainMapping.proteinDomain)}`;
    interpretation.confidenceReason = 'Frameshift detected via sequence length difference';
  }
  if (mutation.mutation_class === 'Nonsense') {
    interpretation.scientificNote = `Premature stop codon produces truncated ${gene.symbol} protein. ${gene.getGeneNote('Nonsense', domainMapping.proteinDomain)}`;
    interpretation.confidenceReason = 'Stop codon introduced at defined position';
  }
  if (mutation.mutation_class === 'Silent') {
    interpretation.scientificNote = `Synonymous substitution with no amino acid change in ${gene.symbol}. Unlikely to affect protein function, though may influence mRNA stability or translation efficiency.`;
    interpretation.confidenceReason = 'Synonymous codon change verified';
  }
  return interpretation;
};

const MAX_SEQ_LENGTH = 5000;

const normalizeSequence = raw => {
  let s = raw.replace(/^>.*$/gm, '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c !== ' ' && c !== '\n' && c !== '\r' && c !== '\t') out += c;
  }
  return out.toUpperCase();
};

const findFirstDifference = (a, b) => {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return i;
  }
  return -1;
};

/* ─── MUTATION DETECTION ──────────────────────────────────────────────────── */
const detectMutations = (ref, alt, frame, strand) => {
  let seq1 = normalizeSequence(ref);
  let seq2 = normalizeSequence(alt);
  if (seq1.length > MAX_SEQ_LENGTH || seq2.length > MAX_SEQ_LENGTH) throw new Error(`Sequence too long for in-browser analysis (max ${MAX_SEQ_LENGTH.toLocaleString()} bp).`);
  if (strand === 'reverse') { seq1 = revComp(seq1); seq2 = revComp(seq2); }
  const lengthDiff = seq2.length - seq1.length;
  const mutations = [];
  const warnings = [];
  const offset = parseInt(frame) - 1;
  if (seq1.length % 3 !== 0) warnings.push('Reference sequence length not divisible by 3 - may indicate incomplete CDS');
  if (lengthDiff !== 0 && Math.abs(lengthDiff) % 3 !== 0) warnings.push('Length difference suggests frameshift mutation');
  if (lengthDiff === 0) {
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i] !== seq2[i]) {
        const codonIndex = Math.floor((i - offset) / 3);
        const codonStart = codonIndex * 3 + offset;
        if (codonStart >= 0 && codonStart + 3 <= seq1.length) {
          const refCodon = seq1.substring(codonStart, codonStart + 3);
          const altCodon = seq2.substring(codonStart, codonStart + 3);
          if (refCodon.length === 3 && altCodon.length === 3) {
            const refAA = translateCodon(refCodon);
            const altAA = translateCodon(altCodon);
            let mutClass = 'Missense';
            if (refAA === altAA) mutClass = 'Silent';
            else if (altAA === '*') mutClass = 'Nonsense';
            if (!mutations.some(m => m.codon_position === codonStart)) {
              mutations.push({ type: 'SNP', position: i, codon_position: codonStart, reference: seq1[i], alternate: seq2[i], reference_codon: refCodon, alternate_codon: altCodon, reference_amino_acid: refAA, alternate_amino_acid: altAA, mutation_class: mutClass });
            }
          }
        }
      }
    }
  } else {
    let pLen = 0;
    const minLen = Math.min(seq1.length, seq2.length);
    while (pLen < minLen && seq1[pLen] === seq2[pLen]) pLen++;
    let e1 = seq1.length - 1, e2 = seq2.length - 1;
    while (e1 > pLen && e2 > pLen && seq1[e1] === seq2[e2]) { e1--; e2--; }
    const middle1 = seq1.slice(pLen, e1 + 1);
    const middle2 = seq2.slice(pLen, e2 + 1);
    if (middle1.length === 0) {
      const isFS = middle2.length % 3 !== 0;
      mutations.push({ type: 'Insertion', position: pLen, codon_position: pLen, inserted_sequence: middle2, length: middle2.length, is_frameshift: isFS, mutation_class: isFS ? 'Frameshift' : 'In-frame Insertion', reference_codon: '---', alternate_codon: middle2.substring(0, 3) });
    } else if (middle2.length === 0) {
      const isFS = middle1.length % 3 !== 0;
      mutations.push({ type: 'Deletion', position: pLen, codon_position: pLen, deleted_sequence: middle1, length: middle1.length, is_frameshift: isFS, mutation_class: isFS ? 'Frameshift' : 'In-frame Deletion', reference_codon: middle1.substring(0, 3), alternate_codon: '---' });
    } else {
      const netDiff = middle2.length - middle1.length;
      if (netDiff > 0) {
        const isFS = netDiff % 3 !== 0;
        mutations.push({ type: 'Insertion', position: pLen, codon_position: pLen, inserted_sequence: middle2, length: netDiff, is_frameshift: isFS, mutation_class: isFS ? 'Frameshift' : 'In-frame Insertion', reference_codon: middle1.substring(0, 3), alternate_codon: middle2.substring(0, 3) });
      } else {
        const isFS = Math.abs(netDiff) % 3 !== 0;
        mutations.push({ type: 'Deletion', position: pLen, codon_position: pLen, deleted_sequence: middle1, length: Math.abs(netDiff), is_frameshift: isFS, mutation_class: isFS ? 'Frameshift' : 'In-frame Deletion', reference_codon: middle1.substring(0, 3), alternate_codon: middle2.substring(0, 3) });
      }
    }
  }
  const summary = {
    total_mutations: mutations.length,
    snps: mutations.filter(m => m.type === 'SNP').length,
    insertions: mutations.filter(m => m.type === 'Insertion').length,
    deletions: mutations.filter(m => m.type === 'Deletion').length,
    frameshift_mutations: mutations.filter(m => m.is_frameshift).length,
    silent_mutations: mutations.filter(m => m.mutation_class === 'Silent').length,
    missense_mutations: mutations.filter(m => m.mutation_class === 'Missense').length,
    nonsense_mutations: mutations.filter(m => m.mutation_class === 'Nonsense').length
  };
  return { mutations, summary, warnings, sequences: { reference: seq1, alternate: seq2, reference_length: seq1.length, alternate_length: seq2.length, length_difference: lengthDiff, reading_frame: frame, strand } };
};

/* ─── PDF GENERATION ──────────────────────────────────────────────────────── */
const generatePDF = (analysisData, annotatedMutations, analysisParams, vcfMeta, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString();
  let pdf = `${gene.symbol} MUTATION ANALYSIS REPORT\n${'='.repeat(80)}\n\n`;
  pdf += `ANALYSIS PARAMETERS\n${'-'.repeat(80)}\n`;
  pdf += `Gene: ${gene.symbol} — ${gene.name} (${gene.type})\n`;
  pdf += `Transcript Reference: ${gene.id} — ${gene.fullName}\n`;
  pdf += `Chromosome: ${gene.chromosome}  Protein Length: ${gene.proteinLength} aa\n`;
  pdf += `Reading Frame: +${analysisParams.readingFrame}\nStrand: ${analysisParams.strand}\n`;
  pdf += `Reference Length: ${analysisData.sequences.reference_length} bp\nAlternate Length: ${analysisData.sequences.alternate_length} bp\n`;
  pdf += `Length Difference: ${analysisData.sequences.length_difference} bp\nAnalysis Date: ${timestamp}\n`;
  pdf += `\nCLINICAL CONTEXT\n${'-'.repeat(80)}\n${gene.clinicalContext}\n`;
  pdf += `Cancer Associations: ${gene.cancerAssociations.join(', ')}\n`;
  if (vcfMeta) {
    pdf += `\nVCF SOURCE\n${'-'.repeat(80)}\n`;
    pdf += `Source: VCF File Upload (NGS Data)\n`;
    pdf += `Variant: ${vcfMeta.id} at ${vcfMeta.chrom}:${vcfMeta.pos}\n`;
    pdf += `REF Allele: ${vcfMeta.ref}  ALT Allele: ${vcfMeta.alt}\n`;
  }
  pdf += `\nSUMMARY STATISTICS\n${'-'.repeat(80)}\n`;
  pdf += `Total Mutations: ${analysisData.summary.total_mutations}\nSNPs: ${analysisData.summary.snps}\n`;
  pdf += `Insertions: ${analysisData.summary.insertions}\nDeletions: ${analysisData.summary.deletions}\n`;
  pdf += `Frameshift: ${analysisData.summary.frameshift_mutations}\nSilent: ${analysisData.summary.silent_mutations}\n`;
  pdf += `Missense: ${analysisData.summary.missense_mutations}\nNonsense: ${analysisData.summary.nonsense_mutations}\n\n`;
  if (annotatedMutations?.length > 0) {
    pdf += `MUTATION OVERVIEW TABLE\n${'='.repeat(80)}\n\n`;
    annotatedMutations.forEach((am, idx) => {
      const mut = am.mutation;
      pdf += `Mutation ${idx + 1}\n${'-'.repeat(80)}\n`;
      pdf += `Nucleotide Position: ${am.positions.nucleotidePosition}\nCodon Number: ${am.positions.codonNumber}\n`;
      pdf += `Amino Acid Position: ${am.positions.aaPosition}\nLiterature Position: ${am.positions.literaturePosition}\n`;
      pdf += `HGVS Notation: ${am.hgvs}\nMutation Type: ${mut.type}\nFunctional Effect: ${mut.mutation_class}\n`;
      pdf += `Confidence Level: ${am.interpretation.confidence}\n`;
      if (mut.reference_amino_acid && mut.alternate_amino_acid) pdf += `Amino Acid Change: ${mut.reference_amino_acid} → ${mut.alternate_amino_acid}\n`;
      pdf += `\nProtein Domain Annotation:\n  Domain: ${am.domainMapping.proteinDomain}\n`;
      if (!am.domainMapping.isInterDomain) pdf += `  Functional Region: ${am.domainMapping.functionalRegion}\n  Region: AA ${am.domainMapping.start}-${am.domainMapping.end}\n`;
      pdf += `  Interpretation: ${am.domainMapping.interpretation}\n`;
      pdf += `\nBiological Interpretation:\n  ${am.interpretation.scientificNote}\n  Confidence: ${am.interpretation.confidence} - ${am.interpretation.confidenceReason}\n\n`;
    });
  }
  pdf += `\nMETHODS NOTE\n${'-'.repeat(80)}\n`;
  pdf += `All mutations were mapped to canonical TP53 transcript ${TP53_CANONICAL.id}.\n`;
  pdf += vcfMeta ? `Input provided via VCF file upload (NGS-compatible format).\n` : `Input provided via manual sequence entry.\n`;
  pdf += `Domain mapping based on canonical TP53 protein structure (393 amino acids).\nHGVS notation follows standard nomenclature guidelines.\n`;
  const blob = new Blob([pdf], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${gene.symbol}_Mutation_Report_${date}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return true;
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function TP53MutationAnalyzer() {
  const [seq1, setSeq1] = useState('');
  const [seq2, setSeq2] = useState('');
  const [mutations, setMutations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readingFrame, setReadingFrame] = useState('1');
  const [strand, setStrand] = useState('forward');
  const [annotatedMutations, setAnnotatedMutations] = useState([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showSampleMenu, setShowSampleMenu] = useState(false);
  const [currentSample, setCurrentSample] = useState(null);
  const [sampleBannerVisible, setSampleBannerVisible] = useState(false);
  const [diffInfo, setDiffInfo] = useState(null);

  const [vcfMode, setVcfMode] = useState(false);
  const [vcfFile, setVcfFile] = useState(null);
  const [vcfParsed, setVcfParsed] = useState(null);
  const [vcfSelectedIdx, setVcfSelectedIdx] = useState(0);
  const [vcfLoading, setVcfLoading] = useState(false);
  const [vcfError, setVcfError] = useState('');
  const [vcfMeta, setVcfMeta] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const vcfInputRef = useRef(null);

  // ── GENE PANEL STATE ───────────────────────────────────────────────────────
  const [selectedGene, setSelectedGene] = useState('TP53');
  const activeGene = GENE_PANEL[selectedGene];

  const loadSample = key => {
    const s = MUTATION_SAMPLES[key];
    setSeq1(s.reference); setSeq2(s.alternate);
    setReadingFrame(s.readingFrame); setStrand(s.strand);
    setCurrentSample(s); setSampleBannerVisible(true);
    setShowSampleMenu(false); setMutations(null); setError('');
    setAiExplanation(''); setDiffInfo(null);
    setVcfMode(false); setVcfParsed(null); setVcfFile(null);
  };

  useEffect(() => {
    const close = () => setShowSampleMenu(false);
    if (showSampleMenu) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [showSampleMenu]);

  /* ── VCF FILE HANDLER ────────────────────────────────────────────────────── */
  const handleVcfFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.vcf') && !file.name.endsWith('.txt')) {
      setVcfError('Please upload a .vcf file');
      return;
    }
    setVcfLoading(true);
    setVcfError('');
    setVcfParsed(null);
    setVcfFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const result = parseVCF(text);
        if (result.variants.length === 0) {
          setVcfError('No valid variants found in VCF file. Check format: CHROM, POS, ID, REF, ALT columns required.');
          setVcfLoading(false);
          return;
        }
        setVcfParsed(result);
        setVcfSelectedIdx(0);
        // Auto-load first variant into sequence boxes
        loadVcfVariant(result.variants[0]);
      } catch (err) {
        setVcfError(`Failed to parse VCF: ${err.message}`);
      }
      setVcfLoading(false);
    };
    reader.onerror = () => { setVcfError('Failed to read file'); setVcfLoading(false); };
    reader.readAsText(file);
  };

  const loadVcfVariant = (variant) => {
    setSeq1(variant.ref);
    setSeq2(variant.alt);
    setVcfMeta(variant);
    setMutations(null);
    setError('');
    setAiExplanation('');
    setDiffInfo(null);
  };

  const handleVcfInputChange = (e) => handleVcfFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); handleVcfFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  /* ── ANALYSIS ────────────────────────────────────────────────────────────── */
  const validateBases = (seq) => { for (let i = 0; i < seq.length; i++) { const c = seq[i]; if (c !== 'A' && c !== 'T' && c !== 'G' && c !== 'C') return false; } return true; };

  const handleAnalyze = async () => {
    if (!seq1.trim() || !seq2.trim()) { setError('Both sequences are required'); return; }
    const cleanSeq1 = normalizeSequence(seq1);
    const cleanSeq2 = normalizeSequence(seq2);
    if (cleanSeq1.length > MAX_SEQ_LENGTH || cleanSeq2.length > MAX_SEQ_LENGTH) { setError(`Sequence too long — max ${MAX_SEQ_LENGTH.toLocaleString()} bp`); return; }
    if (!validateBases(cleanSeq1)) { setError('Reference sequence contains invalid characters (only A, T, G, C allowed).'); return; }
    if (!validateBases(cleanSeq2)) { setError('Alternate sequence contains invalid characters (only A, T, G, C allowed).'); return; }
    const firstDiffIdx = findFirstDifference(cleanSeq1, cleanSeq2);
    if (firstDiffIdx >= 0) {
      setDiffInfo({ index: firstDiffIdx, position: firstDiffIdx + 1, refBase: cleanSeq1[firstDiffIdx], altBase: cleanSeq2[firstDiffIdx], refLen: cleanSeq1.length, altLen: cleanSeq2.length, identical: false });
    } else if (cleanSeq1.length !== cleanSeq2.length) {
      setDiffInfo({ index: Math.min(cleanSeq1.length, cleanSeq2.length), position: Math.min(cleanSeq1.length, cleanSeq2.length) + 1, refBase: cleanSeq1[cleanSeq1.length - 1] ?? '-', altBase: cleanSeq2[cleanSeq2.length - 1] ?? '-', refLen: cleanSeq1.length, altLen: cleanSeq2.length, identical: false });
    } else {
      setDiffInfo({ identical: true, refLen: cleanSeq1.length, altLen: cleanSeq2.length });
    }
    setLoading(true); setError('');
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      const result = detectMutations(cleanSeq1, cleanSeq2, readingFrame, strand);
      setMutations(result);
    } catch (e) { setError(`Analysis failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (mutations?.mutations && readingFrame) {
      const refSeq = mutations.sequences?.reference ?? '';
      setAnnotatedMutations(mutations.mutations.map(mutation => {
        const positionIndex = mutation.codon_position ?? mutation.position ?? 0;
        const positions = calculatePositions(positionIndex, readingFrame);
        const hgvs = generateHGVS(mutation, positions, refSeq, readingFrame, selectedGene);
        const domainMapping = getDomainMapping(positions.aaPosition, selectedGene);
        const interpretation = getBiologicalInterpretation(mutation, domainMapping, selectedGene);
        return { mutation, positions, hgvs, domainMapping, interpretation };
      }));
    }
  }, [mutations, readingFrame, selectedGene]);

  const handleExportPDF = () => {
    if (!mutations) return;
    try { generatePDF(mutations, annotatedMutations, { readingFrame, strand }, vcfMeta, selectedGene); }
    catch (e) { setError(`PDF export failed: ${e.message}`); }
  };

  const handleAI = async () => {
    if (!mutations) return;
    setLoadingAI(true); setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const gene = GENE_PANEL[selectedGene] || GENE_PANEL.TP53;
      let explanation = `${gene.symbol} Mutation Analysis Summary\n`;
      explanation += `Gene: ${gene.name} (${gene.type}) · ${gene.chromosome}\n`;
      explanation += `Transcript: ${gene.id}\n\n`;
      explanation += `Detected ${mutations.summary.total_mutations} mutation(s) in the provided sequences.\n\n`;
      explanation += `Clinical Context:\n${gene.clinicalContext}\n\n`;
      if (mutations.summary.missense_mutations > 0) explanation += `Missense Mutations: ${mutations.summary.missense_mutations} detected. These substitutions alter amino acid identity and may affect ${gene.symbol} protein function.\n\n`;
      if (mutations.summary.frameshift_mutations > 0) explanation += `Frameshift Mutations: ${mutations.summary.frameshift_mutations} detected. These indels disrupt the reading frame, likely producing truncated non-functional ${gene.symbol} protein.\n\n`;
      if (mutations.summary.nonsense_mutations > 0) explanation += `Nonsense Mutations: ${mutations.summary.nonsense_mutations} detected. Premature stop codons result in truncated ${gene.symbol} protein.\n\n`;
      const criticalDomain = annotatedMutations.filter(am => am.domainMapping.functionalRegion === 'Critical');
      if (criticalDomain.length > 0) explanation += `Critical Domain Alert: ${criticalDomain.length} mutation(s) detected in critical functional domains of ${gene.symbol}. These have high likelihood of functional impairment.\n\n`;
      if (vcfMeta) explanation += `VCF Source: Variant ${vcfMeta.id} at ${vcfMeta.chrom}:${vcfMeta.pos} (${vcfMeta.ref} → ${vcfMeta.alt})\n\n`;
      explanation += `Associated Cancers: ${gene.cancerAssociations.join(', ')}.`;
      setAiExplanation(explanation);
    } catch (e) { setError('AI analysis failed'); }
    finally { setLoadingAI(false); }
  };

  /* ── RENDER ──────────────────────────────────────────────────────────────── */
  return (
  <div style={{ minHeight:'100vh', background:'#0c0e14', color:'#e2e4e9', fontFamily:'"Sora",sans-serif', fontSize:'1.05em' }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{ box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar{ width:5px; } ::-webkit-scrollbar-track{ background:#131518; } ::-webkit-scrollbar-thumb{ background:#2a2d3a; border-radius:3px; }
    .pc{ background:#141720; border:1px solid #24272f; border-radius:12px; padding:1.5rem; margin-bottom:1.2rem; animation: fadeSlideIn 0.4s ease-out; }
    .lbl{ display:block; font-size:.95rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.5rem; }
    select, textarea{ width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px; color:#e2e4e9; font-family:'Sora',sans-serif; font-size:1.05rem; padding:.8rem .95rem; outline:none; transition:all .3s ease; }
    select:focus, textarea:focus{ border-color:#06B6D4; box-shadow: 0 0 0 3px rgba(6,182,212,0.1); }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:.95rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }
    .btn-p{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:1rem 1.35rem; background:linear-gradient(135deg,#06B6D4,#0891B2); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.1rem; cursor:pointer; transition:all .3s ease; position:relative; overflow:hidden; }
    .btn-p::before{ content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition:left 0.5s ease; }
    .btn-p:hover::before{ left:100%; } .btn-p:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(6,182,212,.4); } .btn-p:active{ transform:translateY(0); } .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }
    .btn-ai{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:.95rem 1.35rem; background:linear-gradient(135deg,#14B8A6,#0D9488); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem; cursor:pointer; transition:all .3s ease; position:relative; overflow:hidden; }
    .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(20,184,166,.4); } .btn-ai:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; }
    .btn-pdf{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:.95rem 1.35rem; background:linear-gradient(135deg,#8B5CF6,#7C3AED); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem; cursor:pointer; transition:all .3s ease; }
    .btn-pdf:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(139,92,246,.4); }
    .btn-g{ display:inline-flex; align-items:center; gap:.42rem; padding:.52rem 1rem; background:transparent; border:1px solid #24272f; border-radius:7px; color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500; cursor:pointer; transition:all .25s ease; }
    .btn-g:hover{ border-color:#06B6D4; color:#06B6D4; background:rgba(6,182,212,.06); transform:translateY(-1px); }
    .btn-sample{ display:inline-flex; align-items:center; gap:.42rem; padding:.5rem 1rem; background:rgba(6,182,212,.1); border:1px solid rgba(6,182,212,.3); border-radius:7px; color:#67E8F9; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500; cursor:pointer; transition:all .25s ease; position:relative; }
    .btn-sample:hover{ background:rgba(6,182,212,.18); border-color:rgba(6,182,212,.55); transform:translateY(-1px); }
    .sample-menu{ position:absolute; top:calc(100% + .35rem); left:0; background:#141720; border:1px solid #24272f; border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,.45); padding:.6rem; z-index:100; min-width:280px; animation: dropdownSlide 0.25s ease-out; }
    .sample-item{ padding:.8rem .9rem; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:.32rem; transition:all .2s ease; }
    .sample-item:hover{ border-color:#06B6D4; background:rgba(6,182,212,.07); transform:translateX(4px); }
    .info-wrap{ overflow:hidden; transition:max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; }
    .info-wrap.closed{ max-height:0; opacity:0; } .info-wrap.open{ max-height:1200px; opacity:1; }
    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:.9rem .7rem; text-align:center; transition:all .3s ease; }
    .stat-b:hover{ transform:translateY(-3px); box-shadow:0 4px 12px rgba(6,182,212,.15); border-color:#06B6D4; }
    .stat-v{ font-size:1.6rem; font-weight:700; line-height:1.2; } .stat-l{ font-size:.85rem; color:#6b7080; text-transform:uppercase; letter-spacing:.06em; margin-top:.3rem; }
    .mut-card{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1.25rem; margin-bottom:.8rem; animation: fadeSlideIn 0.3s ease-out; transition:all .3s ease; }
    .mut-card:hover{ transform:translateX(4px); box-shadow:0 4px 16px rgba(6,182,212,.1); }
    .ai-box{ background:rgba(6,182,212,.08); border:1px solid rgba(6,182,212,.3); border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; }
    table{ width:100%; border-collapse:collapse; margin-top:1rem; } th,td{ padding:0.75rem; text-align:left; border-bottom:1px solid #24272f; font-size:0.9rem; }
    th{ background:#0f1117; font-weight:600; color:#67E8F9; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.05em; } td{ color:#8a8f9e; }
    .badge{ display:inline-block; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600; }
    .badge-missense{ background:rgba(251,191,36,0.2); color:#FBBF24; border:1px solid rgba(251,191,36,0.3); }
    .badge-nonsense{ background:rgba(239,68,68,0.2); color:#EF4444; border:1px solid rgba(239,68,68,0.3); }
    .badge-silent{ background:rgba(16,185,129,0.2); color:#10B981; border:1px solid rgba(16,185,129,0.3); }
    .badge-frameshift{ background:rgba(220,38,38,0.2); color:#FCA5A5; border:1px solid rgba(220,38,38,0.3); }
    .warning{ background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem; color:#FBBF24; }
    .error{ background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem; color:#EF4444; }
    .seq-input-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; }
    .config-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .summary-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }
    .mode-tab{ display:flex; align-items:center; justify-content:center; gap:.45rem; padding:.65rem 1.2rem; border-radius:8px; font-family:'Sora',sans-serif; font-weight:600; font-size:.95rem; cursor:pointer; border:1px solid #24272f; background:transparent; color:#6b7080; transition:all .25s ease; flex:1; }
    .mode-tab.active{ background:rgba(6,182,212,.12); border-color:rgba(6,182,212,.45); color:#67E8F9; }
    .mode-tab:hover:not(.active){ border-color:#3a3d4a; color:#a0a4b0; }
    .vcf-drop{ border:2px dashed #24272f; border-radius:12px; padding:2.5rem 1.5rem; text-align:center; transition:all .3s ease; cursor:pointer; }
    .vcf-drop.dragover{ border-color:#06B6D4; background:rgba(6,182,212,.06); }
    .vcf-drop:hover{ border-color:#3a3d4a; }
    .variant-row{ padding:.75rem .9rem; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:.4rem; transition:all .2s ease; background:#0f1117; }
    .variant-row.selected{ border-color:#06B6D4; background:rgba(6,182,212,.08); }
    .variant-row:hover:not(.selected){ border-color:#3a3d4a; }
    .vcf-badge{ display:inline-flex; align-items:center; gap:.3rem; background:rgba(139,92,246,.15); border:1px solid rgba(139,92,246,.35); color:#A78BFA; font-size:.78rem; font-weight:600; padding:.2rem .55rem; border-radius:6px; letter-spacing:.04em; text-transform:uppercase; }
    @media(max-width:768px){ .seq-input-grid{ grid-template-columns:1fr; } .config-grid{ grid-template-columns:1fr; } .summary-grid{ grid-template-columns:repeat(2,1fr); } .gene-grid{ grid-template-columns:repeat(2,1fr) !important; } }
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite; }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes dropdownSlide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  `}</style>

  <div style={{ maxWidth:'860px', margin:'0 auto', padding:'1.25rem 1.2rem 3rem' }}>

    {/* HEADER */}
    <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.65rem 1.3rem 1.3rem', margin:'-1.25rem -1.2rem 0', marginBottom:'1.25rem' }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ background:`linear-gradient(135deg, ${activeGene.color}22 0%, #083344 100%)`, border:`2px solid ${activeGene.color}55`, borderRadius:'14px', padding:'1.1rem 1.3rem', marginBottom:'.6rem', boxShadow:`0 8px 32px ${activeGene.color}25` }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'1.75rem' }}>{activeGene.icon}</span>
            <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.75rem', color:'#fff', margin:0 }}>Cancer Gene Mutation Analyzer</h1>
            <span style={{ background:'rgba(6,182,212,.2)', border:'1px solid rgba(6,182,212,.4)', color:'#67E8F9', fontSize:'.75rem', fontWeight:600, padding:'.25rem .6rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Research Grade</span>
            <span className="vcf-badge">VCF Support</span>
            <span style={{ background:'rgba(16,185,129,.15)', border:'1px solid rgba(16,185,129,.35)', color:'#6EE7B7', fontSize:'.75rem', fontWeight:600, padding:'.25rem .6rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Multi-Gene Panel</span>
          </div>
        </div>
        <p style={{ color:'#6b7080', fontSize:'1.05rem', lineHeight:1.6, maxWidth:600, margin:0 }}>Analyze mutations across cancer-associated genes — TP53, BRCA1, KRAS, EGFR — with codon-level resolution, domain annotation, and VCF support.</p>
      </div>
    </div>

    {/* ── GENE PANEL SELECTOR ───────────────────────────────────────────────── */}
    <div className="pc" style={{ borderColor:'rgba(16,185,129,.3)', background:'rgba(16,185,129,.04)', marginBottom:'1.1rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'1rem' }}>
        <span style={{ fontSize:'1.05rem' }}>🧫</span>
        <span style={{ fontSize:'1rem', fontWeight:600, color:'#6EE7B7' }}>Gene Panel Selection</span>
        <span style={{ background:'rgba(16,185,129,.2)', border:'1px solid rgba(16,185,129,.4)', color:'#6EE7B7', fontSize:'.72rem', fontWeight:700, padding:'.18rem .48rem', borderRadius:8, textTransform:'uppercase', marginLeft:'.25rem' }}>Future Direction #1 — Implemented</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'.6rem' }}>
        {Object.values(GENE_PANEL).map(gene => (
          <button
            key={gene.symbol}
            onClick={() => { setSelectedGene(gene.symbol); setMutations(null); setAnnotatedMutations([]); setError(''); setAiExplanation(''); }}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:'.3rem',
              padding:'.85rem .5rem',
              background: selectedGene === gene.symbol ? `${gene.color}18` : '#0f1117',
              border: selectedGene === gene.symbol ? `2px solid ${gene.color}` : '1px solid #1e2130',
              borderRadius:10, cursor:'pointer', transition:'all .25s ease',
              boxShadow: selectedGene === gene.symbol ? `0 4px 16px ${gene.color}30` : 'none'
            }}
          >
            <span style={{ fontSize:'1.4rem' }}>{gene.icon}</span>
            <span style={{ fontFamily:'"JetBrains Mono",monospace', fontWeight:700, fontSize:'.95rem', color: selectedGene === gene.symbol ? gene.color : '#c8cad4' }}>{gene.symbol}</span>
            <span style={{ fontSize:'.72rem', color:'#6b7080', textAlign:'center', lineHeight:1.3 }}>{gene.type}</span>
            <span style={{ fontSize:'.7rem', color: selectedGene === gene.symbol ? gene.color+'cc' : '#3a3d4a', fontFamily:'"JetBrains Mono",monospace' }}>{gene.id.split('.')[0]}</span>
          </button>
        ))}
      </div>
      {/* Active gene info strip */}
      <div style={{ marginTop:'1rem', padding:'.85rem 1rem', background:`${activeGene.color}0d`, border:`1px solid ${activeGene.color}30`, borderRadius:8 }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:'.85rem', fontWeight:600, color:activeGene.color, marginBottom:'.3rem' }}>{activeGene.icon} {activeGene.symbol} — {activeGene.name}</div>
            <div style={{ fontSize:'.85rem', color:'#8a8f9e', lineHeight:1.6 }}>{activeGene.clinicalContext}</div>
          </div>
          <div style={{ minWidth:160 }}>
            <div style={{ fontSize:'.8rem', color:'#6b7080', marginBottom:'.3rem', textTransform:'uppercase', letterSpacing:'.06em' }}>Cancer Associations</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.2rem' }}>
              {activeGene.cancerAssociations.slice(0, 3).map((c, i) => (
                <span key={i} style={{ fontSize:'.78rem', color:'#8a8f9e', background:'#0f1117', border:'1px solid #1e2130', borderRadius:5, padding:'.15rem .4rem', display:'inline-block' }}>• {c}</span>
              ))}
              {activeGene.cancerAssociations.length > 3 && <span style={{ fontSize:'.78rem', color:'#6b7080' }}>+{activeGene.cancerAssociations.length - 3} more</span>}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* INFO TOGGLE */}
    <button className="btn-g" onClick={()=>setInfoOpen(v=>!v)} style={{ width:'100%', justifyContent:'space-between', marginBottom:'1.1rem' }}>
      <span style={{ display:'flex', alignItems:'center', gap:'.45rem' }}><span>💡</span><span>Why This Tool Matters & How to Use It</span></span>
      <span style={{ fontSize:'.82rem', color:'#6b7080', transition:'transform .25s', transform:infoOpen?'rotate(180deg)':'rotate(0)', display:'inline-block' }}>▼</span>
    </button>
    <div className={`info-wrap ${infoOpen?'open':'closed'}`}>
      <div className="pc" style={{ padding:'1.45rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.55rem' }}><span>🎯</span><span style={{ fontSize:'.95rem', fontWeight:600, color:'#06B6D4', textTransform:'uppercase', letterSpacing:'.07em' }}>Why This Tool Matters</span></div>
        <p style={{ fontSize:'1.05rem', color:'#8a8f9e', lineHeight:1.75, margin:0 }}>This research-grade TP53 mutation analyzer maps all mutations to the canonical transcript <strong style={{color:'#10B981'}}>NM_000546.6</strong>. It provides multi-level position reporting, HGVS notation, protein domain annotation, biochemical property analysis, and <strong style={{color:'#A78BFA'}}>VCF file upload for NGS data</strong> — essential for cancer genomics research and clinical interpretation.</p>
        <div style={{ borderTop:'1px solid #24272f', margin:'1.1rem 0' }}></div>
        <div style={{ fontSize:'.9rem', color:'#8a8f9e', padding:'.8rem', background:'rgba(6,182,212,.04)', borderRadius:'6px', borderLeft:'3px solid #06B6D4' }}>
          <strong style={{ color:'#67E8F9' }}>Transcript Reference:</strong> {TP53_CANONICAL.id} – {TP53_CANONICAL.name} ({TP53_CANONICAL.type})
        </div>
      </div>
    </div>

    {/* LOAD SAMPLE */}
    <div style={{ position:'relative', marginBottom:'1.1rem' }}>
      <button className="btn-sample" onClick={e=>{ e.stopPropagation(); setShowSampleMenu(v=>!v); }}>
        <span>📋</span><span>Load Sample Mutations</span><span style={{ fontSize:'.82rem', color:'#6b7080', marginLeft:'.25rem' }}>▼</span>
      </button>
      {showSampleMenu && (
        <div className="sample-menu" onClick={e=>e.stopPropagation()}>
          {Object.entries(MUTATION_SAMPLES).map(([k, s]) => (
            <div key={k} className="sample-item" onClick={()=>loadSample(k)} style={{ background:`${s.color}0a` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.22rem' }}><span style={{ fontSize:'1.25rem' }}>{s.icon}</span><span style={{ fontSize:'1rem', fontWeight:600, color:s.color }}>{s.name}</span></div>
              <div style={{ fontSize:'.9rem', color:'#8a8f9e' }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* SAMPLE BANNER */}
    {sampleBannerVisible && currentSample && (
      <div className="pc" style={{ borderColor:currentSample.color+'55', background:`${currentSample.color}08`, marginBottom:'1.1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            <span style={{ fontSize:'1.6rem' }}>{currentSample.icon}</span>
            <div>
              <div style={{ fontSize:'1.05rem', fontWeight:700, color:currentSample.color }}>Sample Loaded: {currentSample.name}</div>
              <div style={{ fontSize:'.95rem', color:'#8a8f9e', marginTop:'.12rem' }}>{currentSample.description}</div>
            </div>
          </div>
          <button onClick={()=>setSampleBannerVisible(false)} style={{ background:'none', border:'none', color:'#6b7080', fontSize:'1.4rem', cursor:'pointer' }}>×</button>
        </div>
      </div>
    )}

    {/* ANALYSIS CONFIG */}
    <div className="pc" style={{ borderColor:'rgba(6,182,212,.3)', background:'rgba(6,182,212,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
        <span>⚙️</span>
        <span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>Analysis Configuration</span>
        <span style={{ background:'#EF4444', color:'#fff', fontSize:'.72rem', fontWeight:700, padding:'.18rem .48rem', borderRadius:8, textTransform:'uppercase', marginLeft:'.35rem' }}>Required</span>
      </div>
      <div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.25)', borderRadius:'8px', padding:'.9rem', marginBottom:'1rem' }}>
        <label className="lbl" style={{ color:'#10B981', marginBottom:'.5rem' }}>Transcript Reference</label>
        <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem', color:activeGene.color, fontWeight:600 }}>{activeGene.id}</div>
        <div style={{ fontSize:'.88rem', color:'#8a8f9e', fontStyle:'italic', marginTop:'.2rem' }}>{activeGene.icon} {activeGene.fullName}</div>
        <div style={{ fontSize:'.82rem', color:'#6b7080', marginTop:'.25rem' }}>Chromosome: {activeGene.chromosome} · Protein: {activeGene.proteinLength} aa · {activeGene.type}</div>
      </div>
      <div className="config-grid">
        <div>
          <label className="lbl">Reading Frame</label>
          <select value={readingFrame} onChange={e=>setReadingFrame(e.target.value)}>
            <option value="1">+1 (start at position 1)</option>
            <option value="2">+2 (start at position 2)</option>
            <option value="3">+3 (start at position 3)</option>
          </select>
        </div>
        <div>
          <label className="lbl">Strand</label>
          <select value={strand} onChange={e=>setStrand(e.target.value)}>
            <option value="forward">Forward (5′ → 3′)</option>
            <option value="reverse">Reverse (3′ → 5′)</option>
          </select>
        </div>
      </div>
    </div>

    {/* ══════════════════════════════════════════════════════════════════════
        INPUT MODE TABS — Manual vs VCF
        ══════════════════════════════════════════════════════════════════════ */}
    <div className="pc">
      {/* Mode Toggle */}
      <div style={{ display:'flex', gap:'.6rem', marginBottom:'1.2rem' }}>
        <button className={`mode-tab ${!vcfMode ? 'active' : ''}`} onClick={()=>{ setVcfMode(false); setVcfMeta(null); }}>
          <span>⌨️</span> Manual Entry
        </button>
        <button className={`mode-tab ${vcfMode ? 'active' : ''}`} onClick={()=>setVcfMode(true)}>
          <span>📂</span> VCF File Upload
          <span style={{ background:'rgba(139,92,246,.2)', border:'1px solid rgba(139,92,246,.4)', color:'#A78BFA', fontSize:'.7rem', fontWeight:700, padding:'.12rem .4rem', borderRadius:5, marginLeft:'.35rem', textTransform:'uppercase' }}>NGS</span>
        </button>
      </div>

      {/* ── VCF UPLOAD PANEL ─────────────────────────────────────────────────── */}
      {vcfMode ? (
        <div>
          <div style={{ marginBottom:'1rem', padding:'.75rem 1rem', background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.25)', borderRadius:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.35rem' }}>
              <span>📋</span>
              <span style={{ fontSize:'.9rem', fontWeight:600, color:'#A78BFA' }}>VCF Format Guide</span>
            </div>
            <div style={{ fontSize:'.88rem', color:'#8a8f9e', lineHeight:1.7, fontFamily:'"JetBrains Mono",monospace' }}>
              <div style={{ color:'#6b7080' }}>#CHROM&nbsp;&nbsp;POS&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;REF&nbsp;&nbsp;ALT</div>
              <div>chr17&nbsp;&nbsp;&nbsp;&nbsp;7674220&nbsp;&nbsp;rs28934578&nbsp;&nbsp;C&nbsp;&nbsp;&nbsp;&nbsp;T</div>
              <div>chr17&nbsp;&nbsp;&nbsp;&nbsp;7674872&nbsp;&nbsp;.&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;G&nbsp;&nbsp;&nbsp;&nbsp;A</div>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            className={`vcf-drop ${isDragOver ? 'dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={()=>vcfInputRef.current?.click()}
            style={{ marginBottom:'1rem' }}
          >
            <input ref={vcfInputRef} type="file" accept=".vcf,.txt" onChange={handleVcfInputChange} style={{ display:'none' }} />
            {vcfLoading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.75rem' }}>
                <span className="spin" style={{ width:28, height:28, borderWidth:3 }}></span>
                <span style={{ color:'#6b7080' }}>Parsing VCF file…</span>
              </div>
            ) : vcfFile && !vcfError ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.5rem' }}>
                <span style={{ fontSize:'2rem' }}>✅</span>
                <div style={{ fontWeight:600, color:'#10B981' }}>{vcfFile.name}</div>
                <div style={{ fontSize:'.9rem', color:'#6b7080' }}>{vcfParsed?.variants.length} variant{vcfParsed?.variants.length !== 1 ? 's' : ''} found — click to replace</div>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'.65rem' }}>
                <span style={{ fontSize:'2.5rem' }}>📂</span>
                <div style={{ fontWeight:600, color:'#c8cad4', fontSize:'1.05rem' }}>Drop your VCF file here</div>
                <div style={{ fontSize:'.9rem', color:'#6b7080' }}>or click to browse — supports .vcf and .txt</div>
                <div style={{ fontSize:'.82rem', color:'#3a3d4a', marginTop:'.25rem' }}>Supports single & multi-variant VCF files</div>
              </div>
            )}
          </div>

          {vcfError && <div className="error" style={{ marginBottom:'1rem' }}>⚠️ {vcfError}</div>}

          {/* Parsed VCF errors */}
          {vcfParsed?.errors?.length > 0 && (
            <div className="warning" style={{ marginBottom:'1rem' }}>
              <strong>⚠ Parse Warnings ({vcfParsed.errors.length}):</strong>
              <ul style={{ marginTop:'.4rem', paddingLeft:'1.4rem' }}>
                {vcfParsed.errors.map((e, i) => <li key={i} style={{ fontSize:'.9rem' }}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Variant List */}
          {vcfParsed && vcfParsed.variants.length > 0 && (
            <div>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.65rem' }}>
                <label className="lbl" style={{ margin:0 }}>Select Variant to Analyze</label>
                <span style={{ fontSize:'.85rem', color:'#6b7080' }}>{vcfParsed.variants.length} variant{vcfParsed.variants.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ maxHeight:220, overflowY:'auto', paddingRight:'.25rem' }}>
                {vcfParsed.variants.map((v, i) => (
                  <div
                    key={i}
                    className={`variant-row ${vcfSelectedIdx === i ? 'selected' : ''}`}
                    onClick={() => { setVcfSelectedIdx(i); loadVcfVariant(v); }}
                  >
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'.4rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'.65rem' }}>
                        <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.9rem', color:'#67E8F9', fontWeight:600 }}>
                          {v.chrom}:{v.pos}
                        </span>
                        <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem', color:'#60A5FA' }}>{v.ref}</span>
                        <span style={{ color:'#6b7080' }}>→</span>
                        <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem', color:'#FBBF24' }}>{v.alt}</span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
                        {v.isMultiAllelic && <span style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', color:'#F59E0B', fontSize:'.72rem', fontWeight:600, padding:'.15rem .4rem', borderRadius:5 }}>MULTI-ALLELIC</span>}
                        <span style={{ fontSize:'.85rem', color:'#6b7080' }}>{v.id}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:'.85rem', padding:'.75rem .9rem', background:'rgba(6,182,212,.06)', border:'1px solid rgba(6,182,212,.2)', borderRadius:8, fontSize:'.9rem', color:'#67E8F9' }}>
                ✅ Selected: <strong>{vcfParsed.variants[vcfSelectedIdx]?.chrom}:{vcfParsed.variants[vcfSelectedIdx]?.pos}</strong> — sequences loaded into analyzer below
              </div>
            </div>
          )}

          {/* VCF Meta Banner */}
          {vcfMeta && (
            <div style={{ marginTop:'1rem', padding:'.85rem 1rem', background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.3)', borderRadius:8 }}>
              <div style={{ fontSize:'.85rem', fontWeight:600, color:'#A78BFA', marginBottom:'.5rem' }}>📍 Loaded from VCF</div>
              <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontFamily:'"JetBrains Mono",monospace', fontSize:'.9rem' }}>
                <span><span style={{ color:'#6b7080' }}>Variant: </span><span style={{ color:'#c8cad4' }}>{vcfMeta.id}</span></span>
                <span><span style={{ color:'#6b7080' }}>Position: </span><span style={{ color:'#67E8F9' }}>{vcfMeta.chrom}:{vcfMeta.pos}</span></span>
                <span><span style={{ color:'#6b7080' }}>REF: </span><span style={{ color:'#60A5FA', fontWeight:600 }}>{vcfMeta.ref}</span></span>
                <span><span style={{ color:'#6b7080' }}>ALT: </span><span style={{ color:'#FBBF24', fontWeight:600 }}>{vcfMeta.alt}</span></span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── MANUAL ENTRY PANEL ────────────────────────────────────────────── */
        <div>
          <h3 style={{ fontSize:'1.1rem', fontWeight:600, color:'#c8cad4', marginBottom:'1.1rem' }}>Sequence Input</h3>
          <div className="seq-input-grid" style={{ marginBottom:'1rem' }}>
            <div>
              <label className="lbl">Reference Sequence</label>
              <textarea rows={5} value={seq1} onChange={e=>setSeq1(e.target.value)} placeholder="Paste reference DNA sequence (ATGC)…" />
              <div style={{ marginTop:'.38rem', fontSize:'.88rem', fontFamily:'"JetBrains Mono",monospace', display:'flex', justifyContent:'space-between' }}>
                {(() => { const len = seq1.trim().length; const over = len > MAX_SEQ_LENGTH; return (<><span style={{ color: over ? '#EF4444' : '#6b7080' }}>{len.toLocaleString()} bp{over && ' ⚠ exceeds limit'}</span>{seq1.trim() && !over && <span style={{ color:'#10B981' }}>✓</span>}</>); })()}
              </div>
            </div>
            <div>
              <label className="lbl">Alternate Sequence</label>
              <textarea rows={5} value={seq2} onChange={e=>setSeq2(e.target.value)} placeholder="Paste alternate DNA sequence (ATGC)…" />
              <div style={{ marginTop:'.38rem', fontSize:'.88rem', fontFamily:'"JetBrains Mono",monospace', display:'flex', justifyContent:'space-between' }}>
                {(() => { const len = seq2.trim().length; const over = len > MAX_SEQ_LENGTH; return (<><span style={{ color: over ? '#EF4444' : '#6b7080' }}>{len.toLocaleString()} bp{over && ' ⚠ exceeds limit'}</span>{seq2.trim() && !over && <span style={{ color:'#10B981' }}>✓</span>}</>); })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error" style={{ marginBottom:'1rem' }}>⚠️ {error}</div>}

      {!seq1.trim() || !seq2.trim() ? (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'.85rem 1rem', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}><span>⚠️</span><span style={{ color:'#EF4444', fontSize:'.95rem', fontWeight:600 }}>Both sequences are required before analysis</span></div>
        </div>
      ) : null}

      <button className="btn-p" onClick={handleAnalyze} disabled={loading || !seq1.trim() || !seq2.trim()} style={{ opacity: (!seq1.trim() || !seq2.trim()) ? 0.5 : 1, cursor: (!seq1.trim() || !seq2.trim()) ? 'not-allowed' : 'pointer' }}>
        {loading ? <><span className="spin"></span><span>Analyzing Mutations…</span></> : <><span>🔬</span><span>Analyze Mutations</span>{vcfMeta && <span style={{ fontSize:'.82rem', opacity:.8, marginLeft:'.25rem' }}>• VCF Mode</span>}</>}
      </button>
    </div>

    {/* RESULTS */}
    {mutations && (<>
      {mutations.warnings?.length > 0 && (
        <div className="warning"><strong>⚠️ Validation Warnings:</strong><ul style={{ marginTop:'0.5rem', paddingLeft:'1.5rem' }}>{mutations.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.8rem', marginBottom:'.8rem' }}>
        <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
          {loadingAI ? <><span className="spin"></span>Generating AI Analysis…</> : <><span>🤖</span>Get AI Explanation</>}
        </button>
        <button className="btn-pdf" onClick={handleExportPDF}>
          <span>📄</span> Download PDF Report
        </button>
      </div>

      {aiExplanation && (
        <div className="ai-box">
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.65rem' }}><span>🤖</span><span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>AI Analysis</span></div>
          <div style={{ fontSize:'1.02rem', color:'#e2e4e9', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:440, overflowY:'auto', background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.85rem', border:'1px solid #24272f' }}>{aiExplanation}</div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="pc">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.65rem', flexWrap:'wrap', gap:'.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem' }}>
            <span>{activeGene.icon}</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>{activeGene.symbol} — Summary Statistics</span>
          </div>
          {vcfMeta && <span className="vcf-badge">From VCF · {vcfMeta.chrom}:{vcfMeta.pos}</span>}
        </div>
        <div className="summary-grid">
          {[{l:'Total',v:mutations.summary.total_mutations,c:'#fff'},{l:'SNPs',v:mutations.summary.snps,c:'#60A5FA'},{l:'Missense',v:mutations.summary.missense_mutations,c:'#FBBF24'},{l:'Nonsense',v:mutations.summary.nonsense_mutations,c:'#EF4444'},{l:'Silent',v:mutations.summary.silent_mutations,c:'#10B981'},{l:'Insertions',v:mutations.summary.insertions,c:'#F59E0B'},{l:'Deletions',v:mutations.summary.deletions,c:'#EF4444'},{l:'Frameshift',v:mutations.summary.frameshift_mutations,c:'#DC2626'}].map((s,i)=>(
            <div key={i} className="stat-b"><div className="stat-v" style={{ color:s.c }}>{s.v}</div><div className="stat-l">{s.l}</div></div>
          ))}
        </div>
      </div>

      {/* MUTATION OVERVIEW TABLE */}
      {annotatedMutations.length > 0 && (
        <div className="pc">
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
            <span>🧬</span><span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Mutation Overview Table</span>
            <span style={{ background:'rgba(16,185,129,.18)', color:'#10B981', fontSize:'.8rem', fontWeight:600, padding:'.18rem .48rem', borderRadius:8 }}>{annotatedMutations.length} annotated</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead><tr><th>Nucleotide</th><th>Codon</th><th>AA Pos</th><th>Lit Pos</th><th>HGVS</th><th>Type</th><th>Effect</th><th>Domain</th><th>Confidence</th></tr></thead>
              <tbody>
                {annotatedMutations.map((am,i)=>(
                  <tr key={i}>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.nucleotidePosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.codonNumber}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.aaPosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#10B981', fontWeight:600 }}>{am.positions.literaturePosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.82rem', color:'#60A5FA' }}>{am.hgvs}</td>
                    <td style={{ color:'#c8cad4' }}>{am.mutation.type}</td>
                    <td><span className={`badge badge-${am.mutation.mutation_class?.toLowerCase()}`}>{am.mutation.mutation_class}</span></td>
                    <td style={{ fontSize:'.85rem', color:'#8a8f9e' }}>{am.domainMapping.proteinDomain}</td>
                    <td style={{ color:'#10B981', fontWeight:600 }}>{am.interpretation.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED MUTATION REPORT */}
      {annotatedMutations.length > 0 && (
        <div className="pc">
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.8rem' }}><span>📋</span><span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Detailed Mutation Interpretation</span></div>
          {annotatedMutations.map((am,idx)=>(
            <div key={idx} className="mut-card" style={{ borderLeft:`4px solid ${am.mutation.is_frameshift?'#DC2626':am.mutation.mutation_class==='Missense'?'#FBBF24':am.mutation.mutation_class==='Nonsense'?'#EF4444':'#10B981'}` }}>
              <div style={{ marginBottom:'0.75rem' }}>
                <h3 style={{ fontSize:'1.1rem', fontWeight:600, color:'#c8cad4', marginBottom:'0.25rem' }}>Mutation {idx+1}: {am.mutation.type}</h3>
                <div style={{ fontSize:'0.9rem', fontFamily:'"JetBrains Mono",monospace', color:'#10B981', fontWeight:600 }}>{am.hgvs}</div>
              </div>
              {am.mutation.reference_amino_acid && am.mutation.alternate_amino_acid && (
                <div style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.2)', padding:'0.75rem', borderRadius:'6px', marginBottom:'0.75rem' }}>
                  <div style={{ fontSize:'0.85rem', color:'#67E8F9', marginBottom:'0.5rem', fontWeight:600 }}>Amino Acid Change</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'1rem', color:'#60A5FA', fontWeight:600 }}>{am.mutation.reference_codon} ({am.mutation.reference_amino_acid})</span>
                    <span style={{ color:'#6b7080', fontSize:'1.2rem' }}>→</span>
                    <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'1rem', color:'#FBBF24', fontWeight:600 }}>{am.mutation.alternate_codon} ({am.mutation.alternate_amino_acid})</span>
                  </div>
                  <div style={{ fontSize:'0.85rem', color:'#8a8f9e', marginTop:'0.5rem' }}>{AA_PROPERTIES[am.mutation.reference_amino_acid]?.name} → {AA_PROPERTIES[am.mutation.alternate_amino_acid]?.name}</div>
                </div>
              )}
              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', padding:'0.75rem', borderRadius:'6px', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.85rem', color:'#10B981', fontWeight:600, marginBottom:'0.5rem' }}>🔬 Protein Domain Annotation</div>
                <div style={{ fontSize:'0.9rem', color:'#8a8f9e', lineHeight:1.6 }}>
                  <div><strong style={{ color:'#c8cad4' }}>Domain:</strong> {am.domainMapping.proteinDomain}</div>
                  {!am.domainMapping.isInterDomain && (<><div><strong style={{ color:'#c8cad4' }}>Functional Region:</strong> {am.domainMapping.functionalRegion}</div><div><strong style={{ color:'#c8cad4' }}>Region:</strong> AA {am.domainMapping.start}–{am.domainMapping.end}</div></>)}
                  <div style={{ marginTop:'0.5rem', fontStyle:'italic', color:'#67E8F9' }}>{am.domainMapping.interpretation}</div>
                </div>
              </div>
              <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', padding:'0.75rem', borderRadius:'6px' }}>
                <div style={{ fontSize:'0.85rem', color:'#FBBF24', fontWeight:600, marginBottom:'0.5rem' }}>📊 Biological Interpretation</div>
                <div style={{ fontSize:'0.9rem', color:'#8a8f9e', lineHeight:1.6 }}>{am.interpretation.scientificNote}</div>
                <div style={{ fontSize:'0.85rem', color:'#6b7080', marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid rgba(100,116,139,0.2)' }}>
                  <strong style={{ color:'#c8cad4' }}>Confidence:</strong> {am.interpretation.confidence} — {am.interpretation.confidenceReason}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DIFF REPORT */}
      {diffInfo && (
        <div className="pc" style={{ borderColor: diffInfo.identical ? 'rgba(251,191,36,.35)' : 'rgba(6,182,212,.3)', background: diffInfo.identical ? 'rgba(251,191,36,.05)' : 'rgba(6,182,212,.04)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.75rem' }}>
            <span>{diffInfo.identical ? '🔍' : '📍'}</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color: diffInfo.identical ? '#FBBF24' : '#67E8F9' }}>Normalization Report</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem', marginBottom:'.75rem' }}>
            {[{label:'Ref length (normalized)', value: diffInfo.refLen?.toLocaleString() + ' bp'},{label:'Alt length (normalized)', value: diffInfo.altLen?.toLocaleString() + ' bp'}].map((s,i)=>(
              <div key={i} style={{ background:'#0f1117', border:'1px solid #1e2130', borderRadius:8, padding:'.65rem .8rem' }}>
                <div style={{ fontSize:'.8rem', color:'#6b7080', textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</div>
                <div style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4', marginTop:'.2rem', fontFamily:'"JetBrains Mono",monospace' }}>{s.value}</div>
              </div>
            ))}
          </div>
          {!diffInfo.identical && (
            <div style={{ background:'rgba(6,182,212,.08)', border:'1px solid rgba(6,182,212,.25)', borderRadius:8, padding:'.85rem 1rem' }}>
              <div style={{ fontWeight:600, color:'#67E8F9', marginBottom:'.5rem' }}>📍 First mismatch detected</div>
              <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem' }}>
                <span><span style={{ color:'#6b7080' }}>Position: </span><span style={{ color:'#fff', fontWeight:600 }}>{diffInfo.position?.toLocaleString()}</span></span>
                <span><span style={{ color:'#6b7080' }}>Ref: </span><span style={{ color:'#60A5FA', fontWeight:700 }}>{diffInfo.refBase}</span></span>
                <span><span style={{ color:'#6b7080' }}>Alt: </span><span style={{ color:'#FBBF24', fontWeight:700 }}>{diffInfo.altBase}</span></span>
                {diffInfo.refLen !== diffInfo.altLen && <span><span style={{ color:'#6b7080' }}>Length Δ: </span><span style={{ color:'#F59E0B', fontWeight:600 }}>{diffInfo.altLen - diffInfo.refLen > 0 ? '+' : ''}{diffInfo.altLen - diffInfo.refLen} bp</span></span>}
              </div>
            </div>
          )}
        </div>
      )}

      {mutations.mutations?.length === 0 && (
        <div className="pc" style={{ textAlign:'center', padding:'2.2rem 1.65rem', borderColor:'rgba(16,185,129,.3)', background:'rgba(16,185,129,.06)' }}>
          <div style={{ fontSize:'1.85rem', marginBottom:'.4rem' }}>✅</div>
          <div style={{ fontSize:'1.05rem', color:'#10B981', fontWeight:700 }}>No mutations detected — sequences are identical after normalization</div>
        </div>
      )}
    </>)}
  </div>
  </div>
  );
}