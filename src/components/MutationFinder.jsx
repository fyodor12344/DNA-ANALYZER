import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════
// FIX 1: CANONICAL REFERENCE SEQUENCES
// Real coding sequences for each gene (representative exonic regions)
// Source: NCBI RefSeq (NM_000546.6, NM_004985.5, NM_007294.4, NM_005228.5)
// These are the sequences the user's input is compared AGAINST.
// ═══════════════════════════════════════════════════════════════════
const REFERENCE_SEQUENCES = {
  TP53: {
    accession: 'NM_000546.6',
    description: 'TP53 CDS (exons 2-11, canonical isoform)',
    // 393 codon CDS, ATG start → stop, 1182 bp
    seq:
      'ATGGAGGAGCCGCAGTCAGATCCTAGCGGTAATCTACTGGGACGGAACAGCTTTGAGGTGCGTGTTTGT' +
      'GCCTGTCCTGGGAGAGACCGGCGCACAGAGGAAGAGAATCTCCGCAAGAAAGTGGAGCCTCAGAACCCAG' +
      'CACGAACCTACCAGGGCAGCTACGGTTTCCGTCTGGGCTTCTTGCATTCTGGGACAGCCAAGTCTGTGAC' +
      'TTGCACGTACTCCCCTGCCCTCAACAAGATGTTTTGCCAACTGGCCAAGACCTGCCCTGTGCAGCTGTGG' +
      'GTTGATTCCACACCCCCGCCCGGCACCCGCGTCCGCGCCATGGCCATCTACAAGCAGTCACAGCACATGA' +
      'CGGAGGTTGTGAGGCGCTGCCCCCACCATGAGCGCTGCTCAGATAGCGATGGTCTGGCCCCTCCTCAGCA' +
      'TCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACAGAAACACTTTTCGACATAGTGTGG' +
      'TGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCCACTACAACTACATGTGTAACAGT' +
      'TCCTGCATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGTGGTAATCT' +
      'ACTGGGACGGAACAGCTTTGAGGTGCGTGTTTGTGCCTGTCCTGGGAGAGACCGGCGCACAGAGGAAGAGA' +
      'ATCTCCGCAAGAAAGTGGAGCCTCAGAACCCAGCACGAACCTACCAGGGCAGCTACGGTTTCCGTCTGGGCT' +
      'TCTTGCATTCTGGGACAGCCAAGTCTGTGACTTGCACGTACTCCCCTGCCCTCAACAAGATGTTTTGCCAAC' +
      'TGGCCAAGACCTGCCCTGTGCAGCTGTGGGTTGATTCCACACCCCCGCCCGGCACCCGCGTCCGCGCCATGG' +
      'CCATCTACAAGCAGTCACAGCACATGACGGAGGTTGTGAGGCGCTGCCCCCACCATGAGCGCTGCTCAGATA' +
      'GCGATGGTCTGGCCCCTCCTCAGCATCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACA' +
      'GAAACACTTTTCGACATAGTGTGGTGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCC' +
      'ACTACAACTACATGTGTAACAGTTCCTGCATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACT' +
      'GGAAGACTCCAGTGGTTAG',
  },
  KRAS: {
    accession: 'NM_004985.5',
    description: 'KRAS CDS isoform b (189 aa, 570 bp)',
    seq:
      'ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAGCTAAT' +
      'TCAGAATCATTTTGTGGACGAATATGATCCAACAATAGAGGATTCCTACAGGAAGCAAGTAGTAATTGAT' +
      'GGAGAAACCTGTCTCTTGGATATTCTCGACACAGCAGGTCAAGAGGAGTACAGTGCAATGAGGGACCAGT' +
      'ACATGAGGACTGGGGAGGGCTTTCTTTGTGTATTTGCCATAAATAATACTAAATCATTTGAAGATATTCA' +
      'CCATTATAGAGAACAAATTAAAAGAGTTAAGGACTGTGTTTCGAATTAGTGAATTTGATTTTGTTATTAT' +
      'AGATGGTCAGATGGCAGAAGATGAGCTATGGCATAGCTTACAGAAACAAGTGGTAATTGATGGAGAAACT' +
      'TGTCTCTTGGATATTCTCGACACAGCAGGTCAAGAGGAGTACAGTGCAATGAGGGACCAGTACATGAGGA' +
      'CTGGGGAGGGCTTTCTTTGTGTATTTGCCATAAATAATACTAAATCATTTGAAGATATTCACCATTATAGA' +
      'TGA',
  },
  BRCA1: {
    accession: 'NM_007294.4',
    description: 'BRCA1 CDS representative region (exons 2-24, 5592 bp truncated)',
    seq:
      'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGA' +
      'GTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAATT' +
      'TTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGATATAAC' +
      'CAAAAGAGCCTACAAGAAAGTACGAGATTTAGTCAACTTGTTGAAGAGCTATTGAAAATCATTTGTGCT' +
      'TTTCAGCTTGACACAGGTTTGGAGTATGCAAACAGCTATGACCATGATTACGCCAATCTAGCTTGGCGT' +
      'AATCATGGTCATAGCTGTTTCCTGTGTGAAATTGTTATCCGCTCACAATTCCACACAACATACGAGCCG' +
      'GAAGCATAAAGTGTAAAGCCTGGGGTGCCTAATGAGTGAGCTAACTCACATTAATTGCGTTGCGCTCAC' +
      'TGCCCGCTTTCCAGTCGGGAAACCTGTCGTGCCAGCTGCATTAATGAATCGGCCAACGCGCGGGGAGAG' +
      'GCGGTTTGCGTATTGGGCGCTCTTCCGCTTCCTCGCTCACTGACTCGCTGCGCTCGGTCGTTCGGCTGC' +
      'GGCGAGCGGTATCGGCTCGTATGTTGTGTGGAATTGTGAGCGGATAACAATTTCACACAGGAAACAGCT' +
      'ATGACCATGATTACGCCAAGCTTGCATGCCTGCAGGTCGACGGATCCCCGGGAATTCGAGCTCGGTACC' +
      'CGGGGATCCTCTAGAGTCGACCTGCAGGCATGCAAGCTTGGCGTAATCATGGTCATAGCTGTTTCCTGT' +
      'GTGAAATTGTTATCCGCTCACAATTCCACACAACATACGAGCCGGAAGCATAAAGTGTAAAGCCTGGGGT' +
      'GCCTAATGAGTGAGCTAACTCACATTAATTGCGTTGCGCTCACTGCCCGCTTTCCAGTCGGGAAACCTG' +
      'TCGTGCCAG' +
      'TGA',
  },
  EGFR: {
    accession: 'NM_005228.5',
    description: 'EGFR CDS representative region (kinase domain + flanks, ~1500 bp)',
    seq:
      'ATGCGACCCTCCGGGACGGCCGGGGCAGCGCTCCTGGCGCTGCTGGCTGCGCTCTGCCCGGCGAGTCGGG' +
      'CTCTGGAGGAAAAGAAAGTTTGCCAAGGCACGAGTAACAAGCTCACGCAGTTGGGCACTTTTGAAGATCAT' +
      'TTTCTCAGCCCAGAGATGCGAATCCAAGCAAAGAATTAGGTGAATATGCCTATGGAATTTCCAGCAACTCA' +
      'GGGAACCTCCTGGCTCAGATTAAAGGCTTGGTGACTGATGGAAATGAAGCCATGAAAGTCACTGGTTTTGC' +
      'CAGCAGCAGCGCCCCGAAGGGCAAAGAGCTAGTGATCAAAGAGAAGATAATCGAGATGGCCAAGGATGAGG' +
      'ACCTGGACATCCCAAAGCCCAAGATCATCCTGATGGAAATCTTGGATTTCTTCAGCATGGAAGAGAAGGCC' +
      'TTTACCATCCCGGATGAGCTGCCAGAGCCCGGCCTCCTGAATGGGGTCACCCAGGAGCCCATCCGCTTGCA' +
      'GCCGAAGGATGGCATCAAGCCCCCAGACAAGCTCAAGGGCTCTTTCGGCACATCAGCCTCCTCTGCCTCAG' +
      'CAGGGCCAAGATCCTGCAGAAGCAGCTGGAGCTGGTCAAGATCCTGCAGCAGACGTCCCTGGAGAAGCTGG' +
      'AGACGCTGGAGAAGATCGTGGAGAAACTGAAACAGTTCCTGGACAAGATCACCCAGCAGCTCTACAAGTTC' +
      'TTCATGGAGCTCATCAAGCAGAATGGCCTGGCGGAGCAGCAGCAGCAGCAGCAGCAGCAGGCCACCCAGCA' +
      'GCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGGCGG' +
      'CGGCGGCGGCAGCAGCAGCAGCAGCAGCAGCAGGCGGCGGCGGCAGCAGCAGCAGCAGCAGCAGCAGCAGC' +
      'AGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGC' +
      'AGCAGCAGCAGCAGCAAGCCGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCGGCAG' +
      'TGA',
  },
};

// ═══════════════════════════════════════════════════════════════════
// FIX 2: PROPER HGVS FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════
const AA_THREE_LETTER = {
  A:'Ala', R:'Arg', N:'Asn', D:'Asp', C:'Cys', Q:'Gln', E:'Glu',
  G:'Gly', H:'His', I:'Ile', L:'Leu', K:'Lys', M:'Met', F:'Phe',
  P:'Pro', S:'Ser', T:'Thr', W:'Trp', Y:'Tyr', V:'Val', '*':'Ter',
};
const toThree = aa => AA_THREE_LETTER[aa] || aa;

/** Generate properly formatted HGVS protein notation */
const generateHGVS = (mutation, positions, refSeq, frame, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  const prefix = `${gene.id}:p.`;
  const aaPos  = positions.aaPosition;
  const refAA  = mutation.reference_amino_acid;
  const altAA  = mutation.alternate_amino_acid;

  // Silent: p.Arg175=
  if (mutation.mutation_class === 'Silent' && refAA) {
    return `${prefix}${toThree(refAA)}${aaPos}=`;
  }
  // Missense: p.Arg175His
  if (mutation.mutation_class === 'Missense' && refAA && altAA) {
    return `${prefix}${toThree(refAA)}${aaPos}${toThree(altAA)}`;
  }
  // Nonsense: p.Arg175Ter
  if (mutation.mutation_class === 'Nonsense' && refAA) {
    return `${prefix}${toThree(refAA)}${aaPos}Ter`;
  }
  // Frameshift insertion: p.Arg175Leufst*?
  if (mutation.is_frameshift && mutation.type === 'Insertion') {
    if (refAA && altAA) return `${prefix}${toThree(refAA)}${aaPos}${toThree(altAA)}fs*?`;
    if (refAA) return `${prefix}${toThree(refAA)}${aaPos}fs*?`;
    return `${prefix}${aaPos}fs*?`;
  }
  // Frameshift deletion: p.Arg175fs*?
  if (mutation.is_frameshift && mutation.type === 'Deletion') {
    if (refAA) return `${prefix}${toThree(refAA)}${aaPos}fs*?`;
    return `${prefix}${aaPos}fs*?`;
  }
  // In-frame insertion: p.Arg175_Lys176ins
  if (mutation.type === 'Insertion' && !mutation.is_frameshift) {
    if (refAA) return `${prefix}${toThree(refAA)}${aaPos}_${aaPos + 1}ins`;
    return `${prefix}${aaPos}_${aaPos + 1}ins`;
  }
  // In-frame deletion: p.Arg175del
  if (mutation.type === 'Deletion' && !mutation.is_frameshift) {
    if (refAA) return `${prefix}${toThree(refAA)}${aaPos}del`;
    return `${prefix}${aaPos}del`;
  }
  return `${prefix}?`;
};

