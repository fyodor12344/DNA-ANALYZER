// dnaUtils.js - Pure JavaScript utility functions
// NO JSX CODE SHOULD BE IN THIS FILE

/**
 * Cleans the input sequence by converting to uppercase and removing non-ATGC characters
 */
export function cleanSeq(seq) {
  return seq.toUpperCase().replace(/[^ATGC]/g, "");
}

/**
 * Calculates the reverse complement of a DNA sequence
 */
export function reverseComplement(seq) {
  const comp = { A: "T", T: "A", G: "C", C: "G" };
  return cleanSeq(seq)
    .split("")
    .reverse()
    .map((nuc) => comp[nuc] || "")
    .join("");
}

/**
 * Calculates GC content percentage
 */
export function gcContent(seq) {
  seq = cleanSeq(seq);
  if (seq.length === 0) return 0;
  const gc = seq.split("").filter((n) => n === "G" || n === "C").length;
  return Number((gc / seq.length * 100).toFixed(2));
}

/**
 * Calculates AT content percentage
 */
export function atContent(seq) {
  seq = cleanSeq(seq);
  if (seq.length === 0) return 0;
  const at = seq.split("").filter((n) => n === "A" || n === "T").length;
  return Number((at / seq.length * 100).toFixed(2));
}

/**
 * Calculates melting temperature using appropriate formula based on sequence length
 * 
 * For sequences < 14 bp: Wallace Rule (Tm = 2(A+T) + 4(G+C))
 * For sequences 14-70 bp: Basic salt-adjusted formula
 * For sequences > 70 bp: Nearest-neighbor approximation
 * 
 * NOTE: For long sequences (>200 bp), Tm can vary significantly (±5-10°C) based on:
 * - Salt concentration and buffer composition
 * - GC clustering and sequence context
 * - Presence of secondary structures
 * - Mismatches and heteroduplexes
 * 
 * This calculation assumes standard conditions (50mM Na+, no Mg2+, pH 7.0)
 * For accurate Tm measurements of long sequences, use experimental methods or
 * more sophisticated nearest-neighbor thermodynamic calculations.
 */
export function meltingTemp(seq) {
  seq = cleanSeq(seq);
  const length = seq.length;
  
  if (length === 0) return 0;
  
  const a = (seq.match(/A/g) || []).length;
  const t = (seq.match(/T/g) || []).length;
  const g = (seq.match(/G/g) || []).length;
  const c = (seq.match(/C/g) || []).length;
  
  // For very short sequences (primers), use Wallace Rule
  if (length < 14) {
    return 2 * (a + t) + 4 * (g + c);
  }
  
  // For medium sequences (14-70 bp), use basic salt-adjusted formula
  if (length <= 70) {
    // Tm = 81.5 + 16.6 * log10([Na+]) + 0.41 * (%GC) - 675/length
    // Assuming standard salt concentration of 50mM Na+
    const gcPercent = gcContent(seq);
    const saltCorrection = 16.6 * Math.log10(0.05); // 50mM = 0.05M
    const tm = 81.5 + saltCorrection + (0.41 * gcPercent) - (675 / length);
    return Number(tm.toFixed(1));
  }
  
  // For long sequences (>70 bp), use nearest-neighbor approximation
  // Tm = 81.5 + 16.6*log10([Na+]) + 0.41*(%GC) - 600/length
  // Modified denominator for better accuracy with long sequences
  const gcPercent = gcContent(seq);
  const naConc = 0.05; // 50mM Na+
  const saltCorrection = 16.6 * Math.log10(naConc);
  const tm = 81.5 + saltCorrection + (0.41 * gcPercent) - (600 / length);
  
  return Number(tm.toFixed(1));
}

/**
 * Comprehensive codon table with amino acid information
 */
const CODON_TABLE = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V",
  TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E",
  TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GGT: "G", GGC: "G", GGA: "G", GGG: "G"
};

/**
 * Amino acid full names
 */
const AA_NAMES = {
  "A": "Alanine", "R": "Arginine", "N": "Asparagine", "D": "Aspartic acid",
  "C": "Cysteine", "E": "Glutamic acid", "Q": "Glutamine", "G": "Glycine",
  "H": "Histidine", "I": "Isoleucine", "L": "Leucine", "K": "Lysine",
  "M": "Methionine", "F": "Phenylalanine", "P": "Proline", "S": "Serine",
  "T": "Threonine", "W": "Tryptophan", "Y": "Tyrosine", "V": "Valine",
  "*": "Stop"
};

