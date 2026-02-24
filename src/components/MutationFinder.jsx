import { useState, useEffect, useRef, useCallback } from "react";

// ── Three.js loaded from CDN ──────────────────────────────────────
const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

// ═══════════════════════════════════════════════════════════════════
// REFERENCE SEQUENCES
// ═══════════════════════════════════════════════════════════════════
const REFERENCE_SEQUENCES = {
  TP53: {
    accession: "NM_000546.6",
    description: "TP53 CDS (exons 2-11, canonical isoform)",
    seq:
      "ATGGAGGAGCCGCAGTCAGATCCTAGCGGTAATCTACTGGGACGGAACAGCTTTGAGGTGCGTGTTTGT" +
      "GCCTGTCCTGGGAGAGACCGGCGCACAGAGGAAGAGAATCTCCGCAAGAAAGTGGAGCCTCAGAACCCAG" +
      "CACGAACCTACCAGGGCAGCTACGGTTTCCGTCTGGGCTTCTTGCATTCTGGGACAGCCAAGTCTGTGAC" +
      "TTGCACGTACTCCCCTGCCCTCAACAAGATGTTTTGCCAACTGGCCAAGACCTGCCCTGTGCAGCTGTGG" +
      "GTTGATTCCACACCCCCGCCCGGCACCCGCGTCCGCGCCATGGCCATCTACAAGCAGTCACAGCACATGA" +
      "CGGAGGTTGTGAGGCGCTGCCCCCACCATGAGCGCTGCTCAGATAGCGATGGTCTGGCCCCTCCTCAGCA" +
      "TCTTATCCGAGTGGAAGGAAATTTGCGTGTGGAGTATTTGGATGACAGAAACACTTTTCGACATAGTGTGG" +
      "TGGTGCCCTATGAGCCGCCTGAGGTTGGCTCTGACTGTACCACCATCCACTACAACTACATGTGTAACAGT" +
      "TCCTGCATGGGCGGCATGAACCGGAGGCCCATCCTCACCATCATCACACTGGAAGACTCCAGTGGTTAG",
  },
  KRAS: {
    accession: "NM_004985.5",
    description: "KRAS CDS isoform b (189 aa, 570 bp)",
    seq:
      "ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAGCTAAT" +
      "TCAGAATCATTTTGTGGACGAATATGATCCAACAATAGAGGATTCCTACAGGAAGCAAGTAGTAATTGAT" +
      "GGAGAAACCTGTCTCTTGGATATTCTCGACACAGCAGGTCAAGAGGAGTACAGTGCAATGAGGGACCAGT" +
      "ACATGAGGACTGGGGAGGGCTTTCTTTGTGTATTTGCCATAAATAATACTAAATCATTTGAAGATATTCA" +
      "CCATTATAGAGAACAAATTAAAAGAGTTAAGGACTGTGTTTCGAATTAGTGAATTTGATTTTGTTATTATA" +
      "GATGGTCAGATGGCAGAAGATGAGCTATGGCATAGCTTACAGAAACAAGTGGTAATTGATGGAGAAACT" +
      "TGTCTCTTGGATATTCTCGACACAGCAGGTCAAGAGGAGTACAGTGCAATGAGGGACCAGTACATGAGGA" +
      "CTGGGGAGGGCTTTCTTTGTGTATTTGCCATAAATAATACTAAATCATTTGAAGATATTCACCATTATAGA" +
      "TGA",
  },
  BRCA1: {
    accession: "NM_007294.4",
    description: "BRCA1 CDS representative region",
    seq:
      "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGA" +
      "GTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAATT" +
      "TTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGATATAAC" +
      "CAAAAGAGCCTACAAGAAAGTACGAGATTTAGTCAACTTGTTGAAGAGCTATTGAAAATCATTTGTGCT" +
      "TTTCAGCTTGACACAGGTTTGGAGTATGCAAACAGCTATGACCATGATTACGCCAATCTAGCTTGGCGT" +
      "AATCATGGTCATAGCTGTTTCCTGTGTGAAATTGTTATCCGCTCACAATTCCACACAACATACGAGCCG" +
      "GAAGCATAAAGTGTAAAGCCTGGGGTGCCTAATGAGTGAGCTAACTCACATTAATTGCGTTGCGCTCAC" +
      "TGCCCGCTTTCCAGTCGGGAAACCTGTCGTGCCAGTGA",
  },
  EGFR: {
    accession: "NM_005228.5",
    description: "EGFR CDS representative region (kinase domain)",
    seq:
      "ATGCGACCCTCCGGGACGGCCGGGGCAGCGCTCCTGGCGCTGCTGGCTGCGCTCTGCCCGGCGAGTCGGG" +
      "CTCTGGAGGAAAAGAAAGTTTGCCAAGGCACGAGTAACAAGCTCACGCAGTTGGGCACTTTTGAAGATCAT" +
      "TTTCTCAGCCCAGAGATGCGAATCCAAGCAAAGAATTAGGTGAATATGCCTATGGAATTTCCAGCAACTCA" +
      "GGGAACCTCCTGGCTCAGATTAAAGGCTTGGTGACTGATGGAAATGAAGCCATGAAAGTCACTGGTTTTGC" +
      "CAGCAGCAGCGCCCCGAAGGGCAAAGAGCTAGTGATCAAAGAGAAGATAATCGAGATGGCCAAGGATGAGG" +
      "ACCTGGACATCCCAAAGCCCAAGATCATCCTGATGGAAATCTTGGATTTCTTCAGCATGGAAGAGAAGGCC" +
      "TTTACCATCCCGGATGAGCTGCCAGAGCCCGGCCTCCTGAATGGGGTCACCCAGGAGCCCATCCGCTTGCA" +
      "GCAGGGCCAAGATCCTGCAGAAGCAGCTGGAGCTGGTCAAGATCCTGCAGCAGACGTCCCTGGAGAAGCTG" +
      "TGA",
  },
};

