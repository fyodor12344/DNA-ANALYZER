// dnaUtils.js - Pure JavaScript utility functions
// NO JSX CODE SHOULD BE IN THIS FILE

/* ===========================
   BASIC SEQUENCE UTILITIES
=========================== */

export function cleanSeq(seq) {
  return (seq || "").toUpperCase().replace(/[^ATGC]/g, "");
}

export function reverseComplement(seq) {
  const comp = { A: "T", T: "A", G: "C", C: "G" };
  return cleanSeq(seq)
    .split("")
    .reverse()
    .map(n => comp[n] || "")
    .join("");
}

/* ===========================
   COMPOSITION & CONTENT
=========================== */

export function gcContent(seq) {
  const s = cleanSeq(seq);
  if (!s.length) return 0;
  const gc = (s.match(/[GC]/g) || []).length;
  return Number(((gc / s.length) * 100).toFixed(2));
}

export function atContent(seq) {
  const s = cleanSeq(seq);
  if (!s.length) return 0;
  const at = (s.match(/[AT]/g) || []).length;
  return Number(((at / s.length) * 100).toFixed(2));
}

export function nucleotideCounts(seq) {
  const s = cleanSeq(seq);
  return {
    A: (s.match(/A/g) || []).length,
    T: (s.match(/T/g) || []).length,
    G: (s.match(/G/g) || []).length,
    C: (s.match(/C/g) || []).length
  };
}

/* ===========================
   MELTING TEMPERATURE
=========================== */

export function meltingTemp(seq) {
  const s = cleanSeq(seq);
  const len = s.length;
  if (!len) return 0;

  const A = (s.match(/A/g) || []).length;
  const T = (s.match(/T/g) || []).length;
  const G = (s.match(/G/g) || []).length;
  const C = (s.match(/C/g) || []).length;

  if (len < 14) {
    return 2 * (A + T) + 4 * (G + C);
  }

  const gc = gcContent(s);
  const salt = 16.6 * Math.log10(0.05);

  if (len <= 70) {
    return Number((81.5 + salt + 0.41 * gc - 675 / len).toFixed(1));
  }

  return Number((81.5 + salt + 0.41 * gc - 600 / len).toFixed(1));
}

/* ===========================
   CODON TABLES
=========================== */

const CODON_TABLE = {
  TTT:"F",TTC:"F",TTA:"L",TTG:"L",
  CTT:"L",CTC:"L",CTA:"L",CTG:"L",
  ATT:"I",ATC:"I",ATA:"I",ATG:"M",
  GTT:"V",GTC:"V",GTA:"V",GTG:"V",
  TCT:"S",TCC:"S",TCA:"S",TCG:"S",
  CCT:"P",CCC:"P",CCA:"P",CCG:"P",
  ACT:"T",ACC:"T",ACA:"T",ACG:"T",
  GCT:"A",GCC:"A",GCA:"A",GCG:"A",
  TAT:"Y",TAC:"Y",TAA:"*",TAG:"*",
  CAT:"H",CAC:"H",CAA:"Q",CAG:"Q",
  AAT:"N",AAC:"N",AAA:"K",AAG:"K",
  GAT:"D",GAC:"D",GAA:"E",GAG:"E",
  TGT:"C",TGC:"C",TGA:"*",TGG:"W",
  CGT:"R",CGC:"R",CGA:"R",CGG:"R",
  AGT:"S",AGC:"S",AGA:"R",AGG:"R",
  GGT:"G",GGC:"G",GGA:"G",GGG:"G"
};

/* ===========================
   TRANSLATION
=========================== */

export function translate(dna) {
  const s = cleanSeq(dna);
  let aa = "";

  for (let i = 0; i <= s.length - 3; i += 3) {
    const codon = s.substring(i, i + 3);
    const res = CODON_TABLE[codon] || "X";
    if (res === "*") break;
    aa += res;
  }
  return aa;
}

/* ===========================
   ORF DETECTION (FIXED)
=========================== */

