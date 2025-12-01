"""
Sequence Alignment Algorithms - Pure Python
Implements Needleman-Wunsch (global) and Smith-Waterman (local) alignment
"""

def needleman_wunsch(seq1, seq2, match_score=1, mismatch_penalty=-1, gap_penalty=-2):
    """
    Needleman-Wunsch algorithm for global sequence alignment
    
    Args:
        seq1: First DNA sequence
        seq2: Second DNA sequence
        match_score: Score for matching nucleotides
        mismatch_penalty: Penalty for mismatching nucleotides
        gap_penalty: Penalty for gaps
    
    Returns:
        tuple: (aligned_seq1, aligned_seq2, score)
    """
    seq1 = seq1.upper()
    seq2 = seq2.upper()
    
    n, m = len(seq1), len(seq2)
    
    # Initialize scoring matrix
    score_matrix = [[0 for _ in range(m + 1)] for _ in range(n + 1)]
    
    # Initialize first row and column
    for i in range(n + 1):
        score_matrix[i][0] = gap_penalty * i
    for j in range(m + 1):
        score_matrix[0][j] = gap_penalty * j
    
    # Fill the scoring matrix
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            match = score_matrix[i-1][j-1] + (match_score if seq1[i-1] == seq2[j-1] else mismatch_penalty)
            delete = score_matrix[i-1][j] + gap_penalty
            insert = score_matrix[i][j-1] + gap_penalty
            score_matrix[i][j] = max(match, delete, insert)
    
    # Traceback
    align1, align2 = '', ''
    i, j = n, m
    
    while i > 0 or j > 0:
        current_score = score_matrix[i][j]
        
        if i > 0 and j > 0 and current_score == score_matrix[i-1][j-1] + (match_score if seq1[i-1] == seq2[j-1] else mismatch_penalty):
            align1 = seq1[i-1] + align1
            align2 = seq2[j-1] + align2
            i -= 1
            j -= 1
        elif i > 0 and current_score == score_matrix[i-1][j] + gap_penalty:
            align1 = seq1[i-1] + align1
            align2 = '-' + align2
            i -= 1
        else:
            align1 = '-' + align1
            align2 = seq2[j-1] + align2
            j -= 1
    
    final_score = score_matrix[n][m]
    return align1, align2, int(final_score)


def smith_waterman(seq1, seq2, match_score=2, mismatch_penalty=-1, gap_penalty=-1):
    """
    Smith-Waterman algorithm for local sequence alignment
    
    Args:
        seq1: First DNA sequence
        seq2: Second DNA sequence
        match_score: Score for matching nucleotides
        mismatch_penalty: Penalty for mismatching nucleotides
        gap_penalty: Penalty for gaps
    
    Returns:
        tuple: (aligned_seq1, aligned_seq2, score)
    """
    seq1 = seq1.upper()
    seq2 = seq2.upper()
    
    n, m = len(seq1), len(seq2)
    
    # Initialize scoring matrix
    score_matrix = [[0 for _ in range(m + 1)] for _ in range(n + 1)]
    max_score = 0
    max_pos = (0, 0)
    
    # Fill the scoring matrix
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            match = score_matrix[i-1][j-1] + (match_score if seq1[i-1] == seq2[j-1] else mismatch_penalty)
            delete = score_matrix[i-1][j] + gap_penalty
            insert = score_matrix[i][j-1] + gap_penalty
            score_matrix[i][j] = max(0, match, delete, insert)
            
            if score_matrix[i][j] > max_score:
                max_score = score_matrix[i][j]
                max_pos = (i, j)
    
    # Traceback
    align1, align2 = '', ''
    i, j = max_pos
    
    while i > 0 and j > 0 and score_matrix[i][j] > 0:
        current_score = score_matrix[i][j]
        
        if current_score == score_matrix[i-1][j-1] + (match_score if seq1[i-1] == seq2[j-1] else mismatch_penalty):
            align1 = seq1[i-1] + align1
            align2 = seq2[j-1] + align2
            i -= 1
            j -= 1
        elif current_score == score_matrix[i-1][j] + gap_penalty:
            align1 = seq1[i-1] + align1
            align2 = '-' + align2
            i -= 1
        else:
            align1 = '-' + align1
            align2 = seq2[j-1] + align2
            j -= 1
    
    return align1, align2, int(max_score)


def calculate_alignment_stats(align1, align2):
    """
    Calculate alignment statistics
    
    Args:
        align1: Aligned first sequence
        align2: Aligned second sequence
    
    Returns:
        dict: Alignment statistics
    """
    matches = sum(1 for a, b in zip(align1, align2) if a == b and a != '-')
    mismatches = sum(1 for a, b in zip(align1, align2) if a != b and a != '-' and b != '-')
    gaps = sum(1 for a, b in zip(align1, align2) if a == '-' or b == '-')
    length = len(align1)
    
    similarity = (matches / length * 100) if length > 0 else 0
    
    return {
        'matches': matches,
        'mismatches': mismatches,
        'gaps': gaps,
        'length': length,
        'similarity_percentage': round(similarity, 2)
    }