// ═══════════════════════════════════════════════════════════════════
// GENE PANEL
// ═══════════════════════════════════════════════════════════════════
const GENE_PANEL = {
  TP53: {
    id: "NM_000546.6", symbol: "TP53", name: "Tumor Protein p53",
    type: "Tumor Suppressor", chromosome: "17p13.1", proteinLength: 393,
    color: "#06B6D4",
    cancerAssociations: ["Lung cancer","Colorectal cancer","Breast cancer","Li-Fraumeni syndrome","Ovarian cancer","Leukemia"],
    clinicalContext: "Most frequently mutated gene in human cancers (~50% of all tumors). Loss of p53 function abrogates cell cycle arrest and apoptosis in response to DNA damage.",
    domains: [
      { name:"Transactivation Domain", start:1,   end:93,  functionalRegion:"Critical",   color:"#06B6D4", description:"Required for p53-mediated transcriptional activation", detail:"Contains the MDM2-binding site (aa 18–26). Key residues: L22, W23, L25, L26." },
      { name:"Proline-Rich Domain",    start:64,  end:92,  functionalRegion:"Structural",  color:"#8B5CF6", description:"Important for p53 apoptotic function",                 detail:"Contains five PXXP motifs. P72 and P47 are common polymorphism sites." },
      { name:"DNA Binding Domain",     start:102, end:292, functionalRegion:"Critical",   color:"#EF4444", description:"Essential for sequence-specific DNA binding",           detail:"Hotspot residues: R175, G245, R248, R249, R273, R282. Zinc: C176, H179, C238, C242." },
      { name:"Nuclear Localization",   start:316, end:325, functionalRegion:"Critical",   color:"#F59E0B", description:"Directs p53 to nucleus",                              detail:"Three overlapping NLS sequences. Mutations cause cytoplasmic sequestration." },
      { name:"Oligomerization Domain", start:323, end:356, functionalRegion:"Structural",  color:"#10B981", description:"Required for p53 tetramerization",                    detail:"Key interface residues: L330, R333, E343, L344, R342." },
      { name:"Regulatory Domain",      start:356, end:393, functionalRegion:"Regulatory",  color:"#A78BFA", description:"Negatively regulates p53 DNA binding",               detail:"Post-translational modification sites: K370, K372, K373, K381, K382, K386." },
    ],
    secondaryStructure: [
      { type:"helix", start:0,   end:0.12, label:"α1" },
      { type:"sheet", start:0.13,end:0.25, label:"β1" },
      { type:"loop",  start:0.25,end:0.32 },
      { type:"helix", start:0.32,end:0.48, label:"α2" },
      { type:"sheet", start:0.50,end:0.65, label:"β2" },
      { type:"loop",  start:0.65,end:0.72 },
      { type:"helix", start:0.72,end:0.85, label:"α3" },
      { type:"loop",  start:0.85,end:1.0  },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === "Missense") return `TP53 missense mutations in the ${domainName} are among the most oncogenic alterations in human cancer.`;
      if (mutClass === "Nonsense" || mutClass === "Frameshift") return "Truncating TP53 mutations result in complete loss of tumor suppressor activity.";
      return "TP53 variants should be evaluated in the context of the full mutational landscape.";
    },
    pdb: { id:"2OCJ", name:"p53 DNA-binding domain bound to DNA", url:"https://www.rcsb.org/3d-view/2OCJ", description:"Crystal structure of TP53 DBD tetramer bound to full-site DNA (2.05Å resolution)" },
    structuralData: {
      bindingSite:"Zinc coordination via C176, H179, C238, C242 essential for DBD folding",
      hotspotMechanism:"R175H disrupts zinc coordination; R248W/Q abolish DNA contact; R273H/C eliminate phosphate backbone contacts",
      conformationalEffect:"Missense mutations cause local or global unfolding of the DBD β-sandwich",
      mdConsequences:"Loss of zinc reduces melting temperature by 5–10°C; R248W shows altered loop L3 dynamics"
    }
  },
  BRCA1: {
    id: "NM_007294.4", symbol: "BRCA1", name: "Breast Cancer Gene 1",
    type: "Tumor Suppressor", chromosome: "17q21.31", proteinLength: 1863,
    color: "#EC4899",
    cancerAssociations: ["Hereditary breast cancer","Ovarian cancer","Fallopian tube cancer","Peritoneal cancer","Pancreatic cancer"],
    clinicalContext: "Germline BRCA1 mutations confer 57–65% lifetime risk of breast cancer and 39–46% risk of ovarian cancer.",
    domains: [
      { name:"RING Domain",        start:1,    end:109,  functionalRegion:"Critical",  color:"#EF4444", description:"E3 ubiquitin ligase activity; interacts with BARD1", detail:"RING finger coordinates two zinc ions via C24, C27, H41, C44, C61, C64, H74, C77." },
      { name:"RING-NBD Linker",    start:110,  end:202,  functionalRegion:"Structural", color:"#8B5CF6", description:"Connects RING domain to nuclear export signals",      detail:"Contains NES1 and NES2 for CRM1-dependent nuclear export." },
      { name:"Coiled-Coil Domain", start:1364, end:1437, functionalRegion:"Structural", color:"#06B6D4", description:"Mediates interaction with PALB2 for HR repair",        detail:"Key residues: L1396, I1399, L1403, M1410." },
      { name:"BRCT Domain 1",      start:1642, end:1736, functionalRegion:"Critical",  color:"#F59E0B", description:"Phosphoprotein binding; essential for DNA damage response", detail:"Binding groove: K1702, T1700, S1655. Mutations: M1775R, Y1853C." },
      { name:"BRCT Domain 2",      start:1756, end:1855, functionalRegion:"Critical",  color:"#10B981", description:"Tandem BRCT repeat; recruits repair factors to DSBs",   detail:"Key contacts: W1837, A1789." },
    ],
    secondaryStructure: [
      { type:"helix", start:0,    end:0.06 }, { type:"sheet", start:0.06, end:0.14 },
      { type:"loop",  start:0.14, end:0.20 }, { type:"helix", start:0.20, end:0.35 },
      { type:"sheet", start:0.35, end:0.50 }, { type:"loop",  start:0.50, end:0.60 },
      { type:"helix", start:0.60, end:0.75 }, { type:"sheet", start:0.75, end:0.88 },
      { type:"loop",  start:0.88, end:1.0  },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (mutClass === "Missense") return `BRCA1 missense mutations in the ${domainName} may disrupt homologous recombination repair.`;
      if (mutClass === "Nonsense" || mutClass === "Frameshift") return "Truncating BRCA1 mutations are strongly associated with HBOC syndrome.";
      return "BRCA1 variants require clinical classification using multifactorial likelihood models.";
    },
    pdb: { id:"1JNX", name:"BRCA1 BRCT tandem domain", url:"https://www.rcsb.org/3d-view/1JNX", description:"Crystal structure of BRCA1 tandem BRCT domains (1.85Å)" },
    structuralData: {
      bindingSite:"BRCT tandem repeat recognizes phospho-Ser motifs via K1702 and W1837",
      hotspotMechanism:"M1775R disrupts the hydrophobic core of BRCT1; C61G/C64G abolish RING zinc coordination",
      conformationalEffect:"RING mutations destabilize the BARD1 heterodimer interface",
      mdConsequences:"BRCT mutations show increased conformational fluctuation in the phosphopeptide binding groove"
    }
  },
  KRAS: {
    id: "NM_004985.5", symbol: "KRAS", name: "Kirsten RAS Proto-Oncogene",
    type: "Oncogene", chromosome: "12p12.1", proteinLength: 189,
    color: "#F59E0B",
    cancerAssociations: ["Pancreatic ductal adenocarcinoma (>90%)","Colorectal cancer","Non-small cell lung cancer","Thyroid cancer","Biliary tract cancer"],
    clinicalContext: "KRAS is the most commonly mutated oncogene in human cancer. Activating mutations lock KRAS in the GTP-bound active state.",
    domains: [
      { name:"P-loop (G1)",          start:10,  end:17,  functionalRegion:"Critical",  color:"#EF4444", description:"GTP/GDP phosphate binding; hotspot for G12 and G13",    detail:"G12 and G13 mutations abolish GAP-stimulated GTPase by steric clash with R789 of GAP." },
      { name:"Switch I (G2)",         start:30,  end:40,  functionalRegion:"Critical",  color:"#F59E0B", description:"Effector binding region; changes conformation upon GTP hydrolysis", detail:"Contacts RAF, PI3K, RALGDS via D33, I36, T35, Y40." },
      { name:"Switch II (G3)",        start:57,  end:76,  functionalRegion:"Critical",  color:"#06B6D4", description:"GAP interaction site; Q61 is a major mutation hotspot",   detail:"Q61 mutations reduce GTPase activity >1000-fold." },
      { name:"G4 Motif",             start:116, end:119, functionalRegion:"Structural", color:"#8B5CF6", description:"Guanine base recognition",                               detail:"NKXD motif. D119 makes two H-bonds to guanine N1 and N2." },
      { name:"G5 Motif",             start:145, end:147, functionalRegion:"Structural", color:"#10B981", description:"Guanine base specificity",                               detail:"A146T/V mutations found in colorectal cancer." },
      { name:"Hypervariable Region",  start:167, end:189, functionalRegion:"Regulatory", color:"#A78BFA", description:"Membrane anchoring; CAAX motif for farnesylation",       detail:"C185 farnesylated by farnesyltransferase." },
    ],
    secondaryStructure: [
      { type:"helix", start:0,    end:0.08 }, { type:"sheet", start:0.08, end:0.18 },
      { type:"loop",  start:0.18, end:0.28 }, { type:"helix", start:0.28, end:0.42 },
      { type:"sheet", start:0.42, end:0.56 }, { type:"loop",  start:0.56, end:0.65 },
      { type:"helix", start:0.65, end:0.80 }, { type:"sheet", start:0.80, end:0.90 },
      { type:"loop",  start:0.90, end:1.0  },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes("P-loop")) return "Mutations at KRAS G12 and G13 (P-loop) are the most clinically significant. G12C is targetable by sotorasib.";
      if (mutClass === "Missense") return `KRAS missense mutations in the ${domainName} may constitutively activate RAS-MAPK signaling.`;
      return "KRAS mutations predict resistance to EGFR-targeted therapies.";
    },
    pdb: { id:"4OBE", name:"KRAS G12C mutant with GDP", url:"https://www.rcsb.org/3d-view/4OBE", description:"Crystal structure of KRAS G12C bound to GDP (1.90Å)" },
    structuralData: {
      bindingSite:"Mg²⁺ coordination via D57 and T35; nucleotide phosphate contacts via G10, G15, K16",
      hotspotMechanism:"G12D/V introduces steric clash with R789 of GAP, preventing catalytic Arg from inserting into GTP binding site",
      conformationalEffect:"G12 mutations stabilize Switch I/II in active GTP-bound conformation; Q61 mutations remove catalytic water positioning residue",
      mdConsequences:"G12V shows restricted Switch II movement; Q61H shows disordered catalytic water network in MD simulations"
    }
  },
  EGFR: {
    id: "NM_005228.5", symbol: "EGFR", name: "Epidermal Growth Factor Receptor",
    type: "Oncogene", chromosome: "7p11.2", proteinLength: 1210,
    color: "#8B5CF6",
    cancerAssociations: ["Non-small cell lung cancer (NSCLC)","Glioblastoma","Colorectal cancer","Head and neck squamous cell carcinoma"],
    clinicalContext: "Activating EGFR mutations are found in ~15% of NSCLC. These mutations predict sensitivity to EGFR tyrosine kinase inhibitors.",
    domains: [
      { name:"Signal Peptide",          start:1,    end:24,   functionalRegion:"Structural", color:"#06B6D4", description:"Directs EGFR to cell membrane",                      detail:"Cleaved co-translationally after Ala24." },
      { name:"Extracellular Domain I",  start:25,   end:310,  functionalRegion:"Regulatory", color:"#10B981", description:"Ligand binding domain; EGF interaction site",         detail:"EGF contacts residues L38, K465, I467, S468." },
      { name:"Extracellular Domain II", start:311,  end:481,  functionalRegion:"Structural", color:"#8B5CF6", description:"Dimerization arm; receptor activation interface",     detail:"β-hairpin dimerization arm (aa 242–259)." },
      { name:"Transmembrane Domain",    start:646,  end:667,  functionalRegion:"Structural", color:"#A78BFA", description:"Membrane spanning helix",                             detail:"V663, T654 mediate transmembrane domain dimerization." },
      { name:"Kinase Domain",           start:712,  end:979,  functionalRegion:"Critical",  color:"#EF4444", description:"ATP binding and catalytic activity; major mutation hotspot (exons 18-21)", detail:"Key mutations: exon 19 del, L858R activating; T790M resistance; C797S osimertinib resistance." },
      { name:"C-terminal Domain",       start:980,  end:1210, functionalRegion:"Regulatory", color:"#F59E0B", description:"Autophosphorylation sites; signal transduction scaffolding", detail:"Y992, Y1045, Y1068, Y1086, Y1173 phosphorylation sites." },
    ],
    secondaryStructure: [
      { type:"helix", start:0,    end:0.10 }, { type:"loop",  start:0.10, end:0.18 },
      { type:"sheet", start:0.18, end:0.30 }, { type:"helix", start:0.30, end:0.48 },
      { type:"loop",  start:0.48, end:0.55 }, { type:"sheet", start:0.55, end:0.68 },
      { type:"helix", start:0.68, end:0.82 }, { type:"loop",  start:0.82, end:0.90 },
      { type:"helix", start:0.90, end:1.0  },
    ],
    getGeneNote: (mutClass, domainName) => {
      if (domainName.includes("Kinase")) return "EGFR kinase domain mutations are the primary predictive biomarker for TKI therapy in NSCLC.";
      if (mutClass === "Missense") return `EGFR missense mutations in the ${domainName} may alter receptor kinase activity.`;
      return "EGFR mutation status is a mandatory biomarker test in newly diagnosed advanced NSCLC.";
    },
    pdb: { id:"2ITX", name:"EGFR kinase domain with erlotinib", url:"https://www.rcsb.org/3d-view/2ITX", description:"EGFR kinase domain (L858R mutant) bound to erlotinib (2.60Å)" },
    structuralData: {
      bindingSite:"ATP binding via K745, T790 gatekeeper; DFG motif: D855, F856, G857",
      hotspotMechanism:"L858R mimics phosphorylated state of activation loop; exon 19 deletions remove autoinhibitory contacts; T790M bulky Met blocks erlotinib binding",
      conformationalEffect:"L858R shifts equilibrium toward active DFG-in conformation; C797S prevents covalent osimertinib binding",
      mdConsequences:"L858R shows pre-organized active conformation; T790M causes 100-fold reduction in gefitinib binding affinity"
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
// LOOKUP TABLES
// ═══════════════════════════════════════════════════════════════════
const CODON_TABLE = {
  TTT:"F",TTC:"F",TTA:"L",TTG:"L",TCT:"S",TCC:"S",TCA:"S",TCG:"S",
  TAT:"Y",TAC:"Y",TAA:"*",TAG:"*",TGT:"C",TGC:"C",TGA:"*",TGG:"W",
  CTT:"L",CTC:"L",CTA:"L",CTG:"L",CCT:"P",CCC:"P",CCA:"P",CCG:"P",
  CAT:"H",CAC:"H",CAA:"Q",CAG:"Q",CGT:"R",CGC:"R",CGA:"R",CGG:"R",
  ATT:"I",ATC:"I",ATA:"I",ATG:"M",ACT:"T",ACC:"T",ACA:"T",ACG:"T",
  AAT:"N",AAC:"N",AAA:"K",AAG:"K",AGT:"S",AGC:"S",AGA:"R",AGG:"R",
  GTT:"V",GTC:"V",GTA:"V",GTG:"V",GCT:"A",GCC:"A",GCA:"A",GCG:"A",
  GAT:"D",GAC:"D",GAA:"E",GAG:"E",GGT:"G",GGC:"G",GGA:"G",GGG:"G",
};
const translateCodon = c => CODON_TABLE[c] || "?";
const revComp = seq => { const m={A:"T",T:"A",G:"C",C:"G"}; return seq.split("").reverse().map(c=>m[c]||c).join(""); };

const AA_THREE = { A:"Ala",R:"Arg",N:"Asn",D:"Asp",C:"Cys",Q:"Gln",E:"Glu",G:"Gly",H:"His",I:"Ile",L:"Leu",K:"Lys",M:"Met",F:"Phe",P:"Pro",S:"Ser",T:"Thr",W:"Trp",Y:"Tyr",V:"Val","*":"Ter" };
const toThree = aa => AA_THREE[aa] || aa;

const AA_PROPS = {
  A:{size:"small",polarity:"nonpolar",charge:"neutral"},R:{size:"large",polarity:"polar",charge:"positive"},
  N:{size:"medium",polarity:"polar",charge:"neutral"},D:{size:"medium",polarity:"polar",charge:"negative"},
  C:{size:"small",polarity:"polar",charge:"neutral"},E:{size:"medium",polarity:"polar",charge:"negative"},
  Q:{size:"medium",polarity:"polar",charge:"neutral"},G:{size:"small",polarity:"nonpolar",charge:"neutral"},
  H:{size:"large",polarity:"polar",charge:"positive"},I:{size:"medium",polarity:"nonpolar",charge:"neutral"},
  L:{size:"medium",polarity:"nonpolar",charge:"neutral"},K:{size:"large",polarity:"polar",charge:"positive"},
  M:{size:"medium",polarity:"nonpolar",charge:"neutral"},F:{size:"large",polarity:"nonpolar",charge:"neutral"},
  P:{size:"small",polarity:"nonpolar",charge:"neutral"},S:{size:"small",polarity:"polar",charge:"neutral"},
  T:{size:"small",polarity:"polar",charge:"neutral"},W:{size:"large",polarity:"nonpolar",charge:"neutral"},
  Y:{size:"large",polarity:"polar",charge:"neutral"},V:{size:"small",polarity:"nonpolar",charge:"neutral"},
  "*":{size:"n/a",polarity:"n/a",charge:"n/a"},
};

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

const COSMIC_HOTSPOTS = {
  TP53:{R175H:{freq:0.068,samples:2847,tissues:["Colorectal","Breast","Lung","Ovarian"],cosmic_id:"COSM10660"},R248W:{freq:0.051,samples:2138,tissues:["Colorectal","Lung","Breast"],cosmic_id:"COSM10662"},R248Q:{freq:0.038,samples:1592,tissues:["Colorectal","Breast","Brain"],cosmic_id:"COSM43617"},R273H:{freq:0.041,samples:1724,tissues:["Colorectal","Lung","Breast"],cosmic_id:"COSM10656"},R273C:{freq:0.029,samples:1213,tissues:["Colorectal","Lung"],cosmic_id:"COSM10657"},G245S:{freq:0.022,samples:921,tissues:["Colorectal","Breast","Lung"],cosmic_id:"COSM10658"},R249S:{freq:0.015,samples:631,tissues:["Liver","Lung"],cosmic_id:"COSM10659"},R282W:{freq:0.018,samples:753,tissues:["Colorectal","Breast"],cosmic_id:"COSM10663"}},
  KRAS:{G12D:{freq:0.158,samples:9241,tissues:["Pancreatic","Colorectal","Lung"],cosmic_id:"COSM521"},G12V:{freq:0.128,samples:7483,tissues:["Pancreatic","Colorectal","Lung"],cosmic_id:"COSM522"},G12C:{freq:0.089,samples:5204,tissues:["Lung","Colorectal","Pancreatic"],cosmic_id:"COSM516"},G12A:{freq:0.041,samples:2397,tissues:["Pancreatic","Colorectal"],cosmic_id:"COSM517"},G13D:{freq:0.076,samples:4441,tissues:["Colorectal","Lung"],cosmic_id:"COSM532"},Q61H:{freq:0.021,samples:1227,tissues:["Pancreatic","Lung"],cosmic_id:"COSM554"},Q61L:{freq:0.018,samples:1051,tissues:["Pancreatic"],cosmic_id:"COSM553"},A146T:{freq:0.012,samples:701,tissues:["Colorectal"],cosmic_id:"COSM572"}},
  BRCA1:{M1775R:{freq:0.008,samples:312,tissues:["Breast","Ovarian"],cosmic_id:"COSM119071"},C61G:{freq:0.011,samples:428,tissues:["Breast","Ovarian"],cosmic_id:"COSM118943"},C64G:{freq:0.006,samples:234,tissues:["Breast"],cosmic_id:"COSM118944"},R1699W:{freq:0.005,samples:196,tissues:["Breast","Ovarian"],cosmic_id:"COSM119074"}},
  EGFR:{L858R:{freq:0.212,samples:8931,tissues:["Lung","Colorectal"],cosmic_id:"COSM6224"},T790M:{freq:0.141,samples:5942,tissues:["Lung"],cosmic_id:"COSM6240"},L861Q:{freq:0.028,samples:1180,tissues:["Lung"],cosmic_id:"COSM6253"},G719S:{freq:0.022,samples:927,tissues:["Lung"],cosmic_id:"COSM6258"},G719A:{freq:0.019,samples:801,tissues:["Lung"],cosmic_id:"COSM6259"},S768I:{freq:0.014,samples:590,tissues:["Lung"],cosmic_id:"COSM6241"}},
};

const CLINVAR_DB = {
  TP53:{R175H:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Li-Fraumeni syndrome; Adrenocortical carcinoma",accession:"RCV000013183",stars:2},R248W:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Li-Fraumeni syndrome; Colorectal cancer",accession:"RCV000013186",stars:2},R248Q:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Li-Fraumeni syndrome",accession:"RCV000076586",stars:2},R273H:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Li-Fraumeni syndrome; Non-small cell lung cancer",accession:"RCV000013180",stars:2},G245S:{sig:"Pathogenic",review:"criteria provided, single submitter",condition:"Li-Fraumeni syndrome",accession:"RCV000013181",stars:1},R249S:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Hepatocellular carcinoma",accession:"RCV000013184",stars:2},R282W:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Li-Fraumeni syndrome",accession:"RCV000013187",stars:2}},
  KRAS:{G12D:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Pancreatic cancer; RAS-associated autoimmune leukoproliferative disease",accession:"RCV000042399",stars:2},G12V:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Pancreatic cancer; Colorectal cancer",accession:"RCV000042400",stars:2},G12C:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Non-small cell lung cancer; Pancreatic cancer",accession:"RCV000042401",stars:2},G13D:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Colorectal cancer; Pancreatic cancer",accession:"RCV000042402",stars:2},Q61H:{sig:"Pathogenic/Likely pathogenic",review:"criteria provided, single submitter",condition:"Pancreatic cancer",accession:"RCV000145122",stars:1}},
  BRCA1:{M1775R:{sig:"Pathogenic",review:"reviewed by expert panel",condition:"Hereditary breast and ovarian cancer",accession:"RCV000112697",stars:3},C61G:{sig:"Pathogenic",review:"reviewed by expert panel",condition:"Hereditary breast and ovarian cancer",accession:"RCV000031178",stars:3},C64G:{sig:"Pathogenic",review:"reviewed by expert panel",condition:"Hereditary breast and ovarian cancer",accession:"RCV000031179",stars:3}},
  EGFR:{L858R:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Non-small cell lung carcinoma",accession:"RCV000114473",stars:2},T790M:{sig:"Pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Non-small cell lung carcinoma; Lung adenocarcinoma",accession:"RCV000114474",stars:2},G719S:{sig:"Likely pathogenic",review:"criteria provided, single submitter",condition:"Non-small cell lung carcinoma",accession:"RCV000114476",stars:1},L861Q:{sig:"Likely pathogenic",review:"criteria provided, multiple submitters, no conflicts",condition:"Non-small cell lung carcinoma",accession:"RCV000114477",stars:2}},
};

const HOTSPOT_RESIDUES = {
  TP53:[175,245,248,249,273,282,220,179,238,242,176],
  KRAS:[12,13,61,146,59,116,117,119],
  BRCA1:[1775,61,64,1699,24,27,41,44,1702,1700,1655],
  EGFR:[858,790,719,861,768,797,745,746,747,748,749,750,769],
};

// ═══════════════════════════════════════════════════════════════════
// MUTATION DETECTION ENGINES
// ═══════════════════════════════════════════════════════════════════
const normalizeSeq = raw => raw.replace(/^>.*$/gm,"").replace(/[\s\r\n\t]/g,"").toUpperCase();

// Research Mode: Needleman-Wunsch global alignment
function needlemanWunsch(seq1, seq2) {
  const GAP = -2, MATCH = 2, MISMATCH = -1;
  const m = seq1.length, n = seq2.length;
  const dp = Array.from({length:m+1},()=>new Int16Array(n+1));
  for (let i=0;i<=m;i++) dp[i][0]=-i*2;
  for (let j=0;j<=n;j++) dp[0][j]=-j*2;
  for (let i=1;i<=m;i++)
    for (let j=1;j<=n;j++)
      dp[i][j]=Math.max(dp[i-1][j-1]+(seq1[i-1]===seq2[j-1]?MATCH:MISMATCH),dp[i-1][j]+GAP,dp[i][j-1]+GAP);
  let i=m,j=n,a1="",a2="";
  while(i>0||j>0){
    if(i>0&&j>0&&dp[i][j]===dp[i-1][j-1]+(seq1[i-1]===seq2[j-1]?MATCH:MISMATCH)){a1=seq1[i-1]+a1;a2=seq2[j-1]+a2;i--;j--;}
    else if(i>0&&dp[i][j]===dp[i-1][j]+GAP){a1=seq1[i-1]+a1;a2="-"+a2;i--;}
    else{a1="-"+a1;a2=seq2[j-1]+a2;j--;}
  }
  return {aligned1:a1,aligned2:a2,score:dp[m][n]};
}

function detectResearchMutations(wt, mut, frame, strand, isProtein) {
  let ref = normalizeSeq(wt), alt = normalizeSeq(mut);
  if (strand==="reverse") { ref=revComp(ref); alt=revComp(alt); }
  const {aligned1, aligned2} = needlemanWunsch(ref.substring(0,400), alt.substring(0,400));
  const mutations=[]; const offset=parseInt(frame)-1;
  for (let i=0;i<aligned1.length;i++){
    if (aligned1[i]!==aligned2[i]){
      const refNt=aligned1[i], altNt=aligned2[i];
      const codonIdx=Math.floor((i-offset)/3);
      const codonStart=codonIdx*3+offset;
      if (!isProtein) {
        if (refNt==="-") { mutations.push({type:"Insertion",position:i,inserted:altNt,codon_position:codonStart}); }
        else if (altNt==="-") { mutations.push({type:"Deletion",position:i,deleted:refNt,codon_position:codonStart}); }
        else if (codonStart>=0&&codonStart+3<=aligned1.replace(/-/g,"").length) {
          const rc=ref.substring(codonStart,codonStart+3), ac=alt.substring(codonStart,codonStart+3);
          if (rc.length===3&&ac.length===3) {
            const raa=translateCodon(rc), aaa=translateCodon(ac);
            const mc=raa===aaa?"Silent":aaa==="*"?"Nonsense":"Missense";
            if (!mutations.some(m=>m.codon_position===codonStart))
              mutations.push({type:"SNP",position:i,reference:refNt,alternate:altNt,reference_codon:rc,alternate_codon:ac,reference_amino_acid:raa,alternate_amino_acid:aaa,mutation_class:mc,codon_position:codonStart,blosum62:BLOSUM62[raa]?.[aaa]??0});
          }
        }
      } else {
        if (refNt!=="-"&&altNt!=="-"&&refNt!==altNt)
          mutations.push({type:"Substitution",position:i,reference:refNt,alternate:altNt,reference_amino_acid:refNt,alternate_amino_acid:altNt,mutation_class:refNt===altNt?"Silent":altNt==="*"?"Nonsense":"Missense",codon_position:i,blosum62:BLOSUM62[refNt]?.[altNt]??0});
        else if (refNt==="-") mutations.push({type:"Insertion",position:i,inserted:altNt,codon_position:i});
        else if (altNt==="-") mutations.push({type:"Deletion",position:i,deleted:refNt,codon_position:i});
      }
    }
  }
  const identity=aligned1.split("").filter((c,i)=>c===aligned2[i]&&c!=="-").length/aligned1.length;
  return {mutations,aligned1,aligned2,identity,summary:{total:mutations.length,snps:mutations.filter(m=>m.type==="SNP"||m.type==="Substitution").length,insertions:mutations.filter(m=>m.type==="Insertion").length,deletions:mutations.filter(m=>m.type==="Deletion").length,missense:mutations.filter(m=>m.mutation_class==="Missense").length,nonsense:mutations.filter(m=>m.mutation_class==="Nonsense").length,silent:mutations.filter(m=>m.mutation_class==="Silent").length}};
}