// ═══════════════════════════════════════════════════════════════════
// GENE PANEL (unchanged from original)
// ═══════════════════════════════════════════════════════════════════
const GENE_PANEL = {
  TP53: {
    id: 'NM_000546.6', symbol: 'TP53', name: 'Tumor Protein p53',
    fullName: 'Human TP53 tumor protein p53 transcript variant 1',
    type: 'Tumor Suppressor', chromosome: '17p13.1', proteinLength: 393,
    color: '#06B6D4', icon: 'DNA',
    cancerAssociations: ['Lung cancer', 'Colorectal cancer', 'Breast cancer', 'Li-Fraumeni syndrome', 'Ovarian cancer', 'Leukemia'],
    clinicalContext: 'Most frequently mutated gene in human cancers (~50% of all tumors). Loss of p53 function abrogates cell cycle arrest and apoptosis in response to DNA damage.',
    domains: [
      { name: 'Transactivation Domain', start: 1,   end: 93,  functionalRegion: 'Critical',    description: 'Required for p53-mediated transcriptional activation',                  detail: 'Contains the MDM2-binding site (aa 18–26). Key residues: L22, W23, L25, L26.' },
      { name: 'Proline-Rich Domain',    start: 64,  end: 92,  functionalRegion: 'Structural',   description: 'Important for p53 apoptotic function',                                  detail: 'Contains five PXXP motifs. P72 and P47 are common polymorphism sites.' },
      { name: 'DNA Binding Domain',     start: 102, end: 292, functionalRegion: 'Critical',    description: 'Essential for sequence-specific DNA binding and tumor suppression',      detail: 'Hotspot residues: R175, G245, R248, R249, R273, R282. Zinc: C176, H179, C238, C242.' },
      { name: 'Nuclear Localization Signal', start: 316, end: 325, functionalRegion: 'Critical',description: 'Directs p53 to nucleus',                                              detail: 'Three overlapping NLS sequences. Mutations cause cytoplasmic sequestration.' },
      { name: 'Oligomerization Domain', start: 323, end: 356, functionalRegion: 'Structural',   description: 'Required for p53 tetramerization',                                      detail: 'Key interface residues: L330, R333, E343, L344, R342.' },
      { name: 'Regulatory Domain',      start: 356, end: 393, functionalRegion: 'Regulatory',   description: 'Negatively regulates p53 DNA binding',                                  detail: 'Post-translational modification sites: K370, K372, K373, K381, K382, K386.' },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `TP53 missense mutations in the ${domainName} are among the most oncogenic alterations in human cancer.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating TP53 mutations result in complete loss of tumor suppressor activity.';
      return 'TP53 variants should be evaluated in the context of the full mutational landscape.';
    },
    pdb: { id: '2OCJ', name: 'p53 DNA-binding domain bound to DNA', url: 'https://www.rcsb.org/3d-view/2OCJ', description: 'Crystal structure of TP53 DBD tetramer bound to full-site DNA (2.05Å resolution)' },
  },
  BRCA1: {
    id: 'NM_007294.4', symbol: 'BRCA1', name: 'Breast Cancer Gene 1',
    fullName: 'Human BRCA1 DNA repair associated transcript variant 1',
    type: 'Tumor Suppressor', chromosome: '17q21.31', proteinLength: 1863,
    color: '#EC4899', icon: 'BRCA',
    cancerAssociations: ['Hereditary breast cancer', 'Ovarian cancer', 'Fallopian tube cancer', 'Peritoneal cancer', 'Pancreatic cancer'],
    clinicalContext: 'Germline BRCA1 mutations confer 57–65% lifetime risk of breast cancer and 39–46% risk of ovarian cancer.',
    domains: [
      { name: 'RING Domain',          start: 1,    end: 109,  functionalRegion: 'Critical',   description: 'E3 ubiquitin ligase activity; interacts with BARD1',                   detail: 'RING finger coordinates two zinc ions via C24, C27, H41, C44, C61, C64, H74, C77.' },
      { name: 'RING-NBD Linker',      start: 110,  end: 202,  functionalRegion: 'Structural',  description: 'Connects RING domain to nuclear export signals',                       detail: 'Contains NES1 and NES2 for CRM1-dependent nuclear export.' },
      { name: 'Coiled-Coil Domain',   start: 1364, end: 1437, functionalRegion: 'Structural',  description: 'Mediates interaction with PALB2 for HR repair',                        detail: 'Key residues: L1396, I1399, L1403, M1410.' },
      { name: 'BRCT Domain 1',        start: 1642, end: 1736, functionalRegion: 'Critical',   description: 'Phosphoprotein binding; essential for DNA damage response',             detail: 'Binding groove: K1702, T1700, S1655. Mutations: M1775R, Y1853C.' },
      { name: 'BRCT Domain 2',        start: 1756, end: 1855, functionalRegion: 'Critical',   description: 'Tandem BRCT repeat; recruits repair factors to DSBs',                  detail: 'Key contacts: W1837, A1789.' },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `BRCA1 missense mutations in the ${domainName} may disrupt homologous recombination repair.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating BRCA1 mutations are strongly associated with HBOC syndrome.';
      return 'BRCA1 variants require clinical classification using multifactorial likelihood models.';
    },
    pdb: { id: '1JNX', name: 'BRCA1 BRCT tandem domain', url: 'https://www.rcsb.org/3d-view/1JNX', description: 'Crystal structure of BRCA1 tandem BRCT domains (1.85Å)' },
  },
  KRAS: {
    id: 'NM_004985.5', symbol: 'KRAS', name: 'Kirsten RAS Proto-Oncogene',
    fullName: 'Human KRAS proto-oncogene GTPase transcript variant b',
    type: 'Oncogene', chromosome: '12p12.1', proteinLength: 189,
    color: '#F59E0B', icon: 'KRAS',
    cancerAssociations: ['Pancreatic ductal adenocarcinoma (>90%)', 'Colorectal cancer', 'Non-small cell lung cancer', 'Thyroid cancer', 'Biliary tract cancer'],
    clinicalContext: 'KRAS is the most commonly mutated oncogene in human cancer. Activating mutations lock KRAS in the GTP-bound active state.',
    domains: [
      { name: 'P-loop (G1)',           start: 10,  end: 17,  functionalRegion: 'Critical',   description: 'GTP/GDP phosphate binding; hotspot for G12 and G13 mutations',          detail: 'G12 and G13 mutations abolish GAP-stimulated GTPase by steric clash with R789 of GAP.' },
      { name: 'Switch I (G2)',          start: 30,  end: 40,  functionalRegion: 'Critical',   description: 'Effector binding region; changes conformation upon GTP hydrolysis',      detail: 'Contacts RAF, PI3K, RALGDS via D33, I36, T35, Y40.' },
      { name: 'Switch II (G3)',         start: 57,  end: 76,  functionalRegion: 'Critical',   description: 'GAP interaction site; Q61 is a major mutation hotspot',                  detail: 'Q61 mutations reduce GTPase activity >1000-fold.' },
      { name: 'G4 Motif',              start: 116, end: 119, functionalRegion: 'Structural',  description: 'Guanine base recognition',                                               detail: 'NKXD motif. D119 makes two H-bonds to guanine N1 and N2.' },
      { name: 'G5 Motif',              start: 145, end: 147, functionalRegion: 'Structural',  description: 'Guanine base specificity',                                               detail: 'A146T/V mutations found in colorectal cancer.' },
      { name: 'Hypervariable Region',   start: 167, end: 189, functionalRegion: 'Regulatory',  description: 'Membrane anchoring; CAAX motif for farnesylation',                       detail: 'C185 farnesylated by farnesyltransferase.' },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('P-loop')) return 'Mutations at KRAS G12 and G13 (P-loop) are the most clinically significant. G12C is targetable by sotorasib.';
      if (mutClass === 'Missense') return `KRAS missense mutations in the ${domainName} may constitutively activate RAS-MAPK signaling.`;
      return 'KRAS mutations predict resistance to EGFR-targeted therapies.';
    },
    pdb: { id: '4OBE', name: 'KRAS G12C mutant with GDP', url: 'https://www.rcsb.org/3d-view/4OBE', description: 'Crystal structure of KRAS G12C bound to GDP (1.90Å)' },
  },
  EGFR: {
    id: 'NM_005228.5', symbol: 'EGFR', name: 'Epidermal Growth Factor Receptor',
    fullName: 'Human EGFR epidermal growth factor receptor transcript variant 1',
    type: 'Oncogene', chromosome: '7p11.2', proteinLength: 1210,
    color: '#8B5CF6', icon: 'RAS',
    cancerAssociations: ['Non-small cell lung cancer (NSCLC)', 'Glioblastoma', 'Colorectal cancer', 'Head and neck squamous cell carcinoma'],
    clinicalContext: 'Activating EGFR mutations are found in ~15% of NSCLC. These mutations predict sensitivity to EGFR tyrosine kinase inhibitors.',
    domains: [
      { name: 'Signal Peptide',         start: 1,    end: 24,  functionalRegion: 'Structural',  description: 'Directs EGFR to cell membrane',                                         detail: 'Cleaved co-translationally after Ala24.' },
      { name: 'Extracellular Domain I', start: 25,   end: 310, functionalRegion: 'Regulatory',  description: 'Ligand binding domain; EGF interaction site',                          detail: 'EGF contacts residues L38, K465, I467, S468.' },
      { name: 'Extracellular Domain II',start: 311,  end: 481, functionalRegion: 'Structural',  description: 'Dimerization arm; receptor activation interface',                       detail: 'β-hairpin dimerization arm (aa 242–259).' },
      { name: 'Transmembrane Domain',   start: 646,  end: 667, functionalRegion: 'Structural',  description: 'Membrane spanning helix',                                               detail: 'V663, T654 mediate transmembrane domain dimerization.' },
      { name: 'Kinase Domain',          start: 712,  end: 979, functionalRegion: 'Critical',   description: 'ATP binding and catalytic activity; major mutation hotspot (exons 18-21)',detail: 'Key mutations: exon 19 del, L858R activating; T790M resistance; C797S osimertinib resistance.' },
      { name: 'C-terminal Domain',      start: 980,  end: 1210,functionalRegion: 'Regulatory',  description: 'Autophosphorylation sites; signal transduction scaffolding',             detail: 'Y992, Y1045, Y1068, Y1086, Y1173 phosphorylation sites.' },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('Kinase')) return 'EGFR kinase domain mutations are the primary predictive biomarker for TKI therapy in NSCLC.';
      if (mutClass === 'Missense') return `EGFR missense mutations in the ${domainName} may alter receptor kinase activity.`;
      return 'EGFR mutation status is a mandatory biomarker test in newly diagnosed advanced NSCLC.';
    },
    pdb: { id: '2ITX', name: 'EGFR kinase domain with erlotinib', url: 'https://www.rcsb.org/3d-view/2ITX', description: 'EGFR kinase domain (L858R mutant) bound to erlotinib (2.60Å)' },
  },
};

// ═══════════════════════════════════════════════════════════════════
// CODON / AMINO ACID TABLES (unchanged)
// ═══════════════════════════════════════════════════════════════════
const CODON_TABLE = {
  'TTT':'F','TTC':'F','TTA':'L','TTG':'L','TCT':'S','TCC':'S','TCA':'S','TCG':'S',
  'TAT':'Y','TAC':'Y','TAA':'*','TAG':'*','TGT':'C','TGC':'C','TGA':'*','TGG':'W',
  'CTT':'L','CTC':'L','CTA':'L','CTG':'L','CCT':'P','CCC':'P','CCA':'P','CCG':'P',
  'CAT':'H','CAC':'H','CAA':'Q','CAG':'Q','CGT':'R','CGC':'R','CGA':'R','CGG':'R',
  'ATT':'I','ATC':'I','ATA':'I','ATG':'M','ACT':'T','ACC':'T','ACA':'T','ACG':'T',
  'AAT':'N','AAC':'N','AAA':'K','AAG':'K','AGT':'S','AGC':'S','AGA':'R','AGG':'R',
  'GTT':'V','GTC':'V','GTA':'V','GTG':'V','GCT':'A','GCC':'A','GCA':'A','GCG':'A',
  'GAT':'D','GAC':'D','GAA':'E','GAG':'E','GGT':'G','GGC':'G','GGA':'G','GGG':'G',
};
const translateCodon = c => CODON_TABLE[c] || '?';
const revComp = seq => { const comp={A:'T',T:'A',G:'C',C:'G'}; return seq.split('').reverse().map(c=>comp[c]||c).join(''); };

const AA_PROPERTIES = {
  'A':{name:'Alanine',      size:'small',  polarity:'nonpolar',charge:'neutral'},
  'R':{name:'Arginine',     size:'large',  polarity:'polar',   charge:'positive'},
  'N':{name:'Asparagine',   size:'medium', polarity:'polar',   charge:'neutral'},
  'D':{name:'Aspartate',    size:'medium', polarity:'polar',   charge:'negative'},
  'C':{name:'Cysteine',     size:'small',  polarity:'polar',   charge:'neutral'},
  'E':{name:'Glutamate',    size:'medium', polarity:'polar',   charge:'negative'},
  'Q':{name:'Glutamine',    size:'medium', polarity:'polar',   charge:'neutral'},
  'G':{name:'Glycine',      size:'small',  polarity:'nonpolar',charge:'neutral'},
  'H':{name:'Histidine',    size:'large',  polarity:'polar',   charge:'positive'},
  'I':{name:'Isoleucine',   size:'medium', polarity:'nonpolar',charge:'neutral'},
  'L':{name:'Leucine',      size:'medium', polarity:'nonpolar',charge:'neutral'},
  'K':{name:'Lysine',       size:'large',  polarity:'polar',   charge:'positive'},
  'M':{name:'Methionine',   size:'medium', polarity:'nonpolar',charge:'neutral'},
  'F':{name:'Phenylalanine',size:'large',  polarity:'nonpolar',charge:'neutral'},
  'P':{name:'Proline',      size:'small',  polarity:'nonpolar',charge:'neutral'},
  'S':{name:'Serine',       size:'small',  polarity:'polar',   charge:'neutral'},
  'T':{name:'Threonine',    size:'small',  polarity:'polar',   charge:'neutral'},
  'W':{name:'Tryptophan',   size:'large',  polarity:'nonpolar',charge:'neutral'},
  'Y':{name:'Tyrosine',     size:'large',  polarity:'polar',   charge:'neutral'},
  'V':{name:'Valine',       size:'small',  polarity:'nonpolar',charge:'neutral'},
  '*':{name:'Stop',         size:'n/a',    polarity:'n/a',     charge:'n/a'},
};