/**
 * Translates a DNA sequence into amino acids
 * Stops at first stop codon
 */
export function translate(dna_seq) {
  if (!dna_seq) return "";
  
  const codons = dna_seq.match(/.{1,3}/g) || [];
  let aa_seq = "";
  
  for (let codon of codons) {
    if (codon.length !== 3) continue; // Skip incomplete codons
    
    const aa = CODON_TABLE[codon] || "X";
    
    if (aa === "*") {
      break; // Stop at first stop codon
    }
    
    aa_seq += aa;
  }
  
  return aa_seq;
}

/**
 * Finds all Open Reading Frames across all six frames
 * IMPROVED: Better ORF detection logic
 */
export function findORFs(seq) {
  const cleaned = cleanSeq(seq);
  const revcomp = reverseComplement(cleaned);
  const orfs = [];
  const stopCodons = ["TAA", "TAG", "TGA"];

  const sequencesToCheck = [
    { dna: cleaned, strand: '+' },
    { dna: revcomp, strand: '-' }
  ];

  sequencesToCheck.forEach(({ dna, strand }) => {
    for (let frame = 0; frame < 3; frame++) {
      const frameNum = frame + 1;
      let i = frame;
      
      // Scan for ATG start codons
      while (i <= dna.length - 3) {
        const codon = dna.substring(i, i + 3);
        
        // Found a start codon (ATG)
        if (codon === "ATG") {
          const start = i;
          let stopFound = false;
          let j = i + 3;
          
          // Look for stop codon in frame
          while (j <= dna.length - 3) {
            const stopCandidate = dna.substring(j, j + 3);
            
            if (stopCodons.includes(stopCandidate)) {
              const end = j + 3;
              const dna_seq = dna.substring(start, end);
              const aa_seq = translate(dna_seq);
              
              // Only include ORFs with at least some protein sequence
              if (aa_seq.length >= 1) {
                orfs.push({
                  frame: strand === '+' ? frameNum : -frameNum,
                  start: start + 1, // Convert to 1-based position
                  end: end,
                  length_nt: dna_seq.length,
                  dna_seq: dna_seq,
                  aa_seq: aa_seq,
                  type: 'Complete (with stop codon)'
                });
              }
              
              stopFound = true;
              i = end; // Move past this ORF
              break;
            }
            
            j += 3;
          }
          
          // No stop codon found - partial ORF to end of sequence
          if (!stopFound) {
            const partial_end = dna.length - (dna.length - start) % 3; // Align to codon boundary
            const dna_seq = dna.substring(start, partial_end);
            const aa_seq = translate(dna_seq);
            
            // Include partial ORFs if they're substantial (at least 10 amino acids)
            if (aa_seq.length >= 10) {
              orfs.push({
                frame: strand === '+' ? frameNum : -frameNum,
                start: start + 1,
                end: partial_end,
                length_nt: dna_seq.length,
                dna_seq: dna_seq,
                aa_seq: aa_seq,
                type: 'Partial (no stop codon)'
              });
            }
            
            i = partial_end; // Move to end
          }
        } else {
          i += 3; // Move to next codon
        }
      }
    }
  });

  // Sort by length (longest first)
  return orfs.sort((a, b) => b.length_nt - a.length_nt);
}

/**
 * Finds the longest ORF
 */
export function longestORF(seq) {
  const orfs = findORFs(seq);
  return orfs.length > 0 ? orfs[0] : null;
}

/**
 * Counts nucleotide occurrences
 */
export function nucleotideCounts(seq) {
  seq = cleanSeq(seq);
  return {
    A: (seq.match(/A/g) || []).length,
    T: (seq.match(/T/g) || []).length,
    G: (seq.match(/G/g) || []).length,
    C: (seq.match(/C/g) || []).length,
  };
}

/**
 * Calculates codon usage frequency
 */
export function calculateCodonUsage(seq) {
  seq = cleanSeq(seq);
  const codonCounts = {};
  const codonUsage = [];
  let totalCodons = 0;

  // Initialize all codons with 0 count
  Object.keys(CODON_TABLE).forEach(codon => {
    codonCounts[codon] = 0;
  });

  // Count codons in the sequence (reading frame 1 only)
  for (let i = 0; i < seq.length - 2; i += 3) {
    const codon = seq.substring(i, i + 3);
    if (codon.length === 3 && codonCounts.hasOwnProperty(codon)) {
      codonCounts[codon]++;
      totalCodons++;
    }
  }

  // Build usage array with frequencies
  Object.keys(CODON_TABLE).forEach(codon => {
    const count = codonCounts[codon];
    const frequency = totalCodons > 0 ? (count / totalCodons * 100).toFixed(2) : 0;
    const aa = CODON_TABLE[codon];
    
    codonUsage.push({
      codon: codon,
      aa: aa,
      aaName: AA_NAMES[aa] || "Unknown",
      count: count,
      frequency: Number(frequency)
    });
  });

  return codonUsage.sort((a, b) => b.count - a.count);
}

