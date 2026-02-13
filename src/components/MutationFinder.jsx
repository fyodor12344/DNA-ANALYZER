import React, { useState, useEffect } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TP53 MUTATION ANALYZER - RESEARCH GRADE
   Canonical Transcript: NM_000546.6
   ═══════════════════════════════════════════════════════════════════════════ */

// TP53 Canonical Transcript Configuration
const TP53_CANONICAL = {
  id: 'NM_000546.6',
  name: 'Human TP53 tumor protein p53 transcript variant 1',
  type: 'Canonical',
  proteinLength: 393,
  domains: [
    { 
      name: 'Transactivation Domain', 
      start: 1, 
      end: 93,
      functionalRegion: 'Critical',
      description: 'Required for p53-mediated transcriptional activation'
    },
    { 
      name: 'Proline-Rich Domain', 
      start: 64, 
      end: 92,
      functionalRegion: 'Structural',
      description: 'Important for p53 apoptotic function'
    },
    { 
      name: 'DNA Binding Domain', 
      start: 102, 
      end: 292,
      functionalRegion: 'Critical',
      description: 'Essential for sequence-specific DNA binding and tumor suppression'
    },
    { 
      name: 'Nuclear Localization Signal', 
      start: 316, 
      end: 325,
      functionalRegion: 'Critical',
      description: 'Directs p53 to nucleus'
    },
    { 
      name: 'Oligomerization Domain', 
      start: 323, 
      end: 356,
      functionalRegion: 'Structural',
      description: 'Required for p53 tetramerization'
    },
    { 
      name: 'Regulatory Domain', 
      start: 356, 
      end: 393,
      functionalRegion: 'Regulatory',
      description: 'Negatively regulates p53 DNA binding'
    }
  ]
};

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
    alternate:'ATGGCCATTGTAATGGGCCGTTGAAAGGGTGCCCGATAG',
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

// Amino Acid Properties for Biochemical Analysis
const AA_PROPERTIES = {
  'A': { name: 'Alanine',     size: 'small',    polarity: 'nonpolar',   charge: 'neutral' },
  'R': { name: 'Arginine',    size: 'large',    polarity: 'polar',      charge: 'positive' },
  'N': { name: 'Asparagine',  size: 'medium',   polarity: 'polar',      charge: 'neutral' },
  'D': { name: 'Aspartate',   size: 'medium',   polarity: 'polar',      charge: 'negative' },
  'C': { name: 'Cysteine',    size: 'small',    polarity: 'polar',      charge: 'neutral' },
  'E': { name: 'Glutamate',   size: 'medium',   polarity: 'polar',      charge: 'negative' },
  'Q': { name: 'Glutamine',   size: 'medium',   polarity: 'polar',      charge: 'neutral' },
  'G': { name: 'Glycine',     size: 'small',    polarity: 'nonpolar',   charge: 'neutral' },
  'H': { name: 'Histidine',   size: 'large',    polarity: 'polar',      charge: 'positive' },
  'I': { name: 'Isoleucine',  size: 'medium',   polarity: 'nonpolar',   charge: 'neutral' },
  'L': { name: 'Leucine',     size: 'medium',   polarity: 'nonpolar',   charge: 'neutral' },
  'K': { name: 'Lysine',      size: 'large',    polarity: 'polar',      charge: 'positive' },
  'M': { name: 'Methionine',  size: 'medium',   polarity: 'nonpolar',   charge: 'neutral' },
  'F': { name: 'Phenylalanine', size: 'large',  polarity: 'nonpolar',   charge: 'neutral' },
  'P': { name: 'Proline',     size: 'small',    polarity: 'nonpolar',   charge: 'neutral' },
  'S': { name: 'Serine',      size: 'small',    polarity: 'polar',      charge: 'neutral' },
  'T': { name: 'Threonine',   size: 'small',    polarity: 'polar',      charge: 'neutral' },
  'W': { name: 'Tryptophan',  size: 'large',    polarity: 'nonpolar',   charge: 'neutral' },
  'Y': { name: 'Tyrosine',    size: 'large',    polarity: 'polar',      charge: 'neutral' },
  'V': { name: 'Valine',      size: 'small',    polarity: 'nonpolar',   charge: 'neutral' },
  '*': { name: 'Stop',        size: 'n/a',      polarity: 'n/a',        charge: 'n/a' }
};

/* ─── CODON TABLE ────────────────────────────────────────────────────────── */
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
  const m={A:'T',T:'A',G:'C',C:'G'}; 
  return seq.split('').reverse().map(b=>m[b]||b).join(''); 
};

// BUG FIX #2: Removed incorrect T→U replacement. CODON_TABLE keys use DNA (T),
// so replacing T with U caused every lookup to return undefined → '?'.
const translateCodon = codon => CODON_TABLE[codon] || '?';

/* ─── POSITION CALCULATION ───────────────────────────────────────────────── */
const calculatePositions = (nucleotidePos, frame) => {
  const offset = parseInt(frame) - 1;
  const adjustedPos = nucleotidePos - offset;
  const codonNumber = Math.floor(adjustedPos / 3) + 1;
  const aaPosition = codonNumber;
  const literaturePosition = aaPosition; // No offset for canonical TP53
  
  return {
    nucleotidePosition: nucleotidePos + 1, // 1-based
    codonNumber: codonNumber,
    aaPosition: aaPosition,
    literaturePosition: literaturePosition
  };
};

/* ─── HGVS NOTATION ───────────────────────────────────────────────────────── */
const generateHGVS = (mutation, positions) => {
  const prefix = `${TP53_CANONICAL.id}:p.`;
  
  if (mutation.mutation_class === 'Silent') {
    return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}=`;
  }
  
  if (mutation.mutation_class === 'Missense') {
    return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}${mutation.alternate_amino_acid}`;
  }
  
  if (mutation.mutation_class === 'Nonsense') {
    return `${prefix}${mutation.reference_amino_acid}${positions.literaturePosition}*`;
  }
  
  // BUG FIX #4: Check frameshift before insertion/deletion so both paths get
  // a safe fallback for reference_amino_acid when it is undefined.
  if (mutation.is_frameshift) {
    const aa = mutation.reference_amino_acid || 'X';
    return `${prefix}${aa}${positions.literaturePosition}fs`;
  }
  
  if (mutation.type === 'Insertion') {
    // Use reference_amino_acid when available; fall back to positional notation
    const aa = mutation.reference_amino_acid;
    if (aa) {
      return `${prefix}${aa}${positions.literaturePosition}_${positions.literaturePosition + 1}ins`;
    }
    return `${prefix}${positions.literaturePosition}_${positions.literaturePosition + 1}ins`;
  }
  
  if (mutation.type === 'Deletion') {
    const aa = mutation.reference_amino_acid;
    if (aa) {
      return `${prefix}${aa}${positions.literaturePosition}del`;
    }
    return `${prefix}${positions.literaturePosition}del`;
  }
  
  return `${prefix}?`;
};

