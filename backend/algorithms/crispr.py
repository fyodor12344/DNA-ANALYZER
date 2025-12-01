"""
CRISPR PAM Site Finder
Identifies Cas9 PAM (Protospacer Adjacent Motif) sites in DNA sequences
"""

import re


def reverse_complement(seq):
    """Get reverse complement of DNA sequence"""
    complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
    return ''.join(complement.get(base, base) for base in reversed(seq))


def calculate_gc_content(seq):
    """Calculate GC content percentage"""
    if len(seq) == 0:
        return 0
    gc_count = seq.count('G') + seq.count('C')
    return round((gc_count / len(seq)) * 100, 2)


def evaluate_target_efficiency(guide_rna):
    """
    Evaluate target efficiency based on guide RNA characteristics
    Simple heuristic based on GC content and sequence features
    """
    if not guide_rna:
        return 'Low'
    
    gc_content = calculate_gc_content(guide_rna)
    
    # Check for poly-T stretch (avoid)
    has_poly_t = 'TTTT' in guide_rna
    
    # Optimal GC content is 40-60%
    if 40 <= gc_content <= 60 and not has_poly_t:
        return 'High'
    elif 30 <= gc_content <= 70 and not has_poly_t:
        return 'Medium'
    else:
        return 'Low'


def find_pam_sites(sequence, pam_pattern='NGG', guide_length=20):
    """
    Find PAM sites in DNA sequence
    
    Args:
        sequence: DNA sequence to search
        pam_pattern: PAM pattern (default: NGG for SpCas9)
        guide_length: Length of guide RNA (default: 20)
    
    Returns:
        dict: PAM sites analysis results
    """
    sequence = sequence.upper()
    sites = []
    
    # Convert PAM pattern to regex (N = any nucleotide)
    pam_regex = pam_pattern.replace('N', '[ATGC]')
    
    # Find PAM sites on forward strand
    for match in re.finditer(pam_regex, sequence):
        pam_pos = match.start()
        pam_seq = match.group()
        
        # Extract guide RNA sequence (20 bp upstream of PAM)
        guide_start = max(0, pam_pos - guide_length)
        guide_rna = sequence[guide_start:pam_pos] if pam_pos >= guide_length else None
        
        # Get context (10 bp on each side)
        context_start = max(0, pam_pos - 10)
        context_end = min(len(sequence), pam_pos + len(pam_seq) + 10)
        context = sequence[context_start:context_end]
        
        efficiency = evaluate_target_efficiency(guide_rna) if guide_rna else 'Low'
        
        sites.append({
            'position': pam_pos + 1,  # 1-indexed
            'pam_sequence': pam_seq,
            'strand': 'forward',
            'guide_rna': guide_rna,
            'guide_length': len(guide_rna) if guide_rna else 0,
            'target_efficiency': efficiency,
            'context': context
        })
    
    # Find PAM sites on reverse strand
    rev_comp = reverse_complement(sequence)
    for match in re.finditer(pam_regex, rev_comp):
        pam_pos = match.start()
        pam_seq = match.group()
        
        # Calculate position in original sequence
        original_pos = len(sequence) - pam_pos - len(pam_seq)
        
        # Extract guide RNA sequence
        guide_start = max(0, pam_pos - guide_length)
        guide_rna = rev_comp[guide_start:pam_pos] if pam_pos >= guide_length else None
        
        # Get context
        context_start = max(0, pam_pos - 10)
        context_end = min(len(rev_comp), pam_pos + len(pam_seq) + 10)
        context = rev_comp[context_start:context_end]
        
        efficiency = evaluate_target_efficiency(guide_rna) if guide_rna else 'Low'
        
        sites.append({
            'position': original_pos + 1,  # 1-indexed
            'pam_sequence': pam_seq,
            'strand': 'reverse',
            'guide_rna': guide_rna,
            'guide_length': len(guide_rna) if guide_rna else 0,
            'target_efficiency': efficiency,
            'context': context
        })
    
    # Sort sites by position
    sites.sort(key=lambda x: x['position'])
    
    # Count sites by strand
    forward_sites = sum(1 for site in sites if site['strand'] == 'forward')
    reverse_sites = sum(1 for site in sites if site['strand'] == 'reverse')
    
    return {
        'total_sites': len(sites),
        'forward_strand_sites': forward_sites,
        'reverse_strand_sites': reverse_sites,
        'sites': sites
    }