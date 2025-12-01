"""
Mutation and SNP Finder
Identifies single nucleotide polymorphisms and other mutations between sequences
"""

def translate_codon(codon):
    """Translate a DNA codon to amino acid"""
    codon_table = {
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
        'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
    }
    return codon_table.get(codon.upper(), 'X')


def classify_mutation(ref_codon, alt_codon):
    """Classify mutation as silent, missense, or nonsense"""
    if len(ref_codon) != 3 or len(alt_codon) != 3:
        return 'Unknown'
    
    ref_aa = translate_codon(ref_codon)
    alt_aa = translate_codon(alt_codon)
    
    if ref_aa == alt_aa:
        return 'Silent'
    elif alt_aa == '*':
        return 'Nonsense'
    else:
        return 'Missense'


def find_mutations(seq1, seq2):
    """
    Find mutations between two DNA sequences
    
    Args:
        seq1: Reference DNA sequence
        seq2: Alternate DNA sequence
    
    Returns:
        dict: Mutation analysis results
    """
    seq1 = seq1.upper()
    seq2 = seq2.upper()
    
    mutations = []
    snps = 0
    insertions = 0
    deletions = 0
    silent = 0
    missense = 0
    nonsense = 0
    
    # Handle different length sequences
    max_len = max(len(seq1), len(seq2))
    seq1_padded = seq1 + '-' * (max_len - len(seq1))
    seq2_padded = seq2 + '-' * (max_len - len(seq2))
    
    i = 0
    while i < max_len:
        if seq1_padded[i] != seq2_padded[i]:
            # Check for SNP (single nucleotide polymorphism)
            if seq1_padded[i] != '-' and seq2_padded[i] != '-':
                # Get codon context if possible
                codon_pos = (i // 3) * 3
                if codon_pos + 2 < max_len:
                    ref_codon = seq1_padded[codon_pos:codon_pos+3]
                    alt_codon = seq2_padded[codon_pos:codon_pos+3]
                    
                    if '-' not in ref_codon and '-' not in alt_codon:
                        classification = classify_mutation(ref_codon, alt_codon)
                        
                        if classification == 'Silent':
                            silent += 1
                        elif classification == 'Missense':
                            missense += 1
                        elif classification == 'Nonsense':
                            nonsense += 1
                    else:
                        classification = 'Unknown'
                else:
                    classification = 'Unknown'
                
                mutations.append({
                    'position': i + 1,
                    'type': 'SNP',
                    'reference': seq1_padded[i],
                    'alternate': seq2_padded[i],
                    'mutation_class': classification
                })
                snps += 1
                i += 1
            
            # Check for insertion
            elif seq1_padded[i] == '-':
                insert_end = i
                while insert_end < max_len and seq1_padded[insert_end] == '-':
                    insert_end += 1
                
                mutations.append({
                    'position': i + 1,
                    'type': 'Insertion',
                    'inserted_sequence': seq2_padded[i:insert_end],
                    'mutation_class': 'Frameshift'
                })
                insertions += 1
                i = insert_end
            
            # Check for deletion
            elif seq2_padded[i] == '-':
                delete_end = i
                while delete_end < max_len and seq2_padded[delete_end] == '-':
                    delete_end += 1
                
                mutations.append({
                    'position': i + 1,
                    'type': 'Deletion',
                    'deleted_sequence': seq1_padded[i:delete_end],
                    'mutation_class': 'Frameshift'
                })
                deletions += 1
                i = delete_end
        else:
            i += 1
    
    return {
        'summary': {
            'total_mutations': len(mutations),
            'snps': snps,
            'insertions': insertions,
            'deletions': deletions,
            'silent_mutations': silent,
            'missense_mutations': missense,
            'nonsense_mutations': nonsense
        },
        'mutations': mutations
    }