// Cancer Mode: reference-based detection
function detectMutationsVsRef(userSeq, geneKey, frame, strand) {
  const refEntry=REFERENCE_SEQUENCES[geneKey];
  if (!refEntry) throw new Error("No reference for "+geneKey);
  let ref=normalizeSeq(refEntry.seq), alt=normalizeSeq(userSeq);
  if (alt.length>5000) throw new Error("Sequence too long (max 5000 bp)");
  if (!/^[ATGCN]+$/.test(alt)) throw new Error("Invalid characters — only ATGC allowed");
  if (strand==="reverse") { ref=revComp(ref); alt=revComp(alt); }
  const offset=parseInt(frame)-1, mutations=[], warnings=[];
  if (alt.length%3!==0) warnings.push("Input length not divisible by 3 — reading frame may be shifted");
  if (ref.length===alt.length) {
    for (let i=0;i<ref.length;i++){
      if (ref[i]!==alt[i]){
        const codonIdx=Math.floor((i-offset)/3);
        const cs=codonIdx*3+offset;
        if (cs>=0&&cs+3<=ref.length){
          const rc=ref.substring(cs,cs+3), ac=alt.substring(cs,cs+3);
          if (rc.length===3&&ac.length===3&&!/-/.test(rc+ac)){
            const raa=translateCodon(rc), aaa=translateCodon(ac);
            const mc=raa===aaa?"Silent":aaa==="*"?"Nonsense":"Missense";
            if (!mutations.some(m=>m.codon_position===cs))
              mutations.push({type:"SNP",position:i,codon_position:cs,reference:ref[i],alternate:alt[i],reference_codon:rc,alternate_codon:ac,reference_amino_acid:raa,alternate_amino_acid:aaa,mutation_class:mc});
          }
        }
      }
    }
  } else {
    const minLen=Math.min(ref.length,alt.length);
    let pLen=0; while(pLen<minLen&&ref[pLen]===alt[pLen]) pLen++;
    let e1=ref.length-1,e2=alt.length-1;
    while(e1>pLen&&e2>pLen&&ref[e1]===alt[e2]){e1--;e2--;}
    const mid1=ref.slice(pLen,e1+1), mid2=alt.slice(pLen,e2+1);
    if (mid1.length===0){const isFS=mid2.length%3!==0;mutations.push({type:"Insertion",position:pLen,codon_position:pLen,inserted_sequence:mid2,length:mid2.length,is_frameshift:isFS,mutation_class:isFS?"Frameshift":"In-frame Insertion",reference_codon:"---",alternate_codon:mid2.substring(0,3)});}
    else if (mid2.length===0){const isFS=mid1.length%3!==0;mutations.push({type:"Deletion",position:pLen,codon_position:pLen,deleted_sequence:mid1,length:mid1.length,is_frameshift:isFS,mutation_class:isFS?"Frameshift":"In-frame Deletion",reference_codon:mid1.substring(0,3),alternate_codon:"---"});}
    else{const nd=mid2.length-mid1.length;if(nd>0){const isFS=nd%3!==0;mutations.push({type:"Insertion",position:pLen,codon_position:pLen,inserted_sequence:mid2,length:nd,is_frameshift:isFS,mutation_class:isFS?"Frameshift":"In-frame Insertion",reference_codon:mid1.substring(0,3),alternate_codon:mid2.substring(0,3)});}else{const isFS=Math.abs(nd)%3!==0;mutations.push({type:"Deletion",position:pLen,codon_position:pLen,deleted_sequence:mid1,length:Math.abs(nd),is_frameshift:isFS,mutation_class:isFS?"Frameshift":"In-frame Deletion",reference_codon:mid1.substring(0,3),alternate_codon:mid2.substring(0,3)});}}
  }
  const summary={total_mutations:mutations.length,snps:mutations.filter(m=>m.type==="SNP").length,insertions:mutations.filter(m=>m.type==="Insertion").length,deletions:mutations.filter(m=>m.type==="Deletion").length,frameshift_mutations:mutations.filter(m=>m.is_frameshift).length,silent_mutations:mutations.filter(m=>m.mutation_class==="Silent").length,missense_mutations:mutations.filter(m=>m.mutation_class==="Missense").length,nonsense_mutations:mutations.filter(m=>m.mutation_class==="Nonsense").length};
  return {mutations,summary,warnings,sequences:{reference:ref,alternate:alt,reference_name:`${geneKey} ${refEntry.accession}`,reference_length:ref.length,alternate_length:alt.length,length_difference:alt.length-ref.length,reading_frame:frame,strand}};
}

// ═══════════════════════════════════════════════════════════════════
// SCORING + ANNOTATION
// ═══════════════════════════════════════════════════════════════════
const calcPositions = (nucleotidePos, frame) => {
  const offset=parseInt(frame)-1, adj=nucleotidePos-offset, cn=Math.floor(adj/3)+1;
  return {nucleotidePosition:nucleotidePos+1,codonNumber:cn,aaPosition:cn};
};

const getDomain = (aaPos, geneKey="TP53") => {
  const gene=GENE_PANEL[geneKey]||GENE_PANEL.TP53;
  for (const d of gene.domains)
    if (aaPos>=d.start&&aaPos<=d.end)
      return {proteinDomain:d.name,functionalRegion:d.functionalRegion,start:d.start,end:d.end,isInterDomain:false,color:d.color,detail:d.detail};
  return {proteinDomain:"Inter-domain region",functionalRegion:"N/A",isInterDomain:true,color:"#6b7080"};
};

const generateHGVS = (mutation, positions, geneKey="TP53") => {
  const gene=GENE_PANEL[geneKey]||GENE_PANEL.TP53;
  const prefix=`${gene.id}:p.`, aaPos=positions.aaPosition, raa=mutation.reference_amino_acid, aaa=mutation.alternate_amino_acid;
  if (mutation.mutation_class==="Silent"&&raa) return `${prefix}${toThree(raa)}${aaPos}=`;
  if (mutation.mutation_class==="Missense"&&raa&&aaa) return `${prefix}${toThree(raa)}${aaPos}${toThree(aaa)}`;
  if (mutation.mutation_class==="Nonsense"&&raa) return `${prefix}${toThree(raa)}${aaPos}Ter`;
  if (mutation.is_frameshift&&mutation.type==="Insertion") return raa?`${prefix}${toThree(raa)}${aaPos}fs*?`:`${prefix}${aaPos}fs*?`;
  if (mutation.is_frameshift&&mutation.type==="Deletion") return raa?`${prefix}${toThree(raa)}${aaPos}fs*?`:`${prefix}${aaPos}fs*?`;
  if (mutation.type==="Insertion"&&!mutation.is_frameshift) return raa?`${prefix}${toThree(raa)}${aaPos}_${aaPos+1}ins`:`${prefix}${aaPos}_${aaPos+1}ins`;
  if (mutation.type==="Deletion"&&!mutation.is_frameshift) return raa?`${prefix}${toThree(raa)}${aaPos}del`:`${prefix}${aaPos}del`;
  return `${prefix}?`;
};

const estimateSIFT = (raa, aaa) => {
  if (!raa||!aaa||raa===aaa) return {score:1.0,tolerated:true,label:"Tolerated",blosum62:0,labelColor:"#10B981"};
  const b62=BLOSUM62[raa]?.[aaa]??-4;
  const sift=Math.max(0,Math.min(1,(b62+4)/15));
  return {score:parseFloat(sift.toFixed(3)),blosum62:b62,tolerated:sift>=0.05,label:sift<0.05?"Damaging":sift<0.20?"Low tolerance":"Tolerated",labelColor:sift<0.05?"#EF4444":sift<0.20?"#F59E0B":"#10B981"};
};

const estimatePolyPhen = (mutation, domainMapping, geneKey) => {
  const raa=mutation.reference_amino_acid, aaa=mutation.alternate_amino_acid;
  if (!raa||!aaa) return {score:0,label:"Unknown",labelColor:"#6b7280"};
  let score=0;
  const rp=AA_PROPS[raa], ap=AA_PROPS[aaa];
  if (domainMapping.functionalRegion==="Critical") score+=0.35;
  else if (domainMapping.functionalRegion==="Structural") score+=0.20;
  else score+=0.05;
  if (rp&&ap){if(rp.charge!==ap.charge)score+=0.25;if(rp.polarity!==ap.polarity)score+=0.10;if(rp.size!==ap.size)score+=0.05;}
  if (aaa==="P") score+=0.10;
  const hs=HOTSPOT_RESIDUES[geneKey]||[];
  if (hs.includes(mutation.aaPosition)) score+=0.15;
  else if (domainMapping.functionalRegion==="Critical") score+=0.07;
  score=Math.max(0,Math.min(1,score));
  const label=score>0.75?"Probably Damaging":score>0.45?"Possibly Damaging":"Benign";
  return {score:parseFloat(score.toFixed(3)),label,labelColor:score>0.75?"#EF4444":score>0.45?"#F59E0B":"#10B981"};
};

const estimateConservation = (mutation, geneKey) => {
  const hs=HOTSPOT_RESIDUES[geneKey]||[];
  if (hs.includes(mutation.aaPosition)) return {score:0.95,label:"Highly conserved hotspot",color:"#EF4444"};
  const gene=GENE_PANEL[geneKey]; if(!gene) return {score:0.5,label:"Unknown",color:"#6b7080"};
  for (const d of gene.domains){
    if (mutation.aaPosition>=d.start&&mutation.aaPosition<=d.end){
      if (d.functionalRegion==="Critical") return {score:0.82,label:"Highly conserved (critical domain)",color:"#F59E0B"};
      if (d.functionalRegion==="Structural") return {score:0.65,label:"Moderately conserved",color:"#818CF8"};
      return {score:0.40,label:"Partially conserved",color:"#10B981"};
    }
  }
  return {score:0.25,label:"Low conservation (inter-domain)",color:"#10B981"};
};

const lookupCOSMIC=(m,gk)=>{const db=COSMIC_HOTSPOTS[gk];if(!db||!m.reference_amino_acid||!m.alternate_amino_acid)return null;return db[`${m.reference_amino_acid}${m.aaPosition}${m.alternate_amino_acid}`]||null;};
const lookupClinVar=(m,gk)=>{const db=CLINVAR_DB[gk];if(!db||!m.reference_amino_acid||!m.alternate_amino_acid)return null;return db[`${m.reference_amino_acid}${m.aaPosition}${m.alternate_amino_acid}`]||null;};

const scorePathogenicity=(mutation,domainMapping,geneKey="TP53",clinvarData=null,cosmicData=null)=>{
  const reasons=[];let cs={};
  if(mutation.is_frameshift)return{level:"PATHOGENIC",label:"Pathogenic",color:"#EF4444",bgClass:"path-pathogenic",score:95,reasons:["Frameshift (PVS1-equivalent)"],shortLabel:"P",acmgCriteria:["PVS1"],componentScores:{domainImpact:1,mutationType:1,clinvar:0,cosmic:0,conservation:0.8,structural:0},scoreExplanation:"Frameshift → Pathogenic by PVS1 criterion"};
  if(mutation.mutation_class==="Nonsense")return{level:"PATHOGENIC",label:"Pathogenic",color:"#EF4444",bgClass:"path-pathogenic",score:90,reasons:["Premature stop codon (PVS1-equivalent)"],shortLabel:"P",acmgCriteria:["PVS1"],componentScores:{domainImpact:1,mutationType:1,clinvar:0,cosmic:0,conservation:0.8,structural:0},scoreExplanation:"Nonsense → Pathogenic by PVS1 criterion"};
  if(mutation.mutation_class==="Silent")return{level:"LIKELY_BENIGN",label:"Likely Benign",color:"#10B981",bgClass:"path-benign",score:8,reasons:["Synonymous — no AA change (BP7)"],shortLabel:"LB",acmgCriteria:["BP7"],componentScores:{domainImpact:0,mutationType:0,clinvar:0,cosmic:0,conservation:0,structural:0},scoreExplanation:"Silent variant scores ~0 on all components"};
  let di=domainMapping.functionalRegion==="Critical"?1.0:domainMapping.functionalRegion==="Structural"?0.60:0.15;
  reasons.push(`[Domain ×0.25] ${domainMapping.functionalRegion} → ${(di*100).toFixed(0)}%`);cs.domainImpact=di;
  let mt=0;
  const sift=(mutation.reference_amino_acid&&mutation.alternate_amino_acid)?estimateSIFT(mutation.reference_amino_acid,mutation.alternate_amino_acid):null;
  const polyphen=(mutation.reference_amino_acid&&mutation.alternate_amino_acid)?estimatePolyPhen({...mutation},domainMapping,geneKey):null;
  if(mutation.mutation_class==="Missense"){
    const rp=AA_PROPS[mutation.reference_amino_acid],ap=AA_PROPS[mutation.alternate_amino_acid];
    if(rp&&ap){if(rp.charge!==ap.charge){mt+=0.50;reasons.push(`[MutType ×0.20] Charge change +50%`);}if(rp.polarity!==ap.polarity){mt+=0.25;reasons.push(`[MutType ×0.20] Polarity shift +25%`);}if(rp.size!==ap.size){mt+=0.15;reasons.push(`[MutType ×0.20] Size change +15%`);}}
    if(mutation.alternate_amino_acid==="P"){mt+=0.20;reasons.push(`[MutType ×0.20] Proline intro +20%`);}
    if(sift&&!sift.tolerated){mt+=0.20;reasons.push(`[MutType ×0.20] SIFT-like ${sift.label} (BLOSUM62=${sift.blosum62}) +20%`);}
  }else{mt=domainMapping.functionalRegion==="Critical"?0.70:0.40;reasons.push(`[MutType ×0.20] Indel in ${domainMapping.functionalRegion}`);}
  mt=Math.max(0,Math.min(1,mt));cs.mutationType=mt;
  let cv=0;
  if(clinvarData){const sig=clinvarData.sig?.toLowerCase()||"";if(sig.includes("pathogenic")&&!sig.includes("likely")){cv=1.0;reasons.push(`[ClinVar ×0.25] Pathogenic ${clinvarData.accession} → 100%`);}else if(sig.includes("likely pathogenic")){cv=0.75;reasons.push(`[ClinVar ×0.25] Likely Pathogenic → 75%`);}else if(sig.includes("uncertain")){cv=0.40;reasons.push(`[ClinVar ×0.25] VUS → 40%`);}}else reasons.push("[ClinVar ×0.25] No match → 0%");
  cs.clinvar=cv;
  let co=0;if(cosmicData){co=Math.min(1.0,cosmicData.freq*8);reasons.push(`[COSMIC ×0.15] ${cosmicData.samples.toLocaleString()} samples → ${(co*100).toFixed(0)}%`);}else reasons.push("[COSMIC ×0.15] Not in hotspot catalogue → 0%");
  cs.cosmic=co;
  const conserv=estimateConservation({...mutation},geneKey);reasons.push(`[Conservation ×0.10] ${conserv.label} → ${(conserv.score*100).toFixed(0)}%`);cs.conservation=conserv.score;
  const ss=polyphen?polyphen.score:0;if(polyphen)reasons.push(`[PolyPhen ×0.05] ${polyphen.label} → ${(polyphen.score*100).toFixed(0)}%`);cs.structural=ss;
  const finalScore=di*0.25+mt*0.20+cv*0.25+co*0.15+conserv.score*0.10+ss*0.05;
  const pct=Math.round(finalScore*100);
  const scoreExplanation=`Score=(Domain ${(di*100).toFixed(0)}%×0.25)+(MutType ${(mt*100).toFixed(0)}%×0.20)+(ClinVar ${(cv*100).toFixed(0)}%×0.25)+(COSMIC ${(co*100).toFixed(0)}%×0.15)+(Conserv ${(conserv.score*100).toFixed(0)}%×0.10)+(Struct ${(ss*100).toFixed(0)}%×0.05)=${pct}/100`;
  const acmg=[];if(cv===1.0&&di>=0.60)acmg.push("PS1","PM1");if(conserv.score>0.90)acmg.push("PP3");if(sift&&!sift.tolerated)acmg.push("PP3");if(cosmicData&&cosmicData.freq>0.05)acmg.push("PS4");if(di===1.0)acmg.push("PM1");
  let level,label,color,bgClass,shortLabel;
  if(pct>=72){level="PATHOGENIC";label="Pathogenic";color="#EF4444";bgClass="path-pathogenic";shortLabel="P";}
  else if(pct>=52){level="LIKELY_PATHOGENIC";label="Likely Pathogenic";color="#F59E0B";bgClass="path-likely";shortLabel="LP";}
  else if(pct>=30){level="VUS";label="Uncertain Significance";color="#818CF8";bgClass="path-vus";shortLabel="VUS";}
  else if(pct>=12){level="LIKELY_BENIGN";label="Likely Benign";color="#10B981";bgClass="path-benign";shortLabel="LB";}
  else{level="BENIGN";label="Benign";color="#6EE7B7";bgClass="path-benign";shortLabel="B";}
  return{level,label,color,bgClass,score:pct,reasons,shortLabel,acmgCriteria:acmg,componentScores:cs,scoreExplanation,sift,polyphen,conservation:conserv,cosmic:cosmicData,clinvar:clinvarData};
};