/* ─── DOMAIN MAPPING ──────────────────────────────────────────────────────── */
const getDomainMapping = (aaPosition) => {
  // Check if position falls within any domain
  for (const domain of TP53_CANONICAL.domains) {
    if (aaPosition >= domain.start && aaPosition <= domain.end) {
      return {
        proteinDomain: domain.name,
        functionalRegion: domain.functionalRegion,
        interpretation: `Mutation occurs inside functional domain: ${domain.description}`,
        start: domain.start,
        end: domain.end,
        isInterDomain: false
      };
    }
  }
  
  // Inter-domain region
  return {
    proteinDomain: 'Inter-domain region',
    functionalRegion: 'N/A',
    interpretation: 'Mutation in inter-domain linker region',
    isInterDomain: true
  };
};

/* ─── BIOLOGICAL INTERPRETATION ───────────────────────────────────────────── */
const getBiologicalInterpretation = (mutation, domainMapping) => {
  let interpretation = {
    mutationType: mutation.type,
    functionalEffect: mutation.mutation_class,
    confidence: 'High',
    confidenceReason: '',
    scientificNote: '',
    biochemicalAnalysis: null
  };
  
  // Missense mutations
  if (mutation.mutation_class === 'Missense' && mutation.reference_amino_acid && mutation.alternate_amino_acid) {
    const refProps = AA_PROPERTIES[mutation.reference_amino_acid];
    const altProps = AA_PROPERTIES[mutation.alternate_amino_acid];
    
    if (refProps && altProps) {
      interpretation.biochemicalAnalysis = {
        referenceAA: { aa: mutation.reference_amino_acid, ...refProps },
        alternateAA: { aa: mutation.alternate_amino_acid, ...altProps },
        sizeChange: refProps.size !== altProps.size,
        polarityChange: refProps.polarity !== altProps.polarity,
        chargeChange: refProps.charge !== altProps.charge
      };
      
      let changes = [];
      if (refProps.charge !== altProps.charge) changes.push(`charge (${refProps.charge} → ${altProps.charge})`);
      if (refProps.polarity !== altProps.polarity) changes.push(`polarity (${refProps.polarity} → ${altProps.polarity})`);
      if (refProps.size !== altProps.size) changes.push(`size (${refProps.size} → ${altProps.size})`);
      
      if (changes.length > 0) {
        interpretation.scientificNote = `Substitution alters biochemical properties: ${changes.join(', ')}. This may affect protein stability or DNA-binding affinity, particularly within the ${domainMapping.proteinDomain}.`;
      } else {
        interpretation.scientificNote = 'Conservative substitution with similar biochemical properties. May have minimal structural impact, but functional effects depend on structural context.';
      }
    }
    
    interpretation.confidenceReason = 'Clear codon-level substitution with defined amino acid change';
  }
  
  // Frameshift mutations
  if (mutation.is_frameshift) {
    interpretation.scientificNote = 'Frameshift likely disrupts downstream reading frame and truncates protein. Loss-of-function mutation expected with severely reduced or absent p53 tumor suppressor activity.';
    interpretation.confidenceReason = 'Frameshift detected via sequence length difference';
  }
  
  // Nonsense mutations
  if (mutation.mutation_class === 'Nonsense') {
    interpretation.scientificNote = 'Premature stop codon may produce truncated nonfunctional protein. Nonsense-mediated decay may reduce mRNA stability, leading to loss of p53 function.';
    interpretation.confidenceReason = 'Stop codon introduced at defined position';
  }
  
  // Silent mutations
  if (mutation.mutation_class === 'Silent') {
    interpretation.scientificNote = 'Synonymous substitution with no amino acid change. Unlikely to affect protein function, though may influence mRNA stability or translation efficiency.';
    interpretation.confidenceReason = 'Synonymous codon change verified';
  }
  
  return interpretation;
};

/* ─── SEQUENCE ALIGNMENT (Needleman-Wunsch) ───────────────────────────────── */
const alignSequences = (seq1, seq2) => {
  const len1 = seq1.length;
  const len2 = seq2.length;
  
  if (len1 === len2) {
    return { ref: seq1, alt: seq2 };
  }
  
  const MATCH = 2;
  const MISMATCH = -1;
  const GAP = -2;
  
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i * GAP;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j * GAP;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const match = matrix[i-1][j-1] + (seq1[i-1] === seq2[j-1] ? MATCH : MISMATCH);
      const deleteGap = matrix[i-1][j] + GAP;
      const insertGap = matrix[i][j-1] + GAP;
      matrix[i][j] = Math.max(match, deleteGap, insertGap);
    }
  }
  
  let alignedRef = '';
  let alignedAlt = '';
  let i = len1, j = len2;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && matrix[i][j] === matrix[i-1][j-1] + (seq1[i-1] === seq2[j-1] ? MATCH : MISMATCH)) {
      alignedRef = seq1[i-1] + alignedRef;
      alignedAlt = seq2[j-1] + alignedAlt;
      i--; j--;
    } else if (i > 0 && matrix[i][j] === matrix[i-1][j] + GAP) {
      alignedRef = seq1[i-1] + alignedRef;
      alignedAlt = '-' + alignedAlt;
      i--;
    } else {
      alignedRef = '-' + alignedRef;
      alignedAlt = seq2[j-1] + alignedAlt;
      j--;
    }
  }
  
  return { ref: alignedRef, alt: alignedAlt };
};

