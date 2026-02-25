"""
Canonical CDS Reference Sequences
==================================
Partial coding sequences for supported cancer driver genes.
Used by hgvs_parser to convert c. (cDNA) notation to protein-level mutations.

IMPORTANT: These are representative CDS fragments aligned to the canonical
RefSeq transcripts below. In production, replace with full NCBI RefSeq CDS.

  TP53  — NM_000546.6   (393 aa)
  KRAS  — NM_004985.5   (189 aa)
  BRCA1 — NM_007294.4   (1863 aa)
  EGFR  — NM_005228.5   (1210 aa)
"""

# ─── Standard genetic code (DNA → single-letter amino acid) ───────────────────
CODON_TABLE = {
    'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
    'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
    'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
    'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
    'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
    'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
    'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
    'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
    'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
    'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
    'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
    'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
    'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
    'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
    'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
}


def translate_codon(codon: str) -> str:
    """Translate a single DNA codon to its amino acid (1-letter code)."""
    return CODON_TABLE.get(codon.upper(), 'X')


def translate_cds(cds: str) -> str:
    """Translate a full CDS string to a protein sequence (stops at first *)."""
    cds = cds.upper()
    protein = []
    for i in range(0, len(cds) - 2, 3):
        aa = translate_codon(cds[i:i+3])
        if aa == '*':
            break
        protein.append(aa)
    return ''.join(protein)


# ─── Canonical CDS sequences (representative regions) ────────────────────────
# Keys must match the gene symbols used throughout the application.
REFERENCE_SEQUENCES = {
    'TP53': (
        'ATGGAGGAGCCGCAGTCAGATCCTAGCGTGAGTTTGCACCTGAGTCTTGCAGAAACGTGGGAAAA'
        'CCACACTGGCATGTTCAATACCAGGGTTCGAGGCCCACTGAAAGTGAATTTATAGGAGTCCGAATC'
        'TTCATTCTAACAAGGTCAGCATGTGAACTTCAAGGATGCCCAGGCCCCTTTTCTTTATGCCAGCAAA'
        'TAAAGCTACTTCCAGGCAAGATGTTTCATATAAGCTATGATACAGAAATTGATGACTTCATTTTTAAC'
        'GTGTCTGTGTTTGCAGATAGCGATGGTCTGGCTCCTGAAGGCAAAAAGGGGCAGAGGAAGGGGCTTA'
        'GCTTCGCTAAATCCTGACCTGCCCAATGGAGTCACAGCGGGCTTTTCTGATACCACATTTTTCCTCCC'
        'AGAGAATGATTTCATCTGCAGCCAGATTTTCATCTTCTGTCCCTTCCCAGAAAACCTACCAGGGCAGCT'
        'ACGGTTTCCGTCTGGGCTTCTTGCATTCTGGGACAGCCAAGTCTGTGACTTGCACGTACTCCCCTGCC'
        'CTCAACAAGATGTTTTGCCAACTGG'
    ),
    'KRAS': (
        'ATGACTGAATATAAACTTGTGGTAGTTGGAGCTGGTGGCGTAGGCAAGAGTGCCTTGACGATACAG'
        'CTAATTCAGAATCATTTTGTGGACGAATATGATCCAACAATAGAGGATTCCTACAGGAAGCAAGTAG'
        'TAATTGATGGAGAAACCTGTCTCTTGGATATTCTCGACACAGCAGGTCAAGAGGAGTACAGTGCAAT'
        'GAGGGACCAGTACATGAGGACTGGGGAGGGCTTTCTTTGTGTATTTGCCATAAATAATACTAAATCAT'
        'TTGAAGATATTCACCATTATAGAGAACAAATTAAAAGAGTTAAGGACTCTGAAGATGTACCTATGGTC'
        'CTAGTAGGAAATAAATGTGATTTGCCTTCTAGAACAGTAGACACAAAACAGGCTCAGGACTTAGCAAG'
        'AAGTTATGGAATTCCTTTTATTGAAACATCAGCAAAGACAAGACAG'
    ),
    'BRCA1': (
        'ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAG'
        'AGTGTCCCATCTGTCTGGAGTTGATCAAGGAACCTGTCTCCACAAAGTGTGACCACATATTTTGCAAA'
        'TTTTGCATGCTGAAACTTCTCAACCAGAAGAAAGGGCCTTCACAGTGTCCTTTATGTAAGAATGATAT'
        'AACCAAAAGGAGCCTACAAGAAAGTACGAGATTTAGTCAACTTGTTGAAGAGCTATTGAAAATCATTT'
        'GTGCTTTTCAGCTTGACACAGGTTTG'
    ),
    'EGFR': (
        'ATGCGACCCTCCGGGACGGCCGGGGCAGCGCTCCTGGCGCTGCTGGCTGCGCTCTGCCCGGCGAGT'
        'CGGGCTCTGGAGGAAAAGAAAGTTTGCCAAGGCACGAGTAACAAGCTCACGCAGTTGGGCACTTTTG'
        'AAGATCATTTTCTCAGCCTCCAGAGGATGTTCAATAACTGTGAGGTGGTCCTTGGGAATTTGGAAATT'
        'ACCTATGTGCAGAGGAATTATGATCTTTCCTTCTTAAAGATCGTCAGAGCTCTTGGCCGTGGAGACCTG'
        'ACAGATGCCAAACTCATCAAAGAAGCAACG'
    ),
}

# ─── Gene metadata (protein lengths, transcript IDs) ─────────────────────────
GENE_META = {
    'TP53':  {'transcript': 'NM_000546.6', 'protein_length': 393},
    'KRAS':  {'transcript': 'NM_004985.5', 'protein_length': 189},
    'BRCA1': {'transcript': 'NM_007294.4', 'protein_length': 1863},
    'EGFR':  {'transcript': 'NM_005228.5', 'protein_length': 1210},
}

# ─── Three-letter ↔ one-letter amino acid codes ──────────────────────────────
AA_3TO1 = {
    'Ala': 'A', 'Arg': 'R', 'Asn': 'N', 'Asp': 'D', 'Cys': 'C',
    'Glu': 'E', 'Gln': 'Q', 'Gly': 'G', 'His': 'H', 'Ile': 'I',
    'Leu': 'L', 'Lys': 'K', 'Met': 'M', 'Phe': 'F', 'Pro': 'P',
    'Ser': 'S', 'Thr': 'T', 'Trp': 'W', 'Tyr': 'Y', 'Val': 'V',
    'Ter': '*',
}

AA_1TO3 = {v: k for k, v in AA_3TO1.items()}

VALID_AA_1 = set(AA_1TO3.keys())  # {'A','R','N', ... ,'*'}