const getBioInterpretation=(mutation,domainMapping,geneKey="TP53")=>{
  const gene=GENE_PANEL[geneKey]||GENE_PANEL.TP53;
  let note="";
  if(mutation.mutation_class==="Missense"&&mutation.reference_amino_acid&&mutation.alternate_amino_acid){
    const rp=AA_PROPS[mutation.reference_amino_acid],ap=AA_PROPS[mutation.alternate_amino_acid];
    if(rp&&ap){
      const changes=[];
      if(rp.charge!==ap.charge)changes.push(`charge (${rp.charge}→${ap.charge})`);
      if(rp.polarity!==ap.polarity)changes.push(`polarity (${rp.polarity}→${ap.polarity})`);
      if(rp.size!==ap.size)changes.push(`size (${rp.size}→${ap.size})`);
      note=(changes.length>0?`Substitution alters: ${changes.join(", ")}.`:"Conservative substitution.")+` ${gene.getGeneNote("Missense",domainMapping.proteinDomain)}`;
    }
  }
  if(mutation.is_frameshift)note=`Frameshift disrupts downstream reading frame. ${gene.getGeneNote("Frameshift",domainMapping.proteinDomain)}`;
  if(mutation.mutation_class==="Nonsense")note=`Premature stop codon truncates ${gene.symbol} protein. ${gene.getGeneNote("Nonsense",domainMapping.proteinDomain)}`;
  if(mutation.mutation_class==="Silent")note=`Synonymous substitution — no amino acid change in ${gene.symbol}. Unlikely to affect protein function.`;
  return note;
};

