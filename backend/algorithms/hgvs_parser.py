"""
HGVS Parser & Mutation Normalizer
==================================
Clean module for parsing HGVS variant notation in Cancer Intelligence Mode
and normalizing every variant into a unified mutation dictionary that can
be consumed by the 3D engine, domain mapper, and scoring engine.

Supported notations
-------------------
  Protein-level (p.)
    - Missense     : p.R175H, p.Arg175His, R175H
    - Nonsense     : p.R248*, p.Arg248Ter
    - In-frame del : p.E746_A750del

  cDNA-level (c.)  — single nucleotide substitutions only
    - c.524G>A     — converted to protein via stored canonical CDS

NOT supported
-------------
  - g. (genomic) notation
  - Intronic variants (c.1234+5G>A)
  - Large cDNA-level deletions / insertions
  - Copy number variants

Output format (unified mutation dict)
--------------------------------------
  {
      "gene":          "TP53",
      "aa_position":   175,
      "ref_aa":        "R",
      "alt_aa":        "H",
      "mutation_type": "missense",
      "hgvs_input":    "R175H",
      "hgvs_p":        "p.R175H"
  }
"""

import re
from algorithms.reference_sequences import (
    REFERENCE_SEQUENCES,
    GENE_META,
    AA_3TO1,
    AA_1TO3,
    VALID_AA_1,
    CODON_TABLE,
    translate_codon,
)


# ═══════════════════════════════════════════════════════════════════════════════
#  PUBLIC API
# ═══════════════════════════════════════════════════════════════════════════════

def parse_hgvs(gene_name: str, hgvs_string: str) -> dict:
    """
    Main entry point.  Detect whether the input is p. or c. notation
    and route to the appropriate parser.

    Returns a unified mutation dict or raises ValueError on bad input.
    """
    if not hgvs_string or not isinstance(hgvs_string, str):
        raise ValueError("Empty or invalid HGVS string")

    gene_name = gene_name.upper().strip()
    raw = hgvs_string.strip()

    # ── Detect c. notation ────────────────────────────────────────────────
    if raw.lower().startswith('c.'):
        return parse_cdna_hgvs(gene_name, raw)

    # ── Detect p. notation (or bare shorthand like R175H) ─────────────────
    cleaned = re.sub(r'^p\.?', '', raw, flags=re.IGNORECASE)
    return _parse_protein_cleaned(gene_name, cleaned, raw)


# ═══════════════════════════════════════════════════════════════════════════════
#  PROTEIN HGVS  (p.)
# ═══════════════════════════════════════════════════════════════════════════════

def parse_protein_hgvs(hgvs_string: str) -> dict:
    """
    Parse a protein-level HGVS string without a gene context.
    Returns the raw parsed dict (gene field will be empty).
    """
    raw = hgvs_string.strip()
    cleaned = re.sub(r'^p\.?', '', raw, flags=re.IGNORECASE)
    return _parse_protein_cleaned('', cleaned, raw)