/**
 * Translates all six reading frames
 */
export function translateAllFrames(seq) {
  const cleaned = cleanSeq(seq);
  const revcomp = reverseComplement(cleaned);
  
  return {
    forward: [
      { frame: "+1", sequence: translate(cleaned.substring(0)) },
      { frame: "+2", sequence: translate(cleaned.substring(1)) },
      { frame: "+3", sequence: translate(cleaned.substring(2)) }
    ],
    reverse: [
      { frame: "-1", sequence: translate(revcomp.substring(0)) },
      { frame: "-2", sequence: translate(revcomp.substring(1)) },
      { frame: "-3", sequence: translate(revcomp.substring(2)) }
    ]
  };
}

/**
 * Common restriction enzyme recognition sites
 */
const RESTRICTION_ENZYMES = {
  "EcoRI": "GAATTC",
  "BamHI": "GGATCC",
  "HindIII": "AAGCTT",
  "PstI": "CTGCAG",
  "SalI": "GTCGAC",
  "XbaI": "TCTAGA",
  "SmaI": "CCCGGG",
  "KpnI": "GGTACC",
  "NotI": "GCGGCCGC",
  "XhoI": "CTCGAG",
  "NcoI": "CCATGG",
  "NdeI": "CATATG",
  "SacI": "GAGCTC",
  "BglII": "AGATCT",
  "SpeI": "ACTAGT"
};

/**
 * Finds restriction enzyme sites in sequence
 */
export function findRestrictionSites(seq) {
  const cleaned = cleanSeq(seq);
  const sites = [];

  Object.entries(RESTRICTION_ENZYMES).forEach(([enzyme, site]) => {
    const positions = [];
    let index = cleaned.indexOf(site);
    
    while (index !== -1) {
      positions.push(index + 1); // Convert to 1-based
      index = cleaned.indexOf(site, index + 1);
    }

    if (positions.length > 0) {
      sites.push({
        enzyme: enzyme,
        site: site,
        positions: positions,
        count: positions.length
      });
    }
  });

  return sites.sort((a, b) => b.count - a.count);
}

/**
 * Calculate molecular weight (approximate, for ssDNA)
 * Average molecular weight per nucleotide
 */
export function calculateMolecularWeight(seq) {
  const counts = nucleotideCounts(seq);
  
  // Molecular weights for nucleotides (g/mol)
  const weights = { 
    A: 313.2,  // dAMP
    T: 304.2,  // dTMP
    G: 329.2,  // dGMP
    C: 289.2   // dCMP
  };
  
  const weight = (counts.A * weights.A) + 
                 (counts.T * weights.T) + 
                 (counts.G * weights.G) + 
                 (counts.C * weights.C);
  
  return Number(weight.toFixed(2));
}

/**
 * Calculate various sequence statistics
 */
export function getSequenceStats(seq) {
  const cleaned = cleanSeq(seq);
  const counts = nucleotideCounts(cleaned);
  
  return {
    length: cleaned.length,
    purines: counts.A + counts.G,
    pyrimidines: counts.T + counts.C,
    gcContent: gcContent(cleaned),
    atContent: atContent(cleaned),
    gcRatio: counts.G / counts.C || 0,
    atRatio: counts.A / counts.T || 0
  };
}

/**
 * Main summary function with all analyses
 */
export function summary(seq) {
  const cleaned = cleanSeq(seq);
  const allORFs = findORFs(cleaned);
  const longest = longestORF(cleaned);
  
  return {
    length: cleaned.length,
    gc: gcContent(cleaned),
    at: atContent(cleaned),
    tm: meltingTemp(cleaned),
    molecularWeight: calculateMolecularWeight(cleaned),
    nORFs: allORFs.length,
    allORFs: allORFs,
    longestORF: longest,
    revcomp: reverseComplement(cleaned),
    nucleotides: nucleotideCounts(cleaned),
    codonUsage: calculateCodonUsage(cleaned),
    sixFrameTranslation: translateAllFrames(cleaned),
    restrictionSites: findRestrictionSites(cleaned),
    stats: getSequenceStats(cleaned)
  };
}