// ═══════════════════════════════════════════════════════════════════
// 2D DOMAIN MAP COMPONENT
// ═══════════════════════════════════════════════════════════════════
function DomainMap2D({ gene, mutations2D = [], selectedDomain, onDomainClick }) {
  const [tooltip, setTooltip] = useState(null);
  const geneData = GENE_PANEL[gene];
  if (!geneData) return null;
  const protLen = geneData.proteinLength;
  const W = 100, H = 36;
  const domPct = (v) => (v / protLen) * W;
  const ss = geneData.secondaryStructure || [];

  return (
    <div style={{background:"#0a0c14",border:"1px solid #1e2130",borderRadius:10,padding:"1rem",marginBottom:"1rem",position:"relative"}}>
      <div style={{fontSize:".8rem",fontWeight:700,color:"#6b7080",textTransform:"uppercase",letterSpacing:".08em",marginBottom:".6rem",display:"flex",alignItems:"center",gap:".5rem"}}>
        <span>2D Domain Map</span>
        <span style={{fontSize:".65rem",color:geneData.color}}>{geneData.symbol} — {geneData.proteinLength} aa</span>
      </div>

      {/* Backbone with secondary structure */}
      <div style={{position:"relative",width:"100%",height:60,marginBottom:".4rem"}}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"100%",overflow:"visible"}}>
          {/* Backbone line */}
          <line x1="0" y1={H/2} x2={W} y2={H/2} stroke="#1e2130" strokeWidth="1.5"/>
          {/* Secondary structures */}
          {ss.map((s,i)=>{
            const x1=s.start*W, x2=s.end*W, cx=(x1+x2)/2, w=x2-x1;
            if(s.type==="helix") return (
              <g key={i}>
                <rect x={x1} y={H/2-5} width={w} height={10} rx="4" fill="rgba(6,182,212,.25)" stroke="#06B6D4" strokeWidth=".4"/>
                {s.label&&<text x={cx} y={H/2+1} textAnchor="middle" fontSize="3.5" fill="#67E8F9" fontWeight="600">{s.label}</text>}
              </g>
            );
            if(s.type==="sheet") return (
              <g key={i}>
                <polygon points={`${x1},${H/2-4} ${x2-3},${H/2-4} ${x2},${H/2} ${x2-3},${H/2+4} ${x1},${H/2+4}`} fill="rgba(139,92,246,.25)" stroke="#8B5CF6" strokeWidth=".4"/>
                {s.label&&<text x={cx-1} y={H/2+1} textAnchor="middle" fontSize="3.5" fill="#A78BFA" fontWeight="600">{s.label}</text>}
              </g>
            );
            return <line key={i} x1={x1} y1={H/2} x2={x2} y2={H/2} stroke="#2a2d3a" strokeWidth="2"/>;
          })}
          {/* Domain blocks */}
          {geneData.domains.map((d,i)=>{
            const x=domPct(d.start), w=Math.max(domPct(d.end-d.start+1),1.5);
            const isSelected=selectedDomain&&selectedDomain.name===d.name;
            return (
              <g key={i} style={{cursor:"pointer"}} onClick={()=>onDomainClick&&onDomainClick(d)}
                onMouseEnter={e=>{const r=e.currentTarget.getBoundingClientRect();setTooltip({d,x:e.clientX,y:e.clientY});}}
                onMouseLeave={()=>setTooltip(null)}>
                <rect x={x} y={H/2-7} width={w} height={14} rx="2.5"
                  fill={d.color+"33"} stroke={isSelected?d.color+"ee":d.color+"66"} strokeWidth={isSelected?"1":"0.6"}
                  style={{filter:isSelected?`drop-shadow(0 0 3px ${d.color})`:"none"}}/>
              </g>
            );
          })}
          {/* Mutation pins */}
          {mutations2D.map((m,i)=>{
            const aaPos=m.aaPosition||m.positions?.aaPosition||0;
            const x=(aaPos/protLen)*W;
            const col=m.mutation.mutation_class==="Missense"?"#FBBF24":m.mutation.mutation_class==="Nonsense"?"#EF4444":m.mutation.is_frameshift?"#DC2626":"#10B981";
            return (
              <g key={i}>
                <line x1={x} y1={H/2-10} x2={x} y2={H/2-7} stroke={col} strokeWidth="0.8"/>
                <circle cx={x} cy={H/2-11} r="1.8" fill={col} stroke="#0a0c14" strokeWidth="0.4">
                  <title>{m.hgvs||`AA ${aaPos}`}</title>
                </circle>
              </g>
            );
          })}
          {/* Scale ticks */}
          {[0,0.25,0.5,0.75,1.0].map((f,i)=>(
            <g key={i}>
              <line x1={f*W} y1={H-3} x2={f*W} y2={H-1} stroke="#2a2d3a" strokeWidth="0.4"/>
              <text x={f*W} y={H+2} textAnchor="middle" fontSize="2.5" fill="#3a3d4a">{Math.round(f*protLen)}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Domain legend */}
      <div style={{display:"flex",flexWrap:"wrap",gap:".35rem",marginTop:".5rem"}}>
        {geneData.domains.map((d,i)=>(
          <div key={i}
            onClick={()=>onDomainClick&&onDomainClick(d)}
            style={{display:"flex",alignItems:"center",gap:".25rem",background:selectedDomain?.name===d.name?d.color+"25":d.color+"12",border:`1px solid ${selectedDomain?.name===d.name?d.color:d.color+"30"}`,borderRadius:5,padding:".18rem .45rem",cursor:"pointer",fontSize:".66rem",color:d.color,fontWeight:600,transition:"all .2s"}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:d.color}}/>
            {d.name}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip&&(
        <div style={{position:"fixed",left:tooltip.x+10,top:tooltip.y-10,background:"#141720",border:`1px solid ${tooltip.d.color}55`,borderRadius:8,padding:".65rem .8rem",zIndex:9999,maxWidth:260,pointerEvents:"none",boxShadow:"0 8px 24px rgba(0,0,0,.6)"}}>
          <div style={{fontSize:".75rem",fontWeight:700,color:tooltip.d.color,marginBottom:".2rem"}}>{tooltip.d.name}</div>
          <div style={{fontSize:".68rem",color:"#8a8f9e",lineHeight:1.5,marginBottom:".2rem"}}>{tooltip.d.description}</div>
          <div style={{fontSize:".65rem",color:tooltip.d.functionalRegion==="Critical"?"#EF4444":tooltip.d.functionalRegion==="Structural"?"#818CF8":"#10B981",fontWeight:600}}>AA {tooltip.d.start}–{tooltip.d.end} · {tooltip.d.functionalRegion}</div>
          {tooltip.d.detail&&<div style={{fontSize:".63rem",color:"#4a5060",marginTop:".2rem",lineHeight:1.4,borderTop:"1px solid #1e2130",paddingTop:".2rem"}}>{tooltip.d.detail}</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3D PROTEIN VIEWER COMPONENT
// ═══════════════════════════════════════════════════════════════════
function Protein3DViewer({ gene, mutationPositions = [], viewMode, selectedDomain }) {
  const mountRef = useRef(null);
  const sceneRef = useRef({});
  const [threeLoaded, setThreeLoaded] = useState(false);
  const [tooltip3D, setTooltip3D] = useState(null);
  const [spinning, setSpinning] = useState(true);
  const [localView, setLocalView] = useState(viewMode || "ribbon");

  const geneData = GENE_PANEL[gene];

  // Load Three.js from CDN
  useEffect(() => {
    if (window.THREE) { setThreeLoaded(true); return; }
    const s = document.createElement("script");
    s.src = THREE_CDN;
    s.onload = () => setThreeLoaded(true);
    s.onerror = () => console.error("Three.js failed to load");
    document.head.appendChild(s);
  }, []);

  // Build scene
  useEffect(() => {
    if (!threeLoaded || !mountRef.current || !geneData) return;
    const THREE = window.THREE;
    const el = mountRef.current;
    const W = el.clientWidth, H = 320;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08090f);
    scene.fog = new THREE.Fog(0x08090f, 18, 40);

    const camera = new THREE.PerspectiveCamera(60, W/H, 0.1, 100);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(5, 8, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4488ff, 0.35);
    fill.position.set(-5, -3, -5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xff8844, 0.25);
    rim.position.set(0, 5, -8);
    scene.add(rim);

    // Grid
    const grid = new THREE.GridHelper(20, 20, 0x1a1d2a, 0x141720);
    grid.position.y = -5;
    scene.add(grid);

    // ── BUILD BACKBONE ──────────────────────────────────────────
    const ss = geneData.secondaryStructure || [];
    const totalLen = geneData.proteinLength;
    const domains = geneData.domains;

    function getSSType(frac) {
      for (const s of ss) if (frac >= s.start && frac <= s.end) return s.type;
      return "loop";
    }

    function getDomainColor(frac) {
      const aaPos = Math.round(frac * totalLen);
      for (const d of domains) {
        if (aaPos >= d.start && aaPos <= d.end) {
          if (mutationPositions.includes(aaPos)) return 0xff4444;
          const hex = d.color.replace("#","");
          return parseInt(hex, 16);
        }
      }
      return 0x2a4a5a;
    }

    const NUM_SEGMENTS = 80;
    const points = [];
    let cx=0, cy=0, cz=0;

    for (let i=0; i<=NUM_SEGMENTS; i++) {
      const t = i/NUM_SEGMENTS;
      const ssType = getSSType(t);
      const coilR = ssType==="helix"?1.2:ssType==="sheet"?0.6:0.4;
      const coilF = ssType==="helix"?4:ssType==="sheet"?3:2;
      const angle = t * Math.PI * 2 * coilF;
      const advance = 0.18;
      cx += advance + Math.cos(angle * 0.3) * 0.02;
      cy += Math.sin(angle) * coilR * 0.12 + Math.cos(t * Math.PI * 3) * 0.05;
      cz += Math.cos(angle * 0.7) * 0.14 + Math.sin(t * Math.PI * 2) * 0.04;
      points.push(new THREE.Vector3(cx-7, cy, cz-4));
    }

    const splineGroups = [];
    const STEP = 8;
    for (let i=0; i<NUM_SEGMENTS; i+=STEP) {
      const segPts = points.slice(i, i+STEP+1);
      if (segPts.length < 2) continue;
      const curve = new THREE.CatmullRomCurve3(segPts);
      const t = (i/NUM_SEGMENTS);
      const ssType = getSSType(t);
      const radius = ssType==="helix"?0.18:ssType==="sheet"?0.14:0.08;
      const col = getDomainColor(t);
      const colEmit = mutationPositions.some(p => Math.abs(p/totalLen - t) < 0.05) ? col : 0;

      if (localView === "ribbon" || localView === "ballstick") {
        const geo = new THREE.TubeGeometry(curve, 8, radius, 6, false);
        const mat = new THREE.MeshPhongMaterial({
          color: col, emissive: colEmit, emissiveIntensity: 0.3,
          shininess: ssType==="helix"?80:40, transparent: true, opacity: 0.92,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { type:"segment", ssType, frac:t };
        scene.add(mesh);
        splineGroups.push(mesh);
      }

      // Ball-and-stick atoms
      if (localView === "ballstick" || localView === "cpk") {
        const isMobile = W < 480;
        const atomStep = isMobile ? 4 : 2;
        for (let k=0; k<segPts.length; k+=atomStep) {
          const pt = segPts[k];
          const frac = (i + k) / NUM_SEGMENTS;
          const aaPos = Math.round(frac * totalLen);
          const isMut = mutationPositions.includes(aaPos);
          // Cα
          const ag = new THREE.SphereGeometry(isMut?0.22:0.14, 8, 8);
          const am = new THREE.MeshPhongMaterial({color:isMut?0xff3333:0x00e5ff,emissive:isMut?0xff0000:0,emissiveIntensity:isMut?0.5:0,shininess:120});
          const atm = new THREE.Mesh(ag, am);
          atm.position.copy(pt);
          atm.userData = { type:"atom", element:"Ca", aaPos, isMutation:isMut, frac };
          scene.add(atm);
          // N atom (offset)
          if (!isMobile && k > 0) {
            const ng = new THREE.SphereGeometry(0.09,6,6);
            const nm = new THREE.MeshPhongMaterial({color:0x4466ff,shininess:80});
            const nat = new THREE.Mesh(ng,nm);
            nat.position.set(pt.x-0.25, pt.y+0.15, pt.z);
            scene.add(nat);
          }
          // Bond to next
          if (k+atomStep < segPts.length) {
            const p2 = segPts[k+atomStep];
            const dir = new THREE.Vector3().subVectors(p2, pt);
            const bLen = dir.length();
            const bg = new THREE.CylinderGeometry(0.04, 0.04, bLen, 4);
            const bm = new THREE.MeshPhongMaterial({color:0x1a3a4a, transparent:true, opacity:0.7});
            const bond = new THREE.Mesh(bg, bm);
            bond.position.copy(pt).lerp(p2, 0.5);
            bond.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
            scene.add(bond);
          }
        }
      }
    }

    // Mutation glow spheres
    mutationPositions.forEach(aaPos => {
      const frac = aaPos / totalLen;
      if (frac < 0 || frac > 1) return;
      const idx = Math.round(frac * NUM_SEGMENTS);
      const pt = points[Math.min(idx, points.length-1)];
      const gSizes = [0.55, 0.75, 1.0];
      gSizes.forEach((r, gi) => {
        const sg = new THREE.SphereGeometry(r, 16, 16);
        const sm = new THREE.MeshPhongMaterial({color:0xff4444,transparent:true,opacity:0.06*(3-gi),emissive:0xff0000,emissiveIntensity:0.3});
        const sp = new THREE.Mesh(sg, sm);
        sp.position.copy(pt);
        scene.add(sp);
      });
      const pl = new THREE.PointLight(0xff4444, 2, 3);
      pl.position.copy(pt);
      scene.add(pl);
    });

    // Domain highlight for selected
    if (selectedDomain && !selectedDomain.isInterDomain) {
      const sFrac = selectedDomain.start / totalLen;
      const eFrac = selectedDomain.end / totalLen;
      const sIdx = Math.round(sFrac * NUM_SEGMENTS);
      const eIdx = Math.min(Math.round(eFrac * NUM_SEGMENTS), points.length-1);
      if (eIdx > sIdx) {
        const domPts = points.slice(sIdx, eIdx+1);
        const curve = new THREE.CatmullRomCurve3(domPts);
        const col = parseInt(selectedDomain.color.replace("#",""), 16);
        const geo = new THREE.TubeGeometry(curve, 12, 0.28, 8, false);
        const mat = new THREE.MeshPhongMaterial({color:col,emissive:col,emissiveIntensity:0.4,transparent:true,opacity:0.5});
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
      }
    }

    // Controls
    let isDrag=false, prevX=0, prevY=0, rotX=0, rotY=0;
    const group = new THREE.Group();
    scene.children.filter(c=>c.userData.type==="segment"||c.userData.type==="atom"||c.isMesh).forEach(c=>{/* group handled via scene rotation */});

    renderer.domElement.addEventListener("mousedown",e=>{isDrag=true;prevX=e.clientX;prevY=e.clientY;setSpinning(false);});
    renderer.domElement.addEventListener("mousemove",e=>{
      if(!isDrag)return;
      rotY+=(e.clientX-prevX)*0.008; rotX+=(e.clientY-prevY)*0.008;
      prevX=e.clientX; prevY=e.clientY;
      scene.rotation.y=rotY; scene.rotation.x=Math.max(-1,Math.min(1,rotX));
    });
    renderer.domElement.addEventListener("mouseup",()=>{isDrag=false;});
    renderer.domElement.addEventListener("wheel",e=>{camera.position.z=Math.max(5,Math.min(22,camera.position.z+e.deltaY*0.02));});

    // Touch
    let lastTouchX=0;
    renderer.domElement.addEventListener("touchstart",e=>{lastTouchX=e.touches[0].clientX;setSpinning(false);});
    renderer.domElement.addEventListener("touchmove",e=>{
      const dx=e.touches[0].clientX-lastTouchX; lastTouchX=e.touches[0].clientX;
      rotY+=dx*0.01; scene.rotation.y=rotY;
    });

    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    renderer.domElement.addEventListener("click", e => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length) {
        const ud = hits[0].object.userData;
        if (ud.aaPos) setTooltip3D({aaPos:ud.aaPos,element:ud.element,isMut:ud.isMutation,ssType:ud.ssType});
      }
    });

    // Animate
    let animId;
    let spinAngle = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (sceneRef.current.spinning) { spinAngle += 0.003; scene.rotation.y = spinAngle; }
      renderer.render(scene, camera);
    };
    sceneRef.current = { renderer, scene, camera, spinning:true };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const nW = el.clientWidth;
      camera.aspect = nW/H;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, H);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [threeLoaded, gene, localView, mutationPositions.join(","), selectedDomain?.name]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.spinning = spinning;
  }, [spinning]);

  const viewModes = [
    { key:"ribbon", label:"Ribbon" },
    { key:"ballstick", label:"Ball & Stick" },
    { key:"cpk", label:"CPK" },
  ];

  return (
    <div style={{background:"#0a0c14",border:"1px solid #1e2130",borderRadius:10,overflow:"hidden",marginBottom:"1rem"}}>
      <div style={{padding:".6rem .9rem",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #1e2130",flexWrap:"wrap",gap:".35rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:".5rem"}}>
          <span style={{fontSize:".78rem",fontWeight:700,color:geneData?.color}}>{gene}</span>
          <span style={{fontSize:".68rem",color:"#4a5060"}}>3D Protein Model</span>
          {geneData?.pdb&&<a href={geneData.pdb.url} target="_blank" rel="noreferrer" style={{fontSize:".62rem",color:"#4a6080",textDecoration:"none",background:"rgba(6,182,212,.08)",border:"1px solid rgba(6,182,212,.2)",borderRadius:4,padding:".08rem .35rem"}}>PDB: {geneData.pdb.id}</a>}
        </div>
        <div style={{display:"flex",gap:".3rem",alignItems:"center"}}>
          {viewModes.map(v=>(
            <button key={v.key} onClick={()=>setLocalView(v.key)}
              style={{fontSize:".65rem",fontWeight:600,padding:".2rem .5rem",borderRadius:5,border:`1px solid ${localView===v.key?"rgba(6,182,212,.6)":"#24272f"}`,background:localView===v.key?"rgba(6,182,212,.15)":"transparent",color:localView===v.key?"#67E8F9":"#6b7080",cursor:"pointer",transition:"all .2s"}}>
              {v.label}
            </button>
          ))}
          <button onClick={()=>setSpinning(s=>!s)}
            style={{fontSize:".65rem",padding:".2rem .5rem",borderRadius:5,border:`1px solid ${spinning?"rgba(6,182,212,.4)":"#24272f"}`,background:spinning?"rgba(6,182,212,.1)":"transparent",color:spinning?"#67E8F9":"#6b7080",cursor:"pointer",transition:"all .2s"}}>
            {spinning?"⏸":"▶"}
          </button>
        </div>
      </div>
      <div style={{position:"relative"}}>
        <div ref={mountRef} style={{width:"100%",height:320,touchAction:"none"}}/>
        {!threeLoaded&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(8,9,15,.8)",fontSize:".85rem",color:"#4a5060"}}>Loading 3D viewer…</div>}
        {tooltip3D&&(
          <div style={{position:"absolute",bottom:12,left:12,background:"rgba(10,12,22,.95)",border:"1px solid rgba(6,182,212,.3)",borderRadius:8,padding:".5rem .7rem",fontSize:".72rem",color:"#c8cad4",backdropFilter:"blur(4px)"}}>
            <div style={{color:tooltip3D.isMut?"#EF4444":"#67E8F9",fontWeight:700}}>AA {tooltip3D.aaPos}{tooltip3D.isMut?" ← MUTATION":""}</div>
            {tooltip3D.element&&<div style={{color:"#4a5060",fontSize:".65rem"}}>{tooltip3D.element} · {tooltip3D.ssType||"backbone"}</div>}
          </div>
        )}
      </div>
      <div style={{padding:".45rem .9rem",borderTop:"1px solid #1e2130",fontSize:".62rem",color:"#2a3040",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
        <span><span style={{color:"#06B6D4"}}>◦</span> Helix</span>
        <span><span style={{color:"#8B5CF6"}}>◦</span> Sheet</span>
        <span><span style={{color:"#EF4444"}}>◦</span> Mutation site</span>
        <span style={{color:"#1a2030"}}>Drag to rotate · Scroll to zoom · Click atoms for info</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CPK DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════
function CPKPanel({ domain, mutations2D = [] }) {
  if (!domain || domain.isInterDomain) return null;
  const CPK_COLORS = { Ca:"#00e5ff", N:"#4466ff", O:"#ff4444", C:"#44aacc", S:"#ffdd00", H:"#ccddee", P:"#ff8800" };
  const atoms = [
    { el:"N", x:30, y:50 }, { el:"Ca", x:65, y:38 }, { el:"C", x:100, y:50 },
    { el:"O", x:108, y:30 }, { el:"Ca", x:135, y:65 }, { el:"N", x:165, y:50 },
    { el:"C", x:200, y:40 }, { el:"O", x:208, y:20 }, { el:"Ca", x:235, y:55 },
  ];
  const isMutAtom = (idx) => mutations2D.some(m => {
    const aaPos = m.aaPosition || m.positions?.aaPosition;
    return aaPos && Math.abs(aaPos - (domain.start + idx)) < 2;
  });

  return (
    <div style={{background:"#0a0c14",border:`1px solid ${domain.color}33`,borderRadius:10,padding:".8rem",marginBottom:"1rem"}}>
      <div style={{fontSize:".75rem",fontWeight:700,color:domain.color,marginBottom:".5rem",textTransform:"uppercase",letterSpacing:".07em"}}>
        CPK Detail — {domain.name}
        <span style={{fontSize:".62rem",color:"#3a4050",marginLeft:".5rem",fontWeight:400}}>AA {domain.start}–{domain.end}</span>
      </div>
      <svg viewBox="0 0 280 90" style={{width:"100%",maxHeight:90}}>
        {/* Backbone bonds */}
        {atoms.map((a,i) => i<atoms.length-1 && (
          <line key={i} x1={a.x} y1={a.y} x2={atoms[i+1].x} y2={atoms[i+1].y}
            stroke={isMutAtom(i)||isMutAtom(i+1)?"rgba(239,68,68,.5)":"rgba(30,33,48,.8)"} strokeWidth="1.5"/>
        ))}
        {/* Side chain stubs */}
        {atoms.filter(a=>a.el==="Ca").map((a,i)=>(
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={a.x+8} y2={a.y-15} stroke="rgba(30,33,48,.5)" strokeWidth="1" strokeDasharray="2,2"/>
            <circle cx={a.x+8} cy={a.y-15} r="4" fill={isMutAtom(i*3)?"rgba(239,68,68,.4)":"rgba(42,58,72,.6)"} stroke={isMutAtom(i*3)?"#EF4444":"#2a3a48"} strokeWidth="0.5"/>
          </g>
        ))}
        {/* Atoms */}
        {atoms.map((a,i)=>{
          const isMut = isMutAtom(i);
          const r = a.el==="Ca"?7:a.el==="N"||a.el==="O"?5.5:4.5;
          return (
            <g key={i}>
              {isMut&&<circle cx={a.x} cy={a.y} r={r+4} fill="rgba(239,68,68,.12)"/>}
              <circle cx={a.x} cy={a.y} r={r} fill={CPK_COLORS[a.el]||"#888"} stroke={isMut?"#EF4444":"#0a0c14"} strokeWidth={isMut?"1":"0.5"}/>
              <text x={a.x} y={a.y+1.5} textAnchor="middle" fontSize="4" fill="#0a0c14" fontWeight="600">{a.el}</text>
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:".5rem",flexWrap:"wrap",marginTop:".35rem"}}>
        {Object.entries(CPK_COLORS).slice(0,5).map(([el,col])=>(
          <span key={el} style={{fontSize:".6rem",color:col,display:"flex",alignItems:"center",gap:".2rem"}}>
            <svg width="8" height="8"><circle cx="4" cy="4" r="3.5" fill={col}/></svg>{el}
          </span>
        ))}
      </div>
      <div style={{marginTop:".4rem",fontSize:".68rem",color:"#3a4050",lineHeight:1.5,borderTop:"1px solid #1e2130",paddingTop:".3rem"}}>
        {domain.detail}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SAMPLES
// ═══════════════════════════════════════════════════════════════════
const TP53_REF = REFERENCE_SEQUENCES.TP53.seq.substring(0, 120);
const SAMPLES_CANCER = {
  normal:{ name:"Wild-Type (TP53)", icon:"WT", color:"#10B981", seq:TP53_REF, gene:"TP53", desc:"Identical to reference — no mutations expected" },
  snp:{ name:"SNP Missense (TP53)", icon:"SNP", color:"#F59E0B", seq:TP53_REF.substring(0,18)+"CAC"+TP53_REF.substring(21), gene:"TP53", desc:"CGC→CAC missense substitution" },
  nonsense:{ name:"Nonsense Stop (TP53)", icon:"NS", color:"#EF4444", seq:TP53_REF.substring(0,18)+"TAG"+TP53_REF.substring(21), gene:"TP53", desc:"Premature stop codon introduced" },
  frameshift:{ name:"Frameshift (TP53)", icon:"FS", color:"#DC2626", seq:TP53_REF.substring(0,20)+"AC"+TP53_REF.substring(20), gene:"TP53", desc:"2 bp insertion — frameshift" },
};
const SAMPLES_RESEARCH = {
  wt_mut:{ name:"TP53 WT vs R175H", icon:"R", color:"#06B6D4", wt:"ATGCCGGAGCCGCAGTCAG", mut:"ATGCCGGAGCATCAGTCAG", desc:"Classic R175H missense in TP53 DBD" },
  insertion:{ name:"Insertion Example", icon:"I", color:"#F59E0B", wt:"ATGATGATGATGATG", mut:"ATGATGATGATGAATGATG", desc:"2 bp insertion creating frameshift" },
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function CancerGeneAnalyzer() {
  const [mode, setMode] = useState("cancer"); // "cancer" | "research"

  // Shared state
  const [selectedGene, setSelectedGene] = useState("TP53");
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Cancer mode
  const [cancerSeq, setCancerSeq] = useState("");
  const [cancerFrame, setCancerFrame] = useState("1");
  const [cancerStrand, setCancerStrand] = useState("forward");
  const [cancerResults, setCancerResults] = useState(null);
  const [cancerAnnotated, setCancerAnnotated] = useState([]);
  const [cancerLoading, setCancerLoading] = useState(false);
  const [cancerError, setCancerError] = useState("");

  // Research mode
  const [wtSeq, setWtSeq] = useState("");
  const [mutSeq, setMutSeq] = useState("");
  const [resFrame, setResFrame] = useState("1");
  const [resStrand, setResStrand] = useState("forward");
  const [isProtein, setIsProtein] = useState(false);
  const [resResults, setResResults] = useState(null);
  const [resLoading, setResLoading] = useState(false);
  const [resError, setResError] = useState("");

  const [showSamples, setShowSamples] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const activeGene = GENE_PANEL[selectedGene];
  const activeRef = REFERENCE_SEQUENCES[selectedGene];

  useEffect(() => {
    const close = () => setShowSamples(false);
    if (showSamples) { document.addEventListener("click", close); return () => document.removeEventListener("click", close); }
  }, [showSamples]);

  // ── CANCER MODE ANALYZE ──────────────────────────────────────
  const handleCancerAnalyze = async () => {
    if (!cancerSeq.trim()) { setCancerError("Please paste your sequence"); return; }
    setCancerLoading(true); setCancerError(""); setCancerResults(null); setCancerAnnotated([]); setAiText("");
    await new Promise(r => setTimeout(r, 40));
    try {
      const result = detectMutationsVsRef(cancerSeq, selectedGene, cancerFrame, cancerStrand);
      setCancerResults(result);
    } catch(e) { setCancerError("Analysis failed: "+e.message); }
    finally { setCancerLoading(false); }
  };

  useEffect(() => {
    if (!cancerResults?.mutations?.length) { setCancerAnnotated([]); return; }
    const base = cancerResults.mutations.map(mutation => {
      const positions = calcPositions(mutation.codon_position??mutation.position??0, cancerFrame);
      const hgvs = generateHGVS(mutation, positions, selectedGene);
      const domainMapping = getDomain(positions.aaPosition, selectedGene);
      const bioNote = getBioInterpretation(mutation, domainMapping, selectedGene);
      const augMut = {...mutation, aaPosition:positions.aaPosition};
      const clinvarLocal = lookupClinVar(augMut, selectedGene);
      const cosmicLocal = lookupCOSMIC(augMut, selectedGene);
      const pathogenicity = scorePathogenicity(augMut, domainMapping, selectedGene, clinvarLocal, cosmicLocal);
      const sift = mutation.reference_amino_acid&&mutation.alternate_amino_acid ? estimateSIFT(mutation.reference_amino_acid, mutation.alternate_amino_acid) : null;
      const polyphen = mutation.reference_amino_acid&&mutation.alternate_amino_acid ? estimatePolyPhen(augMut, domainMapping, selectedGene) : null;
      const conservation = estimateConservation(augMut, selectedGene);
      return {mutation:augMut, positions, hgvs, domainMapping, bioNote, pathogenicity, sift, polyphen, conservation, clinvar:clinvarLocal, cosmic:cosmicLocal, aaPosition:positions.aaPosition};
    });
    setCancerAnnotated(base);
  }, [cancerResults, cancerFrame, selectedGene]);

  // ── RESEARCH MODE ANALYZE ──────────────────────────────────────
  const handleResearchAnalyze = () => {
    if (!wtSeq.trim()||!mutSeq.trim()) { setResError("Please enter both sequences"); return; }
    setResLoading(true); setResError(""); setResResults(null); setAiText("");
    setTimeout(() => {
      try {
        const result = detectResearchMutations(wtSeq, mutSeq, resFrame, resStrand, isProtein);
        setResResults(result);
      } catch(e) { setResError("Analysis failed: "+e.message); }
      finally { setResLoading(false); }
    }, 40);
  };

  // ── AI ANALYSIS ──────────────────────────────────────────────
  const handleAI = async () => {
    setAiLoading(true); setAiText("");
    const gene = GENE_PANEL[selectedGene]||GENE_PANEL.TP53;
    const isCancer = mode === "cancer";

    let mutList = "";
    if (isCancer && cancerAnnotated.length) {
      mutList = cancerAnnotated.map((am,i) =>
        `Mutation ${i+1}: ${am.hgvs} | ${am.mutation.mutation_class} | Domain: ${am.domainMapping.proteinDomain} | Pathogenicity: ${am.pathogenicity?.label} (${am.pathogenicity?.score}/100)`
      ).join("\n");
    } else if (!isCancer && resResults?.mutations?.length) {
      mutList = resResults.mutations.map((m,i) =>
        `Mutation ${i+1}: Pos ${m.position+1} | Type: ${m.type} | ${m.mutation_class||""} | ${m.reference_amino_acid?`${toThree(m.reference_amino_acid)}→${toThree(m.alternate_amino_acid)}`:"Indel"} | BLOSUM62: ${m.blosum62??0}`
      ).join("\n");
    } else {
      mutList = "No mutations detected.";
    }

    const structData = gene.structuralData;
    const prompt = isCancer
      ? `You are a clinical molecular oncologist. Analyze these ${gene.symbol} mutations vs canonical ${activeRef?.accession}.

Gene: ${gene.symbol} (${gene.name}) — ${gene.type}
PDB: ${gene.pdb?.id} (${gene.pdb?.description})
Clinical context: ${gene.clinicalContext}

Structural data:
- Binding site: ${structData?.bindingSite}
- Hotspot mechanism: ${structData?.hotspotMechanism}
- Conformational effect: ${structData?.conformationalEffect}
- MD consequences: ${structData?.mdConsequences}

Mutations found:
${mutList}

For each mutation: comment on 3D structural impact at the atomic level (using PDB data above), clinical significance in cancer, therapeutic implications, and pathogenicity score justification. Write in clear scientific prose.`
      : `You are a structural biologist. Analyze these mutations comparing wild-type vs mutant sequences.

Gene context: ${gene.symbol} (${gene.name})
PDB: ${gene.pdb?.id} (${gene.pdb?.description})

Structural knowledge:
- ${structData?.bindingSite}
- ${structData?.conformationalEffect}

Mutations detected (Needleman-Wunsch alignment):
${mutList}

For each mutation: assess structural impact using BLOSUM62 score, biochemical property changes (charge/polarity/size), secondary structure disruption, and likely functional consequence. Focus on structural mechanics, not clinical classification. Write as scientific analysis.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      if (!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      setAiText(data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n")||"No response.");
    } catch(e) {
      // Fallback
      const fb = isCancer
        ? `${gene.symbol} CANCER ANALYSIS\nPDB: ${gene.pdb?.id}\nReference: ${activeRef?.accession}\n${"─".repeat(50)}\n`+
          (cancerAnnotated.length ? cancerAnnotated.map((am,i)=>`\nMutation ${i+1}: ${am.hgvs}\nDomain: ${am.domainMapping.proteinDomain}\nPathogenicity: ${am.pathogenicity?.label} (${am.pathogenicity?.score}/100)\nNote: ${am.bioNote}\n`).join("") : "No mutations detected.\n")+"\n[AI unavailable — local analysis shown]"
        : `${gene.symbol} STRUCTURAL ANALYSIS\nPDB: ${gene.pdb?.id}\n${"─".repeat(50)}\n`+
          (resResults?.mutations?.length ? resResults.mutations.map((m,i)=>`\nMutation ${i+1}: Pos ${m.position+1} ${m.type} | BLOSUM62=${m.blosum62??0}\n`).join("") : "No mutations detected.\n")+"\n[AI unavailable — local analysis shown]";
      setAiText(fb);
    } finally { setAiLoading(false); }
  };

  const FREG_COL = {Critical:"#EF4444",Structural:"#8B5CF6",Regulatory:"#10B981"};

  // Get mutation positions for 3D viewer
  const mutation3DPositions = mode==="cancer"
    ? cancerAnnotated.map(am=>am.aaPosition).filter(Boolean)
    : resResults?.mutations?.map(m=>Math.floor((m.codon_position??m.position??0)/3)+1).filter(Boolean)||[];

  return (
    <div style={{minHeight:"100vh",background:"#0c0e14",color:"#e2e4e9",fontFamily:'"Sora",sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#1e2130;border-radius:2px}
        .pc{background:#141720;border:1px solid #1e2130;border-radius:12px;padding:1.25rem;margin-bottom:1rem}
        .lbl{display:block;font-size:.78rem;font-weight:600;color:#6b7080;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.4rem}
        select,textarea{width:100%;background:#0f1117;border:1px solid #1e2130;border-radius:8px;color:#e2e4e9;font-family:'Sora',sans-serif;font-size:.95rem;padding:.7rem .85rem;outline:none;transition:border-color .25s}
        select:focus,textarea:focus{border-color:#06B6D4;box-shadow:0 0 0 2px rgba(6,182,212,.08)}
        textarea{resize:vertical;font-family:'JetBrains Mono',monospace;font-size:.85rem;line-height:1.75}
        textarea::placeholder{color:#1e2130}
        .btn-p{display:flex;align-items:center;justify-content:center;gap:.55rem;width:100%;padding:.9rem 1.25rem;background:linear-gradient(135deg,#06B6D4,#0891B2);border:none;border-radius:9px;color:#fff;font-family:'Sora',sans-serif;font-weight:600;font-size:1rem;cursor:pointer;transition:all .25s}
        .btn-p:hover{filter:brightness(1.1);transform:translateY(-2px);box-shadow:0 6px 20px rgba(6,182,212,.35)}.btn-p:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .btn-ai{display:flex;align-items:center;justify-content:center;gap:.55rem;width:100%;padding:.85rem;background:linear-gradient(135deg,#14B8A6,#0D9488);border:none;border-radius:9px;color:#fff;font-family:'Sora',sans-serif;font-weight:600;cursor:pointer;transition:all .25s}
        .btn-ai:hover{filter:brightness(1.1);transform:translateY(-2px)}.btn-ai:disabled{opacity:.45;cursor:not-allowed;transform:none}
        .btn-g{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .9rem;background:transparent;border:1px solid #1e2130;border-radius:7px;color:#8a8f9e;font-family:'Sora',sans-serif;font-size:.85rem;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-g:hover{border-color:#06B6D4;color:#06B6D4;background:rgba(6,182,212,.05)}
        .stat-b{background:#0f1117;border:1px solid #1e2130;border-radius:9px;padding:.75rem .6rem;text-align:center;transition:all .25s}
        .stat-b:hover{transform:translateY(-2px);box-shadow:0 3px 10px rgba(6,182,212,.12);border-color:#06B6D4}
        .stat-v{font-size:1.5rem;font-weight:700;line-height:1.1}.stat-l{font-size:.72rem;color:#6b7080;text-transform:uppercase;letter-spacing:.06em;margin-top:.25rem}
        .mut-card{background:#0f1117;border:1px solid #1e2130;border-radius:9px;padding:1.1rem;margin-bottom:.7rem;transition:all .25s}
        .mut-card:hover{transform:translateX(3px);box-shadow:0 3px 12px rgba(6,182,212,.08)}
        .badge{display:inline-block;padding:.15rem .4rem;border-radius:4px;font-size:.72rem;font-weight:600}
        .badge-missense{background:rgba(251,191,36,.18);color:#FBBF24;border:1px solid rgba(251,191,36,.3)}
        .badge-nonsense{background:rgba(239,68,68,.18);color:#EF4444;border:1px solid rgba(239,68,68,.3)}
        .badge-silent{background:rgba(16,185,129,.18);color:#10B981;border:1px solid rgba(16,185,129,.3)}
        .badge-frameshift{background:rgba(220,38,38,.18);color:#FCA5A5;border:1px solid rgba(220,38,38,.3)}
        .badge-substitution{background:rgba(251,191,36,.18);color:#FBBF24;border:1px solid rgba(251,191,36,.3)}
        .badge-insertion{background:rgba(245,158,11,.18);color:#F59E0B;border:1px solid rgba(245,158,11,.3)}
        .badge-deletion{background:rgba(239,68,68,.18);color:#EF4444;border:1px solid rgba(239,68,68,.3)}
        .err{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:7px;padding:.7rem .9rem;margin-top:.75rem;color:#EF4444;font-size:.88rem}
        .warn{background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.2);border-radius:7px;padding:.65rem .9rem;margin-bottom:.75rem;color:#FBBF24;font-size:.85rem}
        .sgrid4{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem}
        .cgrid2{display:grid;grid-template-columns:1fr 1fr;gap:.9rem}
        .gene-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem}
        .path-pathogenic{background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:7px;padding:.65rem .8rem;margin-top:.65rem}
        .path-likely{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.28);border-radius:7px;padding:.65rem .8rem;margin-top:.65rem}
        .path-benign{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.22);border-radius:7px;padding:.65rem .8rem;margin-top:.65rem}
        .path-vus{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.28);border-radius:7px;padding:.65rem .8rem;margin-top:.65rem}
        .path-bar-wrap{height:4px;background:#1e2130;border-radius:2px;overflow:hidden;margin:.35rem 0}
        .path-bar{height:100%;border-radius:2px;transition:width .5s ease}
        .score-formula{background:#0a0d14;border:1px solid #141720;border-radius:6px;padding:.5rem .7rem;margin:.4rem 0;font-family:'JetBrains Mono',monospace;font-size:.68rem;color:#3a5060;line-height:1.65}
        .ref-badge{display:inline-flex;align-items:center;gap:.25rem;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#6EE7B7;font-size:.68rem;font-weight:600;padding:.12rem .42rem;border-radius:4px;font-family:'JetBrains Mono',monospace}
        .info-wrap{overflow:hidden;transition:max-height .4s ease,opacity .3s}
        .info-wrap.closed{max-height:0;opacity:0}.info-wrap.open{max-height:800px;opacity:1}
        @keyframes spin{to{transform:rotate(360deg)}}
        .spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .45s linear infinite}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .fade-in{animation:fadeIn .35s ease-out}
        @media(max-width:600px){.sgrid4{grid-template-columns:repeat(2,1fr)}.cgrid2{grid-template-columns:1fr}.gene-grid{grid-template-columns:repeat(2,1fr)}}
      `}</style>

      <div style={{maxWidth:900,margin:"0 auto",padding:"1.1rem 1rem 3rem"}}>

        {/* ── HEADER ── */}
        <div style={{background:"linear-gradient(180deg,#141820 0%,#0c0e14 100%)",borderBottom:"1px solid #1e2130",padding:"1.4rem 1.2rem 1.1rem",margin:"-1.1rem -1rem 1rem",marginBottom:"1rem"}}>
          <div style={{background:`linear-gradient(135deg,${activeGene.color}18,#08121a)`,border:`2px solid ${activeGene.color}44`,borderRadius:14,padding:".85rem 1rem",marginBottom:".5rem",boxShadow:`0 6px 28px ${activeGene.color}18`}}>
            <h1 style={{fontFamily:"Sora",fontWeight:700,fontSize:"clamp(1rem,3.5vw,1.5rem)",color:"#fff",margin:0}}>
              Cancer Gene Mutation Analyzer
            </h1>
            <div style={{display:"flex",gap:".4rem",marginTop:".35rem",flexWrap:"wrap"}}>
              <span style={{background:"rgba(6,182,212,.15)",border:"1px solid rgba(6,182,212,.35)",color:"#67E8F9",fontSize:".62rem",fontWeight:600,padding:".12rem .42rem",borderRadius:20,textTransform:"uppercase"}}>3D Viewer</span>
              <span style={{background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.28)",color:"#6EE7B7",fontSize:".62rem",fontWeight:600,padding:".12rem .42rem",borderRadius:20,textTransform:"uppercase"}}>2D Domain Map</span>
              <span style={{background:"rgba(139,92,246,.1)",border:"1px solid rgba(139,92,246,.28)",color:"#A78BFA",fontSize:".62rem",fontWeight:600,padding:".12rem .42rem",borderRadius:20,textTransform:"uppercase"}}>AI Analysis</span>
              <span style={{background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.28)",color:"#FCD34D",fontSize:".62rem",fontWeight:600,padding:".12rem .42rem",borderRadius:20,textTransform:"uppercase"}}>ClinVar · COSMIC</span>
            </div>
          </div>
        </div>

        {/* ── MODE SWITCH ── */}
        <div style={{display:"flex",gap:".5rem",marginBottom:"1rem",background:"#0f1117",border:"1px solid #1e2130",borderRadius:10,padding:".4rem"}}>
          {[
            {k:"cancer",label:"Cancer Intelligence",desc:"Gene panel + ClinVar + COSMIC + Pathogenicity"},
            {k:"research",label:"Research Mode",desc:"General WT vs Mutant alignment + BLOSUM62"},
          ].map(m=>(
            <button key={m.k} onClick={()=>{setMode(m.k);setAiText("");}}
              style={{flex:1,padding:".65rem .5rem",border:mode===m.k?"1px solid rgba(6,182,212,.5)":"1px solid transparent",borderRadius:8,background:mode===m.k?"rgba(6,182,212,.12)":"transparent",cursor:"pointer",transition:"all .25s",textAlign:"center"}}>
              <div style={{fontSize:".85rem",fontWeight:700,color:mode===m.k?"#67E8F9":"#6b7080"}}>{m.label}</div>
              <div style={{fontSize:".62rem",color:mode===m.k?"#3a7080":"#3a3d4a",marginTop:".1rem"}}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* ── GENE PANEL (Cancer mode) ── */}
        {mode==="cancer"&&(
          <div className="pc" style={{borderColor:"rgba(16,185,129,.2)"}}>
            <div style={{fontSize:".82rem",fontWeight:600,color:"#6EE7B7",marginBottom:".75rem"}}>Gene Panel</div>
            <div className="gene-grid">
              {Object.values(GENE_PANEL).map(gene=>(
                <button key={gene.symbol}
                  onClick={()=>{setSelectedGene(gene.symbol);setCancerResults(null);setCancerAnnotated([]);setCancerError("");setAiText("");setSelectedDomain(null);}}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",gap:".2rem",padding:".65rem .35rem",background:selectedGene===gene.symbol?`${gene.color}15`:"#0f1117",border:selectedGene===gene.symbol?`2px solid ${gene.color}`:"1px solid #1e2130",borderRadius:9,cursor:"pointer",transition:"all .22s",boxShadow:selectedGene===gene.symbol?`0 3px 14px ${gene.color}28`:"none"}}>
                  <span style={{fontFamily:'"JetBrains Mono",monospace',fontWeight:700,fontSize:".88rem",color:selectedGene===gene.symbol?gene.color:"#c8cad4"}}>{gene.symbol}</span>
                  <span style={{fontSize:".6rem",color:"#6b7080"}}>{gene.type}</span>
                </button>
              ))}
            </div>
            <div style={{marginTop:".9rem",padding:".7rem",background:`${activeGene.color}09`,border:`1px solid ${activeGene.color}25`,borderRadius:7}}>
              <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".25rem",flexWrap:"wrap"}}>
                <span style={{fontSize:".82rem",fontWeight:600,color:activeGene.color}}>{activeGene.symbol} — {activeGene.name}</span>
                <span className="ref-badge">vs {activeRef?.accession}</span>
                <a href={activeGene.pdb?.url} target="_blank" rel="noreferrer" style={{fontSize:".62rem",color:"#3a5060",textDecoration:"none",background:"rgba(6,182,212,.07)",border:"1px solid rgba(6,182,212,.18)",borderRadius:4,padding:".08rem .32rem"}}>PDB {activeGene.pdb?.id}</a>
              </div>
              <div style={{fontSize:".78rem",color:"#7a8090",lineHeight:1.55}}>{activeGene.clinicalContext}</div>
            </div>
          </div>
        )}

        {/* ── 2D DOMAIN MAP ── */}
        <DomainMap2D
          gene={selectedGene}
          mutations2D={mode==="cancer"?cancerAnnotated:resResults?.mutations?.map((m,i)=>({mutation:m,aaPosition:Math.floor((m.codon_position??m.position??0)/3)+1,positions:{aaPosition:Math.floor((m.codon_position??m.position??0)/3)+1}}))||[]}
          selectedDomain={selectedDomain}
          onDomainClick={d=>setSelectedDomain(prev=>prev?.name===d.name?null:d)}
        />

        {/* ── 3D VIEWER ── */}
        <Protein3DViewer
          gene={selectedGene}
          mutationPositions={mutation3DPositions}
          viewMode="ribbon"
          selectedDomain={selectedDomain}
        />

        {/* ── CPK PANEL ── */}
        {selectedDomain&&(
          <CPKPanel domain={selectedDomain} mutations2D={mode==="cancer"?cancerAnnotated:[]} />
        )}

        {/* ── SELECTED DOMAIN DETAIL ── */}
        {selectedDomain&&!selectedDomain.isInterDomain&&(
          <div className="pc fade-in" style={{borderColor:selectedDomain.color+"44",background:selectedDomain.color+"06",marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:".5rem"}}>
              <div>
                <div style={{fontSize:".68rem",color:selectedDomain.color+"88",textTransform:"uppercase",letterSpacing:".07em",marginBottom:".15rem"}}>Selected Domain</div>
                <div style={{fontSize:".95rem",fontWeight:700,color:selectedDomain.color}}>{selectedDomain.name}</div>
                <div style={{fontSize:".75rem",color:"#6b7080",marginTop:".1rem"}}>AA {selectedDomain.start}–{selectedDomain.end} · <span style={{color:FREG_COL[selectedDomain.functionalRegion]||"#6b7080"}}>{selectedDomain.functionalRegion}</span></div>
              </div>
              <button onClick={()=>setSelectedDomain(null)} className="btn-g" style={{fontSize:".72rem",padding:".25rem .6rem"}}>✕</button>
            </div>
            <div style={{fontSize:".78rem",color:"#7a8090",lineHeight:1.55,marginTop:".5rem"}}>{selectedDomain.description}</div>
            <div style={{fontSize:".72rem",color:"#4a5060",lineHeight:1.5,marginTop:".35rem",padding:".45rem .6rem",background:"rgba(0,0,0,.2)",borderRadius:6,fontFamily:'"JetBrains Mono",monospace'}}>{selectedDomain.detail}</div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* CANCER INTELLIGENCE MODE INPUT */}
        {/* ═════════════════════════════════════════════════════════ */}
        {mode==="cancer"&&(
          <div className="pc">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:".5rem"}}>
              <h3 style={{fontSize:".95rem",fontWeight:600,color:"#c8cad4"}}>Sequence Input (vs {activeRef?.accession})</h3>
              <div style={{position:"relative"}}>
                <button className="btn-g" style={{fontSize:".8rem"}} onClick={e=>{e.stopPropagation();setShowSamples(v=>!v)}}>Load Sample ▾</button>
                {showSamples&&(
                  <div style={{position:"absolute",top:"calc(100% + .3rem)",right:0,background:"#141720",border:"1px solid #24272f",borderRadius:9,boxShadow:"0 10px 28px rgba(0,0,0,.5)",padding:".5rem",zIndex:100,minWidth:260}}>
                    {Object.entries(SAMPLES_CANCER).map(([k,s])=>(
                      <div key={k} onClick={()=>{setCancerSeq(s.seq);setSelectedGene(s.gene||"TP53");setShowSamples(false);}}
                        style={{padding:".6rem .75rem",borderRadius:7,cursor:"pointer",marginBottom:".25rem",background:s.color+"0a",border:`1px solid ${s.color}22`,transition:"all .18s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=s.color+"66"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=s.color+"22"}>
                        <div style={{fontSize:".82rem",fontWeight:600,color:s.color}}>{s.name}</div>
                        <div style={{fontSize:".72rem",color:"#6b7080",marginTop:".1rem"}}>{s.desc}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{background:"rgba(6,182,212,.04)",border:"1px solid rgba(6,182,212,.15)",borderRadius:7,padding:".6rem .8rem",marginBottom:".9rem",fontSize:".75rem",color:"#3a6070",lineHeight:1.55}}>
              <span style={{color:"#67E8F9",fontWeight:600}}>Reference ({activeRef?.accession}):</span>{" "}
              <span style={{fontFamily:'"JetBrains Mono",monospace',color:"#1a3a50"}}>{activeRef?.seq?.substring(0,55)}…</span>
              <span style={{color:"#2a4050",marginLeft:".4rem"}}>({activeRef?.seq?.length} bp)</span>
            </div>

            <div className="cgrid2" style={{marginBottom:".9rem"}}>
              <div><label className="lbl">Reading Frame</label>
                <select value={cancerFrame} onChange={e=>setCancerFrame(e.target.value)}>
                  <option value="1">+1 (start at pos 1)</option>
                  <option value="2">+2 (start at pos 2)</option>
                  <option value="3">+3 (start at pos 3)</option>
                </select>
              </div>
              <div><label className="lbl">Strand</label>
                <select value={cancerStrand} onChange={e=>setCancerStrand(e.target.value)}>
                  <option value="forward">Forward 5′→3′</option>
                  <option value="reverse">Reverse complement</option>
                </select>
              </div>
            </div>

            <label className="lbl">Your {selectedGene} sequence</label>
            <textarea rows={6} value={cancerSeq} onChange={e=>setCancerSeq(e.target.value)}
              placeholder={`Paste your ${selectedGene} DNA sequence here — compared codon-by-codon against ${activeRef?.accession}\n\nFASTA headers stripped automatically. Only ATGCN allowed.`}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:".3rem",fontSize:".72rem",fontFamily:'"JetBrains Mono",monospace',color:"#3a3d4a"}}>
              <span>Input: {cancerSeq.replace(/^>.*$/gm,"").replace(/\s/g,"").length} bp</span>
              <span>Reference: {activeRef?.seq?.length} bp</span>
            </div>
            {cancerError&&<div className="err">{cancerError}</div>}
            <button className="btn-p" onClick={handleCancerAnalyze} disabled={cancerLoading||!cancerSeq.trim()} style={{marginTop:".9rem",opacity:cancerSeq.trim()?1:.5}}>
              {cancerLoading?<><span className="spin"/><span>Analyzing…</span></>:<span>Compare to {activeRef?.accession} Reference →</span>}
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* RESEARCH MODE INPUT */}
        {/* ═════════════════════════════════════════════════════════ */}
        {mode==="research"&&(
          <div className="pc">
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",flexWrap:"wrap",gap:".5rem"}}>
              <h3 style={{fontSize:".95rem",fontWeight:600,color:"#c8cad4"}}>Wild-Type vs Mutant Alignment</h3>
              <div style={{display:"flex",gap:".5rem",alignItems:"center"}}>
                <div style={{position:"relative"}}>
                  <button className="btn-g" style={{fontSize:".8rem"}} onClick={e=>{e.stopPropagation();setShowSamples(v=>!v)}}>Load Sample ▾</button>
                  {showSamples&&(
                    <div style={{position:"absolute",top:"calc(100% + .3rem)",right:0,background:"#141720",border:"1px solid #24272f",borderRadius:9,boxShadow:"0 10px 28px rgba(0,0,0,.5)",padding:".5rem",zIndex:100,minWidth:260}}>
                      {Object.entries(SAMPLES_RESEARCH).map(([k,s])=>(
                        <div key={k} onClick={()=>{setWtSeq(s.wt);setMutSeq(s.mut);setShowSamples(false);}}
                          style={{padding:".6rem .75rem",borderRadius:7,cursor:"pointer",marginBottom:".25rem",background:s.color+"0a",border:`1px solid ${s.color}22`}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor=s.color+"66"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor=s.color+"22"}>
                          <div style={{fontSize:".82rem",fontWeight:600,color:s.color}}>{s.name}</div>
                          <div style={{fontSize:".72rem",color:"#6b7080",marginTop:".1rem"}}>{s.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="btn-g" onClick={()=>setIsProtein(v=>!v)} style={{fontSize:".8rem",borderColor:isProtein?"rgba(139,92,246,.5)":"#1e2130",color:isProtein?"#A78BFA":"#6b7080",background:isProtein?"rgba(139,92,246,.08)":"transparent"}}>
                  {isProtein?"Protein":"DNA/RNA"}
                </button>
              </div>
            </div>

            {/* Gene selector for research mode */}
            <div style={{marginBottom:".9rem"}}>
              <label className="lbl">Gene Context (for 3D visualization)</label>
              <div className="gene-grid">
                {Object.values(GENE_PANEL).map(gene=>(
                  <button key={gene.symbol} onClick={()=>setSelectedGene(gene.symbol)}
                    style={{padding:".5rem",background:selectedGene===gene.symbol?`${gene.color}15`:"#0f1117",border:selectedGene===gene.symbol?`2px solid ${gene.color}`:"1px solid #1e2130",borderRadius:8,cursor:"pointer",transition:"all .2s"}}>
                    <div style={{fontFamily:'"JetBrains Mono",monospace',fontWeight:700,fontSize:".82rem",color:selectedGene===gene.symbol?gene.color:"#8a8f9e"}}>{gene.symbol}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="cgrid2" style={{marginBottom:".9rem"}}>
              <div><label className="lbl">Reading Frame</label>
                <select value={resFrame} onChange={e=>setResFrame(e.target.value)}>
                  <option value="1">+1</option><option value="2">+2</option><option value="3">+3</option>
                </select>
              </div>
              <div><label className="lbl">Strand</label>
                <select value={resStrand} onChange={e=>setResStrand(e.target.value)}>
                  <option value="forward">Forward 5′→3′</option>
                  <option value="reverse">Reverse complement</option>
                </select>
              </div>
            </div>

            <div className="cgrid2">
              <div>
                <label className="lbl">Wild-Type Sequence</label>
                <textarea rows={5} value={wtSeq} onChange={e=>setWtSeq(e.target.value)} placeholder={isProtein?"Paste wild-type protein sequence (1-letter code)…":"Paste wild-type DNA sequence (ATGC)…"}/>
                <div style={{fontSize:".68rem",color:"#3a3d4a",marginTop:".2rem",fontFamily:'"JetBrains Mono",monospace'}}>{wtSeq.replace(/\s/g,"").length} chars</div>
              </div>
              <div>
                <label className="lbl">Mutant Sequence</label>
                <textarea rows={5} value={mutSeq} onChange={e=>setMutSeq(e.target.value)} placeholder={isProtein?"Paste mutant protein sequence…":"Paste mutant DNA sequence…"}/>
                <div style={{fontSize:".68rem",color:"#3a3d4a",marginTop:".2rem",fontFamily:'"JetBrains Mono",monospace"'}}>{mutSeq.replace(/\s/g,"").length} chars</div>
              </div>
            </div>
            {resError&&<div className="err">{resError}</div>}
            <button className="btn-p" onClick={handleResearchAnalyze} disabled={resLoading||!wtSeq.trim()||!mutSeq.trim()} style={{marginTop:".9rem",opacity:(wtSeq.trim()&&mutSeq.trim())?1:.5}}>
              {resLoading?<><span className="spin"/><span>Aligning sequences…</span></>:<span>Run Needleman-Wunsch Alignment →</span>}
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* AI ANALYSIS BUTTON — BOTH MODES */}
        {/* ═════════════════════════════════════════════════════════ */}
        {((mode==="cancer"&&cancerResults)||(mode==="research"&&resResults))&&(
          <div style={{marginBottom:".9rem"}}>
            <button className="btn-ai" onClick={handleAI} disabled={aiLoading}>
              {aiLoading?<><span className="spin"/>Generating AI Structural Analysis (claude-sonnet-4)…</>:<>🔬 AI Structural Analysis (claude-sonnet-4)</>}
            </button>
          </div>
        )}

        {aiText&&(
          <div className="pc fade-in" style={{borderColor:"rgba(6,182,212,.2)",background:"rgba(6,182,212,.03)",marginBottom:"1rem"}}>
            <div style={{fontSize:".82rem",fontWeight:600,color:"#67E8F9",marginBottom:".6rem",display:"flex",alignItems:"center",gap:".5rem"}}>
              <span>AI Structural Analysis</span>
              <span style={{fontSize:".62rem",color:"#3a5060",background:"rgba(6,182,212,.08)",border:"1px solid rgba(6,182,212,.18)",borderRadius:4,padding:".08rem .35rem"}}>claude-sonnet-4</span>
            </div>
            <div style={{fontSize:".85rem",color:"#c8d0da",lineHeight:1.82,whiteSpace:"pre-wrap",maxHeight:380,overflowY:"auto",background:"rgba(0,0,0,.18)",borderRadius:7,padding:".7rem",border:"1px solid #1e2130"}}>{aiText}</div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* CANCER MODE RESULTS */}
        {/* ═════════════════════════════════════════════════════════ */}
        {mode==="cancer"&&cancerResults&&(
          <div className="fade-in">
            {cancerResults.warnings?.length>0&&(
              <div className="warn">{cancerResults.warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}</div>
            )}

            <div style={{background:"rgba(16,185,129,.05)",border:"1px solid rgba(16,185,129,.2)",borderRadius:7,padding:".55rem .8rem",marginBottom:".9rem",fontSize:".78rem",color:"#6EE7B7",display:"flex",alignItems:"center",gap:".4rem",flexWrap:"wrap"}}>
              <span style={{fontWeight:700}}>Reference used:</span>
              <span className="ref-badge">{cancerResults.sequences.reference_name}</span>
              <span style={{color:"#2a4a2a"}}>{cancerResults.sequences.reference_length} bp ref vs {cancerResults.sequences.alternate_length} bp input</span>
              {cancerResults.sequences.length_difference!==0&&<span style={{color:"#fbbf24",fontWeight:600}}>Δ{cancerResults.sequences.length_difference>0?"+":""}{cancerResults.sequences.length_difference} bp</span>}
            </div>

            {/* Summary stats */}
            <div className="pc">
              <div style={{fontSize:".88rem",fontWeight:600,color:"#c8cad4",marginBottom:".7rem"}}>{selectedGene} Mutation Summary (vs {activeRef?.accession})</div>
              <div className="sgrid4">
                {[{l:"Total",v:cancerResults.summary.total_mutations,c:"#fff"},{l:"SNPs",v:cancerResults.summary.snps,c:"#60A5FA"},{l:"Missense",v:cancerResults.summary.missense_mutations,c:"#FBBF24"},{l:"Nonsense",v:cancerResults.summary.nonsense_mutations,c:"#EF4444"},{l:"Silent",v:cancerResults.summary.silent_mutations,c:"#10B981"},{l:"Insertions",v:cancerResults.summary.insertions,c:"#F59E0B"},{l:"Deletions",v:cancerResults.summary.deletions,c:"#EF4444"},{l:"Frameshift",v:cancerResults.summary.frameshift_mutations,c:"#DC2626"}].map((s,i)=>(
                  <div key={i} className="stat-b"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
                ))}
              </div>
            </div>

            {/* Variant table */}
            {cancerAnnotated.length>0&&(
              <div className="pc">
                <div style={{fontSize:".88rem",fontWeight:600,color:"#c8cad4",marginBottom:".7rem"}}>Variant Table — HGVS</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#0f1117"}}>
                      {["nt pos","AA","HGVS","Type","Effect","Domain","Score"].map((h,i)=>(
                        <th key={i} style={{padding:".6rem .7rem",textAlign:"left",borderBottom:"1px solid #1e2130",fontSize:".7rem",color:"#67E8F9",textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {cancerAnnotated.map((am,i)=>(
                        <tr key={i} style={{cursor:"pointer"}} onClick={()=>{const d=am.domainMapping;if(d&&!d.isInterDomain)setSelectedDomain(d);}}>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720",fontFamily:'"JetBrains Mono",monospace',color:"#67E8F9",fontSize:".8rem"}}>{am.positions.nucleotidePosition}</td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720",fontFamily:'"JetBrains Mono",monospace',color:"#10B981",fontWeight:600}}>{am.positions.aaPosition}</td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720",fontFamily:'"JetBrains Mono",monospace',fontSize:".78rem",color:"#60A5FA",fontWeight:600}}>{am.hgvs}</td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720",color:"#c8cad4",fontSize:".8rem"}}>{am.mutation.type}</td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720"}}><span className={`badge badge-${am.mutation.mutation_class?.toLowerCase()}`}>{am.mutation.mutation_class}</span></td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720",fontSize:".75rem",color:"#7a8090"}}>{am.domainMapping.proteinDomain}</td>
                          <td style={{padding:".6rem .7rem",borderBottom:"1px solid #141720"}}>
                            <span style={{background:am.pathogenicity?.color+"1a",border:`1px solid ${am.pathogenicity?.color}44`,color:am.pathogenicity?.color,fontSize:".72rem",fontWeight:700,padding:".1rem .35rem",borderRadius:4}}>
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

            {/* Detailed mutation cards */}
            {cancerAnnotated.length>0&&(
              <div className="pc">
                <div style={{fontSize:".88rem",fontWeight:600,color:"#c8cad4",marginBottom:".7rem"}}>Detailed Mutation Interpretation</div>
                {cancerAnnotated.map((am,idx)=>{
                  const path=am.pathogenicity;
                  const cardCol=am.mutation.is_frameshift?"#DC2626":am.mutation.mutation_class==="Nonsense"?"#EF4444":am.mutation.mutation_class==="Missense"?"#FBBF24":"#10B981";
                  return (
                    <div key={idx} className="mut-card" style={{borderLeft:`3px solid ${cardCol}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".6rem",flexWrap:"wrap",gap:".35rem"}}>
                        <div>
                          <div style={{fontSize:".65rem",color:"#3a3d4a",fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:".1rem"}}>Mutation {idx+1} — vs {activeRef?.accession}</div>
                          <div style={{fontSize:".95rem",fontFamily:'"JetBrains Mono",monospace',color:"#10B981",fontWeight:700}}>{am.hgvs}</div>
                          {am.mutation.reference_amino_acid&&am.mutation.alternate_amino_acid&&(
                            <div style={{fontSize:".72rem",color:"#6b7080",marginTop:".1rem"}}>{toThree(am.mutation.reference_amino_acid)}{am.positions.aaPosition}{toThree(am.mutation.alternate_amino_acid)} · {am.mutation.reference_codon}→{am.mutation.alternate_codon}</div>
                          )}
                        </div>
                        <div style={{display:"flex",gap:".3rem",alignItems:"center",flexWrap:"wrap"}}>
                          {path?.acmgCriteria?.map((c,ci)=>(
                            <span key={ci} style={{background:"rgba(129,140,248,.12)",border:"1px solid rgba(129,140,248,.3)",color:"#818CF8",fontSize:".62rem",fontWeight:700,padding:".08rem .32rem",borderRadius:4,fontFamily:"monospace"}}>{c}</span>
                          ))}
                          <span style={{background:path?.color+"18",border:`1px solid ${path?.color}44`,color:path?.color,fontSize:".78rem",fontWeight:800,padding:".18rem .5rem",borderRadius:5}}>{path?.shortLabel}</span>
                        </div>
                      </div>

                      {/* Domain info */}
                      <div style={{background:"rgba(16,185,129,.03)",border:"1px solid rgba(16,185,129,.12)",borderRadius:6,padding:".5rem .65rem",marginBottom:".55rem"}}>
                        <div style={{fontSize:".65rem",color:"#0a4a2a",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:".2rem"}}>Domain</div>
                        <div style={{display:"flex",gap:".65rem",flexWrap:"wrap"}}>
                          <div><div style={{fontSize:".62rem",color:"#1a3a2a"}}>Name</div><div style={{fontSize:".78rem",color:"#10B981",fontWeight:600}}>{am.domainMapping.proteinDomain}</div></div>
                          {!am.domainMapping.isInterDomain&&<>
                            <div><div style={{fontSize:".62rem",color:"#1a3a2a"}}>Class</div><div style={{fontSize:".78rem",color:FREG_COL[am.domainMapping.functionalRegion]||"#10B981",fontWeight:600}}>{am.domainMapping.functionalRegion}</div></div>
                            <div><div style={{fontSize:".62rem",color:"#1a3a2a"}}>Range</div><div style={{fontSize:".78rem",color:"#10B981",fontWeight:600,fontFamily:"monospace"}}>AA {am.domainMapping.start}–{am.domainMapping.end}</div></div>
                          </>}
                        </div>
                        {am.domainMapping.detail&&<div style={{fontSize:".65rem",color:"#1a3a2a",marginTop:".25rem",lineHeight:1.5}}>{am.domainMapping.detail}</div>}
                      </div>

                      {/* In-silico predictors for missense */}
                      {am.mutation.mutation_class==="Missense"&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:".4rem",marginBottom:".55rem"}}>
                          {am.sift&&(
                            <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                              <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:".12rem"}}>SIFT-like</div>
                              <div style={{fontFamily:"monospace",fontSize:".88rem",fontWeight:700,color:am.sift.labelColor}}>{am.sift.score}</div>
                              <div style={{fontSize:".62rem",color:am.sift.labelColor,marginTop:".06rem"}}>{am.sift.label}</div>
                              <div style={{fontSize:".58rem",color:"#1a2030",marginTop:".04rem"}}>BLOSUM62: {am.sift.blosum62}</div>
                            </div>
                          )}
                          {am.polyphen&&(
                            <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                              <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:".12rem"}}>PolyPhen-like</div>
                              <div style={{fontFamily:"monospace",fontSize:".88rem",fontWeight:700,color:am.polyphen.labelColor}}>{am.polyphen.score}</div>
                              <div style={{fontSize:".62rem",color:am.polyphen.labelColor}}>{am.polyphen.label}</div>
                            </div>
                          )}
                          {am.conservation&&(
                            <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                              <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:".12rem"}}>Conservation</div>
                              <div style={{fontFamily:"monospace",fontSize:".88rem",fontWeight:700,color:am.conservation.color}}>{am.conservation.score}</div>
                              <div style={{fontSize:".62rem",color:am.conservation.color}}>{am.conservation.label}</div>
                            </div>
                          )}
                          <div style={{background:"rgba(8,10,18,.9)",border:`1px solid ${am.cosmic?"rgba(239,68,68,.25)":"#14172a"}`,borderRadius:6,padding:".45rem .55rem"}}>
                            <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",letterSpacing:".06em",marginBottom:".12rem"}}>COSMIC</div>
                            {am.cosmic?<>
                              <div style={{fontFamily:"monospace",fontSize:".78rem",fontWeight:700,color:"#fca5a5"}}>{(am.cosmic.freq*100).toFixed(1)}%</div>
                              <div style={{fontSize:".6rem",color:"#6a2a2a"}}>{am.cosmic.samples.toLocaleString()} samples</div>
                              <div style={{fontSize:".58rem",color:"#3a1a1a"}}>{am.cosmic.cosmic_id}</div>
                            </>:<div style={{fontSize:".68rem",color:"#1e2030",marginTop:".12rem"}}>Not in COSMIC catalogue</div>}
                          </div>
                        </div>
                      )}

                      {/* ClinVar */}
                      {am.clinvar?(()=>{
                        const cv=am.clinvar;
                        const sc=cv.sig?.toLowerCase().includes("pathogenic")&&!cv.sig?.toLowerCase().includes("likely")?"#EF4444":cv.sig?.toLowerCase().includes("likely pathogenic")?"#F59E0B":cv.sig?.toLowerCase().includes("uncertain")?"#818CF8":"#10B981";
                        return(
                          <div style={{background:"rgba(239,68,68,.03)",border:"1px solid rgba(239,68,68,.14)",borderRadius:6,padding:".5rem .65rem",marginBottom:".55rem"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".25rem",flexWrap:"wrap",gap:".2rem"}}>
                              <div style={{fontSize:".62rem",color:"#5a2a2a",textTransform:"uppercase",letterSpacing:".06em",fontWeight:700}}>ClinVar Evidence</div>
                              <div style={{display:"flex",gap:".15rem"}}>{[...Array(3)].map((_,si)=><div key={si} style={{width:7,height:7,borderRadius:2,background:si<(cv.stars||1)?"#fbbf24":"#1a1d2a"}}/>)}</div>
                            </div>
                            <span style={{background:sc+"15",border:`1px solid ${sc}44`,color:sc,fontSize:".7rem",fontWeight:700,padding:".08rem .35rem",borderRadius:4}}>{cv.sig}</span>
                            <span style={{fontFamily:"monospace",fontSize:".63rem",color:"#2a2d3a",marginLeft:".4rem"}}>{cv.accession}</span>
                            <div style={{fontSize:".68rem",color:"#4a3030",lineHeight:1.45,marginTop:".18rem"}}>{cv.condition}</div>
                          </div>
                        );
                      })():(
                        <div style={{background:"rgba(99,102,241,.03)",border:"1px solid rgba(99,102,241,.12)",borderRadius:6,padding:".4rem .65rem",marginBottom:".55rem"}}>
                          <span style={{fontSize:".7rem",color:"#3a3d5a",fontStyle:"italic"}}>No exact match found in ClinVar database for {am.hgvs}</span>
                        </div>
                      )}

                      {/* Biological interpretation */}
                      {am.bioNote&&(
                        <div style={{background:"rgba(251,191,36,.03)",border:"1px solid rgba(251,191,36,.12)",borderRadius:6,padding:".5rem .65rem",marginBottom:".55rem"}}>
                          <div style={{fontSize:".62rem",color:"#4a3a08",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:".2rem"}}>Biological Interpretation</div>
                          <div style={{fontSize:".78rem",color:"#6a6050",lineHeight:1.6}}>{am.bioNote}</div>
                        </div>
                      )}

                      {/* Pathogenicity */}
                      <div className={path?.bgClass||"path-vus"}>
                        <div style={{display:"flex",alignItems:"center",gap:".4rem",marginBottom:".3rem",flexWrap:"wrap"}}>
                          <span style={{fontFamily:"monospace",fontSize:".88rem",fontWeight:800,color:path?.color}}>{path?.shortLabel}</span>
                          <span style={{fontWeight:700,color:path?.color,fontSize:".88rem"}}>{path?.label}</span>
                          <span style={{marginLeft:"auto",fontSize:".68rem",color:"#5a6070",fontWeight:600}}>{path?.score}/100</span>
                        </div>
                        <div className="path-bar-wrap"><div className="path-bar" style={{width:`${path?.score}%`,background:path?.score>=72?"#EF4444":path?.score>=52?"#F59E0B":path?.score>=30?"#818CF8":"#10B981"}}/></div>
                        <div className="score-formula">{path?.scoreExplanation}</div>
                        {path?.componentScores&&(
                          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:".2rem",margin:".35rem 0",padding:".35rem",background:"rgba(0,0,0,.2)",borderRadius:4}}>
                            {[{k:"domainImpact",l:"Dom"},{k:"mutationType",l:"Mut"},{k:"clinvar",l:"CV"},{k:"cosmic",l:"COSM"},{k:"conservation",l:"Cons"},{k:"structural",l:"Str"}].map(c=>(
                              <div key={c.k} style={{textAlign:"center"}}>
                                <div style={{fontSize:".55rem",color:"#2a2d3a"}}>{c.l}</div>
                                <div style={{fontSize:".68rem",fontFamily:"monospace",color:(path?.componentScores[c.k]||0)>0.5?path?.color:"#4a5060",fontWeight:600}}>{((path?.componentScores[c.k]||0)*100).toFixed(0)}%</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {path?.reasons?.map((r,ri)=>(
                          <div key={ri} style={{fontSize:".7rem",color:"#5a6070",display:"flex",gap:".3rem",marginTop:".1rem"}}>
                            <span style={{color:path?.color,flexShrink:0}}>·</span>{r}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cancerResults.mutations?.length===0&&(
              <div className="pc" style={{textAlign:"center",padding:"1.8rem",borderColor:"rgba(16,185,129,.25)",background:"rgba(16,185,129,.04)"}}>
                <div style={{fontSize:"1.6rem",marginBottom:".35rem"}}>✓</div>
                <div style={{fontSize:".95rem",color:"#10B981",fontWeight:700}}>No mutations detected — input matches {activeRef?.accession} exactly</div>
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* RESEARCH MODE RESULTS */}
        {/* ═════════════════════════════════════════════════════════ */}
        {mode==="research"&&resResults&&(
          <div className="fade-in">
            {/* Stats */}
            <div className="pc">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".7rem",flexWrap:"wrap",gap:".35rem"}}>
                <div style={{fontSize:".88rem",fontWeight:600,color:"#c8cad4"}}>Alignment Results (Needleman-Wunsch)</div>
                <span style={{fontSize:".72rem",color:"#10B981",background:"rgba(16,185,129,.1)",border:"1px solid rgba(16,185,129,.25)",borderRadius:5,padding:".12rem .42rem"}}>
                  Identity: {(resResults.identity*100).toFixed(1)}%
                </span>
              </div>
              <div className="sgrid4">
                {[{l:"Total",v:resResults.summary.total,c:"#fff"},{l:"SNPs/Sub",v:resResults.summary.snps,c:"#60A5FA"},{l:"Insertions",v:resResults.summary.insertions,c:"#F59E0B"},{l:"Deletions",v:resResults.summary.deletions,c:"#EF4444"},{l:"Missense",v:resResults.summary.missense,c:"#FBBF24"},{l:"Nonsense",v:resResults.summary.nonsense,c:"#EF4444"},{l:"Silent",v:resResults.summary.silent,c:"#10B981"},{l:"Identity",v:`${(resResults.identity*100).toFixed(0)}%`,c:"#818CF8"}].map((s,i)=>(
                  <div key={i} className="stat-b"><div className="stat-v" style={{color:s.c}}>{s.v}</div><div className="stat-l">{s.l}</div></div>
                ))}
              </div>
            </div>

            {/* Alignment view */}
            {resResults.aligned1&&(
              <div className="pc">
                <div style={{fontSize:".82rem",fontWeight:600,color:"#c8cad4",marginBottom:".6rem"}}>Pairwise Alignment</div>
                <div style={{fontFamily:'"JetBrains Mono",monospace',fontSize:".72rem",lineHeight:2,overflowX:"auto",maxHeight:180,overflowY:"auto",background:"#0a0c14",borderRadius:7,padding:".65rem .8rem",border:"1px solid #1e2130"}}>
                  <div style={{display:"flex",gap:".5rem",color:"#4a6070",marginBottom:".3rem",fontSize:".6rem",textTransform:"uppercase",letterSpacing:".07em"}}>
                    <span style={{width:42,flexShrink:0}}>WT</span>
                    <span>{resResults.aligned1.substring(0,80)}{resResults.aligned1.length>80?"…":""}</span>
                  </div>
                  <div style={{display:"flex",gap:".5rem",color:"#2a4a2a",marginBottom:".3rem"}}>
                    <span style={{width:42,flexShrink:0,color:"#1a3a1a",fontSize:".6rem",textTransform:"uppercase"}}></span>
                    <span>{resResults.aligned1.substring(0,80).split("").map((c,i)=>c===resResults.aligned2[i]?"|":" ").join("")}</span>
                  </div>
                  <div style={{display:"flex",gap:".5rem",color:"#6a4a1a"}}>
                    <span style={{width:42,flexShrink:0,color:"#4a3a1a",fontSize:".6rem",textTransform:"uppercase"}}>MUT</span>
                    <span>{resResults.aligned2.substring(0,80).split("").map((c,i)=>{
                      const isMatch=c===resResults.aligned1[i];
                      return <span key={i} style={{color:c==="-"?"#EF4444":!isMatch?"#FBBF24":"#3a5a3a"}}>{c}</span>;
                    })}{resResults.aligned2.length>80?"…":""}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Mutation cards for research mode */}
            {resResults.mutations.length>0&&(
              <div className="pc">
                <div style={{fontSize:".88rem",fontWeight:600,color:"#c8cad4",marginBottom:".7rem"}}>Detected Mutations — BLOSUM62 Analysis</div>
                {resResults.mutations.map((m,idx)=>{
                  const cardCol=m.type==="Insertion"?"#F59E0B":m.type==="Deletion"?"#EF4444":m.mutation_class==="Missense"?"#FBBF24":m.mutation_class==="Nonsense"?"#EF4444":"#10B981";
                  const blosum=m.blosum62??0;
                  const rp=m.reference_amino_acid?AA_PROPS[m.reference_amino_acid]:null;
                  const ap=m.alternate_amino_acid?AA_PROPS[m.alternate_amino_acid]:null;
                  return (
                    <div key={idx} className="mut-card" style={{borderLeft:`3px solid ${cardCol}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".5rem",flexWrap:"wrap",gap:".35rem"}}>
                        <div>
                          <div style={{fontSize:".65rem",color:"#3a3d4a",fontWeight:600,textTransform:"uppercase",letterSpacing:".07em",marginBottom:".1rem"}}>Mutation {idx+1} · Position {m.position+1}</div>
                          <div style={{fontSize:".92rem",fontFamily:'"JetBrains Mono",monospace',color:"#c8cad4",fontWeight:700}}>
                            {m.type==="SNP"||m.type==="Substitution"?`${m.reference}→${m.alternate}`:m.type==="Insertion"?`+${m.inserted||""}`:m.type==="Deletion"?`-${m.deleted||""}`:m.type}
                          </div>
                          {m.reference_amino_acid&&m.alternate_amino_acid&&(
                            <div style={{fontSize:".72rem",color:"#6b7080",marginTop:".08rem"}}>{m.reference_codon}→{m.alternate_codon} ({toThree(m.reference_amino_acid)}→{toThree(m.alternate_amino_acid)})</div>
                          )}
                        </div>
                        <span className={`badge badge-${m.type?.toLowerCase()}`}>{m.mutation_class||m.type}</span>
                      </div>

                      {/* BLOSUM62 score */}
                      {m.mutation_class==="Missense"&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:".4rem",marginBottom:".5rem"}}>
                          <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                            <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",marginBottom:".1rem"}}>BLOSUM62</div>
                            <div style={{fontSize:"1rem",fontFamily:"monospace",fontWeight:700,color:blosum>0?"#10B981":blosum===0?"#F59E0B":"#EF4444"}}>{blosum}</div>
                            <div style={{fontSize:".62rem",color:blosum>0?"#10B981":blosum===0?"#F59E0B":"#EF4444"}}>{blosum>0?"Conservative":blosum===0?"Neutral":"Disruptive"}</div>
                          </div>
                          {rp&&ap&&(
                            <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                              <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",marginBottom:".1rem"}}>Property Change</div>
                              {rp.charge!==ap.charge&&<div style={{fontSize:".65rem",color:"#EF4444"}}>Charge: {rp.charge}→{ap.charge}</div>}
                              {rp.polarity!==ap.polarity&&<div style={{fontSize:".65rem",color:"#F59E0B"}}>Polarity: {rp.polarity}→{ap.polarity}</div>}
                              {rp.size!==ap.size&&<div style={{fontSize:".65rem",color:"#818CF8"}}>Size: {rp.size}→{ap.size}</div>}
                              {rp.charge===ap.charge&&rp.polarity===ap.polarity&&rp.size===ap.size&&<div style={{fontSize:".65rem",color:"#10B981"}}>Conservative</div>}
                            </div>
                          )}
                          {m.reference_amino_acid&&m.alternate_amino_acid&&(()=>{
                            const s=estimateSIFT(m.reference_amino_acid, m.alternate_amino_acid);
                            return (
                              <div style={{background:"rgba(8,10,18,.9)",border:"1px solid #14172a",borderRadius:6,padding:".45rem .55rem"}}>
                                <div style={{fontSize:".6rem",color:"#2a2d3a",textTransform:"uppercase",marginBottom:".1rem"}}>SIFT-like</div>
                                <div style={{fontSize:".88rem",fontFamily:"monospace",fontWeight:700,color:s.labelColor}}>{s.score}</div>
                                <div style={{fontSize:".62rem",color:s.labelColor}}>{s.label}</div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Structural impact note */}
                      <div style={{fontSize:".75rem",color:"#5a6070",background:"rgba(0,0,0,.15)",borderRadius:5,padding:".4rem .55rem",lineHeight:1.55}}>
                        {m.mutation_class==="Silent"?"Synonymous — no amino acid change. Unlikely to affect protein structure.":
                         m.mutation_class==="Missense"?`Missense substitution at codon ${Math.floor((m.codon_position??m.position??0)/3)+1}. BLOSUM62 score of ${blosum} indicates ${blosum>=0?"conservative":"potentially disruptive"} substitution.`:
                         m.mutation_class==="Nonsense"?"Premature stop codon introduced — protein truncation expected.":
                         m.type==="Insertion"?`Insertion of ${m.inserted?.length||"?"} bp — ${(m.inserted?.length||0)%3===0?"in-frame insertion":"frameshift disrupting downstream reading frame"}.`:
                         m.type==="Deletion"?`Deletion of ${m.deleted?.length||"?"} bp — ${(m.deleted?.length||0)%3===0?"in-frame deletion":"frameshift disrupting downstream reading frame"}.`:"Mutation detected."}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {resResults.mutations.length===0&&(
              <div className="pc" style={{textAlign:"center",padding:"1.8rem",borderColor:"rgba(16,185,129,.25)",background:"rgba(16,185,129,.04)"}}>
                <div style={{fontSize:"1.6rem",marginBottom:".35rem"}}>✓</div>
                <div style={{fontSize:".95rem",color:"#10B981",fontWeight:700}}>Sequences are identical — no mutations detected</div>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <div style={{marginTop:"2rem",padding:".9rem",background:"#0f1117",border:"1px solid #1e2130",borderRadius:9,fontSize:".72rem",color:"#3a3d4a",lineHeight:1.6}}>
          <strong style={{color:"#5a5d6a"}}>Disclaimer:</strong> Research and educational purposes only. Not for clinical use. All variants require validation in a certified clinical laboratory. Consult a clinical geneticist for patient care decisions.
        </div>
      </div>
    </div>
  );
}