export function findORFs(seq) {
  const cleaned = cleanSeq(seq);
  const rev = reverseComplement(cleaned);
  const stopCodons = ["TAA", "TAG", "TGA"];
  const orfs = [];

  const strands = [
    { dna: cleaned, sign: "+" },
    { dna: rev, sign: "-" }
  ];

  strands.forEach(({ dna, sign }) => {
    for (let frame = 0; frame < 3; frame++) {
      let i = frame;

      while (i <= dna.length - 3) {
        const codon = dna.substring(i, i + 3);

        if (codon === "ATG") {
          let j = i + 3;
          let foundStop = false;

          while (j <= dna.length - 3) {
            const stop = dna.substring(j, j + 3);

            if (stopCodons.includes(stop)) {
              const end = j + 3;
              const dnaSeq = dna.substring(i, end);
              const aaSeq = translate(dnaSeq);

              if (aaSeq.length >= 10) {
                orfs.push({
                  frame: sign === "+" ? frame + 1 : -(frame + 1),
                  start: i + 1,
                  end: end,
                  length_nt: end - i,
                  dna_seq: dnaSeq,
                  aa_seq: aaSeq,
                  type: "Complete (with stop codon)"
                });
              }

              i = end;
              foundStop = true;
              break;
            }
            j += 3;
          }

          if (!foundStop) i += 3;
        } else {
          i += 3;
        }
      }
    }
  });

  return orfs.sort((a, b) => b.length_nt - a.length_nt);
}

export function longestORF(seq) {
  const orfs = findORFs(seq);
  return orfs.length ? orfs[0] : null;
}

/* ===========================
   CODON USAGE
=========================== */

export function calculateCodonUsage(seq) {
  const s = cleanSeq(seq);
  const usage = {};
  let total = 0;

  for (let i = 0; i <= s.length - 3; i += 3) {
    const codon = s.substring(i, i + 3);
    if (CODON_TABLE[codon]) {
      usage[codon] = (usage[codon] || 0) + 1;
      total++;
    }
  }

  return Object.entries(usage)
    .map(([codon, count]) => ({
      codon,
      aa: CODON_TABLE[codon],
      count,
      frequency: Number(((count / total) * 100).toFixed(2))
    }))
    .sort((a, b) => b.count - a.count);
}

/* ===========================
   SIX FRAME TRANSLATION
=========================== */

export function translateAllFrames(seq) {
  const s = cleanSeq(seq);
  const r = reverseComplement(s);

  return {
    forward: [
      { frame: "+1", sequence: translate(s) },
      { frame: "+2", sequence: translate(s.slice(1)) },
      { frame: "+3", sequence: translate(s.slice(2)) }
    ],
    reverse: [
      { frame: "-1", sequence: translate(r) },
      { frame: "-2", sequence: translate(r.slice(1)) },
      { frame: "-3", sequence: translate(r.slice(2)) }
    ]
  };
}

/* ===========================
   RESTRICTION SITES
=========================== */

const RESTRICTION_ENZYMES = {
  EcoRI:"GAATTC", BamHI:"GGATCC", HindIII:"AAGCTT",
  PstI:"CTGCAG", SalI:"GTCGAC", XbaI:"TCTAGA",
  SmaI:"CCCGGG", KpnI:"GGTACC", NotI:"GCGGCCGC"
};

export function findRestrictionSites(seq) {
  const s = cleanSeq(seq);
  const results = [];

  Object.entries(RESTRICTION_ENZYMES).forEach(([enz, site]) => {
    let pos = s.indexOf(site);
    const hits = [];

    while (pos !== -1) {
      hits.push(pos + 1);
      pos = s.indexOf(site, pos + 1);
    }

    if (hits.length) {
      results.push({ enzyme: enz, site, positions: hits, count: hits.length });
    }
  });

  return results;
}

/* ===========================
   MOLECULAR WEIGHT
=========================== */

export function calculateMolecularWeight(seq) {
  const c = nucleotideCounts(seq);
  return Number((
    c.A * 313.2 +
    c.T * 304.2 +
    c.G * 329.2 +
    c.C * 289.2
  ).toFixed(2));
}

/* ===========================
   SUMMARY
=========================== */

export function summary(seq) {
  const s = cleanSeq(seq);
  const orfs = findORFs(s);

  return {
    length: s.length,
    gc: gcContent(s),
    at: atContent(s),
    tm: meltingTemp(s),
    molecularWeight: calculateMolecularWeight(s),
    nORFs: orfs.length,
    allORFs: orfs,
    longestORF: longestORF(s),
    revcomp: reverseComplement(s),
    nucleotides: nucleotideCounts(s),
    codonUsage: calculateCodonUsage(s),
    sixFrameTranslation: translateAllFrames(s),
    restrictionSites: findRestrictionSites(s)
  };
}
