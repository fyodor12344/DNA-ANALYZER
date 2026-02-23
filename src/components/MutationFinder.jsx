import React, { useState, useEffect, useRef, useCallback } from 'react';

const EMBEDDED_PDB = {
  TP53: "REMARK  TP53 DNA Binding Domain - Domain-accurate CA trace\nREMARK  Based on PDB 2OCJ structural topology\nATOM      1  CA  GLY A 113       3.459  -1.900  -0.675  1.00 30.00           C\nATOM      2  CA  SER A 114       6.294  -0.954  -0.145  1.00 30.00           C\nEND",
};

const GENE_PANEL = {
  TP53: {
    id: 'NM_000546.6', symbol: 'TP53', name: 'Tumor Protein p53',
    fullName: 'Human TP53 tumor protein p53 transcript variant 1',
    type: 'Tumor Suppressor', chromosome: '17p13.1', proteinLength: 393,
    color: '#06B6D4', icon: '🧬',
    cancerAssociations: ['Lung cancer', 'Colorectal cancer', 'Breast cancer', 'Li-Fraumeni syndrome', 'Ovarian cancer', 'Leukemia'],
    clinicalContext: 'Most frequently mutated gene in human cancers (~50% of all tumors). Loss of p53 function abrogates cell cycle arrest and apoptosis in response to DNA damage.',
    domains: [
      { name: 'Transactivation Domain', start: 1, end: 93, functionalRegion: 'Critical', description: 'Required for p53-mediated transcriptional activation', detail: 'Contains the MDM2-binding site (aa 18–26) and two sub-domains (AD1: 1–40, AD2: 40–67). Key residues: L22, W23, L25, L26 contact TFIID and CBP/p300.' },
      { name: 'Proline-Rich Domain', start: 64, end: 92, functionalRegion: 'Structural', description: 'Important for p53 apoptotic function', detail: 'Contains five PXXP motifs that interact with SH3 domain proteins. Required for apoptosis but not cell cycle arrest. Residues P72 and P47 are common polymorphism sites.' },
      { name: 'DNA Binding Domain', start: 102, end: 292, functionalRegion: 'Critical', description: 'Essential for sequence-specific DNA binding and tumor suppression', detail: 'β-sandwich scaffold (S1–S10) with four loops (L1–L4) and helix H2 that contact DNA. Hotspot residues: R175, G245, R248, R249, R273, R282. Zinc ion coordinated by C176, H179, C238, C242.' },
      { name: 'Nuclear Localization Signal', start: 316, end: 325, functionalRegion: 'Critical', description: 'Directs p53 to nucleus', detail: 'Three overlapping NLS sequences (NLS1: 305–306, NLS2: 370–380, NLS3: 379–384) bind importin-α for nuclear import. Mutations here cause cytoplasmic sequestration.' },
      { name: 'Oligomerization Domain', start: 323, end: 356, functionalRegion: 'Structural', description: 'Required for p53 tetramerization', detail: 'Forms dimers via β-strand (aa 326–333) and α-helix (aa 335–354). Two dimers assemble into the active tetramer. L330, R333, E343, L344, R342 are key interface residues.' },
      { name: 'Regulatory Domain', start: 356, end: 393, functionalRegion: 'Regulatory', description: 'Negatively regulates p53 DNA binding', detail: 'Contains multiple post-translational modification sites: K370, K372, K373, K381, K382, K386 (acetylation by CBP/p300). S371, S375, S378 (phosphorylation by CHK2). Interacts with S100 proteins.' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `TP53 missense mutations in the ${domainName} are among the most oncogenic alterations in human cancer.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating TP53 mutations result in complete loss of tumor suppressor activity.';
      return 'TP53 variants should be evaluated in the context of the full mutational landscape.';
    },
    pdb: { id: '2OCJ', name: 'p53 DNA-binding domain bound to DNA', url: 'https://www.rcsb.org/3d-view/2OCJ', description: 'Crystal structure of TP53 DBD tetramer bound to full-site DNA (2.05Å resolution)' }
  },
  BRCA1: {
    id: 'NM_007294.4', symbol: 'BRCA1', name: 'Breast Cancer Gene 1',
    fullName: 'Human BRCA1 DNA repair associated transcript variant 1',
    type: 'Tumor Suppressor', chromosome: '17q21.31', proteinLength: 1863,
    color: '#EC4899', icon: '🎀',
    cancerAssociations: ['Hereditary breast cancer', 'Ovarian cancer', 'Fallopian tube cancer', 'Peritoneal cancer', 'Pancreatic cancer'],
    clinicalContext: 'Germline BRCA1 mutations confer 57–65% lifetime risk of breast cancer and 39–46% risk of ovarian cancer.',
    domains: [
      { name: 'RING Domain', start: 1, end: 109, functionalRegion: 'Critical', description: 'E3 ubiquitin ligase activity; interacts with BARD1', detail: 'RING finger (aa 8–98) coordinates two zinc ions via eight cysteine/histidine residues (C24, C27, H41, C44, C61, C64, H74, C77). Forms obligate heterodimer with BARD1 via C-terminal helix.' },
      { name: 'RING-NBD Linker', start: 110, end: 202, functionalRegion: 'Structural', description: 'Connects RING domain to nuclear export signals', detail: 'Contains NES1 (aa 22–30) and NES2 (aa 81–99) for CRM1-dependent nuclear export. Phosphorylation by CDK2 at S127 promotes nuclear retention during S phase.' },
      { name: 'Coiled-Coil Domain', start: 1364, end: 1437, functionalRegion: 'Structural', description: 'Mediates interaction with PALB2 for HR repair', detail: 'Leucine zipper-like coiled-coil interacts with PALB2 WD40 domain. This interaction is essential for BRCA2 recruitment to DSB sites. Key residues: L1396, I1399, L1403, M1410.' },
      { name: 'BRCT Domain 1', start: 1642, end: 1736, functionalRegion: 'Critical', description: 'Phosphoprotein binding; essential for DNA damage response', detail: 'BRCT1 phosphopeptide binding groove (K1702, T1700, S1655) recognizes pSXXF motifs on BACH1/FANCJ, CtIP, and Abraxas. Missense mutations (M1775R, Y1853C) disrupt this binding.' },
      { name: 'BRCT Domain 2', start: 1756, end: 1855, functionalRegion: 'Critical', description: 'Tandem BRCT repeat; recruits repair factors to DSBs', detail: 'BRCT2 packs against BRCT1 via an inter-domain linker helix. Together they form the tandem BRCT phosphopeptide receptor. BRCT2 provides additional hydrophobic contacts: W1837, A1789.' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === 'Missense') return `BRCA1 missense mutations in the ${domainName} may disrupt homologous recombination repair.`;
      if (mutClass === 'Nonsense' || mutClass === 'Frameshift') return 'Truncating BRCA1 mutations are strongly associated with HBOC syndrome.';
      return 'BRCA1 variants require clinical classification using multifactorial likelihood models.';
    },
    pdb: { id: '1JNX', name: 'BRCA1 BRCT tandem domain', url: 'https://www.rcsb.org/3d-view/1JNX', description: 'Crystal structure of BRCA1 tandem BRCT domains (1.85Å)' }
  },
  KRAS: {
    id: 'NM_004985.5', symbol: 'KRAS', name: 'Kirsten RAS Proto-Oncogene',
    fullName: 'Human KRAS proto-oncogene GTPase transcript variant b',
    type: 'Oncogene', chromosome: '12p12.1', proteinLength: 189,
    color: '#F59E0B', icon: '⚡',
    cancerAssociations: ['Pancreatic ductal adenocarcinoma (>90%)', 'Colorectal cancer', 'Non-small cell lung cancer', 'Thyroid cancer', 'Biliary tract cancer'],
    clinicalContext: 'KRAS is the most commonly mutated oncogene in human cancer. Activating mutations lock KRAS in the GTP-bound active state.',
    domains: [
      { name: 'P-loop (G1)', start: 10, end: 17, functionalRegion: 'Critical', description: 'GTP/GDP phosphate binding; hotspot for G12 and G13 mutations', detail: 'Also called Walker A motif (GXXXXGKS/T). G12 and G13 mutations abolish GAP-stimulated GTPase activity by steric clash with R789 of GAP. G12C mutation creates a covalent pocket exploited by sotorasib (AMG-510).' },
      { name: 'Switch I (G2)', start: 30, end: 40, functionalRegion: 'Critical', description: 'Effector binding region; changes conformation upon GTP hydrolysis', detail: 'Residues 30–40 undergo dramatic conformational change between GDP and GTP states. In GTP-bound form, contacts effectors RAF, PI3K, RALGDS via D33, I36, T35, Y40. T35 coordinates Mg²⁺ and γ-phosphate.' },
      { name: 'Switch II (G3)', start: 57, end: 76, functionalRegion: 'Critical', description: 'GAP interaction site; Q61 is a major mutation hotspot', detail: 'Q61 is the catalytic glutamine that activates the water molecule for GTP hydrolysis. Q61 mutations (Q61H, Q61L, Q61R, Q61K) reduce intrinsic and GAP-stimulated GTPase activity >1000-fold. A59 forms van der Waals contacts with γ-phosphate.' },
      { name: 'G4 Motif', start: 116, end: 119, functionalRegion: 'Structural', description: 'Guanine base recognition', detail: 'NKXD motif (N116, K117, D119) provides specificity for guanine over adenine. D119 makes two hydrogen bonds to N1 and N2 of guanine. Mutations here would lose guanine specificity.' },
      { name: 'G5 Motif', start: 145, end: 147, functionalRegion: 'Structural', description: 'Guanine base specificity', detail: 'SAK/SAL motif. A146 and K147 contact the guanine O6 and N7 positions. A146T/V mutations have been found in colorectal cancer.' },
      { name: 'Hypervariable Region', start: 167, end: 189, functionalRegion: 'Regulatory', description: 'Membrane anchoring; CAAX motif for farnesylation', detail: 'CAAX box (C185-A186-V187-M188 or C185-A186-I187-M188) is farnesylated at C185 by farnesyltransferase, then proteolyzed and carboxymethylated. This is the basis for the failed farnesyltransferase inhibitor drug class.' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('P-loop')) return 'Mutations at KRAS G12 and G13 (P-loop) are the most clinically significant. G12C is targetable by sotorasib.';
      if (mutClass === 'Missense') return `KRAS missense mutations in the ${domainName} may constitutively activate RAS-MAPK signaling.`;
      return 'KRAS mutations predict resistance to EGFR-targeted therapies.';
    },
    pdb: { id: '4OBE', name: 'KRAS G12C mutant with GDP', url: 'https://www.rcsb.org/3d-view/4OBE', description: 'Crystal structure of KRAS G12C bound to GDP (1.90Å)' }
  },
  EGFR: {
    id: 'NM_005228.5', symbol: 'EGFR', name: 'Epidermal Growth Factor Receptor',
    fullName: 'Human EGFR epidermal growth factor receptor transcript variant 1',
    type: 'Oncogene', chromosome: '7p11.2', proteinLength: 1210,
    color: '#8B5CF6', icon: '🔬',
    cancerAssociations: ['Non-small cell lung cancer (NSCLC)', 'Glioblastoma', 'Colorectal cancer', 'Head and neck squamous cell carcinoma'],
    clinicalContext: 'Activating EGFR mutations are found in ~15% of NSCLC. These mutations predict sensitivity to EGFR tyrosine kinase inhibitors.',
    domains: [
      { name: 'Signal Peptide', start: 1, end: 24, functionalRegion: 'Structural', description: 'Directs EGFR to cell membrane', detail: 'Cleaved co-translationally after Ala24. Hydrophobic core (L10–A21) inserts into ER membrane during translation. Loss of signal peptide causes cytoplasmic retention.' },
      { name: 'Extracellular Domain I', start: 25, end: 310, functionalRegion: 'Regulatory', description: 'Ligand binding domain; EGF interaction site', detail: 'L-domain fold (β-helix). EGF contacts residues L38, K465, I467, S468 in Domain I and Domain III. Domain I adopts a tethered conformation in the absence of ligand via a Domain II–IV autoinhibitory interaction.' },
      { name: 'Extracellular Domain II', start: 311, end: 481, functionalRegion: 'Structural', description: 'Dimerization arm; receptor activation interface', detail: 'Furin-like cysteine-rich domain. The β-hairpin dimerization arm (aa 242–259) mediates receptor–receptor contacts in the active dimer. Dimerization buries ~1600 Å² surface area.' },
      { name: 'Transmembrane Domain', start: 646, end: 667, functionalRegion: 'Structural', description: 'Membrane spanning helix', detail: 'Single-pass α-helix that transmits conformational changes across the membrane. Helix rotation model: V663, T654 mediate transmembrane domain dimerization in the active state.' },
      { name: 'Kinase Domain', start: 712, end: 979, functionalRegion: 'Critical', description: 'ATP binding and catalytic activity; major mutation hotspot (exons 18-21)', detail: 'Bilobal kinase fold. N-lobe (β-strands) and C-lobe (α-helices). ATP binds in the hinge region (M769, A767). Key mutations: exon 19 del (ELREA745–749del), L858R activating; T790M (gatekeeper) resistance to 1st/2nd gen TKIs; C797S resistance to osimertinib.' },
      { name: 'C-terminal Domain', start: 980, end: 1210, functionalRegion: 'Regulatory', description: 'Autophosphorylation sites; signal transduction scaffolding', detail: 'Contains 5 autophosphorylation sites: Y992, Y1045, Y1068, Y1086, Y1173. pY1068 recruits GRB2→SOS→RAS. pY1173 recruits SHC. pY992 recruits PLCγ. This domain is intrinsically disordered and acts as a signaling hub.' }
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes('Kinase')) return 'EGFR kinase domain mutations are the primary predictive biomarker for TKI therapy in NSCLC.';
      if (mutClass === 'Missense') return `EGFR missense mutations in the ${domainName} may alter receptor kinase activity.`;
      return 'EGFR mutation status is a mandatory biomarker test in newly diagnosed advanced NSCLC.';
    },
    pdb: { id: '2ITX', name: 'EGFR kinase domain with erlotinib', url: 'https://www.rcsb.org/3d-view/2ITX', description: 'EGFR kinase domain (L858R mutant) bound to erlotinib (2.60Å)' }
  }
};

const MUTATION_SAMPLES = {
  normal: { name: '✓ Normal (Wild-Type)', icon: '✓', color: '#10B981', reference: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', alternate: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', readingFrame: '1', strand: 'forward', description: '🧬 Identical Sequences – No Mutations' },
  snp: { name: '⚠ SNP (Missense)', icon: '⚠', color: '#F59E0B', reference: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', alternate: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG'.replace('CGC', 'CGT'), readingFrame: '1', strand: 'forward', description: '⚠️ Single Nucleotide Polymorphism (SNP)' },
  insertion: { name: '➕ Insertion', icon: '➕', color: '#3B82F6', reference: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', alternate: 'ATGGCCATTGTAATGGGCCGCTGAAACAAGGGTGCCCGATAG', readingFrame: '1', strand: 'forward', description: '➕ Insertion Mutation (3 nucleotides)' },
  frameshiftInsertion: { name: '🔴 Frameshift (Insertion)', icon: '🔴', color: '#DC2626', reference: 'ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG', alternate: 'ATGGCCATTGTAATGGGCCGCTGAACAAGGGTGCCCGATAG', readingFrame: '1', strand: 'forward', description: '🔴 Frameshift Mutation (2 bp Insertion)' }
};

const AA_PROPERTIES = {
  'A': { name: 'Alanine', size: 'small', polarity: 'nonpolar', charge: 'neutral' },
  'R': { name: 'Arginine', size: 'large', polarity: 'polar', charge: 'positive' },
  'N': { name: 'Asparagine', size: 'medium', polarity: 'polar', charge: 'neutral' },
  'D': { name: 'Aspartate', size: 'medium', polarity: 'polar', charge: 'negative' },
  'C': { name: 'Cysteine', size: 'small', polarity: 'polar', charge: 'neutral' },
  'E': { name: 'Glutamate', size: 'medium', polarity: 'polar', charge: 'negative' },
  'Q': { name: 'Glutamine', size: 'medium', polarity: 'polar', charge: 'neutral' },
  'G': { name: 'Glycine', size: 'small', polarity: 'nonpolar', charge: 'neutral' },
  'H': { name: 'Histidine', size: 'large', polarity: 'polar', charge: 'positive' },
  'I': { name: 'Isoleucine', size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'L': { name: 'Leucine', size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'K': { name: 'Lysine', size: 'large', polarity: 'polar', charge: 'positive' },
  'M': { name: 'Methionine', size: 'medium', polarity: 'nonpolar', charge: 'neutral' },
  'F': { name: 'Phenylalanine', size: 'large', polarity: 'nonpolar', charge: 'neutral' },
  'P': { name: 'Proline', size: 'small', polarity: 'nonpolar', charge: 'neutral' },
  'S': { name: 'Serine', size: 'small', polarity: 'polar', charge: 'neutral' },
  'T': { name: 'Threonine', size: 'small', polarity: 'polar', charge: 'neutral' },
  'W': { name: 'Tryptophan', size: 'large', polarity: 'nonpolar', charge: 'neutral' },
  'Y': { name: 'Tyrosine', size: 'large', polarity: 'polar', charge: 'neutral' },
  'V': { name: 'Valine', size: 'small', polarity: 'nonpolar', charge: 'neutral' },
  '*': { name: 'Stop', size: 'n/a', polarity: 'n/a', charge: 'n/a' }
};

const CODON_TABLE = {
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L', 'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*', 'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L', 'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q', 'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M', 'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K', 'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V', 'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E', 'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

const revComp = seq => { const comp = { A: 'T', T: 'A', G: 'C', C: 'G' }; return seq.split('').reverse().map(c => comp[c] || c).join(''); };
const translateCodon = codon => CODON_TABLE[codon] || '?';

const parseVCF = (vcfText) => {
  const lines = vcfText.split('\n'); const variants = []; const metaLines = []; const errors = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    if (line.startsWith('##')) { metaLines.push(line); continue; }
    if (line.startsWith('#CHROM') || line.startsWith('#chrom')) continue;
    const cols = line.split('\t');
    if (cols.length < 5) { errors.push(`Line ${i + 1}: Expected at least 5 columns, got ${cols.length}`); continue; }
    const [chrom, pos, id, ref, altRaw] = cols; const alts = altRaw.split(',');
    const cleanRef = ref.toUpperCase().replace(/[^ATGCN]/g, '');
    if (!cleanRef) { errors.push(`Line ${i + 1}: Invalid REF allele "${ref}"`); continue; }
    alts.forEach((alt, altIdx) => {
      const cleanAlt = alt.toUpperCase().replace(/[^ATGCN]/g, '');
      if (!cleanAlt) { errors.push(`Line ${i + 1}, ALT ${altIdx + 1}: Invalid ALT allele "${alt}"`); return; }
      variants.push({ chrom, pos: parseInt(pos), id: id === '.' ? `${chrom}:${pos}` : id, ref: cleanRef, alt: cleanAlt, rawLine: line, lineNumber: i + 1, isMultiAllelic: alts.length > 1, altIndex: altIdx });
    });
  }
  return { variants, metaLines, errors };
};

const calculatePositions = (nucleotidePos, frame) => {
  const offset = parseInt(frame) - 1; const adjustedPos = nucleotidePos - offset; const codonNumber = Math.floor(adjustedPos / 3) + 1;
  return { nucleotidePosition: nucleotidePos + 1, codonNumber, aaPosition: codonNumber, literaturePosition: codonNumber };
};

const generateHGVS = (mutation, positions, refSeq, frame, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53; const prefix = `${gene.id}:p.`;
  if (mutation.mutation_class === 'Silent') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}=`;
  if (mutation.mutation_class === 'Missense') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}${mutation.alternate_amino_acid}`;
  if (mutation.mutation_class === 'Nonsense') return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}*`;
  if (mutation.is_frameshift) { const aa = mutation.reference_amino_acid || '?'; return `${prefix}${aa}${positions.literaturePosition}fs`; }
  if (mutation.type === 'Insertion') { const aa = mutation.reference_amino_acid; return aa ? `${prefix}${aa}${positions.literaturePosition}_${positions.literaturePosition + 1}ins` : `${prefix}${positions.literaturePosition}_${positions.literaturePosition + 1}ins`; }
  if (mutation.type === 'Deletion') { const aa = mutation.reference_amino_acid; return aa ? `${prefix}${aa}${positions.literaturePosition}del` : `${prefix}${positions.literaturePosition}del`; }
  return `${prefix}?`;
};

const getDomainMapping = (aaPosition, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  for (const domain of gene.domains) {
    if (aaPosition >= domain.start && aaPosition <= domain.end) {
      return { proteinDomain: domain.name, functionalRegion: domain.functionalRegion, interpretation: `Mutation occurs inside functional domain: ${domain.description}`, start: domain.start, end: domain.end, isInterDomain: false };
    }
  }
  return { proteinDomain: 'Inter-domain region', functionalRegion: 'N/A', interpretation: `Mutation in inter-domain linker region of ${gene.symbol}`, isInterDomain: true };
};

const getBiologicalInterpretation = (mutation, domainMapping, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53;
  let interpretation = { mutationType: mutation.type, functionalEffect: mutation.mutation_class, confidence: 'High', confidenceReason: '', scientificNote: '', biochemicalAnalysis: null };
  if (mutation.mutation_class === 'Missense' && mutation.reference_amino_acid && mutation.alternate_amino_acid) {
    const refProps = AA_PROPERTIES[mutation.reference_amino_acid]; const altProps = AA_PROPERTIES[mutation.alternate_amino_acid];
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
  if (mutation.is_frameshift) { interpretation.scientificNote = `Frameshift disrupts downstream reading frame and likely truncates ${gene.symbol} protein. ${gene.getGeneNote('Frameshift', domainMapping.proteinDomain)}`; interpretation.confidenceReason = 'Frameshift detected via sequence length difference'; }
  if (mutation.mutation_class === 'Nonsense') { interpretation.scientificNote = `Premature stop codon produces truncated ${gene.symbol} protein. ${gene.getGeneNote('Nonsense', domainMapping.proteinDomain)}`; interpretation.confidenceReason = 'Stop codon introduced at defined position'; }
  if (mutation.mutation_class === 'Silent') { interpretation.scientificNote = `Synonymous substitution with no amino acid change in ${gene.symbol}. Unlikely to affect protein function.`; interpretation.confidenceReason = 'Synonymous codon change verified'; }
  return interpretation;
};

const scorePathogenicity = (mutation, domainMapping) => {
  let score = 0; const reasons = [];
  if (mutation.is_frameshift) return { level: 'PATHOGENIC', label: 'Pathogenic', color: '#EF4444', bgClass: 'path-pathogenic', score: 95, reasons: ['Frameshift disrupts downstream reading frame', 'Truncated/nonfunctional protein expected', 'Loss-of-function mutation'], shortLabel: 'P' };
  if (mutation.mutation_class === 'Nonsense') return { level: 'PATHOGENIC', label: 'Pathogenic', color: '#EF4444', bgClass: 'path-pathogenic', score: 90, reasons: ['Premature stop codon introduced', 'Protein function likely abolished', 'Nonsense-mediated mRNA decay possible'], shortLabel: 'P' };
  if (mutation.mutation_class === 'Silent') return { level: 'LIKELY_BENIGN', label: 'Likely Benign', color: '#10B981', bgClass: 'path-benign', score: 8, reasons: ['Synonymous change — protein sequence unchanged', 'No amino acid alteration', 'May rarely affect splicing (low probability)'], shortLabel: 'B' };
  if (mutation.mutation_class === 'Missense') {
    if (domainMapping.functionalRegion === 'Critical') { score += 35; reasons.push('In critical functional domain'); }
    else if (domainMapping.functionalRegion === 'Structural') { score += 20; reasons.push('In structural domain'); }
    else { score += 5; reasons.push('In inter-domain linker (lower risk)'); }
    const refP = mutation.reference_amino_acid ? AA_PROPERTIES[mutation.reference_amino_acid] : null;
    const altP = mutation.alternate_amino_acid ? AA_PROPERTIES[mutation.alternate_amino_acid] : null;
    if (refP && altP) {
      if (refP.charge !== altP.charge) { score += 25; reasons.push(`Charge change: ${refP.charge} → ${altP.charge}`); }
      if (refP.polarity !== altP.polarity) { score += 15; reasons.push(`Polarity change: ${refP.polarity} → ${altP.polarity}`); }
      if (refP.size !== altP.size) { score += 10; reasons.push(`Size change: ${refP.size} → ${altP.size}`); }
      if (refP.charge === altP.charge && refP.polarity === altP.polarity && refP.size === altP.size) { score -= 10; reasons.push('Conservative substitution (similar properties)'); }
    }
    if (mutation.alternate_amino_acid === 'P') { score += 10; reasons.push('Proline — known helix breaker'); }
    score = Math.max(0, Math.min(100, score));
    if (score >= 70) return { level: 'PATHOGENIC', label: 'Pathogenic', color: '#EF4444', bgClass: 'path-pathogenic', score, reasons, shortLabel: 'P' };
    if (score >= 45) return { level: 'LIKELY_PATHOGENIC', label: 'Likely Pathogenic', color: '#F59E0B', bgClass: 'path-likely', score, reasons, shortLabel: 'LP' };
    if (score >= 25) return { level: 'VUS', label: 'Uncertain Significance', color: '#818CF8', bgClass: 'path-vus', score, reasons, shortLabel: 'VUS' };
    return { level: 'LIKELY_BENIGN', label: 'Likely Benign', color: '#10B981', bgClass: 'path-benign', score, reasons, shortLabel: 'LB' };
  }
  score = domainMapping.functionalRegion === 'Critical' ? 55 : 30;
  reasons.push(domainMapping.functionalRegion === 'Critical' ? 'In-frame indel in critical domain' : 'In-frame indel — impact depends on position');
  if (score >= 45) return { level: 'LIKELY_PATHOGENIC', label: 'Likely Pathogenic', color: '#F59E0B', bgClass: 'path-likely', score, reasons, shortLabel: 'LP' };
  return { level: 'VUS', label: 'Uncertain Significance', color: '#818CF8', bgClass: 'path-vus', score, reasons, shortLabel: 'VUS' };
};

const MAX_SEQ_LENGTH = 5000;
const normalizeSequence = raw => { let s = raw.replace(/^>.*$/gm, ''); let out = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c !== ' ' && c !== '\n' && c !== '\r' && c !== '\t') out += c; } return out.toUpperCase(); };
const findFirstDifference = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) { if (a[i] !== b[i]) return i; } return -1; };