def _parse_protein_cleaned(gene: str, cleaned: str, raw_input: str) -> dict:
    """
    Internal dispatcher for protein-level HGVS after stripping 'p.'.
    Handles:
      1) Single-letter missense / nonsense:  R175H, R248*
      2) Three-letter missense / nonsense:   Arg175His, Arg248Ter
      3) In-frame deletion range:            E746_A750del
    """

    # ── 1. Single-letter: R175H / R248* ───────────────────────────────────
    m = re.match(r'^([A-Z])(\d+)([A-Z*])$', cleaned, re.IGNORECASE)
    if m:
        ref = m.group(1).upper()
        pos = int(m.group(2))
        alt = m.group(3).upper()

        _validate_aa(ref)
        if alt != '*':
            _validate_aa(alt)

        return _build_mutation(gene, pos, ref, alt, raw_input)

    # ── 2. Three-letter: Arg175His / Arg248Ter ────────────────────────────
    m = re.match(r'^([A-Z][a-z]{2})(\d+)([A-Z][a-z]{2}|\*)$', cleaned)
    if m:
        ref = _three_to_one(m.group(1))
        pos = int(m.group(2))
        alt = '*' if m.group(3) == '*' else _three_to_one(m.group(3))
        return _build_mutation(gene, pos, ref, alt, raw_input)

    # ── 3. In-frame deletion: E746_A750del ────────────────────────────────
    m = re.match(
        r'^([A-Z]|[A-Z][a-z]{2})(\d+)_([A-Z]|[A-Z][a-z]{2})(\d+)del$',
        cleaned, re.IGNORECASE,
    )
    if m:
        ref_start_aa = m.group(1)
        start_pos = int(m.group(2))
        ref_end_aa = m.group(3)
        end_pos = int(m.group(4))

        # Convert three-letter codes if needed
        if len(ref_start_aa) == 3:
            ref_start_aa = _three_to_one(ref_start_aa)
        else:
            ref_start_aa = ref_start_aa.upper()
        if len(ref_end_aa) == 3:
            ref_end_aa = _three_to_one(ref_end_aa)
        else:
            ref_end_aa = ref_end_aa.upper()

        if start_pos > end_pos:
            raise ValueError(f"Invalid deletion range: {start_pos} > {end_pos}")

        del_length = end_pos - start_pos + 1
        hgvs_p = f"p.{ref_start_aa}{start_pos}_{ref_end_aa}{end_pos}del"

        return {
            'gene': gene,
            'aa_position': start_pos,
            'aa_end_position': end_pos,
            'ref_aa': ref_start_aa,
            'alt_aa': 'del',
            'mutation_type': 'deletion',
            'deletion_length': del_length,
            'hgvs_input': raw_input,
            'hgvs_p': hgvs_p,
            'valid': True,
        }

    raise ValueError(
        f"Cannot parse protein HGVS: '{raw_input}'. "
        "Expected format like R175H, p.Arg175His, or p.E746_A750del"
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  cDNA HGVS  (c.)  —  single nucleotide substitutions only
# ═══════════════════════════════════════════════════════════════════════════════

def parse_cdna_hgvs(gene_name: str, hgvs_string: str) -> dict:
    """
    Parse a cDNA-level HGVS substitution (e.g. c.524G>A).
    Translates the nucleotide change to a protein-level mutation using
    the stored canonical CDS for the gene.

    Only supports simple substitutions.  Intronic, large indels,
    and complex variants will raise ValueError.
    """
    raw = hgvs_string.strip()
    body = re.sub(r'^c\.', '', raw, flags=re.IGNORECASE)

    # ── Validate no intronic notation ─────────────────────────────────────
    if '+' in body or '-' in body:
        raise ValueError(
            f"Intronic variants are not supported: '{raw}'"
        )

    # ── Match substitution pattern: 524G>A ────────────────────────────────
    m = re.match(r'^(\d+)([ATGC])>([ATGC])$', body, re.IGNORECASE)
    if not m:
        raise ValueError(
            f"Unsupported cDNA notation: '{raw}'. "
            "Only single nucleotide substitutions (e.g. c.524G>A) are supported."
        )

    pos = int(m.group(1))         # 1-based nucleotide position in CDS
    ref_nt = m.group(2).upper()
    alt_nt = m.group(3).upper()

    # ── Look up the gene's CDS ────────────────────────────────────────────
    gene = gene_name.upper()
    cds = REFERENCE_SEQUENCES.get(gene)
    if not cds:
        raise ValueError(
            f"No reference CDS stored for gene '{gene}'. "
            f"Supported genes: {', '.join(sorted(REFERENCE_SEQUENCES.keys()))}"
        )

    cds = cds.upper()

    # ── Bounds check ──────────────────────────────────────────────────────
    if pos < 1 or pos > len(cds):
        raise ValueError(
            f"Nucleotide position {pos} is out of range for {gene} CDS "
            f"(length {len(cds)})"
        )

    # ── Verify reference nucleotide ───────────────────────────────────────
    actual_ref = cds[pos - 1]
    if actual_ref != ref_nt:
        raise ValueError(
            f"Reference mismatch at c.{pos}: expected {ref_nt} but CDS has "
            f"{actual_ref}.  Double-check the transcript version."
        )

    # ── Identify codon and translate ──────────────────────────────────────
    codon_index = (pos - 1) // 3              # 0-based codon number
    codon_start = codon_index * 3             # 0-based CDS offset
    aa_position = codon_index + 1             # 1-based protein position

    if codon_start + 3 > len(cds):
        raise ValueError(
            f"Position {pos} falls in a truncated codon at the end of the "
            f"stored CDS for {gene}"
        )

    ref_codon = cds[codon_start:codon_start + 3]
    alt_codon = list(ref_codon)
    alt_codon[pos - 1 - codon_start] = alt_nt
    alt_codon = ''.join(alt_codon)

    ref_aa = translate_codon(ref_codon)
    alt_aa = translate_codon(alt_codon)

    # ── Build unified output ──────────────────────────────────────────────
    if ref_aa == alt_aa:
        mut_type = 'silent'
    elif alt_aa == '*':
        mut_type = 'nonsense'
    else:
        mut_type = 'missense'

    hgvs_p = f"p.{ref_aa}{aa_position}{alt_aa}"

    return {
        'gene': gene,
        'aa_position': aa_position,
        'ref_aa': ref_aa,
        'alt_aa': alt_aa,
        'mutation_type': mut_type,
        'hgvs_input': raw,
        'hgvs_p': hgvs_p,
        'cdna_position': pos,
        'ref_codon': ref_codon,
        'alt_codon': alt_codon,
        'valid': True,
    }


# ═══════════════════════════════════════════════════════════════════════════════
#  PRIVATE HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def _validate_aa(aa: str) -> None:
    """Raise if the single-letter code is not a standard amino acid."""
    if aa not in VALID_AA_1:
        raise ValueError(f"'{aa}' is not a valid single-letter amino acid code")


def _three_to_one(three: str) -> str:
    """Convert a three-letter amino acid code to single-letter."""
    key = three[0].upper() + three[1:].lower()
    aa = AA_3TO1.get(key)
    if aa is None:
        raise ValueError(f"Unknown three-letter amino acid code: '{three}'")
    return aa


def _classify(ref_aa: str, alt_aa: str) -> str:
    """Classify a missense / nonsense / silent substitution."""
    if ref_aa == alt_aa:
        return 'silent'
    if alt_aa == '*':
        return 'nonsense'
    return 'missense'


def _build_mutation(gene: str, pos: int, ref: str, alt: str,
                    raw_input: str) -> dict:
    """Construct the unified mutation dictionary for a point substitution."""
    if pos <= 0:
        raise ValueError(f"Amino acid position must be positive, got {pos}")

    mut_type = _classify(ref, alt)
    hgvs_p = f"p.{ref}{pos}{alt}"

    return {
        'gene': gene,
        'aa_position': pos,
        'ref_aa': ref,
        'alt_aa': alt,
        'mutation_type': mut_type,
        'hgvs_input': raw_input,
        'hgvs_p': hgvs_p,
        'valid': True,
    }