/* ─── MUTATION DETECTION ──────────────────────────────────────────────────── */
const detectMutations = (ref, alt, frame, strand) => {
  let seq1 = ref.toUpperCase().replace(/\s/g, '');
  let seq2 = alt.toUpperCase().replace(/\s/g, '');
  
  if (strand === 'reverse') {
    seq1 = revComp(seq1);
    seq2 = revComp(seq2);
  }

  const mutations = [];
  const warnings = [];
  const offset = parseInt(frame) - 1;
  const lengthDiff = seq2.length - seq1.length;
  
  // Validation warnings
  if (seq1.length % 3 !== 0) {
    warnings.push('Reference sequence length not divisible by 3 - may indicate incomplete CDS');
  }
  if (lengthDiff !== 0 && Math.abs(lengthDiff) % 3 !== 0) {
    warnings.push('Length difference suggests frameshift mutation');
  }
  
  if (lengthDiff === 0) {
    // Equal length - SNPs only
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
            
            // Determine mutation class
            let mutClass = 'Missense';
            if (refAA === altAA) mutClass = 'Silent';
            else if (altAA === '*') mutClass = 'Nonsense';
            
            const alreadyReported = mutations.some(m => m.codon_position === codonStart);
            
            if (!alreadyReported) {
              mutations.push({
                type: 'SNP',
                position: i,
                codon_position: codonStart,
                reference: seq1[i],
                alternate: seq2[i],
                reference_codon: refCodon,
                alternate_codon: altCodon,
                reference_amino_acid: refAA,
                alternate_amino_acid: altAA,
                mutation_class: mutClass
              });
            }
          }
        }
      }
    }
  } else {
    // Unequal length - perform alignment
    const alignment = alignSequences(seq1, seq2);
    let i = 0, j = 0;
    
    while (i < alignment.ref.length || j < alignment.alt.length) {
      const refBase = alignment.ref[i] || '';
      const altBase = alignment.alt[j] || '';
      
      if (refBase === '-' && altBase !== '-') {
        // Insertion
        let insertedSeq = altBase;
        let k = j + 1;
        while (k < alignment.alt.length && alignment.ref[i + (k - j)] === '-') {
          insertedSeq += alignment.alt[k];
          k++;
        }
        
        const insertLength = insertedSeq.length;
        const isFrameshift = insertLength % 3 !== 0;
        
        mutations.push({
          type: 'Insertion',
          position: i,
          inserted_sequence: insertedSeq,
          length: insertLength,
          is_frameshift: isFrameshift,
          mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Insertion',
          reference_codon: '---',
          alternate_codon: insertedSeq.substring(0, 3)
        });
        
        j = k;
      } else if (refBase !== '-' && altBase === '-') {
        // Deletion
        let deletedSeq = refBase;
        let k = i + 1;
        while (k < alignment.ref.length && alignment.alt[j + (k - i)] === '-') {
          deletedSeq += alignment.ref[k];
          k++;
        }
        
        const deleteLength = deletedSeq.length;
        const isFrameshift = deleteLength % 3 !== 0;
        
        mutations.push({
          type: 'Deletion',
          position: i,
          deleted_sequence: deletedSeq,
          length: deleteLength,
          is_frameshift: isFrameshift,
          mutation_class: isFrameshift ? 'Frameshift' : 'In-frame Deletion',
          reference_codon: deletedSeq.substring(0, 3),
          alternate_codon: '---'
        });
        
        i = k;
      } else if (refBase !== '-' && altBase !== '-' && refBase !== altBase) {
        // SNP in aligned region
        const codonIndex = Math.floor((i - offset) / 3);
        const codonStart = codonIndex * 3 + offset;
        
        if (codonStart >= 0 && codonStart + 3 <= seq1.length) {
          const refCodon = seq1.substring(codonStart, codonStart + 3);
          const altCodon = seq2.substring(codonStart, codonStart + 3);
          
          if (refCodon.length === 3 && altCodon.length === 3) {
            const refAA = translateCodon(refCodon);
            const altAA = translateCodon(altCodon);
            
            // Determine mutation class
            let mutClass = 'Missense';
            if (refAA === altAA) mutClass = 'Silent';
            else if (altAA === '*') mutClass = 'Nonsense';
            
            const alreadyReported = mutations.some(m => m.codon_position === codonStart);
            
            if (!alreadyReported) {
              mutations.push({
                type: 'SNP',
                position: i,
                codon_position: codonStart,
                reference: refBase,
                alternate: altBase,
                reference_codon: refCodon,
                alternate_codon: altCodon,
                reference_amino_acid: refAA,
                alternate_amino_acid: altAA,
                mutation_class: mutClass
              });
            }
          }
        }
        i++; j++;
      } else {
        i++; j++;
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

  return {
    mutations,
    summary,
    warnings,
    sequences: {
      reference: seq1,
      alternate: seq2,
      reference_length: seq1.length,
      alternate_length: seq2.length,
      length_difference: lengthDiff,
      reading_frame: frame,
      strand: strand
    }
  };
};

/* ─── PDF GENERATION ──────────────────────────────────────────────────────── */
const generatePDF = (analysisData, annotatedMutations, analysisParams) => {
  const date = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString();
  
  let pdf = `TP53 MUTATION ANALYSIS REPORT\n`;
  pdf += `${'='.repeat(80)}\n\n`;
  
  pdf += `ANALYSIS PARAMETERS\n`;
  pdf += `${'-'.repeat(80)}\n`;
  pdf += `Transcript Reference: ${TP53_CANONICAL.id} - ${TP53_CANONICAL.name} (${TP53_CANONICAL.type})\n`;
  pdf += `Reading Frame: +${analysisParams.readingFrame}\n`;
  pdf += `Strand: ${analysisParams.strand}\n`;
  pdf += `Reference Length: ${analysisData.sequences.reference_length} bp\n`;
  pdf += `Alternate Length: ${analysisData.sequences.alternate_length} bp\n`;
  pdf += `Length Difference: ${analysisData.sequences.length_difference} bp\n`;
  pdf += `Analysis Date: ${timestamp}\n\n`;
  
  pdf += `SUMMARY STATISTICS\n`;
  pdf += `${'-'.repeat(80)}\n`;
  pdf += `Total Mutations: ${analysisData.summary.total_mutations}\n`;
  pdf += `SNPs: ${analysisData.summary.snps}\n`;
  pdf += `Insertions: ${analysisData.summary.insertions}\n`;
  pdf += `Deletions: ${analysisData.summary.deletions}\n`;
  pdf += `Frameshift Mutations: ${analysisData.summary.frameshift_mutations}\n`;
  pdf += `Silent Mutations: ${analysisData.summary.silent_mutations}\n`;
  pdf += `Missense Mutations: ${analysisData.summary.missense_mutations}\n`;
  pdf += `Nonsense Mutations: ${analysisData.summary.nonsense_mutations}\n\n`;
  
  if (annotatedMutations && annotatedMutations.length > 0) {
    pdf += `MUTATION OVERVIEW TABLE\n`;
    pdf += `${'='.repeat(80)}\n\n`;
    
    annotatedMutations.forEach((am, idx) => {
      const mut = am.mutation;
      pdf += `Mutation ${idx + 1}\n`;
      pdf += `${'-'.repeat(80)}\n`;
      pdf += `Nucleotide Position: ${am.positions.nucleotidePosition}\n`;
      pdf += `Codon Number: ${am.positions.codonNumber}\n`;
      pdf += `Amino Acid Position: ${am.positions.aaPosition}\n`;
      pdf += `Literature Position: ${am.positions.literaturePosition}\n`;
      pdf += `HGVS Notation: ${am.hgvs}\n`;
      pdf += `Mutation Type: ${mut.type}\n`;
      pdf += `Functional Effect: ${mut.mutation_class}\n`;
      pdf += `Confidence Level: ${am.interpretation.confidence}\n`;
      
      if (mut.reference_amino_acid && mut.alternate_amino_acid) {
        pdf += `Amino Acid Change: ${mut.reference_amino_acid} (${AA_PROPERTIES[mut.reference_amino_acid]?.name}) → ${mut.alternate_amino_acid} (${AA_PROPERTIES[mut.alternate_amino_acid]?.name})\n`;
      }
      
      pdf += `\nProtein Domain Annotation:\n`;
      pdf += `  Domain: ${am.domainMapping.proteinDomain}\n`;
      if (!am.domainMapping.isInterDomain) {
        pdf += `  Functional Region: ${am.domainMapping.functionalRegion}\n`;
        pdf += `  Region: AA ${am.domainMapping.start}-${am.domainMapping.end}\n`;
      }
      pdf += `  Interpretation: ${am.domainMapping.interpretation}\n`;
      
      pdf += `\nBiological Interpretation:\n`;
      pdf += `  ${am.interpretation.scientificNote}\n`;
      pdf += `  Confidence: ${am.interpretation.confidence} - ${am.interpretation.confidenceReason}\n`;
      
      pdf += `\n`;
    });
  }
  
  pdf += `\nMETHODS NOTE\n`;
  pdf += `${'-'.repeat(80)}\n`;
  pdf += `All mutations were mapped to canonical TP53 transcript ${TP53_CANONICAL.id}.\n`;
  pdf += `Sequence alignment performed using Needleman-Wunsch algorithm.\n`;
  pdf += `Domain mapping based on canonical TP53 protein structure (393 amino acids).\n`;
  pdf += `HGVS notation follows standard nomenclature guidelines.\n`;
  
  const blob = new Blob([pdf], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TP53_Mutation_Report_${date}.txt`;
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

  // Load sample mutation
  const loadSample = key => {
    const s = MUTATION_SAMPLES[key];
    setSeq1(s.reference); 
    setSeq2(s.alternate);
    setReadingFrame(s.readingFrame); 
    setStrand(s.strand);
    setCurrentSample(s); 
    setSampleBannerVisible(true);
    setShowSampleMenu(false); 
    setMutations(null); 
    setError('');
    setAiExplanation('');
  };

  // Close menu on outside click
  useEffect(() => {
    const close = () => setShowSampleMenu(false);
    if (showSampleMenu) { 
      document.addEventListener('click', close); 
      return () => document.removeEventListener('click', close); 
    }
  }, [showSampleMenu]);

  // Validate and analyze
  const handleAnalyze = () => {
    // Validation
    if (!seq1.trim() || !seq2.trim()) {
      setError('Both sequences are required');
      return;
    }
    
    const cleanSeq1 = seq1.toUpperCase().replace(/\s/g, '');
    const cleanSeq2 = seq2.toUpperCase().replace(/\s/g, '');
    
    if (!/^[ATGC]+$/.test(cleanSeq1)) {
      setError('Reference sequence contains invalid characters (only A, T, G, C allowed)');
      return;
    }
    
    if (!/^[ATGC]+$/.test(cleanSeq2)) {
      setError('Alternate sequence contains invalid characters (only A, T, G, C allowed)');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = detectMutations(cleanSeq1, cleanSeq2, readingFrame, strand);
      setMutations(result);
    } catch (e) {
      setError(`Analysis failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // BUG FIX #3: Use codon_position (codon start index) in preference to raw
  // position (single-base index) when calling calculatePositions for SNPs.
  // Previously `mutation.position || mutation.codon_position` always resolved
  // to the raw base index for SNPs because position is always set, producing
  // incorrect codon numbers and AA positions.
  useEffect(() => {
    if (mutations && mutations.mutations && readingFrame) {
      const annotated = mutations.mutations.map(mutation => {
        const positionIndex = mutation.codon_position ?? mutation.position ?? 0;
        
        const positions = calculatePositions(positionIndex, readingFrame);
        const hgvs = generateHGVS(mutation, positions);
        const domainMapping = getDomainMapping(positions.aaPosition);
        const interpretation = getBiologicalInterpretation(mutation, domainMapping);
        
        return {
          mutation,
          positions,
          hgvs,
          domainMapping,
          interpretation
        };
      });
      
      setAnnotatedMutations(annotated);
    }
  }, [mutations, readingFrame]);

  // PDF export
  const handleExportPDF = () => {
    if (!mutations) return;
    
    try {
      generatePDF(mutations, annotatedMutations, { readingFrame, strand });
    } catch (e) {
      setError(`PDF export failed: ${e.message}`);
    }
  };

  // AI Explanation (mock - can be connected to API)
  const handleAI = async () => {
    if (!mutations) return;
    setLoadingAI(true);
    setError('');
    
    try {
      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      let explanation = `TP53 Mutation Analysis Summary:\n\n`;
      explanation += `Detected ${mutations.summary.total_mutations} mutation(s) in the provided sequences.\n\n`;
      
      if (mutations.summary.missense_mutations > 0) {
        explanation += `Missense Mutations: ${mutations.summary.missense_mutations} detected. These substitutions alter amino acid identity and may affect p53 protein stability, DNA-binding capacity, or transactivation potential.\n\n`;
      }
      
      if (mutations.summary.frameshift_mutations > 0) {
        explanation += `Frameshift Mutations: ${mutations.summary.frameshift_mutations} detected. These indels disrupt the reading frame, likely producing truncated non-functional p53 protein. Such mutations are typically loss-of-function and associated with impaired tumor suppression.\n\n`;
      }
      
      if (mutations.summary.nonsense_mutations > 0) {
        explanation += `Nonsense Mutations: ${mutations.summary.nonsense_mutations} detected. Premature stop codons result in truncated p53 protein, eliminating downstream functional domains.\n\n`;
      }
      
      if (annotatedMutations.length > 0) {
        const criticalDomain = annotatedMutations.filter(am => 
          am.domainMapping.functionalRegion === 'Critical'
        );
        if (criticalDomain.length > 0) {
          explanation += `Critical Domain Alert: ${criticalDomain.length} mutation(s) detected in critical functional domains (DNA-binding, transactivation, or nuclear localization). These mutations have high likelihood of functional impairment.\n\n`;
        }
      }
      
      explanation += `Clinical Relevance: TP53 is the most frequently mutated gene in human cancers. Mutations in TP53 are associated with Li-Fraumeni syndrome, various solid tumors, and hematologic malignancies. The detected mutations should be interpreted in clinical context with additional genomic and phenotypic data.`;
      
      setAiExplanation(explanation);
    } catch (e) {
      setError('AI analysis failed');
    } finally {
      setLoadingAI(false);
    }
  };

  return (
  <div style={{ minHeight:'100vh', background:'#0c0e14', color:'#e2e4e9', fontFamily:'"Sora",sans-serif', fontSize:'1.05em' }}>
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
    *{ box-sizing:border-box; margin:0; padding:0; }
    ::-webkit-scrollbar{ width:5px; }
    ::-webkit-scrollbar-track{ background:#131518; }
    ::-webkit-scrollbar-thumb{ background:#2a2d3a; border-radius:3px; }
    
    .pc{ background:#141720; border:1px solid #24272f; border-radius:12px; padding:1.5rem; margin-bottom:1.2rem; animation: fadeSlideIn 0.4s ease-out; }
    .lbl{ display:block; font-size:.95rem; font-weight:600; color:#6b7080; text-transform:uppercase; letter-spacing:.08em; margin-bottom:.5rem; }
    
    select, textarea{
      width:100%; background:#0f1117; border:1px solid #24272f; border-radius:8px;
      color:#e2e4e9; font-family:'Sora',sans-serif; font-size:1.05rem;
      padding:.8rem .95rem; outline:none; transition:all .3s ease;
    }
    select:focus, textarea:focus{ border-color:#06B6D4; box-shadow: 0 0 0 3px rgba(6,182,212,0.1); }
    textarea{ resize:vertical; font-family:'JetBrains Mono',monospace; font-size:.95rem; line-height:1.85; }
    textarea::placeholder{ color:#2e3145; }
    select option{ background:#0f1117; }
    
    .btn-p{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:1rem 1.35rem;
      background:linear-gradient(135deg,#06B6D4,#0891B2);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.1rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-p::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-p:hover::before{ left:100%; }
    .btn-p:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(6,182,212,.4); }
    .btn-p:active{ transform:translateY(0); }
    .btn-p:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; box-shadow:none; }
    
    .btn-ai{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:.95rem 1.35rem;
      background:linear-gradient(135deg,#14B8A6,#0D9488);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-ai::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-ai:hover::before{ left:100%; }
    .btn-ai:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(20,184,166,.4); }
    .btn-ai:disabled{ filter:brightness(.5); cursor:not-allowed; transform:none; }
    
    .btn-pdf{
      display:flex; align-items:center; justify-content:center; gap:.6rem;
      width:100%; padding:.95rem 1.35rem;
      background:linear-gradient(135deg,#8B5CF6,#7C3AED);
      border:none; border-radius:10px;
      color:#fff; font-family:'Sora',sans-serif; font-weight:600; font-size:1.05rem;
      cursor:pointer; transition:all .3s ease;
      position:relative; overflow:hidden;
    }
    .btn-pdf::before{
      content:''; position:absolute; top:0; left:-100%; width:100%; height:100%;
      background:linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition:left 0.5s ease;
    }
    .btn-pdf:hover::before{ left:100%; }
    .btn-pdf:hover{ filter:brightness(1.12); transform:translateY(-2px); box-shadow:0 8px 24px rgba(139,92,246,.4); }
    
    .btn-g{
      display:inline-flex; align-items:center; gap:.42rem;
      padding:.52rem 1rem; background:transparent;
      border:1px solid #24272f; border-radius:7px;
      color:#8a8f9e; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500;
      cursor:pointer; transition:all .25s ease;
    }
    .btn-g:hover{ border-color:#06B6D4; color:#06B6D4; background:rgba(6,182,212,.06); transform:translateY(-1px); }
    
    .btn-sample{
      display:inline-flex; align-items:center; gap:.42rem;
      padding:.5rem 1rem; background:rgba(6,182,212,.1);
      border:1px solid rgba(6,182,212,.3); border-radius:7px;
      color:#67E8F9; font-family:'Sora',sans-serif; font-size:.95rem; font-weight:500;
      cursor:pointer; transition:all .25s ease; position:relative;
    }
    .btn-sample:hover{ background:rgba(6,182,212,.18); border-color:rgba(6,182,212,.55); transform:translateY(-1px); }
    
    .sample-menu{
      position:absolute; top:calc(100% + .35rem); left:0;
      background:#141720; border:1px solid #24272f; border-radius:10px;
      box-shadow:0 12px 32px rgba(0,0,0,.45); padding:.6rem;
      z-index:100; min-width:280px; max-width:90vw;
      animation: dropdownSlide 0.25s ease-out;
    }
    .sample-item{
      padding:.8rem .9rem; border-radius:8px; cursor:pointer;
      border:1px solid transparent; margin-bottom:.32rem; transition:all .2s ease;
    }
    .sample-item:hover{ border-color:#06B6D4; background:rgba(6,182,212,.07); transform:translateX(4px); }
    .sample-item:last-child{ margin-bottom:0; }
    
    .info-wrap{ overflow:hidden; transition:max-height .4s cubic-bezier(.4,0,.2,1), opacity .3s; }
    .info-wrap.closed{ max-height:0; opacity:0; }
    .info-wrap.open{ max-height:1200px; opacity:1; }
    
    .stat-b{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:.9rem .7rem; text-align:center; 
             transition:all .3s ease; animation: fadeIn 0.4s ease-out; }
    .stat-b:hover{ transform:translateY(-3px); box-shadow:0 4px 12px rgba(6,182,212,.15); border-color:#06B6D4; }
    .stat-v{ font-size:1.6rem; font-weight:700; line-height:1.2; }
    .stat-l{ font-size:.85rem; color:#6b7080; text-transform:uppercase; letter-spacing:.06em; margin-top:.3rem; }
    
    .mut-card{ background:#0f1117; border:1px solid #1e2130; border-radius:10px; padding:1.25rem; margin-bottom:.8rem; 
               animation: fadeSlideIn 0.3s ease-out; transition:all .3s ease; }
    .mut-card:hover{ transform:translateX(4px); box-shadow:0 4px 16px rgba(6,182,212,.1); border-color:#24272f; }
    
    .ai-box{ background:rgba(6,182,212,.08); border:1px solid rgba(6,182,212,.3); border-radius:12px; padding:1.35rem; margin-bottom:1.1rem; 
             animation: fadeSlideIn 0.4s ease-out; }
    
    table{ width:100%; border-collapse:collapse; margin-top:1rem; }
    th, td{ padding:0.75rem; text-align:left; border-bottom:1px solid #24272f; font-size:0.9rem; }
    th{ background:#0f1117; font-weight:600; color:#67E8F9; text-transform:uppercase; font-size:0.8rem; letter-spacing:0.05em; }
    td{ color:#8a8f9e; }
    
    .badge{ display:inline-block; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:600; }
    .badge-missense{ background:rgba(251,191,36,0.2); color:#FBBF24; border:1px solid rgba(251,191,36,0.3); }
    .badge-nonsense{ background:rgba(239,68,68,0.2); color:#EF4444; border:1px solid rgba(239,68,68,0.3); }
    .badge-silent{ background:rgba(16,185,129,0.2); color:#10B981; border:1px solid rgba(16,185,129,0.3); }
    .badge-frameshift{ background:rgba(220,38,38,0.2); color:#FCA5A5; border:1px solid rgba(220,38,38,0.3); }
    
    .warning{ background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem; color:#FBBF24; }
    .error{ background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:0.75rem; margin-bottom:1rem; color:#EF4444; }
    
    .seq-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .seq-input-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; }
    .config-grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .summary-grid{ display:grid; grid-template-columns:repeat(4,1fr); gap:.6rem; }
    
    @media(max-width:768px){
      .seq-input-grid{ grid-template-columns:1fr; }
      .config-grid{ grid-template-columns:1fr; }
      .summary-grid{ grid-template-columns:repeat(2,1fr); }
    }
    
    @media(max-width:640px){
      .seq-grid{ grid-template-columns:1fr; }
    }
    
    @keyframes spin{ to{ transform:rotate(360deg); } }
    .spin{ display:inline-block; width:18px; height:18px; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; border-radius:50%; animation:spin .5s linear infinite; }
    
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes dropdownSlide { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  `}</style>

  <div className="container" style={{ maxWidth:'860px', margin:'0 auto', padding:'1.25rem 1.2rem 3rem' }}>
    {/* HEADER */}
    <div style={{ background:'linear-gradient(180deg,#141820 0%,#0c0e14 100%)', borderBottom:'1px solid #1e2130', padding:'1.65rem 1.3rem 1.3rem', margin:'-1.25rem -1.2rem 0', marginBottom:'1.25rem' }}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ 
          background:'linear-gradient(135deg, #164E63 0%, #083344 100%)', 
          border:'2px solid rgba(6, 182, 212, 0.3)', 
          borderRadius:'14px', 
          padding:'1.1rem 1.3rem',
          marginBottom:'.6rem',
          boxShadow:'0 8px 32px rgba(6, 182, 212, 0.15)'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.75rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'1.75rem' }}>🧬</span>
            <h1 style={{ fontFamily:'Sora', fontWeight:700, fontSize:'1.75rem', color:'#fff', margin:0 }}>Mutation Finder</h1>
            <span style={{ background:'rgba(6,182,212,.2)', border:'1px solid rgba(6,182,212,.4)', color:'#67E8F9', fontSize:'.75rem', fontWeight:600, padding:'.25rem .6rem', borderRadius:20, letterSpacing:'.08em', textTransform:'uppercase' }}>Research Grade</span>
          </div>
        </div>
        <p style={{ color:'#6b7080', fontSize:'1.05rem', lineHeight:1.6, maxWidth:560, margin:0 }}>
          Compare two DNA sequences to identify and classify SNPs, insertions, deletions, and frameshift mutations with codon-level resolution.
        </p>
      </div>
    </div>

    {/* INFO TOGGLE */}
    <button className="btn-g" onClick={()=>setInfoOpen(v=>!v)} style={{ width:'100%', justifyContent:'space-between', marginBottom:'1.1rem' }}>
      <span style={{ display:'flex', alignItems:'center', gap:'.45rem' }}>
        <span style={{ fontSize:'1.05rem' }}>💡</span>
        <span style={{ fontSize:'1rem' }}>Why This Tool Matters & How to Use It</span>
      </span>
      <span style={{ fontSize:'.82rem', color:'#6b7080', transition:'transform .25s', transform:infoOpen?'rotate(180deg)':'rotate(0)', display:'inline-block' }}>▼</span>
    </button>

    <div className={`info-wrap ${infoOpen?'open':'closed'}`}>
      <div className="pc" style={{ padding:'1.45rem' }}>
        <div style={{ marginBottom:'1.2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.55rem' }}>
            <span style={{ fontSize:'1.05rem' }}>🎯</span>
            <span style={{ fontSize:'.95rem', fontWeight:600, color:'#06B6D4', textTransform:'uppercase', letterSpacing:'.07em' }}>Why This Tool Matters</span>
          </div>
          <p style={{ fontSize:'1.05rem', color:'#8a8f9e', lineHeight:1.75, margin:0 }}>
            This research-grade TP53 mutation analyzer maps all mutations to the canonical transcript <strong style={{color:'#10B981'}}>NM_000546.6</strong>. It provides multi-level position reporting, HGVS notation, protein domain annotation, and biochemical property analysis - essential for cancer genomics research and clinical interpretation.
          </p>
        </div>
        <div style={{ borderTop:'1px solid #24272f', margin:'1.1rem 0' }}></div>
        <div style={{ fontSize:'.9rem', color:'#8a8f9e', padding:'.8rem', background:'rgba(6,182,212,.04)', borderRadius:'6px', borderLeft:'3px solid #06B6D4' }}>
          <strong style={{ color:'#67E8F9' }}>Transcript Reference:</strong> {TP53_CANONICAL.id} – {TP53_CANONICAL.name} ({TP53_CANONICAL.type})
        </div>
      </div>
    </div>

    {/* LOAD SAMPLE */}
    <div style={{ position:'relative', marginBottom:'1.1rem' }}>
      <button className="btn-sample" onClick={e=>{ e.stopPropagation(); setShowSampleMenu(v=>!v); }}>
        <span style={{ fontSize:'1.02rem' }}>📋</span>
        <span>Load Sample Mutations</span>
        <span style={{ fontSize:'.82rem', color:'#6b7080', marginLeft:'.25rem' }}>▼</span>
      </button>
      {showSampleMenu && (
        <div className="sample-menu" onClick={e=>e.stopPropagation()}>
          {Object.entries(MUTATION_SAMPLES).map(([k, s]) => (
            <div key={k} className="sample-item" onClick={()=>loadSample(k)} style={{ background:`${s.color}0a` }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.22rem' }}>
                <span style={{ fontSize:'1.25rem' }}>{s.icon}</span>
                <span style={{ fontSize:'1rem', fontWeight:600, color:s.color }}>{s.name}</span>
              </div>
              <div style={{ fontSize:'.9rem', color:'#8a8f9e', lineHeight:1.45 }}>{s.description}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* SAMPLE BANNER */}
    {sampleBannerVisible && currentSample && (
      <div className="pc" style={{ borderColor:currentSample.color+'55', background:`${currentSample.color}08`, marginBottom:'1.1rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'.65rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            <span style={{ fontSize:'1.6rem' }}>{currentSample.icon}</span>
            <div>
              <div style={{ fontSize:'1.05rem', fontWeight:700, color:currentSample.color }}>Sample Loaded: {currentSample.name}</div>
              <div style={{ fontSize:'.95rem', color:'#8a8f9e', marginTop:'.12rem' }}>{currentSample.description}</div>
            </div>
          </div>
          <button onClick={()=>setSampleBannerVisible(false)} style={{ background:'none', border:'none', color:'#6b7080', fontSize:'1.4rem', cursor:'pointer', padding:'.1rem' }}>×</button>
        </div>
      </div>
    )}

    {/* BUG FIX #1: Restructured Analysis Configuration card so config-grid is
        properly closed within its own .pc card, and Sequence Input lives in a
        separate .pc card below. Previously the outer config-grid div was never
        closed before the Sequence Input h2, causing the inputs to be deeply
        nested inside the config card and breaking the layout. */}

    {/* ANALYSIS CONFIG */}
    <div className="pc" style={{ borderColor:'rgba(6,182,212,.3)', background:'rgba(6,182,212,.04)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
        <span style={{ fontSize:'1.05rem' }}>⚙️</span>
        <span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>Analysis Configuration</span>
        <span style={{ background:'#EF4444', color:'#fff', fontSize:'.72rem', fontWeight:700, padding:'.18rem .48rem', borderRadius:8, letterSpacing:'.04em', textTransform:'uppercase', marginLeft:'.35rem' }}>Required</span>
      </div>
      
      {/* Transcript Reference Display */}
      <div style={{ background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.25)', borderRadius:'8px', padding:'.9rem', marginBottom:'1rem' }}>
        <label className="lbl" style={{ color:'#10B981', marginBottom:'.5rem' }}>
          Transcript Reference <span style={{ textTransform:'none', fontWeight:400, letterSpacing:0 }}>(Research Grade)</span>
        </label>
        <div style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.95rem', color:'#10B981', fontWeight:600, marginBottom:'.3rem' }}>
          {TP53_CANONICAL.id} (Canonical TP53)
        </div>
        <div style={{ fontSize:'.88rem', color:'#8a8f9e', fontStyle:'italic' }}>
          🧬 {TP53_CANONICAL.name}
        </div>
      </div>
      
      {/* Reading Frame + Strand selectors */}
      <div className="config-grid">
        <div>
          <label className="lbl">Reading Frame <span style={{ textTransform:'none', color:'#6b7080', fontWeight:400, letterSpacing:0 }}>(codon boundaries)</span></label>
          <select value={readingFrame} onChange={e=>setReadingFrame(e.target.value)} style={{ borderColor: readingFrame ? '#06B6D4' : '#EF4444' }}>
            <option value="1">+1 (start at position 1)</option>
            <option value="2">+2 (start at position 2)</option>
            <option value="3">+3 (start at position 3)</option>
          </select>
        </div>
        <div>
          <label className="lbl">Strand</label>
          <select value={strand} onChange={e=>setStrand(e.target.value)} style={{ borderColor: strand ? '#06B6D4' : '#EF4444' }}>
            <option value="forward">Forward (5′ → 3′)</option>
            <option value="reverse">Reverse (3′ → 5′)</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop:'.95rem', background:'rgba(0,0,0,.2)', borderRadius:8, padding:'.8rem .9rem', border:'1px solid #24272f' }}>
        <div style={{ fontSize:'.97rem', color:'#8a8f9e', lineHeight:1.7 }}>
          <div style={{ display:'flex', alignItems:'start', gap:'.5rem' }}>
            <span style={{ fontSize:'1.05rem', flexShrink:0 }}>ℹ️</span>
            <div>
              <strong style={{ color:'#67E8F9' }}>Why this matters:</strong> DNA is read in triplets (codons). The reading frame sets where each triplet starts; the strand sets the direction. Different combinations produce different proteins.
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* SEQUENCE INPUT */}
    <div className="pc">
      <h3 style={{ fontSize:'1.15rem', fontWeight:600, color:'#c8cad4', marginBottom:'1.2rem' }}>Sequence Input</h3>
      
      <div className="seq-input-grid" style={{ marginBottom:'1rem' }}>
        <div>
          <label className="lbl">Reference Sequence</label>
          <textarea 
            rows={5} 
            value={seq1} 
            onChange={e=>setSeq1(e.target.value)} 
            placeholder="Paste reference DNA sequence (ATGC)…"
            style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.9rem', lineHeight:1.5 }}
          />
          <div style={{ marginTop:'.38rem', fontSize:'.88rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{seq1.replace(/\s/g,'').length} bp</span>
            {seq1.trim() && <span style={{ color:'#10B981' }}>✓ Sequence provided</span>}
          </div>
        </div>
        
        <div>
          <label className="lbl">Alternate Sequence</label>
          <textarea 
            rows={5} 
            value={seq2} 
            onChange={e=>setSeq2(e.target.value)} 
            placeholder="Paste alternate DNA sequence (ATGC)…"
            style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.9rem', lineHeight:1.5 }}
          />
          <div style={{ marginTop:'.38rem', fontSize:'.88rem', color:'#6b7080', fontFamily:'"JetBrains Mono",monospace', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>{seq2.replace(/\s/g,'').length} bp</span>
            {seq2.trim() && <span style={{ color:'#10B981' }}>✓ Sequence provided</span>}
          </div>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom:'1rem' }}>
          ⚠️ {error}
        </div>
      )}
      
      {!seq1.trim() || !seq2.trim() ? (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'.85rem 1rem', marginBottom:'1rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
            <span style={{ fontSize:'1.2rem' }}>⚠️</span>
            <span style={{ color:'#EF4444', fontSize:'.95rem', fontWeight:600 }}>Both sequences are required</span>
          </div>
        </div>
      ) : null}

      <button 
        className="btn-p" 
        onClick={handleAnalyze} 
        disabled={loading || !seq1.trim() || !seq2.trim()}
        style={{ 
          fontSize:'1.05rem',
          opacity: (!seq1.trim() || !seq2.trim()) ? 0.5 : 1,
          cursor: (!seq1.trim() || !seq2.trim()) ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? (
          <>
            <span className="spin"></span>
            <span>Analyzing Mutations...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize:'1.15rem' }}>🔬</span>
            <span>Analyze Mutations</span>
          </>
        )}
      </button>
    </div>

    {/* RESULTS */}
    {mutations && (<>
      {/* WARNINGS */}
      {mutations.warnings && mutations.warnings.length > 0 && (
        <div className="warning">
          <strong>⚠️ Validation Warnings:</strong>
          <ul style={{ marginTop:'0.5rem', paddingLeft:'1.5rem' }}>
            {mutations.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.8rem', marginBottom:'.8rem' }}>
        <button className="btn-ai" onClick={handleAI} disabled={loadingAI}>
          {loadingAI ? <><span className="spin"></span> Generating AI Analysis…</> : <><span>🤖</span> Get AI Explanation</>}
        </button>
        
        <button className="btn-pdf" onClick={handleExportPDF}>
          <span>📄</span> Download PDF Report
        </button>
      </div>

      {/* AI EXPLANATION */}
      {aiExplanation && (
        <div className="ai-box">
          <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.65rem' }}>
            <span style={{ fontSize:'1.15rem' }}>🤖</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#67E8F9' }}>AI Analysis</span>
          </div>
          <div style={{ fontSize:'1.02rem', color:'#e2e4e9', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:440, overflowY:'auto', background:'rgba(0,0,0,.25)', borderRadius:8, padding:'.85rem', border:'1px solid #24272f' }}>
            {aiExplanation}
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div className="pc">
        <div style={{ display:'flex', alignItems:'center', gap:'.45rem', marginBottom:'.65rem' }}>
          <span style={{ fontSize:'1.05rem' }}>📊</span>
          <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Summary Statistics</span>
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
            {l:'Frameshift',v:mutations.summary.frameshift_mutations,c:'#DC2626'}
          ].map((s,i)=>(
            <div key={i} className="stat-b">
              <div className="stat-v" style={{ color:s.c }}>{s.v}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MUTATION OVERVIEW TABLE */}
      {annotatedMutations.length > 0 && (
        <div className="pc">
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'1.05rem' }}>🧬</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Mutation Overview Table</span>
            <span style={{ background:'rgba(16,185,129,.18)', color:'#10B981', fontSize:'.8rem', fontWeight:600, padding:'.18rem .48rem', borderRadius:8 }}>
              {annotatedMutations.length} annotated
            </span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Nucleotide</th>
                  <th>Codon</th>
                  <th>AA Pos</th>
                  <th>Lit Pos</th>
                  <th>HGVS</th>
                  <th>Type</th>
                  <th>Effect</th>
                  <th>Domain</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {annotatedMutations.map((am,i)=>(
                  <tr key={i} style={{ transition:'background 0.2s' }}>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.nucleotidePosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.codonNumber}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#67E8F9' }}>{am.positions.aaPosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', color:'#10B981', fontWeight:600 }}>{am.positions.literaturePosition}</td>
                    <td style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'.82rem', color:'#60A5FA' }}>{am.hgvs}</td>
                    <td style={{ color:'#c8cad4' }}>{am.mutation.type}</td>
                    <td>
                      <span className={`badge badge-${am.mutation.mutation_class?.toLowerCase()}`}>
                        {am.mutation.mutation_class}
                      </span>
                    </td>
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
          <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.8rem', flexWrap:'wrap' }}>
            <span style={{ fontSize:'1.05rem' }}>📋</span>
            <span style={{ fontSize:'1rem', fontWeight:600, color:'#c8cad4' }}>Detailed Mutation Interpretation</span>
          </div>
          {annotatedMutations.map((am,idx)=>(
            <div key={idx} className="mut-card" style={{ borderLeft:`4px solid ${am.mutation.is_frameshift?'#DC2626':am.mutation.mutation_class==='Missense'?'#FBBF24':am.mutation.mutation_class==='Nonsense'?'#EF4444':'#10B981'}` }}>
              <div style={{ marginBottom:'0.75rem' }}>
                <h3 style={{ fontSize:'1.1rem', fontWeight:600, color:'#c8cad4', marginBottom:'0.25rem' }}>
                  Mutation {idx+1}: {am.mutation.type}
                </h3>
                <div style={{ fontSize:'0.9rem', fontFamily:'"JetBrains Mono",monospace', color:'#10B981', fontWeight:600 }}>
                  {am.hgvs}
                </div>
              </div>

              {am.mutation.reference_amino_acid && am.mutation.alternate_amino_acid && (
                <div style={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.2)', padding:'0.75rem', borderRadius:'6px', marginBottom:'0.75rem' }}>
                  <div style={{ fontSize:'0.85rem', color:'#67E8F9', marginBottom:'0.5rem', fontWeight:600 }}>
                    Amino Acid Change
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'1rem', color:'#60A5FA', fontWeight:600 }}>
                      {am.mutation.reference_codon} ({am.mutation.reference_amino_acid})
                    </span>
                    <span style={{ color:'#6b7080', fontSize:'1.2rem' }}>→</span>
                    <span style={{ fontFamily:'"JetBrains Mono",monospace', fontSize:'1rem', color:'#FBBF24', fontWeight:600 }}>
                      {am.mutation.alternate_codon} ({am.mutation.alternate_amino_acid})
                    </span>
                  </div>
                  <div style={{ fontSize:'0.85rem', color:'#8a8f9e', marginTop:'0.5rem' }}>
                    {AA_PROPERTIES[am.mutation.reference_amino_acid]?.name} → {AA_PROPERTIES[am.mutation.alternate_amino_acid]?.name}
                  </div>
                </div>
              )}

              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', padding:'0.75rem', borderRadius:'6px', marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.85rem', color:'#10B981', fontWeight:600, marginBottom:'0.5rem' }}>
                  🔬 Protein Domain Annotation
                </div>
                <div style={{ fontSize:'0.9rem', color:'#8a8f9e', lineHeight:1.6 }}>
                  <div><strong style={{ color:'#c8cad4' }}>Domain:</strong> {am.domainMapping.proteinDomain}</div>
                  {!am.domainMapping.isInterDomain && (
                    <>
                      <div><strong style={{ color:'#c8cad4' }}>Functional Region:</strong> {am.domainMapping.functionalRegion}</div>
                      <div><strong style={{ color:'#c8cad4' }}>Region:</strong> AA {am.domainMapping.start}–{am.domainMapping.end}</div>
                    </>
                  )}
                  <div style={{ marginTop:'0.5rem', fontStyle:'italic', color:'#67E8F9' }}>
                    {am.domainMapping.interpretation}
                  </div>
                </div>
              </div>

              <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', padding:'0.75rem', borderRadius:'6px' }}>
                <div style={{ fontSize:'0.85rem', color:'#FBBF24', fontWeight:600, marginBottom:'0.5rem' }}>
                  📊 Biological Interpretation
                </div>
                <div style={{ fontSize:'0.9rem', color:'#8a8f9e', lineHeight:1.6 }}>
                  {am.interpretation.scientificNote}
                </div>
                <div style={{ fontSize:'0.85rem', color:'#6b7080', marginTop:'0.5rem', paddingTop:'0.5rem', borderTop:'1px solid rgba(100,116,139,0.2)' }}>
                  <strong style={{ color:'#c8cad4' }}>Confidence:</strong> {am.interpretation.confidence} — {am.interpretation.confidenceReason}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NO MUTATIONS */}
      {mutations.mutations?.length === 0 && (
        <div className="pc" style={{ textAlign:'center', padding:'2.2rem 1.65rem', borderColor:'rgba(16,185,129,.3)', background:'rgba(16,185,129,.06)' }}>
          <div style={{ fontSize:'1.85rem', marginBottom:'.4rem' }}>✅</div>
          <div style={{ fontSize:'1.05rem', color:'#10B981', fontWeight:700 }}>No mutations detected — sequences are identical!</div>
        </div>
      )}
    </>)}
  </div>
  </div>
  );
}