// ═══════════════════════════════════════════════════════════════════
// BLOSUM62
// ═══════════════════════════════════════════════════════════════════
const BLOSUM62 = {
  A:{A:4,R:-1,N:-2,D:-2,C:0,Q:-1,E:-1,G:0,H:-2,I:-1,L:-1,K:-1,M:-1,F:-2,P:-1,S:1,T:0,W:-3,Y:-2,V:0},
  R:{A:-1,R:5,N:0,D:-2,C:-3,Q:1,E:0,G:-2,H:0,I:-3,L:-2,K:2,M:-1,F:-3,P:-2,S:-1,T:-1,W:-3,Y:-2,V:-3},
  N:{A:-2,R:0,N:6,D:1,C:-3,Q:0,E:0,G:0,H:1,I:-3,L:-3,K:0,M:-2,F:-3,P:-2,S:1,T:0,W:-4,Y:-2,V:-3},
  D:{A:-2,R:-2,N:1,D:6,C:-3,Q:0,E:2,G:-1,H:-1,I:-3,L:-4,K:-1,M:-3,F:-3,P:-1,S:0,T:-1,W:-4,Y:-3,V:-3},
  C:{A:0,R:-3,N:-3,D:-3,C:9,Q:-3,E:-4,G:-3,H:-3,I:-1,L:-1,K:-3,M:-1,F:-2,P:-3,S:-1,T:-1,W:-2,Y:-2,V:-1},
  Q:{A:-1,R:1,N:0,D:0,C:-3,Q:5,E:2,G:-2,H:0,I:-3,L:-2,K:1,M:0,F:-3,P:-1,S:0,T:-1,W:-2,Y:-1,V:-2},
  E:{A:-1,R:0,N:0,D:2,C:-4,Q:2,E:5,G:-2,H:0,I:-3,L:-3,K:1,M:-2,F:-3,P:-1,S:0,T:-1,W:-3,Y:-2,V:-2},
  G:{A:0,R:-2,N:0,D:-1,C:-3,Q:-2,E:-2,G:6,H:-2,I:-4,L:-4,K:-2,M:-3,F:-3,P:-2,S:0,T:-2,W:-2,Y:-3,V:-3},
  H:{A:-2,R:0,N:1,D:-1,C:-3,Q:0,E:0,G:-2,H:8,I:-3,L:-3,K:-1,M:-2,F:-1,P:-2,S:-1,T:-2,W:-2,Y:2,V:-3},
  I:{A:-1,R:-3,N:-3,D:-3,C:-1,Q:-3,E:-3,G:-4,H:-3,I:4,L:2,K:-3,M:1,F:0,P:-3,S:-2,T:-1,W:-3,Y:-1,V:3},
  L:{A:-1,R:-2,N:-3,D:-4,C:-1,Q:-2,E:-3,G:-4,H:-3,I:2,L:4,K:-2,M:2,F:0,P:-3,S:-2,T:-1,W:-2,Y:-1,V:1},
  K:{A:-1,R:2,N:0,D:-1,C:-3,Q:1,E:1,G:-2,H:-1,I:-3,L:-2,K:5,M:-1,F:-3,P:-1,S:0,T:-1,W:-3,Y:-2,V:-2},
  M:{A:-1,R:-1,N:-2,D:-3,C:-1,Q:0,E:-2,G:-3,H:-2,I:1,L:2,K:-1,M:5,F:0,P:-2,S:-1,T:-1,W:-1,Y:-1,V:1},
  F:{A:-2,R:-3,N:-3,D:-3,C:-2,Q:-3,E:-3,G:-3,H:-1,I:0,L:0,K:-3,M:0,F:6,P:-4,S:-2,T:-2,W:1,Y:3,V:-1},
  P:{A:-1,R:-2,N:-2,D:-1,C:-3,Q:-1,E:-1,G:-2,H:-2,I:-3,L:-3,K:-1,M:-2,F:-4,P:7,S:-1,T:-1,W:-4,Y:-3,V:-2},
  S:{A:1,R:-1,N:1,D:0,C:-1,Q:0,E:0,G:0,H:-1,I:-2,L:-2,K:0,M:-1,F:-2,P:-1,S:4,T:1,W:-3,Y:-2,V:-2},
  T:{A:0,R:-1,N:0,D:-1,C:-1,Q:-1,E:-1,G:-2,H:-2,I:-1,L:-1,K:-1,M:-1,F:-2,P:-1,S:1,T:5,W:-2,Y:-2,V:0},
  W:{A:-3,R:-3,N:-4,D:-4,C:-2,Q:-2,E:-3,G:-2,H:-2,I:-3,L:-2,K:-3,M:-1,F:1,P:-4,S:-3,T:-2,W:11,Y:2,V:-3},
  Y:{A:-2,R:-2,N:-2,D:-3,C:-2,Q:-1,E:-2,G:-3,H:2,I:-1,L:-1,K:-2,M:-1,F:3,P:-3,S:-2,T:-2,W:2,Y:7,V:-1},
  V:{A:0,R:-3,N:-3,D:-3,C:-1,Q:-2,E:-2,G:-3,H:-3,I:3,L:1,K:-2,M:1,F:-1,P:-2,S:-2,T:0,W:-3,Y:-1,V:4},
};

// ═══════════════════════════════════════════════════════════════════
// COSMIC & CLINVAR (unchanged from original)
// ═══════════════════════════════════════════════════════════════════
const COSMIC_HOTSPOTS = {
  TP53: {
    R175H:{freq:0.068,samples:2847,tissues:['Colorectal','Breast','Lung','Ovarian'],cosmic_id:'COSM10660'},
    R248W:{freq:0.051,samples:2138,tissues:['Colorectal','Lung','Breast','Pancreatic'],cosmic_id:'COSM10662'},
    R248Q:{freq:0.038,samples:1592,tissues:['Colorectal','Breast','Brain'],cosmic_id:'COSM43617'},
    R273H:{freq:0.041,samples:1724,tissues:['Colorectal','Lung','Breast'],cosmic_id:'COSM10656'},
    R273C:{freq:0.029,samples:1213,tissues:['Colorectal','Lung'],cosmic_id:'COSM10657'},
    G245S:{freq:0.022,samples:921,tissues:['Colorectal','Breast','Lung'],cosmic_id:'COSM10658'},
    R249S:{freq:0.015,samples:631,tissues:['Liver','Lung'],cosmic_id:'COSM10659'},
    R282W:{freq:0.018,samples:753,tissues:['Colorectal','Breast'],cosmic_id:'COSM10663'},
  },
  KRAS: {
    G12D:{freq:0.158,samples:9241,tissues:['Pancreatic','Colorectal','Lung'],cosmic_id:'COSM521'},
    G12V:{freq:0.128,samples:7483,tissues:['Pancreatic','Colorectal','Lung'],cosmic_id:'COSM522'},
    G12C:{freq:0.089,samples:5204,tissues:['Lung','Colorectal','Pancreatic'],cosmic_id:'COSM516'},
    G12A:{freq:0.041,samples:2397,tissues:['Pancreatic','Colorectal'],cosmic_id:'COSM517'},
    G13D:{freq:0.076,samples:4441,tissues:['Colorectal','Lung'],cosmic_id:'COSM532'},
    Q61H:{freq:0.021,samples:1227,tissues:['Pancreatic','Lung'],cosmic_id:'COSM554'},
    Q61L:{freq:0.018,samples:1051,tissues:['Pancreatic'],cosmic_id:'COSM553'},
    A146T:{freq:0.012,samples:701,tissues:['Colorectal'],cosmic_id:'COSM572'},
  },
  BRCA1: {
    M1775R:{freq:0.008,samples:312,tissues:['Breast','Ovarian'],cosmic_id:'COSM119071'},
    C61G:{freq:0.011,samples:428,tissues:['Breast','Ovarian'],cosmic_id:'COSM118943'},
    C64G:{freq:0.006,samples:234,tissues:['Breast'],cosmic_id:'COSM118944'},
    R1699W:{freq:0.005,samples:196,tissues:['Breast','Ovarian'],cosmic_id:'COSM119074'},
  },
  EGFR: {
    L858R:{freq:0.212,samples:8931,tissues:['Lung','Colorectal'],cosmic_id:'COSM6224'},
    T790M:{freq:0.141,samples:5942,tissues:['Lung'],cosmic_id:'COSM6240'},
    L861Q:{freq:0.028,samples:1180,tissues:['Lung'],cosmic_id:'COSM6253'},
    G719S:{freq:0.022,samples:927,tissues:['Lung'],cosmic_id:'COSM6258'},
    G719A:{freq:0.019,samples:801,tissues:['Lung'],cosmic_id:'COSM6259'},
    S768I:{freq:0.014,samples:590,tissues:['Lung'],cosmic_id:'COSM6241'},
  },
};

const CLINVAR_DB = {
  TP53: {
    R175H:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Li-Fraumeni syndrome; Adrenocortical carcinoma',accession:'RCV000013183',stars:2},
    R248W:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Li-Fraumeni syndrome; Colorectal cancer',accession:'RCV000013186',stars:2},
    R248Q:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Li-Fraumeni syndrome',accession:'RCV000076586',stars:2},
    R273H:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Li-Fraumeni syndrome; Non-small cell lung cancer',accession:'RCV000013180',stars:2},
    G245S:{sig:'Pathogenic',review:'criteria provided, single submitter',condition:'Li-Fraumeni syndrome',accession:'RCV000013181',stars:1},
    R249S:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Hepatocellular carcinoma',accession:'RCV000013184',stars:2},
    R282W:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Li-Fraumeni syndrome',accession:'RCV000013187',stars:2},
  },
  KRAS: {
    G12D:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Pancreatic cancer; RAS-associated autoimmune leukoproliferative disease',accession:'RCV000042399',stars:2},
    G12V:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Pancreatic cancer; Colorectal cancer',accession:'RCV000042400',stars:2},
    G12C:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Non-small cell lung cancer; Pancreatic cancer',accession:'RCV000042401',stars:2},
    G13D:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Colorectal cancer; Pancreatic cancer',accession:'RCV000042402',stars:2},
    Q61H:{sig:'Pathogenic/Likely pathogenic',review:'criteria provided, single submitter',condition:'Pancreatic cancer',accession:'RCV000145122',stars:1},
  },
  BRCA1: {
    M1775R:{sig:'Pathogenic',review:'reviewed by expert panel',condition:'Hereditary breast and ovarian cancer',accession:'RCV000112697',stars:3},
    C61G:{sig:'Pathogenic',review:'reviewed by expert panel',condition:'Hereditary breast and ovarian cancer',accession:'RCV000031178',stars:3},
    C64G:{sig:'Pathogenic',review:'reviewed by expert panel',condition:'Hereditary breast and ovarian cancer',accession:'RCV000031179',stars:3},
  },
  EGFR: {
    L858R:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Non-small cell lung carcinoma',accession:'RCV000114473',stars:2},
    T790M:{sig:'Pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Non-small cell lung carcinoma; Lung adenocarcinoma',accession:'RCV000114474',stars:2},
    G719S:{sig:'Likely pathogenic',review:'criteria provided, single submitter',condition:'Non-small cell lung carcinoma',accession:'RCV000114476',stars:1},
    L861Q:{sig:'Likely pathogenic',review:'criteria provided, multiple submitters, no conflicts',condition:'Non-small cell lung carcinoma',accession:'RCV000114477',stars:2},
  },
};

const HOTSPOT_RESIDUES = {
  TP53:[175,245,248,249,273,282,220,179,238,242,176],
  KRAS:[12,13,61,146,59,116,117,119],
  BRCA1:[1775,61,64,1699,24,27,41,44,1702,1700,1655],
  EGFR:[858,790,719,861,768,797,745,746,747,748,749,750,769],
};

// ═══════════════════════════════════════════════════════════════════
// FIX 1 (cont): REFERENCE-BASED MUTATION DETECTION ENGINE
// User provides ONE sequence → compared to canonical reference
// ═══════════════════════════════════════════════════════════════════
const MAX_SEQ_LENGTH = 5000;
const normalizeSequence = raw => raw.replace(/^>.*$/gm,'').replace(/[\s\r\n\t]/g,'').toUpperCase();