const detectMutations = (ref, alt, frame, strand) => {
  let seq1 = normalizeSequence(ref); let seq2 = normalizeSequence(alt);
  if (seq1.length > MAX_SEQ_LENGTH || seq2.length > MAX_SEQ_LENGTH) throw new Error(`Sequence too long (max ${MAX_SEQ_LENGTH.toLocaleString()} bp).`);
  if (strand === 'reverse') { seq1 = revComp(seq1); seq2 = revComp(seq2); }
  const lengthDiff = seq2.length - seq1.length; const mutations = []; const warnings = [];
  const offset = parseInt(frame) - 1;
  if (seq1.length % 3 !== 0) warnings.push('Reference sequence length not divisible by 3');
  if (lengthDiff !== 0 && Math.abs(lengthDiff) % 3 !== 0) warnings.push('Length difference suggests frameshift mutation');
  if (lengthDiff === 0) {
    for (let i = 0; i < seq1.length; i++) {
      if (seq1[i] !== seq2[i]) {
        const codonIndex = Math.floor((i - offset) / 3); const codonStart = codonIndex * 3 + offset;
        if (codonStart >= 0 && codonStart + 3 <= seq1.length) {
          const refCodon = seq1.substring(codonStart, codonStart + 3); const altCodon = seq2.substring(codonStart, codonStart + 3);
          if (refCodon.length === 3 && altCodon.length === 3) {
            const refAA = translateCodon(refCodon); const altAA = translateCodon(altCodon);
            let mutClass = 'Missense'; if (refAA === altAA) mutClass = 'Silent'; else if (altAA === '*') mutClass = 'Nonsense';
            if (!mutations.some(m => m.codon_position === codonStart)) {
              mutations.push({ type: 'SNP', position: i, codon_position: codonStart, reference: seq1[i], alternate: seq2[i], reference_codon: refCodon, alternate_codon: altCodon, reference_amino_acid: refAA, alternate_amino_acid: altAA, mutation_class: mutClass });
            }
          }
        }
      }
    }
  } else {
    let pLen = 0; const minLen = Math.min(seq1.length, seq2.length);
    while (pLen < minLen && seq1[pLen] === seq2[pLen]) pLen++;
    let e1 = seq1.length - 1, e2 = seq2.length - 1;
    while (e1 > pLen && e2 > pLen && seq1[e1] === seq2[e2]) { e1--; e2--; }
    const middle1 = seq1.slice(pLen, e1 + 1); const middle2 = seq2.slice(pLen, e2 + 1);
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
  const summary = { total_mutations: mutations.length, snps: mutations.filter(m => m.type === 'SNP').length, insertions: mutations.filter(m => m.type === 'Insertion').length, deletions: mutations.filter(m => m.type === 'Deletion').length, frameshift_mutations: mutations.filter(m => m.is_frameshift).length, silent_mutations: mutations.filter(m => m.mutation_class === 'Silent').length, missense_mutations: mutations.filter(m => m.mutation_class === 'Missense').length, nonsense_mutations: mutations.filter(m => m.mutation_class === 'Nonsense').length };
  return { mutations, summary, warnings, sequences: { reference: seq1, alternate: seq2, reference_length: seq1.length, alternate_length: seq2.length, length_difference: lengthDiff, reading_frame: frame, strand } };
};

const generatePDF = (analysisData, annotatedMutations, analysisParams, vcfMeta, geneKey = 'TP53') => {
  const gene = GENE_PANEL[geneKey] || GENE_PANEL.TP53; const date = new Date().toISOString().split('T')[0]; const timestamp = new Date().toLocaleString();
  let pdf = `${gene.symbol} MUTATION ANALYSIS REPORT\n${'='.repeat(80)}\n\n`;
  pdf += `Gene: ${gene.symbol} — ${gene.name}\nTranscript: ${gene.id}\nDate: ${timestamp}\n\n`;
  pdf += `SUMMARY\n${'-'.repeat(80)}\n`;
  pdf += `Total: ${analysisData.summary.total_mutations}\nSNPs: ${analysisData.summary.snps}\nMissense: ${analysisData.summary.missense_mutations}\nNonsense: ${analysisData.summary.nonsense_mutations}\nFrameshift: ${analysisData.summary.frameshift_mutations}\nSilent: ${analysisData.summary.silent_mutations}\n\n`;
  if (annotatedMutations?.length > 0) {
    pdf += `MUTATIONS\n${'='.repeat(80)}\n`;
    annotatedMutations.forEach((am, idx) => { pdf += `\nMutation ${idx + 1}: ${am.hgvs}\n`; pdf += `  Type: ${am.mutation.type} (${am.mutation.mutation_class})\n`; pdf += `  Domain: ${am.domainMapping.proteinDomain}\n`; pdf += `  Interpretation: ${am.interpretation.scientificNote}\n`; });
  }
  const blob = new Blob([pdf], { type: 'text/plain;charset=utf-8' }); const url = window.URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `${gene.symbol}_Mutation_Report_${date}.txt`; document.body.appendChild(link); link.click(); document.body.removeChild(link); window.URL.revokeObjectURL(url);
  return true;
};

/* ═══════════════════════════════════════════════════════════════════════════
   ENHANCED 3D STRUCTURE VIEWER WITH CLICK-TO-SELECT & DOMAIN INFO
   ═══════════════════════════════════════════════════════════════════════════ */
function StructureViewer({ gene, showRCSB, setShowRCSB, mutPins }) {
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const sceneStateRef = useRef(null);
  const [clickedDomain, setClickedDomain] = useState(null);
  const [isSpinning, setIsSpinning] = useState(true);
  const [hoveredDomain, setHoveredDomain] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Build segment list with domain info for raycasting
  // ─── CONTINUOUS BACKBONE BUILDER ───────────────────────────────────────────
  // Returns a flat array of {aa, x, y, z, ss, domain} with NO gaps.
  // Each point's y/z is computed from the PREVIOUS point's y/z, so the chain
  // is always connected. Helices and sheets use trig offsets relative to the
  // segment's own entry y/z so they also inherit continuity.
  const buildBackbone = useCallback((gene) => {
    // Secondary structure layout — just AA ranges + type + turns (no y/z here!)
    const SS_DEFS = {
      TP53: [
        {t:'loop', s:1,  e:30},  {t:'helix',s:30, e:55,  turns:2},
        {t:'loop', s:55, e:93},  {t:'sheet',s:102,e:125},
        {t:'loop', s:125,e:140}, {t:'sheet',s:140,e:162},
        {t:'loop', s:162,e:175}, {t:'helix',s:175,e:200, turns:3},
        {t:'loop', s:200,e:220}, {t:'sheet',s:220,e:240},
        {t:'loop', s:240,e:255}, {t:'sheet',s:255,e:275},
        {t:'loop', s:275,e:292}, {t:'loop', s:292,e:320},
        {t:'helix',s:320,e:356, turns:3}, {t:'loop',s:356,e:370},
        {t:'helix',s:370,e:393, turns:2},
      ],
      KRAS: [
        {t:'loop', s:1,  e:10},  {t:'helix',s:10, e:18, turns:1.2},
        {t:'sheet',s:18, e:30},  {t:'loop', s:30, e:42},
        {t:'sheet',s:42, e:57},  {t:'loop', s:57, e:76},
        {t:'helix',s:76, e:93,  turns:2}, {t:'sheet',s:93,e:116},
        {t:'loop', s:116,e:130}, {t:'helix',s:130,e:155,turns:2.5},
        {t:'sheet',s:155,e:167}, {t:'loop', s:167,e:189},
      ],
      BRCA1: [
        {t:'helix',s:1,   e:45,   turns:3}, {t:'loop',s:45,  e:109},
        {t:'loop', s:109, e:500},            {t:'loop',s:500, e:900},
        {t:'loop', s:900, e:1364},           {t:'helix',s:1364,e:1437,turns:6},
        {t:'loop', s:1437,e:1642},           {t:'helix',s:1642,e:1680,turns:3},
        {t:'sheet',s:1680,e:1710},           {t:'helix',s:1710,e:1736,turns:2.5},
        {t:'loop', s:1736,e:1756},           {t:'helix',s:1756,e:1800,turns:4},
        {t:'sheet',s:1800,e:1830},           {t:'helix',s:1830,e:1863,turns:2.5},
      ],
      EGFR: [
        {t:'loop', s:1,  e:100},  {t:'helix',s:100,e:180,turns:5},
        {t:'loop', s:180,e:360},  {t:'helix',s:360,e:480,turns:7},
        {t:'loop', s:480,e:646},  {t:'loop', s:646,e:712},
        {t:'sheet',s:712,e:735},  {t:'loop', s:735,e:756},
        {t:'helix',s:756,e:790,turns:3}, {t:'loop',s:790,e:835},
        {t:'sheet',s:835,e:858},  {t:'loop', s:858,e:870},
        {t:'helix',s:870,e:940,turns:5}, {t:'sheet',s:940,e:960},
        {t:'helix',s:960,e:979,turns:2}, {t:'loop', s:979,e:1100},
        {t:'helix',s:1100,e:1180,turns:5},{t:'loop',s:1180,e:1210},
      ],
    };

    const rng = seed => { let x = Math.sin(seed + 1) * 43758.5453; return x - Math.floor(x); };
    const defs = (SS_DEFS[gene.symbol] || SS_DEFS.TP53).map(d => ({
      ...d,
      domain: gene.domains.find(dom => ((d.s + d.e) / 2) >= dom.start && ((d.s + d.e) / 2) <= dom.end) || null,
    }));

    const total = gene.proteinLength;
    const toX = aa => ((aa - 1) / (total - 1)) * 120 - 60;

    // Walk the chain — each segment starts AND ends at the same backbone
    // center-line (curY/curZ). Helices/sheets coil AROUND the center and
    // smoothly return to it. Loops drift gently and ease back before they end.
    const pts = []; // { aa, x, y, z, ss, domain, segIdx }
    let curY = 0, curZ = 0;

    defs.forEach((seg, si) => {
      const len = seg.e - seg.s;
      const steps = Math.max(seg.t === 'helix' ? len * 3 : len * 1.5, 12);
      const entryY = curY, entryZ = curZ;
      // Target exit: same as entry so segments always connect flush
      const exitY = entryY, exitZ = entryZ;

      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const aa = seg.s + t * len;
        const x = toX(aa);
        let y, z;

        if (seg.t === 'helix') {
          // Coil around centerline: sin/cos amplitude with smooth envelope
          // Envelope = sin(t*π) so it rises from 0 and returns to 0 → starts and ends at entryY/Z
          const envelope = Math.sin(t * Math.PI);
          const turns = seg.turns || 2;
          const angle = t * Math.PI * 2 * turns;
          y = entryY + Math.sin(angle) * 5.0 * envelope;
          z = entryZ + Math.cos(angle) * 3.5 * envelope;
        } else if (seg.t === 'sheet') {
          // Flat ribbon wave, sin envelope guarantees start=end=entryY/Z
          const envelope = Math.sin(t * Math.PI);
          y = entryY + envelope * 4.0 * Math.sin(t * Math.PI * 1.5);
          z = entryZ + envelope * 2.0;
        } else {
          // Loop: random walk with strong pull back to exitY/Z near the end
          if (k === 0) { y = entryY; z = entryZ; }
          else {
            const prev = pts[pts.length - 1];
            // Remaining fraction: pull harder as we approach end
            const remaining = 1 - t;
            const pullStrength = t > 0.7 ? (t - 0.7) / 0.3 : 0; // 0..1 over last 30%
            const dy = (rng(si * 997 + k * 7.3) - 0.5) * 2.0 * (1 - pullStrength);
            const dz = (rng(si * 997 + k * 3.1 + 0.5) - 0.5) * 2.0 * (1 - pullStrength);
            const rawY = prev.y + dy;
            const rawZ = prev.z + dz;
            // Blend toward exit over the last 30%
            y = rawY * (1 - pullStrength) + exitY * pullStrength;
            z = rawZ * (1 - pullStrength) + exitZ * pullStrength;
            y = Math.max(-16, Math.min(16, y));
            z = Math.max(-16, Math.min(16, z));
          }
        }

        // Don't duplicate the shared endpoint
        if (k === 0 && pts.length > 0) continue;

        pts.push({ aa, x, y, z, ss: seg.t, domain: seg.domain, segIdx: si });
        curY = y; curZ = z;
      }
      // Force exact continuity: overwrite last point to precisely entryY/Z
      // (helix/sheet envelope is ~0 at t=1 anyway, but floating-point may drift)
      if (pts.length > 0) {
        pts[pts.length - 1].y = entryY;
        pts[pts.length - 1].z = entryZ;
        curY = entryY; curZ = entryZ;
      }
    });

    return { pts, defs };
  }, []);

  useEffect(() => {
    if (!showRCSB) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const W = container.offsetWidth || 800;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || W < 600;
      const H = isMobile ? 320 : 480;
      const go = () => {
        const THREE = window.THREE;
        const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: isMobile ? 'low-power' : 'default' });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
        renderer.setClearColor(0x060810, 1);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = H + 'px';
        renderer.domElement.style.display = 'block';

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x060810, 0.005);
        const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 2000);
        camera.position.set(0, 20, 160);

        // Enhanced lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const key = new THREE.DirectionalLight(0x67e8f9, 3.0);
        key.position.set(50, 80, 60);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xa78bfa, 1.5);
        fill.position.set(-60, -30, -40);
        scene.add(fill);
        const back = new THREE.DirectionalLight(0xfbbf24, 1.0);
        back.position.set(0, -60, -80);
        scene.add(back);
        const rim = new THREE.DirectionalLight(0xffffff, 0.6);
        rim.position.set(0, 100, -100);
        scene.add(rim);

        // Point lights for selected glow effect
        const selectionLight = new THREE.PointLight(0xffffff, 0, 50);
        scene.add(selectionLight);

        const COLORS = {
          Critical: [0x06b6d4, 0x22d3ee, 0x0891b2],
          Structural: [0x8b5cf6, 0xa78bfa, 0x7c3aed],
          Regulatory: [0x10b981, 0x34d399, 0x059669],
          loop: 0x1e2840,
        };

        const domainAt = (aa) => gene.domains.find(d => aa >= d.start && aa <= d.end) || null;
        const colorOf = (aa, selected = false, hovered = false) => {
          const d = domainAt(aa);
          if (!d) return selected ? 0x4a5568 : hovered ? 0x2d3748 : COLORS.loop;
          const pal = COLORS[d.functionalRegion] || COLORS.Critical;
          const idx = gene.domains.filter(x => x.functionalRegion === d.functionalRegion).indexOf(d);
          const base = pal[Math.max(0, idx) % pal.length];
          if (selected) return base;
          if (hovered) return base;
          return base;
        };

        // ── Subtle grid floor ──────────────────────────────────────────
        const gridHelper = new THREE.GridHelper(200, 40, 0x1a1a2e, 0x1a1a2e);
        gridHelper.position.y = -30;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        scene.add(gridHelper);

        const makeTube = (pts, radius, col, emissInt = 0.2, opacity = 1, shininess = 130) => {
          if (pts.length < 2) return null;
          const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
          const segs = Math.max(pts.length * (isMobile ? 2 : 4), isMobile ? 12 : 24);
          const geo = new THREE.TubeGeometry(curve, segs, radius, isMobile ? 6 : 12, false);
          const mat = new THREE.MeshPhongMaterial({
            color: col, emissive: col, emissiveIntensity: emissInt,
            shininess, specular: 0x446688,
            transparent: opacity < 1, opacity,
          });
          return new THREE.Mesh(geo, mat);
        };

        // ── BUILD CONTINUOUS BACKBONE ──────────────────────────────────
        // buildBackbone returns pts: [{aa,x,y,z,ss,domain,segIdx}] — one
        // continuous array with NO jumps. We then split by segIdx to colour
        // each segment separately, sharing the boundary point so tubes join.
        const { pts: bbPtsRaw, defs: bbDefs } = buildBackbone(gene);
        // On mobile, subsample every other point to halve draw calls
        const bbPts = isMobile
          ? bbPtsRaw.filter((_, i) => i === 0 || i === bbPtsRaw.length-1 || i % 2 === 0)
          : bbPtsRaw;
        const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);

        const group = new THREE.Group();
        const atomGroup = new THREE.Group();   // atomic detail (zoom-in)
        const ribbonGroup = new THREE.Group(); // backbone tubes
        group.add(ribbonGroup);
        group.add(atomGroup);
        atomGroup.visible = false;

        const meshes = []; // { mesh, glowMesh, ss, midAA, domain }

        // Split bbPts into per-segment slices (share boundary pts → no gaps)
        let segStart = 0;
        for (let i = 1; i <= bbPts.length; i++) {
          const isLast = (i === bbPts.length);
          const curSeg  = isLast ? -1 : bbPts[i].segIdx;
          const prevSeg = bbPts[i - 1].segIdx;
          if (isLast || curSeg !== prevSeg) {
            // Slice: include one extra point from the next segment so the tube
            // physically touches it (= closed gap at the join).
            const slice = bbPts.slice(segStart, isLast ? i : i + 1);
            if (slice.length >= 2) {
              const midAA = (slice[0].aa + slice[slice.length - 1].aa) / 2;
              const ssType = slice[Math.floor(slice.length / 2)].ss;
              const domain = slice[Math.floor(slice.length / 2)].domain;
              const col    = colorOf(midAA);
              const isLinker = col === COLORS.loop;

              const vpts = slice.map(v3);
              let radius, glowR, emissInt, opacity, shine;
              if (ssType === 'helix')      { radius = 1.65; glowR = 3.6; emissInt = 0.22; opacity = 1.0; shine = 155; }
              else if (ssType === 'sheet') { radius = 1.35; glowR = 3.0; emissInt = 0.18; opacity = 1.0; shine = 140; }
              else                         { radius = 0.38; glowR = 0;   emissInt = 0.0;  opacity = 0.65; shine = 80; }

              const tube = makeTube(vpts, isLinker ? Math.min(radius, 0.45) : radius, col, isLinker ? 0 : emissInt, opacity, shine);
              if (tube) {
                tube.userData = { ss: { t: ssType }, midAA, domain, segIdx: prevSeg, isLinker };
                ribbonGroup.add(tube);
                if (!isLinker && glowR > 0 && !isMobile) {
                  const glow = makeTube(vpts, glowR, col, 0, 0.05);
                  if (glow) { glow.material.depthWrite = false; glow.userData = { isGlow: true }; ribbonGroup.add(glow); }
                }
                meshes.push({ mesh: tube, glowMesh: null, ss: { t: ssType }, midAA, domain });
              }
            }
            segStart = i;
          }
        }

        // ── MOLECULAR DETAIL LAYER (CPK / Ball-and-Stick) ─────────────
        // Reference-quality atomic visualization: Cα backbone + N/C=O backbone atoms
        // + multi-atom side chains + dashed H-bonds (like PyMOL/Chimera style).
        // CPK colours: C=teal, N=blue, O=red, S=yellow (standard Corey–Pauling–Koltun).
        // Visible when camera.position.z < 115 (scroll to zoom in).
        const ACOL = { C: 0x1db87a, N: 0x3b82f6, O: 0xef4444, S: 0xfbbf24, H: 0xe2e8f0, CA: 0x22d3ee };
        const rng2 = s => { let x = Math.sin(s + 1.7) * 43758.5453; return x - Math.floor(x); };

        const addAtom = (x, y, z, elem, r = 0.55) => {
          const col = ACOL[elem] || ACOL.C;
          const m = new THREE.Mesh(
            new THREE.SphereGeometry(r, 10, 10),
            new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.42, shininess: 240, specular: 0xbbccee })
          );
          m.position.set(x, y, z); m.userData = { isAtom: true };
          atomGroup.add(m); return m;
        };

        const addBond = (x1,y1,z1,x2,y2,z2,col=0x2a5080,r=0.13) => {
          const m = makeTube([new THREE.Vector3(x1,y1,z1),new THREE.Vector3(x2,y2,z2)], r, col, 0.06, 1, 90);
          if (m) { m.userData = { isAtom: true }; atomGroup.add(m); }
        };

        // Dashed H-bond (blue dashes, like PyMOL)
        const addHBond = (x1,y1,z1,x2,y2,z2) => {
          const segs = 12;
          for (let k = 0; k < segs; k++) {
            if (k % 2 === 0) continue;
            const t0 = k/segs, t1 = (k+1)/segs;
            addBond(x1+(x2-x1)*t0,y1+(y2-y1)*t0,z1+(z2-z1)*t0,
                    x1+(x2-x1)*t1,y1+(y2-y1)*t1,z1+(z2-z1)*t1, 0x38bdf8, 0.11);
          }
        };

        // Sample backbone for atomic rendering (all domain residues + some linkers)
        // Skip entirely on mobile — too many draw calls crash WebGL
        const ATOM_STEP = Math.max(2, Math.floor(bbPts.length / 80));
        if (!isMobile) bbPts.forEach((p, pi) => {
          if (pi % ATOM_STEP !== 0) return;
          if (!p.domain && p.ss === 'loop') return; // skip linker loops to reduce clutter
          const { x, y, z, ss } = p;

          // Cα (backbone alpha-carbon) — slightly larger
          addAtom(x, y, z, 'CA', 0.52);

          const pPrev = bbPts[Math.max(0, pi - ATOM_STEP)];
          const pNext = bbPts[Math.min(bbPts.length - 1, pi + ATOM_STEP)];

          // Backbone amide N (between Cα-1 and Cα, slightly above)
          const nx = (x + pPrev.x)/2, ny = (y + pPrev.y)/2 + 0.55, nz = (z + pPrev.z)/2;
          // Backbone carbonyl C and O (between Cα and Cα+1, below/offset)
          const coX = (x + pNext.x)/2, coY = (y + pNext.y)/2 - 0.45, coZ = (z + pNext.z)/2;
          const oX = coX + (rng2(pi*13.1)-0.5)*1.1;
          const oY = coY - 0.85;
          const oZ = coZ + (rng2(pi*7.9)-0.5)*1.1;

          addAtom(nx, ny, nz, 'N', 0.38);
          addAtom(coX, coY, coZ, 'C', 0.34); // carbonyl C
          addAtom(oX, oY, oZ, 'O', 0.40);   // carbonyl O (red)

          // Bonds: N-Cα, Cα-C=O, C=O-O
          addBond(nx, ny, nz, x, y, z, 0x1a4a7a, 0.14);
          addBond(x, y, z, coX, coY, coZ, 0x1a4a7a, 0.14);
          addBond(coX, coY, coZ, oX, oY, oZ, 0x1a4a7a, 0.13);

          // Side chain — 2-3 atoms depending on residue type
          const ang = rng2(pi * 7.3) * Math.PI * 2;
          const scLen = 1.1 + rng2(pi * 3.7) * 1.6;
          const sc1x = x + Math.cos(ang) * scLen * 0.7;
          const sc1y = y + (rng2(pi * 5.2) - 0.3) * scLen * 1.1 + 1.4;
          const sc1z = z + Math.sin(ang) * scLen * 0.7;
          // Residue type cycling: Ala, Arg, Asn, Asp, Cys, Gln, Glu, His, Leu…
          const sideElems = ['C','N','O','O','S','C','N','O','C','C','N','O','S','C','C','N','O','O'][pi % 18] || 'C';
          addAtom(sc1x, sc1y, sc1z, sideElems, 0.40);
          addBond(x, y, z, sc1x, sc1y, sc1z, 0x153050, 0.11);

          // Second side-chain atom for longer residues
          if (pi % 3 === 0) {
            const ang2 = ang + 1.2;
            const sc2x = sc1x + Math.cos(ang2) * 1.1;
            const sc2y = sc1y + (rng2(pi*9.1)-0.5)*0.9;
            const sc2z = sc1z + Math.sin(ang2) * 1.1;
            const elem2 = ['O','N','C','S','C','O','N','C'][pi % 8];
            addAtom(sc2x, sc2y, sc2z, elem2, 0.36);
            addBond(sc1x, sc1y, sc1z, sc2x, sc2y, sc2z, 0x153050, 0.10);
            // Occasionally add H-bond from side-chain heteroatom
            if (['N','O','S'].includes(elem2) && pi % 5 === 0) {
              const hbTarget = bbPts[Math.min(bbPts.length-1, pi + ATOM_STEP*3)];
              if (hbTarget && hbTarget.domain) {
                addHBond(sc2x, sc2y, sc2z, hbTarget.x, hbTarget.y, hbTarget.z);
              }
            }
          }

          // Backbone H-bonds (secondary structure specific)
          if (ss === 'helix') {
            // α-helix: i → i+4 H-bond (N-H···O=C)
            const hp = bbPts[Math.min(bbPts.length-1, pi + ATOM_STEP * 4)];
            if (hp && hp.domain) addHBond(nx, ny, nz, hp.x + (rng2(pi*3.3)-0.5)*0.6, hp.y - 0.45, hp.z);
          } else if (ss === 'sheet') {
            // β-sheet: parallel/antiparallel strand H-bonds
            const hp = bbPts[Math.min(bbPts.length-1, pi + ATOM_STEP * 2)];
            if (hp && hp.domain) addHBond(nx, ny, nz, hp.x, hp.y - 0.4, hp.z);
            // Cross-strand H-bond (perpendicular offset)
            const hp2 = bbPts[Math.min(bbPts.length-1, pi + ATOM_STEP * 6)];
            if (hp2 && hp2.domain) addHBond(oX, oY, oZ, hp2.x, hp2.y + 0.5, hp2.z);
          }
        }); // end !isMobile forEach

        // Water molecules (O atoms as red spheres) near polar surface residues
        if (!isMobile) for (let w = 0; w < 45; w++) {
          const idx = Math.floor(rng2(w * 11.7) * bbPts.length);
          const p = bbPts[idx]; if (!p || !p.domain) continue;
          const wr = 2.0 + rng2(w*7.7) * 3.2, wa = rng2(w*13.3)*Math.PI*2, wh = (rng2(w*5.1)-0.5)*4.0;
          addAtom(p.x + Math.cos(wa)*wr, p.y + wh, p.z + Math.sin(wa)*wr, 'O', 0.28);
        }

        // Zoom-controlled atom visibility — show atoms earlier (camZ < 115)
        const updateAtomVisibility = (camZ) => {
          const show = camZ < 115;
          atomGroup.visible = show;
          // Fade ribbon when ultra-zoomed so atoms are visible on white-like bg
          ribbonGroup.children.forEach(c => {
            if (c.material && !c.userData.isGlow) {
              c.material.opacity = camZ < 50 ? 0.25 : camZ < 80 ? 0.65 : 1.0;
              c.material.transparent = camZ < 80;
            }
          });
        };

        // ── Mutation pins ──────────────────────────────────────────────
        const pinMeshes = [];
        if (mutPins && mutPins.length > 0) {
          mutPins.forEach(pin => {
            // Find the backbone point closest to this AA position
            const bbp = bbPts.find(p => Math.round(p.aa) === pin.pos)
                     || bbPts.reduce((best, p) => Math.abs(p.aa - pin.pos) < Math.abs(best.aa - pin.pos) ? p : best, bbPts[0]);
            if (!bbp) return;
            const col = parseInt((pin.color || '#ef4444').replace('#', ''), 16);
            const spikePts = [new THREE.Vector3(bbp.x, bbp.y, bbp.z), new THREE.Vector3(bbp.x, bbp.y + 26, bbp.z)];
            const spike = makeTube(spikePts, 0.22, col, 0.7);
            if (spike) { spike.userData = { isPin: true, pin }; group.add(spike); }
            const bGeo = new THREE.SphereGeometry(2.5, isMobile ? 10 : 20, isMobile ? 10 : 20);
            const bMat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 1.0, shininess: 250 });
            const ball = new THREE.Mesh(bGeo, bMat); ball.position.set(bbp.x, bbp.y + 28, bbp.z);
            ball.userData = { isPin: true, pin }; group.add(ball); pinMeshes.push(ball);
            const gGeo = new THREE.SphereGeometry(5, 10, 10);
            const gMat = new THREE.MeshPhongMaterial({ color: col, transparent: true, opacity: 0.15, depthWrite: false });
            const glow2 = new THREE.Mesh(gGeo, gMat); glow2.position.set(bbp.x, bbp.y + 28, bbp.z); group.add(glow2);
          });
        }

        group.rotation.x = 0.18;
        scene.add(group);

        // Raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.params.Line = { threshold: 1 };
        const mouse = new THREE.Vector2();
        let selectedMesh = null;
        let selectedOriginalColor = null;
        let hoveredMesh = null;

        const getCanvasPos = (clientX, clientY) => {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        };

        const highlightSelected = (mesh, highlight) => {
          if (!mesh || mesh.userData.isGlow) return;
          const col = colorOf(mesh.userData.midAA || 0);
          if (highlight) {
            mesh.material.emissiveIntensity = 0.8;
            mesh.material.color.setHex(0xffffff);
            mesh.material.emissive.setHex(col);
            mesh.scale.set(1.12, 1.12, 1.12);
          } else {
            mesh.material.emissiveIntensity = mesh.userData.isLinker ? 0 : 0.22;
            mesh.material.color.setHex(col);
            mesh.material.emissive.setHex(col);
            mesh.scale.set(1, 1, 1);
          }
        };

        const handleClick = (e) => {
          e.preventDefault();
          getCanvasPos(e.clientX, e.clientY);
          raycaster.setFromCamera(mouse, camera);
          const clickable = meshes.map(m => m.mesh).filter(m => m && !m.userData.isGlow);
          const intersects = raycaster.intersectObjects(clickable, false);

          if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (hit.userData.isGlow) return;

            // Deselect previous
            if (selectedMesh && selectedMesh !== hit) {
              highlightSelected(selectedMesh, false);
            }

            if (selectedMesh === hit) {
              // Deselect
              highlightSelected(hit, false);
              selectedMesh = null;
              autoSpinRef.current = true;
              setIsSpinning(true);
              setClickedDomain(null);
              selectionLight.intensity = 0;
            } else {
              // Select
              highlightSelected(hit, true);
              selectedMesh = hit;
              autoSpinRef.current = false;
              setIsSpinning(false);
              const domain = hit.userData.domain;
              const midAA = hit.userData.midAA;
              const ss = hit.userData.ss;
              const fullDomainInfo = domain ? gene.domains.find(d => d.name === domain.name) : null;
              setClickedDomain({
                domain: fullDomainInfo || domain,
                midAA: Math.round(midAA),
                ssType: ss?.t,
                isLinker: hit.userData.isLinker,
                color: colorOf(midAA).toString(16).padStart(6, '0'),
              });
              // Move selection light near clicked region
              const pt = intersects[0].point;
              selectionLight.position.copy(pt);
              selectionLight.color.setHex(colorOf(midAA));
              selectionLight.intensity = 3;
            }
          } else {
            // Clicked empty space — deselect
            if (selectedMesh) {
              highlightSelected(selectedMesh, false);
              selectedMesh = null;
            }
            autoSpinRef.current = true;
            setIsSpinning(true);
            setClickedDomain(null);
            selectionLight.intensity = 0;
          }
        };

        // Hover handling for tooltip
        const handleMouseMove = (e) => {
          if (dragging) return;
          getCanvasPos(e.clientX, e.clientY);
          raycaster.setFromCamera(mouse, camera);
          const clickable = meshes.map(m => m.mesh).filter(m => m && !m.userData.isGlow);
          const intersects = raycaster.intersectObjects(clickable, false);
          const rect = renderer.domElement.getBoundingClientRect();

          if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (!hit.userData.isGlow && hit !== selectedMesh) {
              renderer.domElement.style.cursor = 'pointer';
              const domain = hit.userData.domain;
              if (domain) {
                setTooltip({ text: domain.name, x: e.clientX - rect.left, y: e.clientY - rect.top - 40 });
                setHoveredDomain(domain.name);
              } else {
                setTooltip({ text: `Linker (~AA ${Math.round(hit.userData.midAA)})`, x: e.clientX - rect.left, y: e.clientY - rect.top - 40 });
                setHoveredDomain(null);
              }
            }
          } else {
            renderer.domElement.style.cursor = dragging ? 'grabbing' : 'grab';
            setTooltip(null);
            setHoveredDomain(null);
          }
        };

        let dragging = false, ox = 0, oy = 0, rotY = 0, rotX = 0.18;
        const autoSpinRef = { current: true };

        const el = renderer.domElement;
        el.addEventListener('pointerdown', e => {
          dragging = true; ox = e.clientX; oy = e.clientY;
          el.setPointerCapture(e.pointerId);
          el.style.cursor = 'grabbing';
        });
        el.addEventListener('pointermove', e => {
          handleMouseMove(e);
          if (!dragging) return;
          rotY += (e.clientX - ox) * 0.012; ox = e.clientX;
          rotX += (e.clientY - oy) * 0.012; oy = e.clientY;
          rotX = Math.max(-1.4, Math.min(1.4, rotX));
        });
        el.addEventListener('pointerup', e => {
          if (Math.abs(e.clientX - ox) < 4 && Math.abs(e.clientY - oy) < 4) handleClick(e);
          dragging = false; el.style.cursor = 'grab';
        });
        el.addEventListener('wheel', e => {
          camera.position.z = Math.max(30, Math.min(400, camera.position.z + e.deltaY * 0.3));
          e.preventDefault();
        }, { passive: false });
        el.style.cursor = 'grab';

        // Pulse animation for selected mesh
        let pulseT = 0;
        const animate = () => {
          frameRef.current = requestAnimationFrame(animate);
          if (autoSpinRef.current) rotY += 0.006;
          group.rotation.y = rotY;
          group.rotation.x = rotX;

          // Pulse selected
          if (selectedMesh && !selectedMesh.userData.isGlow) {
            pulseT += 0.05;
            const pulse = 0.6 + Math.sin(pulseT) * 0.25;
            selectedMesh.material.emissiveIntensity = pulse;
            selectionLight.intensity = 2 + Math.sin(pulseT) * 1.5;
          } else {
            pulseT = 0;
          }

          renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
          if (!container) return;
          const W2 = container.offsetWidth;
          renderer.setSize(W2, H);
          camera.aspect = W2 / H;
          camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);
        sceneStateRef.current = { autoSpinRef, renderer };
        frameRef._cleanup = () => { window.removeEventListener('resize', onResize); renderer.dispose(); };
      };

      if (window.THREE) { go(); }
      else if (!document.getElementById('three-js')) {
        const s = document.createElement('script'); s.id = 'three-js';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        s.onload = go; document.head.appendChild(s);
      } else {
        const poll = setInterval(() => { if (window.THREE) { clearInterval(poll); go(); } }, 100);
      }
    }, 80);

    return () => {
      clearTimeout(timer);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (frameRef._cleanup) { frameRef._cleanup(); frameRef._cleanup = null; }
      if (containerRef.current) containerRef.current.innerHTML = '';
      setClickedDomain(null);
      setIsSpinning(true);
    };
  }, [showRCSB, gene, mutPins, buildBackbone]);

  const handleResumeRotation = () => {
    if (sceneStateRef.current?.autoSpinRef) {
      sceneStateRef.current.autoSpinRef.current = true;
      setIsSpinning(true);
      setClickedDomain(null);
    }
  };

  const FREGION_COLORS = { Critical: '#06b6d4', Structural: '#8b5cf6', Regulatory: '#10b981' };

  return (
    <div style={{ borderTop: '1px solid #1e2130', paddingTop: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.6rem', marginBottom: '.75rem' }}>
        <div>
          <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '.08em' }}>3D Protein Ribbon · Click to Explore</div>
          <div style={{ fontSize: '.82rem', color: '#6b7080', marginTop: '.2rem' }}>
            <span style={{ color: '#A78BFA', fontFamily: '"JetBrains Mono",monospace', fontWeight: 700 }}>{gene.symbol}</span>
            {' '}{gene.proteinLength} aa · Click segment to inspect · Scroll in → molecular atoms
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowRCSB(v => !v)}
            style={{ padding: '.5rem 1rem', background: showRCSB ? 'rgba(99,102,241,.3)' : 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.5)', borderRadius: 8, color: '#A78BFA', fontSize: '.88rem', fontWeight: 700, cursor: 'pointer' }}>
            {showRCSB ? '▲ Hide' : '▼ Show'} 3D View
          </button>
          <a href={gene.pdb.url} target="_blank" rel="noopener noreferrer"
            style={{ padding: '.5rem 1rem', background: 'rgba(6,182,212,.1)', border: '1px solid rgba(6,182,212,.35)', borderRadius: 8, color: '#67E8F9', fontSize: '.88rem', fontWeight: 700, textDecoration: 'none' }}>
            ↗ PDB {gene.pdb.id}
          </a>
        </div>
      </div>

      {showRCSB && (<>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(99,102,241,.3)', marginBottom: '1rem' }}>
          {/* Toolbar */}
          <div style={{ padding: '.5rem .9rem', background: 'rgba(99,102,241,.1)', borderBottom: '1px solid rgba(99,102,241,.2)', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', color: '#A78BFA', fontWeight: 700 }}>PDB {gene.pdb.id}</span>
            <span style={{ color: '#4a4d5a' }}>·</span>
            <span style={{ fontSize: '.75rem', color: '#6b7080' }}>{gene.pdb.name}</span>
            {!isSpinning && (
              <button onClick={handleResumeRotation}
                style={{ background: 'rgba(6,182,212,.15)', border: '1px solid rgba(6,182,212,.4)', color: '#67E8F9', fontSize: '.75rem', fontWeight: 700, padding: '.2rem .6rem', borderRadius: 5, cursor: 'pointer' }}>
                ▶ Resume Rotation
              </button>
            )}
            {mutPins && mutPins.length > 0 && (
              <span style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.35)', color: '#fca5a5', fontSize: '.72rem', fontWeight: 700, padding: '.15rem .5rem', borderRadius: 5 }}>
                {mutPins.length} mutation{mutPins.length !== 1 ? 's' : ''} pinned
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.72rem', color: '#4a4d5a' }}>
              {isSpinning ? '🔄 Spinning — Click segment to freeze & inspect' : '⏸ Frozen — Click empty space to resume'}
            </span>
          </div>

          {/* 3D container */}
          <div style={{ position: 'relative' }}>
            <div ref={containerRef} style={{ width: '100%', height: 'clamp(280px, 45vw, 480px)', background: '#060810', position: 'relative' }} />
            {/* Tooltip */}
            {tooltip && (
              <div style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, background: 'rgba(6,6,20,.9)', border: '1px solid rgba(99,102,241,.5)', borderRadius: 6, padding: '.3rem .65rem', fontSize: '.78rem', color: '#c8cad4', fontWeight: 600, pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,.5)' }}>
                {tooltip.text}
              </div>
            )}
            {/* Spinning indicator */}
            {isSpinning && (
              <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: '.35rem', background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 6, padding: '.25rem .6rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: 'domainPulse 1.5s ease-in-out infinite' }}></div>
                <span style={{ fontSize: '.72rem', color: '#6b7080' }}>Auto-rotating</span>
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ padding: '.6rem .9rem', background: 'rgba(0,0,0,.45)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[{ col: '#06b6d4', label: 'α-Helix · Critical' }, { col: '#8b5cf6', label: 'β-Strand · Structural' }, { col: '#10b981', label: 'Helix · Regulatory' }, { col: '#1e2840', label: 'Loop / Linker' }].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <div style={{ width: 14, height: 8, background: l.col, borderRadius: 3, boxShadow: `0 0 6px ${l.col}88` }}></div>
                <span style={{ fontSize: '.74rem', color: '#8a8f9e' }}>{l.label}</span>
              </div>
            ))}
            {mutPins && mutPins.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <div style={{ width: 14, height: 8, background: '#ef4444', borderRadius: 3, boxShadow: '0 0 6px #ef444488' }}></div>
                <span style={{ fontSize: '.74rem', color: '#8a8f9e' }}>Mutation site</span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.6rem', borderLeft: '1px solid rgba(255,255,255,.06)', paddingLeft: '.8rem' }}>
              <span style={{ fontSize: '.68rem', color: '#4a4d5a', fontWeight: 600 }}>CPK atoms (scroll↓ to reveal):</span>
              {[{ col: '#22d3ee', label: 'Cα' }, { col: '#3b82f6', label: 'N' }, { col: '#ef4444', label: 'O' }, { col: '#1db87a', label: 'C' }, { col: '#fbbf24', label: 'S' }].map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: a.col, boxShadow: `0 0 5px ${a.col}99` }}></div>
                  <span style={{ fontSize: '.68rem', color: '#6b7080', fontFamily: '"JetBrains Mono",monospace' }}>{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ CLICK INFO PANEL ═══ */}
        {clickedDomain ? (
          <div style={{ background: '#080c14', border: `2px solid #${clickedDomain.color || '6366f1'}`, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem', animation: 'fadeSlideIn .35s ease-out' }}>
            {/* Panel header */}
            <div style={{ padding: '.75rem 1rem', background: `#${clickedDomain.color || '1e2130'}18`, borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: `#${clickedDomain.color}`, boxShadow: `0 0 10px #${clickedDomain.color}` }}></div>
                <span style={{ fontSize: '.9rem', fontWeight: 700, color: '#e2e4e9' }}>
                  {clickedDomain.domain ? clickedDomain.domain.name : (clickedDomain.isLinker ? 'Inter-domain Linker Region' : 'Unknown Region')}
                </span>
                {clickedDomain.domain && (
                  <span style={{ background: `${FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#6366f1'}22`, border: `1px solid ${FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#6366f1'}55`, color: FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#a78bfa', fontSize: '.72rem', fontWeight: 700, padding: '.15rem .45rem', borderRadius: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                    {clickedDomain.domain.functionalRegion}
                  </span>
                )}
                <span style={{ background: '#1e2130', border: '1px solid #2a2d3a', color: '#6b7080', fontSize: '.7rem', fontWeight: 600, padding: '.12rem .4rem', borderRadius: 5 }}>
                  {clickedDomain.ssType === 'helix' ? '🌀 α-Helix' : clickedDomain.ssType === 'sheet' ? '➡️ β-Strand' : '〰️ Loop'}
                </span>
              </div>
              <button onClick={handleResumeRotation} style={{ background: 'rgba(99,102,241,.15)', border: '1px solid rgba(99,102,241,.35)', color: '#a78bfa', fontSize: '.78rem', fontWeight: 600, padding: '.3rem .7rem', borderRadius: 6, cursor: 'pointer' }}>
                ▶ Resume
              </button>
            </div>

            {clickedDomain.domain ? (
              <div style={{ padding: '1.1rem' }}>
                {/* Domain position strip */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '.7rem .9rem', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8 }}>
                  {[
                    { label: 'Start', value: `AA ${clickedDomain.domain.start}`, col: '#67e8f9' },
                    { label: 'End', value: `AA ${clickedDomain.domain.end}`, col: '#67e8f9' },
                    { label: 'Length', value: `${clickedDomain.domain.end - clickedDomain.domain.start + 1} residues`, col: '#a78bfa' },
                    { label: 'Clicked ~', value: `AA ${clickedDomain.midAA}`, col: '#fbbf24' },
                  ].map((s, i) => (
                    <div key={i} style={{ minWidth: 90 }}>
                      <div style={{ fontSize: '.72rem', color: '#6b7080', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.15rem' }}>{s.label}</div>
                      <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '.9rem', fontWeight: 700, color: s.col }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.4rem' }}>Function Overview</div>
                  <div style={{ fontSize: '.92rem', color: '#c8cad4', lineHeight: 1.7 }}>{clickedDomain.domain.description}</div>
                </div>

                {/* Detailed molecular info */}
                {clickedDomain.domain.detail && (
                  <div style={{ background: `${FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#6366f1'}0a`, border: `1px solid ${FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#6366f1'}25`, borderRadius: 8, padding: '.85rem 1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '.8rem', fontWeight: 700, color: FREGION_COLORS[clickedDomain.domain.functionalRegion] || '#a78bfa', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.5rem' }}>
                      🔬 Molecular Detail
                    </div>
                    <div style={{ fontSize: '.88rem', color: '#9ca3af', lineHeight: 1.8 }}>{clickedDomain.domain.detail}</div>
                  </div>
                )}

                {/* Cancer relevance */}
                <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '.75rem 1rem' }}>
                  <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.4rem' }}>⚕ Clinical Relevance</div>
                  <div style={{ fontSize: '.86rem', color: '#9ca3af', lineHeight: 1.7 }}>
                    {clickedDomain.domain.functionalRegion === 'Critical'
                      ? `Mutations in the ${clickedDomain.domain.name} are among the most clinically significant alterations in ${gene.symbol}. Variants here typically cause loss of ${gene.type === 'Tumor Suppressor' ? 'tumor-suppressive function' : 'oncogenic gain-of-function changes'}. These are frequently reported in ClinVar as Pathogenic or Likely Pathogenic.`
                      : clickedDomain.domain.functionalRegion === 'Structural'
                        ? `The ${clickedDomain.domain.name} maintains the three-dimensional fold of ${gene.symbol}. Mutations here can indirectly disrupt critical function by destabilizing the protein structure. Classified as Likely Pathogenic to VUS depending on specific residue.`
                        : `The ${clickedDomain.domain.name} modulates ${gene.symbol} activity through post-translational modifications or protein interactions. Variants range from Benign to VUS. Clinical significance often context-dependent.`}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', color: '#8a8f9e', fontSize: '.9rem' }}>
                Inter-domain linker region near AA {clickedDomain.midAA}. Flexible connector between functional domains. Generally less conserved; variants here are more often classified as Benign or VUS.
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: '#0d1018', border: '1px dashed #2a2d3a', borderRadius: 10, padding: '.9rem 1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <span style={{ fontSize: '1.5rem', opacity: .5 }}>👆</span>
            <div>
              <div style={{ fontSize: '.9rem', color: '#6b7080', fontWeight: 600 }}>Click any part of the 3D structure to inspect it</div>
              <div style={{ fontSize: '.78rem', color: '#3a3d4a', marginTop: '.15rem' }}>Rotation will pause and detailed domain information will appear here</div>
            </div>
          </div>
        )}

        {/* Domain quick-nav */}
        <div style={{ background: '#0d1018', border: '1px solid #1e2130', borderRadius: 10, overflow: 'hidden', marginBottom: '.5rem' }}>
          <div style={{ padding: '.65rem .9rem', background: 'rgba(99,102,241,.07)', borderBottom: '1px solid #1e2130', fontSize: '.82rem', fontWeight: 700, color: '#a78bfa' }}>
            📐 Domain Quick Reference — {gene.symbol}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', background: '#1e2130' }}>
            {gene.domains.map((d, i) => {
              const col = FREGION_COLORS[d.functionalRegion] || '#6366f1';
              return (
                <div key={i} style={{ padding: '.75rem .9rem', background: '#0d1018', borderLeft: `3px solid ${col}` }}>
                  <div style={{ fontSize: '.78rem', fontWeight: 700, color: col, marginBottom: '.1rem' }}>{d.name}</div>
                  <div style={{ fontSize: '.7rem', color: '#4a4d5a', fontFamily: '"JetBrains Mono",monospace', marginBottom: '.3rem' }}>AA {d.start}–{d.end}</div>
                  <div style={{ fontSize: '.76rem', color: '#8a8f9e', lineHeight: 1.5 }}>{d.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </>)}

      {!showRCSB && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.9rem 1rem', background: '#0f1117', border: '1px dashed #2a2d3a', borderRadius: 10 }}>
          <div style={{ fontSize: '2rem', opacity: .5 }}>🧬</div>
          <div>
            <div style={{ fontSize: '.9rem', color: '#6b7080' }}>Click <strong style={{ color: '#A78BFA' }}>Show 3D View</strong> to launch the interactive domain ribbon for <strong style={{ color: gene.color }}>{gene.symbol}</strong></div>
            <div style={{ fontSize: '.78rem', color: '#3a3d4a', marginTop: '.2rem' }}>Click segments to inspect · Domain info panel · Molecular detail · <a href={gene.pdb.url} target="_blank" rel="noopener noreferrer" style={{ color: '#67e8f9', textDecoration: 'none' }}>PDB {gene.pdb.id} ↗</a></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CancerGeneMutationAnalyzer() {
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
  const [selectedGene, setSelectedGene] = useState('TP53');
  const [showRCSB, setShowRCSB] = useState(false);

  const activeGene = GENE_PANEL[selectedGene];

  const loadSample = key => {
    const s = MUTATION_SAMPLES[key];
    setSeq1(s.reference); setSeq2(s.alternate); setReadingFrame(s.readingFrame); setStrand(s.strand);
    setCurrentSample(s); setSampleBannerVisible(true); setShowSampleMenu(false);
    setMutations(null); setError(''); setAiExplanation(''); setDiffInfo(null);
    setVcfMode(false); setVcfParsed(null); setVcfFile(null);
  };

  useEffect(() => {
    const close = () => setShowSampleMenu(false);
    if (showSampleMenu) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [showSampleMenu]);

  const handleVcfFile = (file) => {
    if (!file) return;
    if (!file.name.endsWith('.vcf') && !file.name.endsWith('.txt')) { setVcfError('Please upload a .vcf file'); return; }
    setVcfLoading(true); setVcfError(''); setVcfParsed(null); setVcfFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseVCF(e.target.result);
        if (result.variants.length === 0) { setVcfError('No valid variants found in VCF file.'); setVcfLoading(false); return; }
        setVcfParsed(result); setVcfSelectedIdx(0); loadVcfVariant(result.variants[0]);
      } catch (err) { setVcfError(`Failed to parse VCF: ${err.message}`); }
      setVcfLoading(false);
    };
    reader.onerror = () => { setVcfError('Failed to read file'); setVcfLoading(false); };
    reader.readAsText(file);
  };

  const loadVcfVariant = (variant) => { setSeq1(variant.ref); setSeq2(variant.alt); setVcfMeta(variant); setMutations(null); setError(''); setAiExplanation(''); setDiffInfo(null); };
  const handleVcfInputChange = (e) => handleVcfFile(e.target.files[0]);
  const handleDrop = (e) => { e.preventDefault(); setIsDragOver(false); handleVcfFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const validateBases = (seq) => { for (let i = 0; i < seq.length; i++) { const c = seq[i]; if (c !== 'A' && c !== 'T' && c !== 'G' && c !== 'C') return false; } return true; };

  const handleAnalyze = async () => {
    if (!seq1.trim() || !seq2.trim()) { setError('Both sequences are required'); return; }
    const cleanSeq1 = normalizeSequence(seq1); const cleanSeq2 = normalizeSequence(seq2);
    if (cleanSeq1.length > MAX_SEQ_LENGTH || cleanSeq2.length > MAX_SEQ_LENGTH) { setError(`Sequence too long — max ${MAX_SEQ_LENGTH.toLocaleString()} bp`); return; }
    if (!validateBases(cleanSeq1)) { setError('Reference sequence contains invalid characters (only A, T, G, C allowed).'); return; }
    if (!validateBases(cleanSeq2)) { setError('Alternate sequence contains invalid characters (only A, T, G, C allowed).'); return; }
    const firstDiffIdx = findFirstDifference(cleanSeq1, cleanSeq2);
    if (firstDiffIdx >= 0) { setDiffInfo({ index: firstDiffIdx, position: firstDiffIdx + 1, refBase: cleanSeq1[firstDiffIdx], altBase: cleanSeq2[firstDiffIdx], refLen: cleanSeq1.length, altLen: cleanSeq2.length, identical: false }); }
    else if (cleanSeq1.length !== cleanSeq2.length) { setDiffInfo({ index: Math.min(cleanSeq1.length, cleanSeq2.length), position: Math.min(cleanSeq1.length, cleanSeq2.length) + 1, refLen: cleanSeq1.length, altLen: cleanSeq2.length, identical: false }); }
    else { setDiffInfo({ identical: true, refLen: cleanSeq1.length, altLen: cleanSeq2.length }); }
    setLoading(true); setError('');
    await new Promise(resolve => setTimeout(resolve, 50));
    try { const result = detectMutations(cleanSeq1, cleanSeq2, readingFrame, strand); setMutations(result); }
    catch (e) { setError(`Analysis failed: ${e.message}`); }
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
      await new Promise(resolve => setTimeout(resolve, 1200));
      const gene = GENE_PANEL[selectedGene] || GENE_PANEL.TP53;
      const totalMut = mutations.summary.total_mutations;
      const criticalMuts = annotatedMutations.filter(am => am.domainMapping.functionalRegion === 'Critical');
      const frameshiftMuts = annotatedMutations.filter(am => am.mutation.is_frameshift);
      const nonsenseMuts = annotatedMutations.filter(am => am.mutation.mutation_class === 'Nonsense');
      const missenseMuts = annotatedMutations.filter(am => am.mutation.mutation_class === 'Missense');
      const silentMuts = annotatedMutations.filter(am => am.mutation.mutation_class === 'Silent');
      let exp = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n  ${gene.icon} ${gene.symbol} CLINICAL MUTATION ANALYSIS REPORT\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      exp += `Gene:        ${gene.symbol} — ${gene.name}\nType:        ${gene.type}\nTranscript:  ${gene.id}\nChromosome:  ${gene.chromosome}\nProtein:     ${gene.proteinLength} amino acids\nMutations:   ${totalMut} detected\n\n`;
      exp += `▶ MUTATION DETECTION SUMMARY\n${'─'.repeat(60)}\n`;
      if (totalMut === 0) { exp += `No mutations detected. Sequences are identical.\n\n`; }
      else {
        exp += `Total variants: ${totalMut}\n`;
        if (mutations.summary.snps > 0) exp += `• SNPs: ${mutations.summary.snps}\n`;
        if (mutations.summary.insertions > 0) exp += `• Insertions: ${mutations.summary.insertions}\n`;
        if (mutations.summary.deletions > 0) exp += `• Deletions: ${mutations.summary.deletions}\n`;
        if (mutations.summary.frameshift_mutations > 0) exp += `• Frameshift: ${mutations.summary.frameshift_mutations} — HIGH SEVERITY\n`;
        if (mutations.summary.missense_mutations > 0) exp += `• Missense: ${mutations.summary.missense_mutations}\n`;
        if (mutations.summary.nonsense_mutations > 0) exp += `• Nonsense: ${mutations.summary.nonsense_mutations} — HIGH SEVERITY\n`;
        if (mutations.summary.silent_mutations > 0) exp += `• Silent: ${mutations.summary.silent_mutations} — likely benign\n`;
        exp += `\n`;
      }
      if (annotatedMutations.length > 0) {
        exp += `▶ INDIVIDUAL MUTATION DETAILS\n${'─'.repeat(60)}\n`;
        annotatedMutations.forEach((am, i) => { exp += `Mutation ${i + 1}: ${am.hgvs}\n  Type: ${am.mutation.type} (${am.mutation.mutation_class})\n  Domain: ${am.domainMapping.proteinDomain} (${am.domainMapping.functionalRegion})\n`; if (am.mutation.reference_amino_acid && am.mutation.alternate_amino_acid) exp += `  AA Change: ${am.mutation.reference_amino_acid} → ${am.mutation.alternate_amino_acid}\n`; exp += `  Interpretation: ${am.interpretation.scientificNote}\n\n`; });
      }
      const severity = frameshiftMuts.length > 0 || nonsenseMuts.length > 0 ? 'HIGH — Truncating mutation detected.' : criticalMuts.length > 0 ? 'MODERATE-HIGH — Missense in critical functional domain.' : missenseMuts.length > 0 ? 'MODERATE — Missense mutation detected.' : silentMuts.length > 0 ? 'LOW — Synonymous substitution only.' : 'UNDETERMINED';
      exp += `▶ CLINICAL SEVERITY\n${'─'.repeat(60)}\nSeverity: ${severity}\n\n`;
      exp += `▶ ASSOCIATED CANCERS\n${'─'.repeat(60)}\n`; gene.cancerAssociations.forEach((c, i) => { exp += `  ${i + 1}. ${c}\n`; });
      exp += `\n▶ CLINICAL CONTEXT\n${'─'.repeat(60)}\n${gene.clinicalContext}\n\n${'─'.repeat(60)}\n⚕ DISCLAIMER: Research/educational use only. Not clinical advice.\n${'─'.repeat(60)}\n`;
      setAiExplanation(exp);
    } catch (e) { setError('AI analysis failed'); }
    finally { setLoadingAI(false); }
  };

  const buildDomainColorMap = (gene) => {
    const domainColors = { 'Critical': ['#0E7490', '#0891B2', '#06B6D4', '#22D3EE'], 'Structural': ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA'], 'Regulatory': ['#065F46', '#047857', '#059669', '#34D399'] };
    const colorCounters = { Critical: 0, Structural: 0, Regulatory: 0 };
    const map = {};
    gene.domains.forEach(d => { const fr = d.functionalRegion; const idx = colorCounters[fr] || 0; colorCounters[fr] = idx + 1; const palette = domainColors[fr] || domainColors.Critical; map[d.name] = palette[idx % palette.length]; });
    return map;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0c0e14', color: '#e2e4e9', fontFamily: '"Sora",sans-serif', fontSize: '1.05em' }}>
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
        .btn-p{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:1rem 1.35rem; background:linear-gradient(135deg,#06B6D4,#0891B2); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.1rem; cursor:pointer; transition:all .3s ease; }
        .btn-p:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(6,182,212,.4); } .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; }
        .btn-ai{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:.95rem 1.35rem; background:linear-gradient(135deg,#14B8A6,#0D9488); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem; cursor:pointer; transition:all .3s ease; }
        .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-2px); } .btn-ai:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; }
        .btn-pdf{ display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; padding:.95rem 1.35rem; background:linear-gradient(135deg,#8B5CF6,#7C3AED); border:none; border-radius:10px; color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem; cursor:pointer; transition:all .3s ease; }
        .btn-pdf:hover{ filter:brightness(1.12); transform:translateY(-2px); }
        .btn-g{ display:inline-flex; align-items:center; gap:.42rem; padding:.52rem 1rem; background:transparent; border:1px solid #24272f; border-radius:7px; color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500; cursor:pointer; transition:all .25s ease; }
        .btn-g:hover{ border-color:#06B6D4; color:#06B6D4; background:rgba(6,182,212,.06); }
        .btn-sample{ display:inline-flex; align-items:center; gap:.42rem; padding:.5rem 1rem; background:rgba(6,182,212,.1); border:1px solid rgba(6,182,212,.3); border-radius:7px; color:#67E8F9; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500; cursor:pointer; transition:all .25s ease; position:relative; }
        .btn-sample:hover{ background:rgba(6,182,212,.18); border-color:rgba(6,182,212,.55); }
        .sample-menu{ position:absolute; top:calc(100% + .35rem); left:0; background:#141720; border:1px solid #24272f; border-radius:10px; box-shadow:0 12px 32px rgba(0,0,0,.45); padding:.6rem; z-index:100; min-width:280px; animation: dropdownSlide 0.25s ease-out; }
        .sample-item{ padding:.8rem .9rem; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:.32rem; transition:all .2s ease; }
        .sample-item:hover{ border-color:#06B6D4; background:rgba(6,182,212,.07); }
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
        .variant-row{ padding:.75rem .9rem; border-radius:8px; cursor:pointer; border:1px solid transparent; margin-bottom:.4rem; transition:all .2s ease; background:#0f1117; }
        .variant-row.selected{ border-color:#06B6D4; background:rgba(6,182,212,.08); }
        .variant-row:hover:not(.selected){ border-color:#3a3d4a; }
        .vcf-badge{ display:inline-flex; align-items:center; gap:.3rem; background:rgba(139,92,246,.15); border:1px solid rgba(139,92,246,.35); color:#A78BFA; font-size:.78rem; font-weight:600; padding:.2rem .55rem; border-radius:6px; letter-spacing:.04em; text-transform:uppercase; }
        .path-pathogenic{ background:rgba(220,38,38,.15); border:1px solid rgba(220,38,38,.4); border-radius:8px; padding:.75rem .9rem; margin-top:.75rem; }
        .path-likely{ background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.35); border-radius:8px; padding:.75rem .9rem; margin-top:.75rem; }
        .path-benign{ background:rgba(16,185,129,.1); border:1px solid rgba(16,185,129,.3); border-radius:8px; padding:.75rem .9rem; margin-top:.75rem; }
        .path-vus{ background:rgba(99,102,241,.12); border:1px solid rgba(99,102,241,.35); border-radius:8px; padding:.75rem .9rem; margin-top:.75rem; }
        .path-label{ font-size:.82rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:.35rem; display:flex; align-items:center; gap:.4rem; }
        .path-bar-wrap{ height:6px; background:#1e2130; border-radius:3px; overflow:hidden; margin:.45rem 0; }
        .path-bar{ height:100%; border-radius:3px; transition:width .6s ease; }
        @keyframes spin{ to{ transform:rotate(360deg); } }
        .spin{ display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dropdownSlide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes domainPulse { 0%,100%{ opacity:1; } 50%{ opacity:0.3; } }
        @media(max-width:640px){
          .pc{ padding:1rem; } .seq-input-grid{ grid-template-columns:1fr; } .config-grid{ grid-template-columns:1fr; }
          .summary-grid{ grid-template-columns:repeat(2,1fr); } .gene-grid{ grid-template-columns:repeat(2,1fr) !important; } .action-grid{ grid-template-columns:1fr !important; }
        }
        @media(max-width:768px){
          .seq-input-grid{ grid-template-columns:1fr; } .config-grid{ grid-template-columns:1fr; }
          .summary-grid{ grid-template-columns:repeat(2,1fr); } .gene-grid{ grid-template-columns:repeat(2,1fr) !important; } .action-grid{ grid-template-columns:1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '1.25rem 1.2rem 3rem' }}>

        {/* HEADER */}
        <div style={{ background: 'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom: '1px solid #1e2130', padding: '1.65rem 1.3rem 1.3rem', margin: '-1.25rem -1.2rem 0', marginBottom: '1.25rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ background: `linear-gradient(135deg, ${activeGene.color}22 0%, #083344 100%)`, border: `2px solid ${activeGene.color}55`, borderRadius: '14px', padding: '1rem 1.1rem', marginBottom: '.6rem', boxShadow: `0 8px 32px ${activeGene.color}25` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 'clamp(1.2rem,4vw,1.75rem)', color: '#fff', margin: 0, lineHeight: 1.2 }}>Cancer Gene Mutation Analyzer</h1>
                <span style={{ background: 'rgba(6,182,212,.2)', border: '1px solid rgba(6,182,212,.4)', color: '#67E8F9', fontSize: '.72rem', fontWeight: 600, padding: '.2rem .5rem', borderRadius: 20, letterSpacing: '.07em', textTransform: 'uppercase' }}>Research Grade</span>
                <span className="vcf-badge">VCF Support</span>
                <span style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.35)', color: '#6EE7B7', fontSize: '.72rem', fontWeight: 600, padding: '.2rem .5rem', borderRadius: 20, textTransform: 'uppercase' }}>Multi-Gene Panel</span>
              </div>
            </div>
            <p style={{ color: '#6b7080', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 600, margin: 0 }}>Analyze mutations across TP53, BRCA1, KRAS, EGFR — with codon resolution, domain annotation, and clickable 3D structure exploration.</p>
          </div>
        </div>

        {/* GENE PANEL SELECTOR */}
        <div className="pc" style={{ borderColor: 'rgba(16,185,129,.3)', background: 'rgba(16,185,129,.04)', marginBottom: '1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.05rem' }}>🧫</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#6EE7B7' }}>Gene Panel Selection</span>
          </div>
          <div className="gene-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.5rem' }}>
            {Object.values(GENE_PANEL).map(gene => (
              <button key={gene.symbol} onClick={() => { setSelectedGene(gene.symbol); setMutations(null); setAnnotatedMutations([]); setError(''); setAiExplanation(''); setShowRCSB(false); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem', padding: '.75rem .4rem', background: selectedGene === gene.symbol ? `${gene.color}18` : '#0f1117', border: selectedGene === gene.symbol ? `2px solid ${gene.color}` : '1px solid #1e2130', borderRadius: 10, cursor: 'pointer', transition: 'all .25s ease', boxShadow: selectedGene === gene.symbol ? `0 4px 16px ${gene.color}30` : 'none' }}>
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontWeight: 700, fontSize: '.9rem', color: selectedGene === gene.symbol ? gene.color : '#c8cad4' }}>{gene.symbol}</span>
                <span style={{ fontSize: '.68rem', color: '#6b7080', textAlign: 'center', lineHeight: 1.3 }}>{gene.type}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: '1rem', padding: '.85rem 1rem', background: `${activeGene.color}0d`, border: `1px solid ${activeGene.color}30`, borderRadius: 8 }}>
            <div style={{ fontSize: '.85rem', fontWeight: 600, color: activeGene.color, marginBottom: '.3rem' }}>{activeGene.icon} {activeGene.symbol} — {activeGene.name}</div>
            <div style={{ fontSize: '.85rem', color: '#8a8f9e', lineHeight: 1.6 }}>{activeGene.clinicalContext}</div>
          </div>
        </div>

        {/* INFO TOGGLE */}
        <button className="btn-g" onClick={() => setInfoOpen(v => !v)} style={{ width: '100%', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><span>💡</span><span>Why This Tool Matters & How to Use It</span></span>
          <span style={{ fontSize: '.82rem', color: '#6b7080', transition: 'transform .25s', transform: infoOpen ? 'rotate(180deg)' : 'rotate(0)', display: 'inline-block' }}>▼</span>
        </button>
        <div className={`info-wrap ${infoOpen ? 'open' : 'closed'}`}>
          <div className="pc" style={{ padding: '1.45rem' }}>
            <p style={{ fontSize: '1.05rem', color: '#8a8f9e', lineHeight: 1.75, margin: 0 }}>
              Research-grade cancer gene mutation analyzer with clickable 3D protein structure visualization. Click any region of the 3D ribbon to freeze rotation and see detailed molecular information about that domain.
            </p>
          </div>
        </div>

        {/* LOAD SAMPLE */}
        <div style={{ position: 'relative', marginBottom: '1.1rem' }}>
          <button className="btn-sample" onClick={e => { e.stopPropagation(); setShowSampleMenu(v => !v); }}>
            <span>📋</span><span>Load Sample Mutations</span><span style={{ fontSize: '.82rem', color: '#6b7080', marginLeft: '.25rem' }}>▼</span>
          </button>
          {showSampleMenu && (
            <div className="sample-menu" onClick={e => e.stopPropagation()}>
              {Object.entries(MUTATION_SAMPLES).map(([k, s]) => (
                <div key={k} className="sample-item" onClick={() => loadSample(k)} style={{ background: `${s.color}0a` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.22rem' }}><span style={{ fontSize: '1.25rem' }}>{s.icon}</span><span style={{ fontSize: '1rem', fontWeight: 600, color: s.color }}>{s.name}</span></div>
                  <div style={{ fontSize: '.9rem', color: '#8a8f9e' }}>{s.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {sampleBannerVisible && currentSample && (
          <div className="pc" style={{ borderColor: currentSample.color + '55', background: `${currentSample.color}08`, marginBottom: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <span style={{ fontSize: '1.6rem' }}>{currentSample.icon}</span>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: currentSample.color }}>Sample Loaded: {currentSample.name}</div>
                  <div style={{ fontSize: '.95rem', color: '#8a8f9e', marginTop: '.12rem' }}>{currentSample.description}</div>
                </div>
              </div>
              <button onClick={() => setSampleBannerVisible(false)} style={{ background: 'none', border: 'none', color: '#6b7080', fontSize: '1.4rem', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}

        {/* ANALYSIS CONFIG */}
        <div className="pc" style={{ borderColor: 'rgba(6,182,212,.3)', background: 'rgba(6,182,212,.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.8rem' }}>
            <span>⚙️</span><span style={{ fontSize: '1rem', fontWeight: 600, color: '#67E8F9' }}>Analysis Configuration</span>
          </div>
          <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.25)', borderRadius: '8px', padding: '.9rem', marginBottom: '1rem' }}>
            <label className="lbl" style={{ color: '#10B981', marginBottom: '.5rem' }}>Active Transcript</label>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '.95rem', color: activeGene.color, fontWeight: 600 }}>{activeGene.id}</div>
            <div style={{ fontSize: '.88rem', color: '#8a8f9e', fontStyle: 'italic', marginTop: '.2rem' }}>{activeGene.icon} {activeGene.fullName}</div>
          </div>
          <div className="config-grid">
            <div><label className="lbl">Reading Frame</label>
              <select value={readingFrame} onChange={e => setReadingFrame(e.target.value)}>
                <option value="1">+1 (start at position 1)</option>
                <option value="2">+2 (start at position 2)</option>
                <option value="3">+3 (start at position 3)</option>
              </select>
            </div>
            <div><label className="lbl">Strand</label>
              <select value={strand} onChange={e => setStrand(e.target.value)}>
                <option value="forward">Forward (5′ → 3′)</option>
                <option value="reverse">Reverse (3′ → 5′)</option>
              </select>
            </div>
          </div>
        </div>

        {/* INPUT MODE */}
        <div className="pc">
          <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1.2rem' }}>
            <button className={`mode-tab ${!vcfMode ? 'active' : ''}`} onClick={() => { setVcfMode(false); setVcfMeta(null); }}><span>⌨️</span> Manual Entry</button>
            <button className={`mode-tab ${vcfMode ? 'active' : ''}`} onClick={() => setVcfMode(true)}>
              <span>📂</span> VCF File Upload
              <span style={{ background: 'rgba(139,92,246,.2)', border: '1px solid rgba(139,92,246,.4)', color: '#A78BFA', fontSize: '.7rem', fontWeight: 700, padding: '.12rem .4rem', borderRadius: 5, marginLeft: '.35rem', textTransform: 'uppercase' }}>NGS</span>
            </button>
          </div>

          {vcfMode ? (
            <div>
              <div className={`vcf-drop ${isDragOver ? 'dragover' : ''}`} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={() => vcfInputRef.current?.click()} style={{ marginBottom: '1rem' }}>
                <input ref={vcfInputRef} type="file" accept=".vcf,.txt" onChange={handleVcfInputChange} style={{ display: 'none' }} />
                {vcfLoading ? (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.75rem' }}><span className="spin" style={{ width: 28, height: 28, borderWidth: 3 }}></span><span style={{ color: '#6b7080' }}>Parsing VCF file…</span></div>)
                  : vcfFile && !vcfError ? (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem' }}><span style={{ fontSize: '2rem' }}>✅</span><div style={{ fontWeight: 600, color: '#10B981' }}>{vcfFile.name}</div><div style={{ fontSize: '.9rem', color: '#6b7080' }}>{vcfParsed?.variants.length} variant{vcfParsed?.variants.length !== 1 ? 's' : ''} found</div></div>)
                  : (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.65rem' }}><span style={{ fontSize: '2.5rem' }}>📂</span><div style={{ fontWeight: 600, color: '#c8cad4', fontSize: '1.05rem' }}>Drop your VCF file here</div><div style={{ fontSize: '.9rem', color: '#6b7080' }}>or click to browse</div></div>)}
              </div>
              {vcfError && <div className="error" style={{ marginBottom: '1rem' }}>⚠️ {vcfError}</div>}
              {vcfParsed && vcfParsed.variants.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.65rem' }}>
                    <label className="lbl" style={{ margin: 0 }}>Select Variant to Analyze</label>
                    <span style={{ fontSize: '.85rem', color: '#6b7080' }}>{vcfParsed.variants.length} variants</span>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: '.25rem' }}>
                    {vcfParsed.variants.map((v, i) => (
                      <div key={i} className={`variant-row ${vcfSelectedIdx === i ? 'selected' : ''}`} onClick={() => { setVcfSelectedIdx(i); loadVcfVariant(v); }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '.9rem', color: '#67E8F9', fontWeight: 600 }}>{v.chrom}:{v.pos}</span>
                          <span style={{ fontFamily: '"JetBrains Mono",monospace', color: '#60A5FA' }}>{v.ref}</span>
                          <span style={{ color: '#6b7080' }}>→</span>
                          <span style={{ fontFamily: '"JetBrains Mono",monospace', color: '#FBBF24' }}>{v.alt}</span>
                          <span style={{ fontSize: '.85rem', color: '#6b7080', marginLeft: 'auto' }}>{v.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#c8cad4', marginBottom: '1.1rem' }}>Sequence Input</h3>
              <div className="seq-input-grid" style={{ marginBottom: '1rem' }}>
                <div>
                  <label className="lbl">Reference Sequence</label>
                  <textarea rows={5} value={seq1} onChange={e => setSeq1(e.target.value)} placeholder="Paste reference DNA sequence (ATGC)…" />
                  <div style={{ marginTop: '.38rem', fontSize: '.88rem', fontFamily: '"JetBrains Mono",monospace', color: '#6b7080' }}>{seq1.trim().length.toLocaleString()} bp</div>
                </div>
                <div>
                  <label className="lbl">Alternate Sequence</label>
                  <textarea rows={5} value={seq2} onChange={e => setSeq2(e.target.value)} placeholder="Paste alternate DNA sequence (ATGC)…" />
                  <div style={{ marginTop: '.38rem', fontSize: '.88rem', fontFamily: '"JetBrains Mono",monospace', color: '#6b7080' }}>{seq2.trim().length.toLocaleString()} bp</div>
                </div>
              </div>
            </div>
          )}

          {error && <div className="error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
          <button className="btn-p" onClick={handleAnalyze} disabled={loading || !seq1.trim() || !seq2.trim()} style={{ opacity: (!seq1.trim() || !seq2.trim()) ? 0.5 : 1 }}>
            {loading ? <><span className="spin"></span><span>Analyzing Mutations…</span></> : <><span>🔬</span><span>Analyze Mutations</span></>}
          </button>
        </div>

        {/* RESULTS */}
        {mutations && (<>
          {mutations.warnings?.length > 0 && (<div className="warning"><strong>⚠️ Validation Warnings:</strong><ul style={{ marginTop: '.5rem', paddingLeft: '1.5rem' }}>{mutations.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></div>)}

          <div className="action-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem', marginBottom: '.8rem' }}>
            <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>{loadingAI ? <><span className="spin"></span>Generating…</> : <><span>🤖</span>Get AI Explanation</>}</button>
            <button className="btn-pdf" onClick={handleExportPDF}><span>📄</span> Download Report</button>
          </div>

          {aiExplanation && (
            <div className="ai-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.65rem' }}><span>🤖</span><span style={{ fontSize: '1rem', fontWeight: 600, color: '#67E8F9' }}>AI Analysis</span></div>
              <div style={{ fontSize: '1rem', color: '#e2e4e9', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 440, overflowY: 'auto', background: 'rgba(0,0,0,.25)', borderRadius: 8, padding: '.85rem', border: '1px solid #24272f' }}>{aiExplanation}</div>
            </div>
          )}

          {/* SUMMARY */}
          <div className="pc">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.65rem' }}>
              <span>{activeGene.icon}</span><span style={{ fontSize: '1rem', fontWeight: 600, color: '#c8cad4' }}>{activeGene.symbol} — Summary Statistics</span>
            </div>
            <div className="summary-grid">
              {[{ l: 'Total', v: mutations.summary.total_mutations, c: '#fff' }, { l: 'SNPs', v: mutations.summary.snps, c: '#60A5FA' }, { l: 'Missense', v: mutations.summary.missense_mutations, c: '#FBBF24' }, { l: 'Nonsense', v: mutations.summary.nonsense_mutations, c: '#EF4444' }, { l: 'Silent', v: mutations.summary.silent_mutations, c: '#10B981' }, { l: 'Insertions', v: mutations.summary.insertions, c: '#F59E0B' }, { l: 'Deletions', v: mutations.summary.deletions, c: '#EF4444' }, { l: 'Frameshift', v: mutations.summary.frameshift_mutations, c: '#DC2626' }].map((s, i) => (
                <div key={i} className="stat-b"><div className="stat-v" style={{ color: s.c }}>{s.v}</div><div className="stat-l">{s.l}</div></div>
              ))}
            </div>
          </div>

          {/* MUTATION OVERVIEW TABLE */}
          {annotatedMutations.length > 0 && (
            <div className="pc">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.8rem' }}>
                <span>🧬</span><span style={{ fontSize: '1rem', fontWeight: 600, color: '#c8cad4' }}>Mutation Overview Table</span>
                <span style={{ background: 'rgba(16,185,129,.18)', color: '#10B981', fontSize: '.8rem', fontWeight: 600, padding: '.18rem .48rem', borderRadius: 8 }}>{annotatedMutations.length} annotated</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Nucleotide</th><th>Codon</th><th>AA Pos</th><th>HGVS</th><th>Type</th><th>Effect</th><th>Domain</th></tr></thead>
                  <tbody>
                    {annotatedMutations.map((am, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: '"JetBrains Mono",monospace', color: '#67E8F9' }}>{am.positions.nucleotidePosition}</td>
                        <td style={{ fontFamily: '"JetBrains Mono",monospace', color: '#67E8F9' }}>{am.positions.codonNumber}</td>
                        <td style={{ fontFamily: '"JetBrains Mono",monospace', color: '#10B981', fontWeight: 600 }}>{am.positions.aaPosition}</td>
                        <td style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '.82rem', color: '#60A5FA' }}>{am.hgvs}</td>
                        <td style={{ color: '#c8cad4' }}>{am.mutation.type}</td>
                        <td><span className={`badge badge-${am.mutation.mutation_class?.toLowerCase()}`}>{am.mutation.mutation_class}</span></td>
                        <td style={{ fontSize: '.85rem', color: '#8a8f9e' }}>{am.domainMapping.proteinDomain}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROTEIN STRUCTURE VISUALIZATION */}
          {(() => {
            const gene = GENE_PANEL[selectedGene] || GENE_PANEL.TP53;
            const totalLen = gene.proteinLength;
            const domainColorMap = buildDomainColorMap(gene);
            const mutPins = annotatedMutations.map(am => ({ pos: am.positions.aaPosition, hgvs: am.hgvs, color: am.mutation.is_frameshift ? '#EF4444' : am.mutation.mutation_class === 'Missense' ? '#FBBF24' : am.mutation.mutation_class === 'Nonsense' ? '#EF4444' : '#10B981' }));

            return (
              <div className="pc" style={{ borderColor: 'rgba(99,102,241,.35)', background: 'rgba(99,102,241,.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>🔬</span>
                    <span style={{ fontSize: '1rem', fontWeight: 600, color: '#c8cad4' }}>Protein Structure Visualization</span>
                    <span style={{ background: 'rgba(99,102,241,.2)', border: '1px solid rgba(99,102,241,.4)', color: '#A78BFA', fontSize: '.72rem', fontWeight: 600, padding: '.15rem .45rem', borderRadius: 6, textTransform: 'uppercase' }}>2D + 3D Interactive</span>
                  </div>
                </div>

                {/* 2D DOMAIN MAP */}
                <div style={{ marginBottom: '1.2rem' }}>
                  <div style={{ fontSize: '.85rem', fontWeight: 600, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '.6rem' }}>2D Domain Architecture</div>
                  <div style={{ position: 'relative', marginBottom: '2.8rem' }}>
                    <div style={{ position: 'relative', height: '28px', background: '#1a1d26', borderRadius: 4, border: '1px solid #2a2d3a' }}>
                      {gene.domains.map((d, di) => {
                        const left = ((d.start - 1) / totalLen) * 100;
                        const width = ((d.end - d.start + 1) / totalLen) * 100;
                        const col = domainColorMap[d.name] || '#06B6D4';
                        return (
                          <div key={di} title={`${d.name} (${d.start}–${d.end})\n${d.description}`}
                            style={{ position: 'absolute', top: 0, left: `${left}%`, width: `${Math.max(width, 1.5)}%`, height: '100%', background: col, borderRadius: 3, opacity: .9, cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {width > 6 && <span style={{ fontSize: '.6rem', color: 'rgba(255,255,255,.9)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: '0 3px' }}>{d.name.replace(' Domain', '').replace(' Signal', '').replace(' Region', '')}</span>}
                          </div>
                        );
                      })}
                      {mutPins.map((pin, pi) => {
                        const pct = ((pin.pos - 1) / totalLen) * 100;
                        return (
                          <div key={pi} title={pin.hgvs} style={{ position: 'absolute', top: '-2px', left: `${pct}%`, transform: 'translateX(-50%)', zIndex: 10 }}>
                            <div style={{ width: 2, height: 36, background: pin.color, margin: '0 auto', borderRadius: 1 }}></div>
                            <div style={{ width: 10, height: 10, background: pin.color, borderRadius: '50%', margin: '-6px auto 0', border: '2px solid #0c0e14', boxShadow: `0 0 6px ${pin.color}` }}></div>
                            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4, whiteSpace: 'nowrap', fontSize: '.62rem', color: pin.color, fontFamily: '"JetBrains Mono",monospace', fontWeight: 600, background: '#0c0e14', padding: '1px 4px', borderRadius: 3 }}>
                              {pin.hgvs.split(':p.')[1] || pin.hgvs}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.45rem', marginTop: '.5rem' }}>
                    {gene.domains.map((d, di) => (
                      <div key={di} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 6, padding: '.25rem .55rem' }}>
                        <div style={{ width: 10, height: 10, background: domainColorMap[d.name] || '#06B6D4', borderRadius: 2, flexShrink: 0 }}></div>
                        <span style={{ fontSize: '.75rem', color: '#8a8f9e' }}>{d.name}</span>
                        <span style={{ fontSize: '.7rem', color: '#4a4d5a', fontFamily: '"JetBrains Mono",monospace' }}>{d.start}–{d.end}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3D VIEWER */}
                <StructureViewer gene={gene} showRCSB={showRCSB} setShowRCSB={setShowRCSB} mutPins={mutPins} />
              </div>
            );
          })()}

          {/* DETAILED MUTATION REPORT */}
          {annotatedMutations.length > 0 && (
            <div className="pc">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.55rem', marginBottom: '.8rem' }}><span>📋</span><span style={{ fontSize: '1rem', fontWeight: 600, color: '#c8cad4' }}>Detailed Mutation Interpretation</span></div>
              {annotatedMutations.map((am, idx) => (
                <div key={idx} className="mut-card" style={{ borderLeft: `4px solid ${am.mutation.is_frameshift ? '#DC2626' : am.mutation.mutation_class === 'Missense' ? '#FBBF24' : am.mutation.mutation_class === 'Nonsense' ? '#EF4444' : '#10B981'}` }}>
                  <div style={{ marginBottom: '.75rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#c8cad4', marginBottom: '.25rem' }}>Mutation {idx + 1}: {am.mutation.type}</h3>
                    <div style={{ fontSize: '.9rem', fontFamily: '"JetBrains Mono",monospace', color: '#10B981', fontWeight: 600 }}>{am.hgvs}</div>
                  </div>
                  {am.mutation.reference_amino_acid && am.mutation.alternate_amino_acid && (
                    <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', padding: '.75rem', borderRadius: '6px', marginBottom: '.75rem' }}>
                      <div style={{ fontSize: '.85rem', color: '#67E8F9', marginBottom: '.5rem', fontWeight: 600 }}>Amino Acid Change</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '1rem', color: '#60A5FA', fontWeight: 600 }}>{am.mutation.reference_codon} ({am.mutation.reference_amino_acid})</span>
                        <span style={{ color: '#6b7080', fontSize: '1.2rem' }}>→</span>
                        <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: '1rem', color: '#FBBF24', fontWeight: 600 }}>{am.mutation.alternate_codon} ({am.mutation.alternate_amino_acid})</span>
                      </div>
                      <div style={{ fontSize: '.85rem', color: '#8a8f9e', marginTop: '.5rem' }}>{AA_PROPERTIES[am.mutation.reference_amino_acid]?.name} → {AA_PROPERTIES[am.mutation.alternate_amino_acid]?.name}</div>
                    </div>
                  )}
                  <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', padding: '.75rem', borderRadius: '6px', marginBottom: '.75rem' }}>
                    <div style={{ fontSize: '.85rem', color: '#10B981', fontWeight: 600, marginBottom: '.5rem' }}>🔬 Protein Domain Annotation</div>
                    <div style={{ fontSize: '.9rem', color: '#8a8f9e', lineHeight: 1.6 }}>
                      <div><strong style={{ color: '#c8cad4' }}>Domain:</strong> {am.domainMapping.proteinDomain}</div>
                      {!am.domainMapping.isInterDomain && <><div><strong style={{ color: '#c8cad4' }}>Functional Region:</strong> {am.domainMapping.functionalRegion}</div><div><strong style={{ color: '#c8cad4' }}>Region:</strong> AA {am.domainMapping.start}–{am.domainMapping.end}</div></>}
                      <div style={{ marginTop: '.5rem', fontStyle: 'italic', color: '#67E8F9' }}>{am.domainMapping.interpretation}</div>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', padding: '.75rem', borderRadius: '6px' }}>
                    <div style={{ fontSize: '.85rem', color: '#FBBF24', fontWeight: 600, marginBottom: '.5rem' }}>📊 Biological Interpretation</div>
                    <div style={{ fontSize: '.9rem', color: '#8a8f9e', lineHeight: 1.6 }}>{am.interpretation.scientificNote}</div>
                  </div>
                  {(() => {
                    const path = scorePathogenicity(am.mutation, am.domainMapping);
                    return (
                      <div className={path.bgClass} style={{ marginTop: '.75rem' }}>
                        <div className="path-label" style={{ color: path.color }}>
                          <span>{path.level === 'PATHOGENIC' ? '🔴' : path.level === 'LIKELY_PATHOGENIC' ? '🟡' : path.level === 'VUS' ? '🔵' : '🟢'}</span>
                          Pathogenicity: {path.label}
                          <span style={{ marginLeft: 'auto', background: path.color + '22', border: `1px solid ${path.color}55`, color: path.color, fontSize: '.7rem', fontWeight: 700, padding: '.1rem .4rem', borderRadius: 5 }}>{path.shortLabel}</span>
                        </div>
                        <div className="path-bar-wrap"><div className="path-bar" style={{ width: `${path.score}%`, background: path.score >= 70 ? '#EF4444' : path.score >= 45 ? '#F59E0B' : path.score >= 25 ? '#818CF8' : '#10B981' }}></div></div>
                        <div style={{ fontSize: '.78rem', color: '#6b7080', marginBottom: '.4rem' }}>Score: {path.score}/100</div>
                        {path.reasons.map((r, ri) => (<div key={ri} style={{ fontSize: '.8rem', color: '#8a8f9e', display: 'flex', gap: '.4rem' }}><span style={{ color: path.color }}>·</span>{r}</div>))}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}

          {mutations.mutations?.length === 0 && (
            <div className="pc" style={{ textAlign: 'center', padding: '2.2rem', borderColor: 'rgba(16,185,129,.3)', background: 'rgba(16,185,129,.06)' }}>
              <div style={{ fontSize: '1.85rem', marginBottom: '.4rem' }}>✅</div>
              <div style={{ fontSize: '1.05rem', color: '#10B981', fontWeight: 700 }}>No mutations detected — sequences are identical</div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}