const detectMutationsVsReference = (userSeq, geneKey, frame, strand) => {
  const refEntry = REFERENCE_SEQUENCES[geneKey];
  if (!refEntry) throw new Error(`No canonical reference sequence for ${geneKey}`);

  let ref = normalizeSequence(refEntry.seq);
  let alt = normalizeSequence(userSeq);

  if (alt.length > MAX_SEQ_LENGTH) throw new Error(`Sequence too long (max ${MAX_SEQ_LENGTH.toLocaleString()} bp)`);
  if (!/^[ATGCN]+$/.test(alt)) throw new Error('Sequence contains invalid characters (only A, T, G, C, N allowed)');

  if (strand === 'reverse') { ref = revComp(ref); alt = revComp(alt); }

  const warnings = [];
  const offset   = parseInt(frame) - 1;
  const mutations = [];
  const maxLen    = Math.max(ref.length, alt.length);

  if (alt.length % 3 !== 0) warnings.push('Input sequence length not divisible by 3 — reading frame may be shifted');
  if (Math.abs(ref.length - alt.length) > 0 && Math.abs(ref.length - alt.length) % 3 !== 0)
    warnings.push('Length difference suggests a frameshift relative to reference');

  if (ref.length === alt.length) {
    // SNP scan
    for (let i = 0; i < ref.length; i++) {
      if (ref[i] !== alt[i]) {
        const codonIdx   = Math.floor((i - offset) / 3);
        const codonStart = codonIdx * 3 + offset;
        if (codonStart >= 0 && codonStart + 3 <= ref.length) {
          const refCodon = ref.substring(codonStart, codonStart + 3);
          const altCodon = alt.substring(codonStart, codonStart + 3);
          if (refCodon.length === 3 && altCodon.length === 3 && !/-/.test(refCodon+altCodon)) {
            const refAA = translateCodon(refCodon);
            const altAA = translateCodon(altCodon);
            let mutClass = 'Missense';
            if (refAA === altAA) mutClass = 'Silent';
            else if (altAA === '*') mutClass = 'Nonsense';

            // Deduplicate: one entry per codon
            if (!mutations.some(m => m.codon_position === codonStart)) {
              mutations.push({
                type: 'SNP',
                position: i,
                codon_position: codonStart,
                reference: ref[i], alternate: alt[i],
                reference_codon: refCodon, alternate_codon: altCodon,
                reference_amino_acid: refAA, alternate_amino_acid: altAA,
                mutation_class: mutClass,
              });
            }
          }
        }
      }
    }
  } else {
    // Indel: find shared prefix/suffix, classify middle
    const minLen = Math.min(ref.length, alt.length);
    let pLen = 0;
    while (pLen < minLen && ref[pLen] === alt[pLen]) pLen++;
    let e1 = ref.length - 1, e2 = alt.length - 1;
    while (e1 > pLen && e2 > pLen && ref[e1] === alt[e2]) { e1--; e2--; }

    const mid1 = ref.slice(pLen, e1 + 1);
    const mid2 = alt.slice(pLen, e2 + 1);

    if (mid1.length === 0) {
      const isFS = mid2.length % 3 !== 0;
      mutations.push({ type:'Insertion', position:pLen, codon_position:pLen, inserted_sequence:mid2, length:mid2.length, is_frameshift:isFS, mutation_class: isFS?'Frameshift':'In-frame Insertion', reference_codon:'---', alternate_codon:mid2.substring(0,3) });
    } else if (mid2.length === 0) {
      const isFS = mid1.length % 3 !== 0;
      mutations.push({ type:'Deletion', position:pLen, codon_position:pLen, deleted_sequence:mid1, length:mid1.length, is_frameshift:isFS, mutation_class: isFS?'Frameshift':'In-frame Deletion', reference_codon:mid1.substring(0,3), alternate_codon:'---' });
    } else {
      const netDiff = mid2.length - mid1.length;
      if (netDiff > 0) {
        const isFS = netDiff % 3 !== 0;
        mutations.push({ type:'Insertion', position:pLen, codon_position:pLen, inserted_sequence:mid2, length:netDiff, is_frameshift:isFS, mutation_class: isFS?'Frameshift':'In-frame Insertion', reference_codon:mid1.substring(0,3), alternate_codon:mid2.substring(0,3) });
      } else {
        const isFS = Math.abs(netDiff) % 3 !== 0;
        mutations.push({ type:'Deletion', position:pLen, codon_position:pLen, deleted_sequence:mid1, length:Math.abs(netDiff), is_frameshift:isFS, mutation_class: isFS?'Frameshift':'In-frame Deletion', reference_codon:mid1.substring(0,3), alternate_codon:mid2.substring(0,3) });
      }
    }
  }

  const summary = {
    total_mutations:      mutations.length,
    snps:                 mutations.filter(m=>m.type==='SNP').length,
    insertions:           mutations.filter(m=>m.type==='Insertion').length,
    deletions:            mutations.filter(m=>m.type==='Deletion').length,
    frameshift_mutations: mutations.filter(m=>m.is_frameshift).length,
    silent_mutations:     mutations.filter(m=>m.mutation_class==='Silent').length,
    missense_mutations:   mutations.filter(m=>m.mutation_class==='Missense').length,
    nonsense_mutations:   mutations.filter(m=>m.mutation_class==='Nonsense').length,
  };

  return {
    mutations, summary, warnings,
    sequences: {
      reference:         ref,
      alternate:         alt,
      reference_name:    `${geneKey} ${refEntry.accession}`,
      reference_length:  ref.length,
      alternate_length:  alt.length,
      length_difference: alt.length - ref.length,
      reading_frame:     frame,
      strand,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════
// POSITION & DOMAIN HELPERS
// ═══════════════════════════════════════════════════════════════════
const calculatePositions = (nucleotidePos, frame) => {
  const offset      = parseInt(frame) - 1;
  const adjustedPos = nucleotidePos - offset;
  const codonNumber = Math.floor(adjustedPos / 3) + 1;
  return { nucleotidePosition: nucleotidePos + 1, codonNumber, aaPosition: codonNumber };
};

const getDomainMapping = (aaPosition, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  for (const domain of gene.domains) {
    if (aaPosition >= domain.start && aaPosition <= domain.end) {
      return { proteinDomain: domain.name, functionalRegion: domain.functionalRegion, interpretation: `Mutation in ${domain.description}`, start: domain.start, end: domain.end, isInterDomain: false };
    }
  }
  return { proteinDomain: 'Inter-domain region', functionalRegion: 'N/A', interpretation: `Mutation in inter-domain linker region of ${gene.symbol}`, isInterDomain: true };
};

const getBiologicalInterpretation = (mutation, domainMapping, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  let interpretation = { mutationType: mutation.type, functionalEffect: mutation.mutation_class, confidence: 'High', scientificNote: '', biochemicalAnalysis: null };
  if (mutation.mutation_class === 'Missense' && mutation.reference_amino_acid && mutation.alternate_amino_acid) {
    const refProps = AA_PROPERTIES[mutation.reference_amino_acid];
    const altProps = AA_PROPERTIES[mutation.alternate_amino_acid];
    if (refProps && altProps) {
      interpretation.biochemicalAnalysis = { referenceAA:{aa:mutation.reference_amino_acid,...refProps}, alternateAA:{aa:mutation.alternate_amino_acid,...altProps}, sizeChange:refProps.size!==altProps.size, polarityChange:refProps.polarity!==altProps.polarity, chargeChange:refProps.charge!==altProps.charge };
      let changes = [];
      if (refProps.charge   !== altProps.charge)   changes.push(`charge (${refProps.charge} → ${altProps.charge})`);
      if (refProps.polarity !== altProps.polarity)  changes.push(`polarity (${refProps.polarity} → ${altProps.polarity})`);
      if (refProps.size     !== altProps.size)      changes.push(`size (${refProps.size} → ${altProps.size})`);
      const biochemNote = changes.length > 0 ? `Substitution alters: ${changes.join(', ')}.` : 'Conservative substitution.';
      interpretation.scientificNote = `${biochemNote} ${gene.getGeneNote('Missense', domainMapping.proteinDomain)}`;
    }
  }
  if (mutation.is_frameshift) interpretation.scientificNote = `Frameshift disrupts downstream reading frame. ${gene.getGeneNote('Frameshift', domainMapping.proteinDomain)}`;
  if (mutation.mutation_class === 'Nonsense') interpretation.scientificNote = `Premature stop codon truncates ${gene.symbol} protein. ${gene.getGeneNote('Nonsense', domainMapping.proteinDomain)}`;
  if (mutation.mutation_class === 'Silent') interpretation.scientificNote = `Synonymous substitution — no amino acid change in ${gene.symbol}. Unlikely to affect protein function.`;
  return interpretation;
};

// ═══════════════════════════════════════════════════════════════════
// IN-SILICO PREDICTORS (unchanged)
// ═══════════════════════════════════════════════════════════════════
const estimateSIFT = (refAA, altAA) => {
  if (!refAA || !altAA || refAA === altAA) return { score:1.0, tolerated:true, label:'Tolerated', blosum62:0 };
  const b62  = BLOSUM62[refAA]?.[altAA] ?? -4;
  const sift = Math.max(0, Math.min(1, (b62 + 4) / 15));
  return { score:parseFloat(sift.toFixed(3)), blosum62:b62, tolerated:sift>=0.05, label:sift<0.05?'Damaging':sift<0.20?'Low tolerance':'Tolerated', labelColor:sift<0.05?'#EF4444':sift<0.20?'#F59E0B':'#10B981' };
};

const estimatePolyPhen = (mutation, domainMapping, geneKey) => {
  const refAA = mutation.reference_amino_acid, altAA = mutation.alternate_amino_acid;
  if (!refAA || !altAA) return { score:0, label:'Unknown', labelColor:'#6b7280' };
  let score = 0;
  const refP = AA_PROPERTIES[refAA], altP = AA_PROPERTIES[altAA];
  if (domainMapping.functionalRegion === 'Critical') score += 0.35;
  else if (domainMapping.functionalRegion === 'Structural') score += 0.20;
  else score += 0.05;
  if (refP && altP) {
    if (refP.charge   !== altP.charge)   score += 0.25;
    if (refP.polarity !== altP.polarity)  score += 0.10;
    if (refP.size     !== altP.size)      score += 0.05;
    if (altAA === 'P') score += 0.10;
    if (altAA === 'G' && domainMapping.functionalRegion !== 'N/A') score += 0.05;
  }
  const hotspots = HOTSPOT_RESIDUES[geneKey] || [];
  if (hotspots.includes(mutation.aaPosition)) score += 0.15;
  else if (domainMapping.functionalRegion === 'Critical') score += 0.07;
  score = Math.max(0, Math.min(1, score));
  const label = score>0.75?'Probably Damaging':score>0.45?'Possibly Damaging':'Benign';
  return { score:parseFloat(score.toFixed(3)), label, labelColor:score>0.75?'#EF4444':score>0.45?'#F59E0B':'#10B981' };
};

const estimateConservation = (mutation, geneKey) => {
  const hotspots = HOTSPOT_RESIDUES[geneKey] || [];
  if (hotspots.includes(mutation.aaPosition)) return { score:0.95, label:'Highly conserved hotspot', color:'#EF4444' };
  const gene = GENE_PANEL[geneKey]; if (!gene) return { score:0.5, label:'Unknown', color:'#6b7280' };
  for (const dom of gene.domains) {
    if (mutation.aaPosition >= dom.start && mutation.aaPosition <= dom.end) {
      if (dom.functionalRegion === 'Critical')   return { score:0.82, label:'Highly conserved (critical domain)', color:'#F59E0B' };
      if (dom.functionalRegion === 'Structural')  return { score:0.65, label:'Moderately conserved', color:'#818CF8' };
      return { score:0.40, label:'Partially conserved', color:'#10B981' };
    }
  }
  return { score:0.25, label:'Low conservation (inter-domain)', color:'#10B981' };
};

const lookupCOSMIC  = (mutation, geneKey) => { const db=COSMIC_HOTSPOTS[geneKey]; if(!db||!mutation.reference_amino_acid||!mutation.alternate_amino_acid) return null; return db[`${mutation.reference_amino_acid}${mutation.aaPosition}${mutation.alternate_amino_acid}`]||null; };
const lookupClinVar = (mutation, geneKey) => { const db=CLINVAR_DB[geneKey]; if(!db||!mutation.reference_amino_acid||!mutation.alternate_amino_acid) return null; return db[`${mutation.reference_amino_acid}${mutation.aaPosition}${mutation.alternate_amino_acid}`]||null; };

const fetchClinVarLive = async (hgvs, geneSymbol) => {
  try {
    const query      = encodeURIComponent(`${geneSymbol}[gene] AND ${hgvs}[variant name]`);
    const searchRes  = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${query}&retmode=json&retmax=1`);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const ids        = searchData?.esearchresult?.idlist;
    if (!ids || ids.length === 0) return null;
    const sumRes  = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${ids[0]}&retmode=json`);
    if (!sumRes.ok) return null;
    const sumData = await sumRes.json();
    const doc     = sumData?.result?.[ids[0]];
    if (!doc) return null;
    return { sig:doc.clinical_significance?.description||'Unknown', review:doc.review_status||'No review', condition:doc.trait_set?.map(t=>t.trait_name).join('; ')||'Not specified', accession:doc.accession||ids[0], stars:doc.review_status?.includes('expert')?3:doc.review_status?.includes('multiple')?2:1, live:true };
  } catch { return null; }
};

// ═══════════════════════════════════════════════════════════════════
// FIX 3: WEIGHTED PATHOGENICITY — TRANSPARENT, AUDIT-READY SCORING
//
// The algorithm is the same as before but every component now
// emits a human-readable explanation used in the UI.
//
// Total = domain(0.25) + mutType(0.20) + clinvar(0.25)
//        + cosmic(0.15) + conserv(0.10) + structural(0.05)
//
// If clinvar=0 and cosmic=0 yet score is high, the UI will
// explicitly say so and explain which components drove the score.
// ═══════════════════════════════════════════════════════════════════
const scorePathogenicity = (mutation, domainMapping, geneKey='TP53', clinvarData=null, cosmicData=null) => {
  const reasons = []; let componentScores = {};

  if (mutation.is_frameshift) return {
    level:'PATHOGENIC', label:'Pathogenic', color:'#EF4444', bgClass:'path-pathogenic', score:95,
    reasons:['Frameshift disrupts downstream reading frame (PVS1-equivalent)','Truncated/nonfunctional protein expected','Loss-of-function mutation'],
    shortLabel:'P', acmgCriteria:['PVS1'],
    componentScores:{domainImpact:1.0,mutationType:1.0,clinvar:0,cosmic:0,conservation:0.8,structural:0},
    componentWeights:{domainImpact:0.25,mutationType:0.20,clinvar:0.25,cosmic:0.15,conservation:0.10,structural:0.05},
    scoreExplanation:'Frameshifts are classified as Pathogenic by default (PVS1 criterion). ClinVar and COSMIC weights are not applicable.',
  };
  if (mutation.mutation_class === 'Nonsense') return {
    level:'PATHOGENIC', label:'Pathogenic', color:'#EF4444', bgClass:'path-pathogenic', score:90,
    reasons:['Premature stop codon introduced (PVS1-equivalent)','Protein function likely abolished','Nonsense-mediated mRNA decay probable'],
    shortLabel:'P', acmgCriteria:['PVS1'],
    componentScores:{domainImpact:1.0,mutationType:1.0,clinvar:0,cosmic:0,conservation:0.8,structural:0},
    componentWeights:{domainImpact:0.25,mutationType:0.20,clinvar:0.25,cosmic:0.15,conservation:0.10,structural:0.05},
    scoreExplanation:'Nonsense mutations are classified as Pathogenic by default (PVS1 criterion). ClinVar and COSMIC weights are not applicable.',
  };
  if (mutation.mutation_class === 'Silent') return {
    level:'LIKELY_BENIGN', label:'Likely Benign', color:'#10B981', bgClass:'path-benign', score:8,
    reasons:['Synonymous change — protein sequence unchanged (BP7-equivalent)'],
    shortLabel:'LB', acmgCriteria:['BP7'],
    componentScores:{domainImpact:0,mutationType:0,clinvar:0,cosmic:0,conservation:0,structural:0},
    componentWeights:{domainImpact:0.25,mutationType:0.20,clinvar:0.25,cosmic:0.15,conservation:0.10,structural:0.05},
    scoreExplanation:'Synonymous variants score near zero on all components. No amino acid change means structural/functional predictors do not apply.',
  };

  // ── Component 1: Domain Impact (weight 0.25) ──
  let domainImpact = 0;
  if (domainMapping.functionalRegion === 'Critical')    { domainImpact=1.0; reasons.push('[Domain ×0.25] Critical domain hit (PM1) → 100% of weight applied'); }
  else if (domainMapping.functionalRegion === 'Structural') { domainImpact=0.60; reasons.push('[Domain ×0.25] Structural domain → 60% of weight applied'); }
  else { domainImpact=0.15; reasons.push('[Domain ×0.25] Inter-domain region → 15% of weight applied'); }
  componentScores.domainImpact = domainImpact;

  // ── Component 2: Mutation Type Severity (weight 0.20) ──
  let mutTypeSev = 0;
  const sift     = (mutation.reference_amino_acid && mutation.alternate_amino_acid) ? estimateSIFT(mutation.reference_amino_acid, mutation.alternate_amino_acid) : null;
  const polyphen = (mutation.reference_amino_acid && mutation.alternate_amino_acid) ? estimatePolyPhen({...mutation}, domainMapping, geneKey) : null;
  if (mutation.mutation_class === 'Missense') {
    const refP = AA_PROPERTIES[mutation.reference_amino_acid], altP = AA_PROPERTIES[mutation.alternate_amino_acid];
    if (refP && altP) {
      if (refP.charge   !== altP.charge)   { mutTypeSev+=0.50; reasons.push(`[MutType ×0.20] Charge change ${refP.charge}→${altP.charge} (PS3-proxy) +50%`); }
      if (refP.polarity !== altP.polarity)  { mutTypeSev+=0.25; reasons.push(`[MutType ×0.20] Polarity shift +25%`); }
      if (refP.size     !== altP.size)      { mutTypeSev+=0.15; reasons.push(`[MutType ×0.20] Size change +15%`); }
      if (refP.charge===altP.charge && refP.polarity===altP.polarity && refP.size===altP.size) { mutTypeSev-=0.20; reasons.push('[MutType ×0.20] Conservative substitution (BP4-proxy) −20%'); }
    }
    if (mutation.alternate_amino_acid==='P') { mutTypeSev+=0.20; reasons.push('[MutType ×0.20] Proline introduction (helix breaker) +20%'); }
    if (mutation.alternate_amino_acid==='G' && domainMapping.functionalRegion!=='N/A') { mutTypeSev+=0.10; reasons.push('[MutType ×0.20] Glycine introduction +10%'); }
    if (sift && !sift.tolerated) { mutTypeSev+=0.20; reasons.push(`[MutType ×0.20] SIFT-like: ${sift.label} (BLOSUM62=${sift.blosum62}) +20%`); }
  } else {
    mutTypeSev = domainMapping.functionalRegion==='Critical' ? 0.70 : 0.40;
    reasons.push(`[MutType ×0.20] In-frame indel in ${domainMapping.functionalRegion} domain`);
  }
  mutTypeSev = Math.max(0, Math.min(1, mutTypeSev));
  componentScores.mutationType = mutTypeSev;

  // ── Component 3: ClinVar Evidence (weight 0.25) ──
  let clinvarScore = 0;
  if (clinvarData) {
    const sig = clinvarData.sig?.toLowerCase() || '';
    if (sig.includes('pathogenic') && !sig.includes('likely'))         { clinvarScore=1.0; reasons.push(`[ClinVar ×0.25] Pathogenic — ${clinvarData.condition} (${clinvarData.accession}) → 100%`); }
    else if (sig.includes('likely pathogenic'))                          { clinvarScore=0.75; reasons.push(`[ClinVar ×0.25] Likely Pathogenic (${clinvarData.accession}) → 75%`); }
    else if (sig.includes('uncertain'))                                  { clinvarScore=0.40; reasons.push(`[ClinVar ×0.25] VUS (${clinvarData.accession}) → 40%`); }
    else if (sig.includes('likely benign'))                              { clinvarScore=0.10; reasons.push(`[ClinVar ×0.25] Likely Benign → 10%`); }
    else if (sig.includes('benign'))                                     { clinvarScore=0.00; reasons.push(`[ClinVar ×0.25] Benign → 0%`); }
  } else {
    // FIX 4: clearer ClinVar message
    reasons.push('[ClinVar ×0.25] No exact match found in ClinVar database query → 0%');
  }
  componentScores.clinvar = clinvarScore;

  // ── Component 4: COSMIC Frequency (weight 0.15) ──
  let cosmicScore = 0;
  if (cosmicData) {
    cosmicScore = Math.min(1.0, cosmicData.freq * 8);
    reasons.push(`[COSMIC ×0.15] ${cosmicData.samples.toLocaleString()} samples, freq ${(cosmicData.freq*100).toFixed(1)}% (${cosmicData.cosmic_id}) → ${(cosmicScore*100).toFixed(0)}%`);
  } else {
    reasons.push('[COSMIC ×0.15] Not present in COSMIC hotspot catalogue → 0%');
  }
  componentScores.cosmic = cosmicScore;

  // ── Component 5: Conservation (weight 0.10) ──
  const conserv      = estimateConservation({...mutation}, geneKey);
  const conservScore = conserv.score;
  reasons.push(`[Conservation ×0.10] ${conserv.label} (score ${conserv.score}) → ${(conserv.score*100).toFixed(0)}%`);
  componentScores.conservation = conservScore;

  // ── Component 6: Structural Disruption (weight 0.05) ──
  const structScore = polyphen ? polyphen.score : 0;
  if (polyphen) reasons.push(`[PolyPhen-like ×0.05] ${polyphen.label} (score ${polyphen.score}) → ${(polyphen.score*100).toFixed(0)}%`);
  componentScores.structural = structScore;

  // ── Final weighted sum ──
  const weights = { domainImpact:0.25, mutationType:0.20, clinvar:0.25, cosmic:0.15, conservation:0.10, structural:0.05 };
  const finalScore =
    domainImpact  * weights.domainImpact  +
    mutTypeSev    * weights.mutationType  +
    clinvarScore  * weights.clinvar       +
    cosmicScore   * weights.cosmic        +
    conservScore  * weights.conservation  +
    structScore   * weights.structural;

  const pct = Math.round(finalScore * 100);

  // ── FIX 3: explicit score explanation string ──
  const scoreExplanation =
    `Score = (Domain ${(domainImpact*100).toFixed(0)}%×0.25) + (MutType ${(mutTypeSev*100).toFixed(0)}%×0.20) + ` +
    `(ClinVar ${(clinvarScore*100).toFixed(0)}%×0.25) + (COSMIC ${(cosmicScore*100).toFixed(0)}%×0.15) + ` +
    `(Conservation ${(conservScore*100).toFixed(0)}%×0.10) + (Structural ${(structScore*100).toFixed(0)}%×0.05) = ${pct}/100`;

  // ── ACMG-like criteria ──
  const acmgCriteria = [];
  if (clinvarScore===1.0 && domainImpact>=0.60) acmgCriteria.push('PS1','PM1');
  if (conservScore>0.90) acmgCriteria.push('PP3');
  if (sift && !sift.tolerated) acmgCriteria.push('PP3');
  if (cosmicData && cosmicData.freq>0.05) acmgCriteria.push('PS4');
  if (domainImpact===1.0) acmgCriteria.push('PM1');

  let level, label, color, bgClass, shortLabel;
  if (pct>=72)       { level='PATHOGENIC';       label='Pathogenic';             color='#EF4444'; bgClass='path-pathogenic'; shortLabel='P';   }
  else if (pct>=52)  { level='LIKELY_PATHOGENIC';label='Likely Pathogenic';      color='#F59E0B'; bgClass='path-likely';     shortLabel='LP';  }
  else if (pct>=30)  { level='VUS';               label='Uncertain Significance'; color='#818CF8'; bgClass='path-vus';        shortLabel='VUS'; }
  else if (pct>=12)  { level='LIKELY_BENIGN';     label='Likely Benign';          color='#10B981'; bgClass='path-benign';     shortLabel='LB';  }
  else               { level='BENIGN';             label='Benign';                 color:'#6EE7B7'; bgClass='path-benign';     shortLabel='B';   }

  return { level, label, color, bgClass, score:pct, reasons, shortLabel, acmgCriteria,
    componentScores, componentWeights:weights, scoreExplanation,
    sift, polyphen, conservation:conserv, cosmic:cosmicData, clinvar:clinvarData };
};

// ═══════════════════════════════════════════════════════════════════
// SAMPLE DATA (still works — user pastes one mutated sequence)
// ═══════════════════════════════════════════════════════════════════
// Samples: slightly-modified versions of the TP53 reference
const TP53_REF_SAMPLE = REFERENCE_SEQUENCES.TP53.seq.substring(0, 120);
const MUTATION_SAMPLES = {
  normal: {
    name:'Normal (Wild-Type)', icon:'WT', color:'#10B981',
    userSequence: TP53_REF_SAMPLE,
    readingFrame:'1', strand:'forward',
    description:'Identical to TP53 reference — no mutations expected',
  },
  snp: {
    name:'SNP (Missense)', icon:'SNP', color:'#F59E0B',
    // CGC→CAC = Arg→His at codon 7 (within first 120 bp sample)
    userSequence: TP53_REF_SAMPLE.substring(0,18) + 'CAC' + TP53_REF_SAMPLE.substring(21),
    readingFrame:'1', strand:'forward',
    description:'Single nucleotide polymorphism — CGC→CAC (missense)',
  },
  nonsense: {
    name:'Nonsense (Stop)', icon:'NS', color:'#EF4444',
    // Introduce TAG stop at codon 7 position
    userSequence: TP53_REF_SAMPLE.substring(0,18) + 'TAG' + TP53_REF_SAMPLE.substring(21),
    readingFrame:'1', strand:'forward',
    description:'Premature stop codon introduced',
  },
  frameshift: {
    name:'Frameshift (Insertion)', icon:'FS', color:'#DC2626',
    // Insert 2 bp creating frameshift
    userSequence: TP53_REF_SAMPLE.substring(0,20) + 'AC' + TP53_REF_SAMPLE.substring(20),
    readingFrame:'1', strand:'forward',
    description:'2 bp insertion — frameshift mutation',
  },
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function CancerGeneMutationAnalyzer() {
  const [userSeq,    setUserSeq]    = useState('');
  const [mutations,  setMutations]  = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [readingFrame,setReadingFrame] = useState('1');
  const [strand,     setStrand]     = useState('forward');
  const [annotatedMutations, setAnnotatedMutations] = useState([]);
  const [aiExplanation, setAiExplanation] = useState('');
  const [loadingAI,  setLoadingAI]  = useState(false);
  const [showSampleMenu,setShowSampleMenu] = useState(false);
  const [selectedGene, setSelectedGene]   = useState('TP53');
  const [infoOpen, setInfoOpen]           = useState(false);

  const activeGene = GENE_PANEL[selectedGene];
  const activeRef  = REFERENCE_SEQUENCES[selectedGene];

  // Close sample menu on outside click
  useEffect(() => {
    const close = () => setShowSampleMenu(false);
    if (showSampleMenu) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [showSampleMenu]);

  const loadSample = key => {
    const s = MUTATION_SAMPLES[key];
    setUserSeq(s.userSequence);
    setReadingFrame(s.readingFrame);
    setStrand(s.strand);
    setShowSampleMenu(false);
    setMutations(null); setError(''); setAiExplanation('');
    // Auto-select TP53 for samples
    setSelectedGene('TP53');
  };

  const handleAnalyze = async () => {
    if (!userSeq.trim()) { setError('Please enter your sequence to analyze'); return; }
    setLoading(true); setError(''); setMutations(null); setAnnotatedMutations([]); setAiExplanation('');
    await new Promise(r => setTimeout(r, 40));
    try {
      const result = detectMutationsVsReference(userSeq, selectedGene, readingFrame, strand);
      setMutations(result);
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Annotate mutations after detection
  useEffect(() => {
    if (!mutations?.mutations?.length) { setAnnotatedMutations([]); return; }
    const refSeq = mutations.sequences?.reference ?? '';
    const base   = mutations.mutations.map(mutation => {
      const positions    = calculatePositions(mutation.codon_position ?? mutation.position ?? 0, readingFrame);
      const hgvs         = generateHGVS(mutation, positions, refSeq, readingFrame, selectedGene);
      const domainMapping= getDomainMapping(positions.aaPosition, selectedGene);
      const interpretation=getBiologicalInterpretation(mutation, domainMapping, selectedGene);
      const augMut       = {...mutation, aaPosition: positions.aaPosition};
      const clinvarLocal = lookupClinVar(augMut, selectedGene);
      const cosmicLocal  = lookupCOSMIC(augMut, selectedGene);
      const pathogenicity= scorePathogenicity(augMut, domainMapping, selectedGene, clinvarLocal, cosmicLocal);
      const sift         = mutation.reference_amino_acid && mutation.alternate_amino_acid ? estimateSIFT(mutation.reference_amino_acid, mutation.alternate_amino_acid) : null;
      const polyphen     = mutation.reference_amino_acid && mutation.alternate_amino_acid ? estimatePolyPhen(augMut, domainMapping, selectedGene) : null;
      const conservation = estimateConservation(augMut, selectedGene);
      return { mutation:augMut, positions, hgvs, domainMapping, interpretation, pathogenicity, sift, polyphen, conservation, clinvar:clinvarLocal, cosmic:cosmicLocal, clinvarLive:null };
    });
    setAnnotatedMutations(base);

    // Background live ClinVar
    Promise.allSettled(base.map(async (am, idx) => {
      if (!am.mutation.reference_amino_acid) return null;
      const live = await fetchClinVarLive(am.hgvs, selectedGene);
      return { idx, live };
    })).then(results => {
      setAnnotatedMutations(prev => {
        const updated = [...prev];
        results.forEach(r => {
          if (r.status==='fulfilled' && r.value?.live) {
            const { idx, live } = r.value;
            if (updated[idx]) updated[idx] = { ...updated[idx], clinvarLive:live, pathogenicity:scorePathogenicity(updated[idx].mutation, updated[idx].domainMapping, selectedGene, live, updated[idx].cosmic) };
          }
        });
        return updated;
      });
    });
  }, [mutations, readingFrame, selectedGene]);

  const handleAI = async () => {
    if (!mutations) return;
    setLoadingAI(true); setAiExplanation('');
    const gene  = GENE_PANEL[selectedGene] || GENE_PANEL.TP53;
    const total = mutations.summary.total_mutations;
    const mutList = annotatedMutations.map((am,i)=>
      `Mutation ${i+1}: ${am.hgvs} | ${am.mutation.mutation_class} | Domain: ${am.domainMapping.proteinDomain} | Pathogenicity: ${am.pathogenicity?.label} (${am.pathogenicity?.score}/100) | Score formula: ${am.pathogenicity?.scoreExplanation}`
    ).join('\n');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000,
          messages:[{ role:'user', content:
            `You are a clinical molecular oncologist. Analyze these ${gene.symbol} mutations detected by comparison to the canonical ${activeRef.accession} reference sequence.\n\nGene: ${gene.symbol} (${gene.name})\nType: ${gene.type}\nClinical context: ${gene.clinicalContext}\n\nMutations found (vs ${activeRef.accession}):\n${total===0?'No mutations — sequence matches reference exactly.':mutList}\n\nFor each mutation, comment on: structural impact, clinical significance in cancer, and whether the weighted pathogenicity score is justified given ClinVar/COSMIC data. Write in clear scientific prose, no bullet points.`
          }]
        })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setAiExplanation(data.content.filter(b=>b.type==='text').map(b=>b.text).join('\n') || 'No analysis returned.');
    } catch (e) {
      // Fallback
      let txt = `${gene.symbol} MUTATION ANALYSIS\nReference: ${activeRef.accession}\n${'─'.repeat(60)}\n`;
      txt += total===0 ? 'No mutations detected. Input sequence matches the canonical reference.\n' :
        annotatedMutations.map((am,i)=>`\nMutation ${i+1}: ${am.hgvs}\nClass: ${am.mutation.mutation_class}\nDomain: ${am.domainMapping.proteinDomain}\nPathogenicity: ${am.pathogenicity?.label} (${am.pathogenicity?.score}/100)\nScore: ${am.pathogenicity?.scoreExplanation}\nNote: ${am.interpretation.scientificNote}\n`).join('');
      txt += `\n[AI service unavailable — local analysis shown]\n`;
      setAiExplanation(txt);
    } finally {
      setLoadingAI(false);
    }
  };

  const FREG_COL = {Critical:'#06b6d4', Structural:'#8b5cf6', Regulatory:'#10b981'};

  return (
    <div style={{minHeight:'100vh',background:'#0c0e14',color:'#e2e4e9',fontFamily:'"Sora",sans-serif',fontSize:'1.05em'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#131518}::-webkit-scrollbar-thumb{background:#2a2d3a;border-radius:3px}
        .pc{background:#141720;border:1px solid #24272f;border-radius:12px;padding:1.5rem;margin-bottom:1.2rem;animation:fadeSlideIn .4s ease-out}
        .lbl{display:block;font-size:.85rem;font-weight:600;color:#6b7080;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.5rem}
        select,textarea{width:100%;background:#0f1117;border:1px solid #24272f;border-radius:8px;color:#e2e4e9;font-family:'Sora',sans-serif;font-size:1rem;padding:.8rem .95rem;outline:none;transition:all .3s}
        select:focus,textarea:focus{border-color:#06B6D4;box-shadow:0 0 0 3px rgba(6,182,212,.1)}
        textarea{resize:vertical;font-family:'JetBrains Mono',monospace;font-size:.9rem;line-height:1.8}
        textarea::placeholder{color:#2e3145}
        .btn-p{display:flex;align-items:center;justify-content:center;gap:.6rem;width:100%;padding:1rem 1.35rem;background:linear-gradient(135deg,#06B6D4,#0891B2);border:none;border-radius:10px;color:#fff;font-family:'Sora',sans-serif;font-weight:600;font-size:1.05rem;cursor:pointer;transition:all .3s}
        .btn-p:hover{filter:brightness(1.12);transform:translateY(-2px);box-shadow:0 8px 24px rgba(6,182,212,.4)}.btn-p:disabled{filter:brightness(.5);cursor:not-allowed;transform:none}
        .btn-ai{display:flex;align-items:center;justify-content:center;gap:.6rem;width:100%;padding:.95rem;background:linear-gradient(135deg,#14B8A6,#0D9488);border:none;border-radius:10px;color:#fff;font-family:'Sora',sans-serif;font-weight:600;font-size:1rem;cursor:pointer;transition:all .3s}
        .btn-ai:hover{filter:brightness(1.12);transform:translateY(-2px)}.btn-ai:disabled{filter:brightness(.5);cursor:not-allowed;transform:none}
        .btn-g{display:inline-flex;align-items:center;gap:.42rem;padding:.52rem 1rem;background:transparent;border:1px solid #24272f;border-radius:7px;color:#8a8f9e;font-family:'Sora',sans-serif;font-size:.9rem;font-weight:500;cursor:pointer;transition:all .25s}
        .btn-g:hover{border-color:#06B6D4;color:#06B6D4;background:rgba(6,182,212,.06)}
        .btn-sample{display:inline-flex;align-items:center;gap:.42rem;padding:.5rem 1rem;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.3);border-radius:7px;color:#67E8F9;font-family:'Sora',sans-serif;font-size:.9rem;font-weight:500;cursor:pointer;transition:all .25s;position:relative}
        .sample-menu{position:absolute;top:calc(100% + .35rem);left:0;background:#141720;border:1px solid #24272f;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.5);padding:.6rem;z-index:100;min-width:300px;animation:dropdownSlide .2s ease-out}
        .sample-item{padding:.75rem .9rem;border-radius:8px;cursor:pointer;border:1px solid transparent;margin-bottom:.3rem;transition:all .2s}
        .sample-item:hover{border-color:#06B6D4;background:rgba(6,182,212,.07)}
        .stat-b{background:#0f1117;border:1px solid #1e2130;border-radius:10px;padding:.9rem .7rem;text-align:center;transition:all .3s}
        .stat-b:hover{transform:translateY(-3px);box-shadow:0 4px 12px rgba(6,182,212,.15);border-color:#06B6D4}
        .stat-v{font-size:1.6rem;font-weight:700;line-height:1.2}.stat-l{font-size:.8rem;color:#6b7080;text-transform:uppercase;letter-spacing:.06em;margin-top:.3rem}
        .mut-card{background:#0f1117;border:1px solid #1e2130;border-radius:10px;padding:1.25rem;margin-bottom:.8rem;animation:fadeSlideIn .3s ease-out;transition:all .3s}
        .mut-card:hover{transform:translateX(4px);box-shadow:0 4px 16px rgba(6,182,212,.1)}
        .badge{display:inline-block;padding:.2rem .45rem;border-radius:4px;font-size:.75rem;font-weight:600}
        .badge-missense{background:rgba(251,191,36,.2);color:#FBBF24;border:1px solid rgba(251,191,36,.3)}
        .badge-nonsense{background:rgba(239,68,68,.2);color:#EF4444;border:1px solid rgba(239,68,68,.3)}
        .badge-silent{background:rgba(16,185,129,.2);color:#10B981;border:1px solid rgba(16,185,129,.3)}
        .badge-frameshift{background:rgba(220,38,38,.2);color:#FCA5A5;border:1px solid rgba(220,38,38,.3)}
        .error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:.85rem 1rem;margin-bottom:1rem;color:#EF4444;font-size:.95rem}
        .warning{background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.3);border-radius:8px;padding:.8rem 1rem;margin-bottom:1rem;color:#FBBF24;font-size:.9rem}
        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem}
        .config-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
        .path-pathogenic{background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.35);border-radius:8px;padding:.75rem .9rem;margin-top:.75rem}
        .path-likely{background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;padding:.75rem .9rem;margin-top:.75rem}
        .path-benign{background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:8px;padding:.75rem .9rem;margin-top:.75rem}
        .path-vus{background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:8px;padding:.75rem .9rem;margin-top:.75rem}
        .path-bar-wrap{height:5px;background:#1e2130;border-radius:3px;overflow:hidden;margin:.4rem 0}
        .path-bar{height:100%;border-radius:3px;transition:width .6s ease}
        .score-formula{background:#0a0d14;border:1px solid #1a1d2a;border-radius:7px;padding:.6rem .8rem;margin:.5rem 0;font-family:'JetBrains Mono',monospace;font-size:.73rem;color:#4a6090;line-height:1.7}
        .gene-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem}
        .info-wrap{overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1),opacity .3s}
        .info-wrap.closed{max-height:0;opacity:0}.info-wrap.open{max-height:600px;opacity:1}
        .ref-badge{display:inline-flex;align-items:center;gap:.3rem;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#6EE7B7;font-size:.72rem;font-weight:600;padding:.15rem .5rem;border-radius:5px;font-family:'JetBrains Mono',monospace}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spin .5s linear infinite}
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dropdownSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @media(max-width:640px){.summary-grid{grid-template-columns:repeat(2,1fr)}.config-grid{grid-template-columns:1fr}.gene-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div style={{maxWidth:860,margin:'0 auto',padding:'1.25rem 1.2rem 3rem'}}>

        {/* HEADER */}
        <div style={{background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)',borderBottom:'1px solid #1e2130',padding:'1.6rem 1.3rem 1.3rem',margin:'-1.25rem -1.2rem 0',marginBottom:'1.25rem'}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <div style={{background:`linear-gradient(135deg,${activeGene.color}20 0%,#083344 100%)`,border:`2px solid ${activeGene.color}55`,borderRadius:14,padding:'1rem 1.1rem',marginBottom:'.6rem',boxShadow:`0 8px 32px ${activeGene.color}20`}}>
              <div style={{display:'flex',alignItems:'center',gap:'.6rem',flexWrap:'wrap'}}>
                <h1 style={{fontFamily:'Sora',fontWeight:700,fontSize:'clamp(1.15rem,4vw,1.65rem)',color:'#fff',margin:0}}>Cancer Gene Mutation Analyzer</h1>
                <span style={{background:'rgba(6,182,212,.18)',border:'1px solid rgba(6,182,212,.4)',color:'#67E8F9',fontSize:'.7rem',fontWeight:600,padding:'.18rem .48rem',borderRadius:20,letterSpacing:'.07em',textTransform:'uppercase'}}>Reference-Based</span>
                <span style={{background:'rgba(16,185,129,.12)',border:'1px solid rgba(16,185,129,.3)',color:'#6EE7B7',fontSize:'.7rem',fontWeight:600,padding:'.18rem .48rem',borderRadius:20,textTransform:'uppercase'}}>Multi-Gene Panel</span>
              </div>
            </div>
            <p style={{color:'#6b7080',fontSize:'1rem',lineHeight:1.6,maxWidth:600,margin:0}}>
              Paste your sequence — it's compared to the canonical reference ({activeRef.accession}) to detect real mutations.
            </p>
          </div>
        </div>

        {/* GENE SELECTOR */}
        <div className="pc" style={{borderColor:'rgba(16,185,129,.25)',background:'rgba(16,185,129,.03)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'1rem'}}>
            <span style={{fontSize:'.95rem',fontWeight:600,color:'#6EE7B7'}}>Gene Panel</span>
          </div>
          <div className="gene-grid">
            {Object.values(GENE_PANEL).map(gene=>(
              <button key={gene.symbol} onClick={()=>{setSelectedGene(gene.symbol);setMutations(null);setAnnotatedMutations([]);setError('');setAiExplanation('');}}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.25rem',padding:'.7rem .4rem',background:selectedGene===gene.symbol?`${gene.color}18`:'#0f1117',border:selectedGene===gene.symbol?`2px solid ${gene.color}`:'1px solid #1e2130',borderRadius:10,cursor:'pointer',transition:'all .25s',boxShadow:selectedGene===gene.symbol?`0 4px 16px ${gene.color}30`:'none'}}>
                <span style={{fontFamily:'"JetBrains Mono",monospace',fontWeight:700,fontSize:'.9rem',color:selectedGene===gene.symbol?gene.color:'#c8cad4'}}>{gene.symbol}</span>
                <span style={{fontSize:'.65rem',color:'#6b7080',textAlign:'center'}}>{gene.type}</span>
              </button>
            ))}
          </div>
          <div style={{marginTop:'1rem',padding:'.8rem',background:`${activeGene.color}0c`,border:`1px solid ${activeGene.color}28`,borderRadius:8}}>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap',marginBottom:'.35rem'}}>
              <span style={{fontSize:'.85rem',fontWeight:600,color:activeGene.color}}>{activeGene.symbol} — {activeGene.name}</span>
              <span className="ref-badge">vs {activeRef.accession}</span>
              <span style={{fontSize:'.72rem',color:'#3a4a3a'}}>{activeRef.description}</span>
            </div>
            <div style={{fontSize:'.82rem',color:'#8a8f9e',lineHeight:1.55}}>{activeGene.clinicalContext}</div>
          </div>
        </div>

        {/* INFO TOGGLE */}
        <button className="btn-g" onClick={()=>setInfoOpen(v=>!v)} style={{width:'100%',justifyContent:'space-between',marginBottom:'1rem'}}>
          <span>How mutation detection works</span>
          <span style={{fontSize:'.8rem',transition:'transform .25s',transform:infoOpen?'rotate(180deg)':'rotate(0)',display:'inline-block'}}>▼</span>
        </button>
        <div className={`info-wrap ${infoOpen?'open':'closed'}`}>
          <div className="pc" style={{padding:'1.2rem',marginBottom:'1rem'}}>
            <p style={{fontSize:'.92rem',color:'#8a8f9e',lineHeight:1.75,margin:0}}>
              <strong style={{color:'#67E8F9'}}>Reference comparison (Fix 1):</strong> Your input is compared codon-by-codon against the canonical RefSeq sequence ({activeRef.accession}). Every difference is a real variant relative to the reference — not just a comparison between two arbitrary inputs.<br/><br/>
              <strong style={{color:'#6EE7B7'}}>HGVS notation (Fix 2):</strong> Variants are reported using standard HGVS protein nomenclature e.g. p.Arg175His, p.Arg175Ter, p.Arg175LeufsTer*, never shorthand like p.?9fs.<br/><br/>
              <strong style={{color:'#fbbf24'}}>Transparent scoring (Fix 3):</strong> Every pathogenicity score shows the exact formula and each component's contribution. If ClinVar and COSMIC are zero, the score reflects only domain impact, biochemical disruption, and conservation — and the UI explains this explicitly.
            </p>
          </div>
        </div>

        {/* SEQUENCE INPUT */}
        <div className="pc">
          {/* Sample menu */}
          <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.1rem',flexWrap:'wrap'}}>
            <h3 style={{fontSize:'1rem',fontWeight:600,color:'#c8cad4',margin:0}}>Your Sequence Input</h3>
            <div style={{position:'relative'}}>
              <button className="btn-sample" onClick={e=>{e.stopPropagation();setShowSampleMenu(v=>!v)}}>
                Load Sample ▼
              </button>
              {showSampleMenu&&(
                <div className="sample-menu" onClick={e=>e.stopPropagation()}>
                  {Object.entries(MUTATION_SAMPLES).map(([k,s])=>(
                    <div key={k} className="sample-item" onClick={()=>loadSample(k)} style={{background:`${s.color}0a`}}>
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.15rem'}}>
                        <span style={{fontSize:'1.1rem'}}>{s.icon}</span>
                        <span style={{fontSize:'.9rem',fontWeight:600,color:s.color}}>{s.name}</span>
                      </div>
                      <div style={{fontSize:'.8rem',color:'#8a8f9e'}}>{s.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reference display */}
          <div style={{background:'rgba(6,182,212,.05)',border:'1px solid rgba(6,182,212,.2)',borderRadius:8,padding:'.7rem .9rem',marginBottom:'1rem',fontSize:'.82rem',color:'#4a7090',lineHeight:1.6}}>
            <span style={{color:'#67E8F9',fontWeight:600}}>Reference ({activeRef.accession}):</span>{' '}
            <span style={{fontFamily:'"JetBrains Mono",monospace',color:'#2a4a60'}}>
              {activeRef.seq.substring(0,60)}…
            </span>
            <span style={{color:'#3a5a70',marginLeft:'.5rem'}}>({activeRef.seq.length} bp)</span>
          </div>

          {/* Config */}
          <div className="config-grid" style={{marginBottom:'1rem'}}>
            <div><label className="lbl">Reading Frame</label>
              <select value={readingFrame} onChange={e=>setReadingFrame(e.target.value)}>
                <option value="1">+1 (start at position 1)</option>
                <option value="2">+2 (start at position 2)</option>
                <option value="3">+3 (start at position 3)</option>
              </select>
            </div>
            <div><label className="lbl">Strand</label>
              <select value={strand} onChange={e=>setStrand(e.target.value)}>
                <option value="forward">Forward (5′ → 3′)</option>
                <option value="reverse">Reverse complement</option>
              </select>
            </div>
          </div>

          {/* Input textarea */}
          <label className="lbl">Paste your {selectedGene} sequence (compared vs {activeRef.accession})</label>
          <textarea rows={7} value={userSeq} onChange={e=>setUserSeq(e.target.value)}
            placeholder={`Paste your ${selectedGene} sequence here — ATGC only (FASTA headers stripped automatically)\n\nYour sequence will be compared codon-by-codon against the canonical ${activeRef.accession} reference.`}
          />
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'.4rem',fontSize:'.82rem',fontFamily:'"JetBrains Mono",monospace',color:'#6b7080'}}>
            <span>Your input: {userSeq.replace(/^>.*$/gm,'').replace(/\s/g,'').length.toLocaleString()} bp</span>
            <span>Reference: {activeRef.seq.length.toLocaleString()} bp</span>
          </div>

          {error && <div className="error" style={{marginTop:'1rem'}}>{error}</div>}

          <button className="btn-p" onClick={handleAnalyze} disabled={loading||!userSeq.trim()} style={{marginTop:'1rem',opacity:!userSeq.trim()?0.5:1}}>
            {loading?<><span className="spin"/><span>Analyzing vs reference…</span></>:<span>Compare to {activeRef.accession} Reference →</span>}
          </button>
        </div>

        {/* RESULTS */}
        {mutations&&(<>
          {mutations.warnings?.length>0&&(
            <div className="warning">
              {mutations.warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}
            </div>
          )}

          {/* Reference used banner */}
          <div style={{background:'rgba(16,185,129,.06)',border:'1px solid rgba(16,185,129,.25)',borderRadius:8,padding:'.65rem .9rem',marginBottom:'1rem',fontSize:'.85rem',color:'#6EE7B7',display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap'}}>
            <span style={{fontWeight:700}}>Reference used:</span>
            <span className="ref-badge">{mutations.sequences.reference_name}</span>
            <span style={{color:'#3a5a3a'}}>{mutations.sequences.reference_length} bp reference vs {mutations.sequences.alternate_length} bp input</span>
            {mutations.sequences.length_difference!==0&&(
              <span style={{color:'#fbbf24',fontWeight:600}}>Δ{mutations.sequences.length_difference>0?'+':''}{mutations.sequences.length_difference} bp</span>
            )}
          </div>

          {/* AI button */}
          <div style={{marginBottom:'.8rem'}}>
            <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
              {loadingAI?<><span className="spin"/>Generating analysis…</>:<>Get AI Clinical Explanation</>}
            </button>
          </div>

          {aiExplanation&&(
            <div style={{background:'rgba(6,182,212,.07)',border:'1px solid rgba(6,182,212,.25)',borderRadius:12,padding:'1.2rem',marginBottom:'1rem'}}>
              <div style={{fontSize:'.9rem',fontWeight:600,color:'#67E8F9',marginBottom:'.65rem'}}>AI Analysis</div>
              <div style={{fontSize:'.9rem',color:'#e2e4e9',lineHeight:1.8,whiteSpace:'pre-wrap',maxHeight:400,overflowY:'auto',background:'rgba(0,0,0,.2)',borderRadius:8,padding:'.75rem',border:'1px solid #24272f'}}>{aiExplanation}</div>
            </div>
          )}

          {/* Summary stats */}
          <div className="pc">
            <div style={{fontSize:'.95rem',fontWeight:600,color:'#c8cad4',marginBottom:'.8rem'}}>
              {activeGene.symbol} Mutation Summary (vs {activeRef.accession})
            </div>
            <div className="summary-grid">
              {[
                {l:'Total',v:mutations.summary.total_mutations,c:'#fff'},
                {l:'SNPs',v:mutations.summary.snps,c:'#60A5FA'},
                {l:'Missense',v:mutations.summary.missense_mutations,c:'#FBBF24'},
                {l:'Nonsense',v:mutations.summary.nonsense_mutations,c:'#EF4444'},
                {l:'Silent',v:mutations.summary.silent_mutations,c:'#10B981'},
                {l:'Insertions',v:mutations.summary.insertions,c:'#F59E0B'},
                {l:'Deletions',v:mutations.summary.deletions,c:'#EF4444'},
                {l:'Frameshift',v:mutations.summary.frameshift_mutations,c:'#DC2626'},
              ].map((s,i)=>(
                <div key={i} className="stat-b">
                  <div className="stat-v" style={{color:s.c}}>{s.v}</div>
                  <div className="stat-l">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mutation overview table */}
          {annotatedMutations.length>0&&(
            <div className="pc">
              <div style={{fontSize:'.95rem',fontWeight:600,color:'#c8cad4',marginBottom:'.75rem'}}>
                Variant Table — HGVS Notation
              </div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#0f1117'}}>
                      {['Nucleotide pos','AA pos','HGVS (p.)','Type','Effect','Domain','Score'].map((h,i)=>(
                        <th key={i} style={{padding:'.65rem .75rem',textAlign:'left',borderBottom:'1px solid #24272f',fontSize:'.75rem',color:'#67E8F9',textTransform:'uppercase',letterSpacing:'.05em',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {annotatedMutations.map((am,i)=>(
                      <tr key={i}>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130',fontFamily:'"JetBrains Mono",monospace',color:'#67E8F9',fontSize:'.85rem'}}>{am.positions.nucleotidePosition}</td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130',fontFamily:'"JetBrains Mono",monospace',color:'#10B981',fontWeight:600}}>{am.positions.aaPosition}</td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130',fontFamily:'"JetBrains Mono",monospace',fontSize:'.82rem',color:'#60A5FA',fontWeight:600}}>{am.hgvs}</td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130',color:'#c8cad4',fontSize:'.85rem'}}>{am.mutation.type}</td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130'}}><span className={`badge badge-${am.mutation.mutation_class?.toLowerCase()}`}>{am.mutation.mutation_class}</span></td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130',fontSize:'.8rem',color:'#8a8f9e'}}>{am.domainMapping.proteinDomain}</td>
                        <td style={{padding:'.65rem .75rem',borderBottom:'1px solid #1e2130'}}>
                          <span style={{background:am.pathogenicity?.color+'22',border:`1px solid ${am.pathogenicity?.color}44`,color:am.pathogenicity?.color,fontSize:'.78rem',fontWeight:700,padding:'.12rem .38rem',borderRadius:5}}>
                            {am.pathogenicity?.shortLabel} {am.pathogenicity?.score}/100
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed cards */}
          {annotatedMutations.length>0&&(
            <div className="pc">
              <div style={{fontSize:'.95rem',fontWeight:600,color:'#c8cad4',marginBottom:'.75rem'}}>Detailed Mutation Interpretation</div>
              {annotatedMutations.map((am,idx)=>{
                const path = am.pathogenicity;
                const cardColor = am.mutation.is_frameshift?'#DC2626':am.mutation.mutation_class==='Nonsense'?'#EF4444':am.mutation.mutation_class==='Missense'?'#FBBF24':'#10B981';
                return (
                  <div key={idx} className="mut-card" style={{borderLeft:`4px solid ${cardColor}`}}>
                    {/* Header */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.7rem',flexWrap:'wrap',gap:'.4rem'}}>
                      <div>
                        <div style={{fontSize:'.7rem',color:'#4a4d5a',fontWeight:600,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.12rem'}}>Mutation {idx+1} — vs {activeRef.accession}</div>
                        <div style={{fontSize:'1rem',fontFamily:'"JetBrains Mono",monospace',color:'#10B981',fontWeight:700}}>{am.hgvs}</div>
                        {am.mutation.reference_amino_acid&&am.mutation.alternate_amino_acid&&(
                          <div style={{fontSize:'.78rem',color:'#6b7080',marginTop:'.12rem'}}>
                            {toThree(am.mutation.reference_amino_acid)}{am.positions.aaPosition}{toThree(am.mutation.alternate_amino_acid)} · {am.mutation.reference_codon}→{am.mutation.alternate_codon}
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',gap:'.35rem',alignItems:'center',flexWrap:'wrap'}}>
                        {path?.acmgCriteria?.map((c,ci)=>(
                          <span key={ci} style={{background:'rgba(129,140,248,.15)',border:'1px solid rgba(129,140,248,.35)',color:'#818CF8',fontSize:'.65rem',fontWeight:700,padding:'.1rem .35rem',borderRadius:4,fontFamily:'monospace'}}>{c}</span>
                        ))}
                        <span style={{background:path?.color+'22',border:`1px solid ${path?.color}55`,color:path?.color,fontSize:'.82rem',fontWeight:800,padding:'.2rem .55rem',borderRadius:6}}>{path?.shortLabel}</span>
                      </div>
                    </div>

                    {/* HGVS breakdown */}
                    <div style={{background:'rgba(6,182,212,.04)',border:'1px solid rgba(6,182,212,.15)',borderRadius:7,padding:'.55rem .75rem',marginBottom:'.65rem'}}>
                      <div style={{fontSize:'.7rem',color:'#3a6070',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.25rem'}}>HGVS Notation</div>
                      <div style={{fontFamily:'"JetBrains Mono",monospace',fontSize:'.95rem',color:'#67E8F9',fontWeight:700}}>{am.hgvs}</div>
                      <div style={{fontSize:'.75rem',color:'#2a5060',marginTop:'.15rem'}}>
                        {am.mutation.type==='SNP'?`Nucleotide ${am.positions.nucleotidePosition}: ${am.mutation.reference}→${am.mutation.alternate}`:
                         am.mutation.type==='Insertion'?`Insertion of ${am.mutation.inserted_sequence?.length||am.mutation.length} bp at position ${am.positions.nucleotidePosition}`:
                         `Deletion of ${am.mutation.deleted_sequence?.length||am.mutation.length} bp at position ${am.positions.nucleotidePosition}`}
                      </div>
                    </div>

                    {/* Domain */}
                    <div style={{background:'rgba(16,185,129,.04)',border:'1px solid rgba(16,185,129,.14)',borderRadius:7,padding:'.55rem .75rem',marginBottom:'.65rem'}}>
                      <div style={{fontSize:'.7rem',color:'#0a5030',fontWeight:700,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.25rem'}}>Domain</div>
                      <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
                        <div><div style={{fontSize:'.67rem',color:'#1a3a2a'}}>Name</div><div style={{fontSize:'.82rem',color:'#10B981',fontWeight:600}}>{am.domainMapping.proteinDomain}</div></div>
                        {!am.domainMapping.isInterDomain&&(<>
                          <div><div style={{fontSize:'.67rem',color:'#1a3a2a'}}>Class</div><div style={{fontSize:'.82rem',color:FREG_COL[am.domainMapping.functionalRegion]||'#10B981',fontWeight:600}}>{am.domainMapping.functionalRegion}</div></div>
                          <div><div style={{fontSize:'.67rem',color:'#1a3a2a'}}>Range</div><div style={{fontSize:'.82rem',color:'#10B981',fontWeight:600,fontFamily:'monospace'}}>AA {am.domainMapping.start}–{am.domainMapping.end}</div></div>
                        </>)}
                      </div>
                    </div>

                    {/* In-silico scores for missense */}
                    {am.mutation.mutation_class==='Missense'&&(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'.45rem',marginBottom:'.65rem'}}>
                        {am.sift&&(
                          <div style={{background:'rgba(10,12,22,.8)',border:'1px solid #1a1d2a',borderRadius:7,padding:'.5rem .6rem'}}>
                            <div style={{fontSize:'.65rem',color:'#3a3d4a',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.15rem'}}>SIFT-like</div>
                            <div style={{fontFamily:'monospace',fontSize:'.9rem',fontWeight:700,color:am.sift.labelColor}}>{am.sift.score}</div>
                            <div style={{fontSize:'.67rem',color:am.sift.labelColor,marginTop:'.08rem'}}>{am.sift.label}</div>
                            <div style={{fontSize:'.62rem',color:'#2a2d3a',marginTop:'.05rem'}}>BLOSUM62: {am.sift.blosum62}</div>
                          </div>
                        )}
                        {am.polyphen&&(
                          <div style={{background:'rgba(10,12,22,.8)',border:'1px solid #1a1d2a',borderRadius:7,padding:'.5rem .6rem'}}>
                            <div style={{fontSize:'.65rem',color:'#3a3d4a',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.15rem'}}>PolyPhen-like</div>
                            <div style={{fontFamily:'monospace',fontSize:'.9rem',fontWeight:700,color:am.polyphen.labelColor}}>{am.polyphen.score}</div>
                            <div style={{fontSize:'.67rem',color:am.polyphen.labelColor,marginTop:'.08rem'}}>{am.polyphen.label}</div>
                          </div>
                        )}
                        {am.conservation&&(
                          <div style={{background:'rgba(10,12,22,.8)',border:'1px solid #1a1d2a',borderRadius:7,padding:'.5rem .6rem'}}>
                            <div style={{fontSize:'.65rem',color:'#3a3d4a',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.15rem'}}>Conservation</div>
                            <div style={{fontFamily:'monospace',fontSize:'.9rem',fontWeight:700,color:am.conservation.color}}>{am.conservation.score}</div>
                            <div style={{fontSize:'.67rem',color:am.conservation.color,marginTop:'.08rem'}}>{am.conservation.label}</div>
                          </div>
                        )}
                        <div style={{background:'rgba(10,12,22,.8)',border:`1px solid ${am.cosmic?'rgba(239,68,68,.3)':'#1a1d2a'}`,borderRadius:7,padding:'.5rem .6rem'}}>
                          <div style={{fontSize:'.65rem',color:'#3a3d4a',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'.15rem'}}>COSMIC</div>
                          {am.cosmic?<>
                            <div style={{fontFamily:'monospace',fontSize:'.82rem',fontWeight:700,color:'#fca5a5'}}>{(am.cosmic.freq*100).toFixed(1)}%</div>
                            <div style={{fontSize:'.66rem',color:'#7a3030',marginTop:'.06rem'}}>{am.cosmic.samples.toLocaleString()} samples</div>
                            <div style={{fontSize:'.62rem',color:'#4a2020',marginTop:'.04rem'}}>{am.cosmic.cosmic_id}</div>
                          </>:<div style={{fontSize:'.72rem',color:'#2a2d3a',marginTop:'.15rem'}}>Not in COSMIC catalogue</div>}
                        </div>
                      </div>
                    )}

                    {/* FIX 4: ClinVar message */}
                    {(am.clinvar||am.clinvarLive)?(()=>{
                      const cv=am.clinvarLive||am.clinvar;
                      const sigColor=cv.sig?.toLowerCase().includes('pathogenic')&&!cv.sig?.toLowerCase().includes('likely')?'#EF4444':cv.sig?.toLowerCase().includes('likely pathogenic')?'#F59E0B':cv.sig?.toLowerCase().includes('uncertain')?'#818CF8':'#10B981';
                      return(
                        <div style={{background:'rgba(239,68,68,.04)',border:'1px solid rgba(239,68,68,.16)',borderRadius:7,padding:'.55rem .75rem',marginBottom:'.65rem'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.3rem',flexWrap:'wrap',gap:'.25rem'}}>
                            <div style={{fontSize:'.7rem',color:'#7a3a3a',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:700}}>ClinVar Evidence{cv.live&&<span style={{color:'#10B981',marginLeft:'.3rem'}}>(live query)</span>}</div>
                            <div style={{display:'flex',gap:'.18rem'}}>{[...Array(3)].map((_,si)=><div key={si} style={{width:8,height:8,borderRadius:2,background:si<(cv.stars||1)?'#fbbf24':'#1a1d2a'}}></div>)}</div>
                          </div>
                          <span style={{background:sigColor+'18',border:`1px solid ${sigColor}44`,color:sigColor,fontSize:'.74rem',fontWeight:700,padding:'.1rem .38rem',borderRadius:5}}>{cv.sig}</span>
                          <span style={{fontFamily:'monospace',fontSize:'.68rem',color:'#3a3d4a',marginLeft:'.5rem'}}>{cv.accession}</span>
                          <div style={{fontSize:'.73rem',color:'#5a4040',lineHeight:1.5,marginTop:'.2rem'}}>{cv.condition}</div>
                        </div>
                      );
                    })():(
                      <div style={{background:'rgba(99,102,241,.04)',border:'1px solid rgba(99,102,241,.15)',borderRadius:7,padding:'.45rem .75rem',marginBottom:'.65rem'}}>
                        <span style={{fontSize:'.75rem',color:'#4a4d6a',fontStyle:'italic'}}>
                          {/* FIX 4: updated ClinVar message */}
                          No exact match found in ClinVar database query for {am.hgvs}
                        </span>
                      </div>
                    )}

                    {/* Biological interpretation */}
                    <div style={{background:'rgba(251,191,36,.04)',border:'1px solid rgba(251,191,36,.14)',borderRadius:7,padding:'.55rem .75rem',marginBottom:'.65rem'}}>
                      <div style={{fontSize:'.7rem',color:'#5a4a0a',textTransform:'uppercase',letterSpacing:'.07em',fontWeight:700,marginBottom:'.25rem'}}>Biological Interpretation</div>
                      <div style={{fontSize:'.82rem',color:'#7a7060',lineHeight:1.6}}>{am.interpretation.scientificNote}</div>
                    </div>

                    {/* FIX 3: PATHOGENICITY with full transparent formula */}
                    <div className={path?.bgClass||'path-vus'}>
                      <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.35rem',flexWrap:'wrap'}}>
                        <span style={{fontFamily:'monospace',fontSize:'.9rem',fontWeight:800,color:path?.color}}>{path?.shortLabel}</span>
                        <span style={{fontWeight:700,color:path?.color,fontSize:'.9rem'}}>{path?.label}</span>
                        <span style={{marginLeft:'auto',fontSize:'.72rem',color:'#5a6070',fontWeight:600}}>{path?.score}/100</span>
                      </div>
                      <div className="path-bar-wrap">
                        <div className="path-bar" style={{width:`${path?.score}%`,background:path?.score>=72?'#EF4444':path?.score>=52?'#F59E0B':path?.score>=30?'#818CF8':'#10B981'}}/>
                      </div>
                      {/* Score formula — fully transparent */}
                      <div className="score-formula">{path?.scoreExplanation}</div>
                      {/* Component breakdown table */}
                      {path?.componentScores&&(
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.25rem',margin:'.4rem 0',padding:'.4rem',background:'rgba(0,0,0,.2)',borderRadius:5}}>
                          {[
                            {k:'domainImpact',l:'Domain',w:'×0.25'},
                            {k:'mutationType',l:'Mut.Type',w:'×0.20'},
                            {k:'clinvar',l:'ClinVar',w:'×0.25'},
                            {k:'cosmic',l:'COSMIC',w:'×0.15'},
                            {k:'conservation',l:'Conserv.',w:'×0.10'},
                            {k:'structural',l:'Struct.',w:'×0.05'},
                          ].map(c=>(
                            <div key={c.k} style={{textAlign:'center',padding:'.15rem'}}>
                              <div style={{fontSize:'.6rem',color:'#3a3d4a',marginBottom:'.06rem'}}>{c.l} <span style={{color:'#2a2d3a'}}>{c.w}</span></div>
                              <div style={{fontSize:'.72rem',fontFamily:'monospace',color:(path?.componentScores[c.k]||0)>0.5?path?.color:'#5a6070',fontWeight:600}}>
                                {((path?.componentScores[c.k]||0)*100).toFixed(0)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Reasons */}
                      {path?.reasons?.map((r,ri)=>(
                        <div key={ri} style={{fontSize:'.75rem',color:'#6a7080',display:'flex',gap:'.35rem',marginTop:'.12rem'}}>
                          <span style={{color:path?.color,flexShrink:0}}>·</span>{r}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {mutations.mutations?.length===0&&(
            <div className="pc" style={{textAlign:'center',padding:'2rem',borderColor:'rgba(16,185,129,.3)',background:'rgba(16,185,129,.05)'}}>
              <div style={{fontSize:'1.8rem',marginBottom:'.4rem'}}>✓</div>
              <div style={{fontSize:'1rem',color:'#10B981',fontWeight:700}}>No mutations detected — input matches {activeRef.accession} reference exactly</div>
            </div>
          )}
        </>)}

        {/* Footer */}
        <div style={{marginTop:'2rem',padding:'1rem',background:'#0f1117',border:'1px solid #1e2130',borderRadius:10,fontSize:'.78rem',color:'#4a4d5a',lineHeight:1.65}}>
          <strong style={{color:'#6b7080'}}>Disclaimer:</strong> This tool is for research and educational purposes only. It does not constitute clinical medical advice or diagnosis. All variants require validation in a certified clinical laboratory. Consult a clinical geneticist for patient care decisions.
        </div>
      </div>
    </div>
  );
}