"""
Enhanced PCR Primer Designer with Advanced Analysis
Includes nearest-neighbor Tm, hairpin detection, dimer analysis, and protocol suggestions
"""

import math

# Nearest-neighbor thermodynamic parameters (SantaLucia 1998)
NN_PARAMS = {
    'AA': {'dH': -7.9, 'dS': -22.2}, 
    'TT': {'dH': -7.9, 'dS': -22.2},
    'AT': {'dH': -7.2, 'dS': -20.4}, 
    'TA': {'dH': -7.2, 'dS': -21.3},
    'CA': {'dH': -8.5, 'dS': -22.7}, 
    'TG': {'dH': -8.5, 'dS': -22.7},
    'GT': {'dH': -8.4, 'dS': -22.4}, 
    'AC': {'dH': -8.4, 'dS': -22.4},
    'CT': {'dH': -7.8, 'dS': -21.0}, 
    'AG': {'dH': -7.8, 'dS': -21.0},
    'GA': {'dH': -8.2, 'dS': -22.2}, 
    'TC': {'dH': -8.2, 'dS': -22.2},
    'CG': {'dH': -10.6, 'dS': -27.2}, 
    'GC': {'dH': -9.8, 'dS': -24.4},
    'GG': {'dH': -8.0, 'dS': -19.9}, 
    'CC': {'dH': -8.0, 'dS': -19.9}
}


def reverse_complement(seq):
    """Get reverse complement of DNA sequence"""
    complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
    return ''.join(complement.get(base, base) for base in reversed(seq))


def calculate_tm_nearest_neighbor(seq, primer_conc=0.5, salt_conc=50):
    """
    Calculate Tm using nearest-neighbor thermodynamics (more accurate)
    
    Args:
        seq: DNA sequence
        primer_conc: Primer concentration in µM (default 0.5)
        salt_conc: Salt concentration in mM (default 50)
    
    Returns:
        float: Melting temperature in °C
    """
    seq = seq.upper()
    
    if len(seq) < 14:
        # Wallace rule for very short primers
        a_t = seq.count('A') + seq.count('T')
        g_c = seq.count('G') + seq.count('C')
        return 2 * a_t + 4 * g_c
    
    # Sum nearest-neighbor contributions
    dH = 0  # Enthalpy (kcal/mol)
    dS = 0  # Entropy (cal/mol·K)
    
    # Initial values for terminal base pairs
    dH += 0.2  # Initiation
    dS += -5.7
    
    # Sum all dinucleotide steps
    for i in range(len(seq) - 1):
        dinuc = seq[i:i+2]
        if dinuc in NN_PARAMS:
            dH += NN_PARAMS[dinuc]['dH']
            dS += NN_PARAMS[dinuc]['dS']
    
    # Salt correction
    dS += 0.368 * (len(seq) - 1) * math.log(salt_conc / 1000)
    
    # Tm calculation
    R = 1.987  # Gas constant (cal/mol·K)
    primer_conc_M = primer_conc * 1e-6
    
    tm = (1000 * dH) / (dS + R * math.log(primer_conc_M / 4)) - 273.15
    
    return round(tm, 1)


def calculate_gc_content(seq):
    """Calculate GC content percentage"""
    if len(seq) == 0:
        return 0
    gc_count = seq.count('G') + seq.count('C')
    return round((gc_count / len(seq)) * 100, 1)


def check_hairpin(seq, threshold=-3.0):
    """
    Check for hairpin formation potential
    
    Returns:
        dict: Hairpin analysis with max_stem_length and estimated_dG
    """
    seq = seq.upper()
    rev_comp = reverse_complement(seq)
    
    max_stem = 0
    best_position = -1
    
    # Check for complementary regions
    for i in range(len(seq) - 3):
        for j in range(len(seq) - 3):
            stem_length = 0
            k = 0
            while (i + k < len(seq) and j + k < len(seq) and 
                   seq[i + k] == rev_comp[j + k]):
                stem_length += 1
                k += 1
            
            if stem_length > max_stem:
                max_stem = stem_length
                best_position = i
    
    # Estimate free energy (rough approximation)
    estimated_dG = -1.5 * max_stem if max_stem >= 4 else 0
    
    has_hairpin = estimated_dG < threshold
    
    return {
        'has_hairpin': has_hairpin,
        'max_stem_length': max_stem,
        'estimated_dG': round(estimated_dG, 1),
        'risk_level': 'high' if estimated_dG < -5 else ('medium' if estimated_dG < -3 else 'low')
    }


def check_primer_dimers(fwd_seq, rev_seq, threshold=-5.0):
    """
    Check for primer dimer formation between forward and reverse primers
    
    Returns:
        dict: Dimer analysis
    """
    fwd = fwd_seq.upper()
    rev = rev_seq.upper()
    rev_comp_rev = reverse_complement(rev)
    
    # Check 3' end complementarity (most critical)
    end_length = min(6, len(fwd), len(rev))
    fwd_3_end = fwd[-end_length:]
    rev_3_end = rev[-end_length:]
    
    # Count complementary bases at 3' ends
    complement = {'A': 'T', 'T': 'A', 'G': 'C', 'C': 'G'}
    complementarity = 0
    for i in range(end_length):
        if fwd_3_end[i] == complement.get(rev_3_end[end_length-1-i], ''):
            complementarity += 1
    
    # Check overall complementarity
    max_complement = 0
    for i in range(len(fwd) - 3):
        for j in range(len(rev_comp_rev) - 3):
            count = 0
            k = 0
            while (i + k < len(fwd) and j + k < len(rev_comp_rev) and
                   fwd[i + k] == rev_comp_rev[j + k]):
                count += 1
                k += 1
            max_complement = max(max_complement, count)
    
    # Estimate dimer formation energy
    estimated_dG = -1.5 * max_complement
    
    has_dimer = estimated_dG < threshold or complementarity >= 4
    
    return {
        'has_dimer_risk': has_dimer,
        'three_prime_complementarity': complementarity,
        'max_complementarity': max_complement,
        'estimated_dG': round(estimated_dG, 1),
        'risk_level': 'high' if estimated_dG < -7 else ('medium' if estimated_dG < -5 else 'low')
    }


def check_gc_clamp(seq):
    """Check for proper GC clamp at 3' end"""
    if len(seq) < 5:
        return {'has_clamp': False, 'gc_in_last_5': 0, 'is_optimal': False}
    
    last_5 = seq[-5:].upper()
    gc_count = last_5.count('G') + last_5.count('C')
    has_clamp = seq[-1] in ['G', 'C']
    
    return {
        'has_clamp': has_clamp,
        'gc_in_last_5': gc_count,
        'is_optimal': 2 <= gc_count <= 3 and has_clamp
    }


def evaluate_primer_quality(primer_seq, tm, hairpin_data=None, gc_clamp_data=None):
    """
    Enhanced primer quality evaluation
    
    Returns:
        tuple: (quality_grade, quality_score, issues, warnings)
    """
    issues = []
    warnings = []
    score = 100
    
    primer_seq = primer_seq.upper()
    length = len(primer_seq)
    
    # Length check (optimal: 18-25 bp)
    if length < 18:
        issues.append("Primer too short (< 18 bp) - may lack specificity")
        score -= 20
    elif length < 20:
        warnings.append("Primer slightly short - consider 20-25 bp")
        score -= 5
    elif length > 25:
        issues.append("Primer too long (> 25 bp) - may reduce efficiency")
        score -= 10
    
    # Tm check (optimal: 55-65°C)
    if tm < 52:
        issues.append(f"Tm too low ({tm}°C) - reduce annealing temperature")
        score -= 20
    elif tm < 55:
        warnings.append(f"Tm slightly low ({tm}°C) - optimal is 55-65°C")
        score -= 10
    elif tm > 68:
        issues.append(f"Tm too high ({tm}°C) - may cause non-specific binding")
        score -= 15
    elif tm > 65:
        warnings.append(f"Tm slightly high ({tm}°C)")
        score -= 5
    
    # GC content check (optimal: 40-60%)
    gc = calculate_gc_content(primer_seq)
    if gc < 35:
        issues.append(f"GC content too low ({gc}%) - poor stability")
        score -= 20
    elif gc < 40:
        warnings.append(f"GC content slightly low ({gc}%)")
        score -= 10
    elif gc > 65:
        issues.append(f"GC content too high ({gc}%) - strong secondary structures")
        score -= 20
    elif gc > 60:
        warnings.append(f"GC content slightly high ({gc}%)")
        score -= 10
    
    # GC clamp check
    if gc_clamp_data:
        if not gc_clamp_data['has_clamp']:
            warnings.append("No GC clamp at 3' end - consider redesigning")
            score -= 10
        if not gc_clamp_data['is_optimal']:
            if gc_clamp_data['gc_in_last_5'] < 2:
                warnings.append("Weak 3' end stability")
                score -= 5
            elif gc_clamp_data['gc_in_last_5'] > 3:
                warnings.append("Too many G/C at 3' end - may cause mispriming")
                score -= 5
    
    # Check for runs of same nucleotide (poly-X)
    for base in ['A', 'T', 'G', 'C']:
        if base * 4 in primer_seq:
            issues.append(f"Contains poly-{base} run (≥4) - avoid!")
            score -= 20
            break
        elif base * 3 in primer_seq:
            warnings.append(f"Contains {base*3} - may cause issues")
            score -= 5
    
    # Hairpin check
    if hairpin_data:
        if hairpin_data['risk_level'] == 'high':
            issues.append(f"High hairpin risk (stem: {hairpin_data['max_stem_length']} bp)")
            score -= 20
        elif hairpin_data['risk_level'] == 'medium':
            warnings.append(f"Moderate hairpin risk")
            score -= 10
    
    # Check for self-complementarity at 3' end
    if len(primer_seq) >= 6:
        end_3 = primer_seq[-6:]
        rev_comp = reverse_complement(primer_seq)
        if end_3 in rev_comp:
            warnings.append("Possible 3' self-complementarity")
            score -= 10
    
    score = max(0, score)
    
    if score >= 85:
        grade = "Excellent"
    elif score >= 70:
        grade = "Good"
    elif score >= 55:
        grade = "Fair"
    else:
        grade = "Poor"
    
    return grade, score, issues, warnings


def suggest_pcr_protocol(fwd_primer, rev_primer, product_size):
    """
    Generate PCR protocol recommendations
    
    Returns:
        dict: Protocol parameters
    """
    avg_tm = (fwd_primer['tm'] + rev_primer['tm']) / 2
    
    # Annealing temperature (typically Tm - 5°C)
    annealing_temp = round(avg_tm - 5, 1)
    
    # Extension time (1 min per kb, minimum 30s)
    extension_time = max(30, math.ceil(product_size / 1000) * 60)
    
    # Cycle recommendation
    cycles = 30 if product_size < 1000 else 35
    
    # Polymerase recommendation
    if product_size < 500:
        polymerase = "Standard Taq (or high-fidelity for cloning)"
    elif product_size < 3000:
        polymerase = "High-fidelity polymerase recommended"
    else:
        polymerase = "High-fidelity with long-range capability"
    
    # Notes
    notes = []
    if product_size < 200:
        notes.append("Short amplicon - reduce extension time to 15-30s")
    if avg_tm < 55:
        notes.append("Low Tm - consider touchdown PCR (start at 60°C, -0.5°C/cycle)")
    if fwd_primer.get('issues') or rev_primer.get('issues'):
        notes.append("Primer quality concerns - optimize if poor results")
    
    return {
        'annealing_temp': annealing_temp,
        'annealing_range': [annealing_temp - 2, annealing_temp + 3],
        'extension_time': extension_time,
        'cycles': cycles,
        'polymerase': polymerase,
        'denaturation': {'temp': 95, 'time': 30},
        'final_extension': {'temp': 72, 'time': 300},
        'notes': notes
    }


def design_primers(sequence, target_tm=60, primer_length=20, product_size_range=(200, 500)):
    """
    Enhanced primer design with advanced analysis
    Handles both long and short sequences automatically
    """
    sequence = sequence.upper()
    min_size, max_size = product_size_range
    seq_length = len(sequence)
    
    # === AUTO-ADJUST FOR SHORT SEQUENCES ===
    if seq_length < 150:
        # Calculate realistic product size range for short sequences
        adjusted_min = primer_length * 2 + 10
        adjusted_max = seq_length - primer_length - 5
        
        if adjusted_max > adjusted_min:
            min_size = adjusted_min
            max_size = adjusted_max
            print(f"Short sequence detected ({seq_length} bp). Adjusted product size: {min_size}-{max_size} bp")
        else:
            print(f"Sequence too short ({seq_length} bp) for reliable primer design")
            return {
                'forward_primer': None,
                'reverse_primer': None,
                'expected_product_size': 0,
                'tm_difference': 0,
                'dimer_analysis': None,
                'pcr_protocol': None,
                'all_candidates': []
            }
    
    # === FIND FORWARD PRIMERS ===
    forward_candidates = []
    search_end_fwd = min(100, int(seq_length * 0.3), seq_length - primer_length - 20)
    
    for i in range(0, search_end_fwd):
        if i + primer_length > seq_length:
            break
            
        primer_seq = sequence[i:i + primer_length]
        if len(primer_seq) < primer_length:
            continue
            
        tm = calculate_tm_nearest_neighbor(primer_seq)
        hairpin = check_hairpin(primer_seq)
        gc_clamp = check_gc_clamp(primer_seq)
        grade, score, issues, warnings = evaluate_primer_quality(primer_seq, tm, hairpin, gc_clamp)
        
        forward_candidates.append({
            'sequence': primer_seq,
            'position': i,
            'length': len(primer_seq),
            'tm': tm,
            'gc_content': calculate_gc_content(primer_seq),
            'quality_grade': grade,
            'quality_score': score,
            'issues': issues,
            'warnings': warnings,
            'hairpin': hairpin,
            'gc_clamp': gc_clamp,
            'type': 'Forward'
        })
    
    if not forward_candidates:
        print("No forward primer candidates found")
        return {
            'forward_primer': None,
            'reverse_primer': None,
            'expected_product_size': 0,
            'tm_difference': 0,
            'dimer_analysis': None,
            'pcr_protocol': None,
            'all_candidates': []
        }
    
    forward_candidates.sort(key=lambda x: x['quality_score'], reverse=True)
    best_forward = forward_candidates[0]
    
    # === FIND REVERSE PRIMERS ===
    reverse_candidates = []
    search_start_rev = max(
        best_forward['position'] + min_size,
        int(seq_length * 0.5)
    )
    search_end_rev = seq_length - primer_length
    
    for i in range(search_start_rev, search_end_rev + 1):
        if i + primer_length > seq_length:
            break
            
        primer_region = sequence[i:i + primer_length]
        if len(primer_region) < primer_length:
            continue
            
        primer_seq = reverse_complement(primer_region)
        tm = calculate_tm_nearest_neighbor(primer_seq)
        hairpin = check_hairpin(primer_seq)
        gc_clamp = check_gc_clamp(primer_seq)
        grade, score, issues, warnings = evaluate_primer_quality(primer_seq, tm, hairpin, gc_clamp)
        
        expected_size = i - best_forward['position'] + primer_length
        
        if min_size <= expected_size <= max_size:
            reverse_candidates.append({
                'sequence': primer_seq,
                'position': i,
                'length': len(primer_seq),
                'tm': tm,
                'gc_content': calculate_gc_content(primer_seq),
                'quality_grade': grade,
                'quality_score': score,
                'issues': issues,
                'warnings': warnings,
                'hairpin': hairpin,
                'gc_clamp': gc_clamp,
                'type': 'Reverse',
                'expected_product': expected_size
            })
    
    if not reverse_candidates:
        print(f"No reverse primer candidates found")
        return {
            'forward_primer': best_forward,
            'reverse_primer': None,
            'expected_product_size': 0,
            'tm_difference': 0,
            'dimer_analysis': None,
            'pcr_protocol': None,
            'all_candidates': forward_candidates[:5]
        }
    
    reverse_candidates.sort(
        key=lambda x: (x['quality_score'], -abs(x['tm'] - best_forward['tm'])),
        reverse=True
    )
    best_reverse = reverse_candidates[0]
    
    # === ANALYZE PRIMER PAIR ===
    expected_size = best_reverse['position'] - best_forward['position'] + primer_length
    tm_diff = abs(best_forward['tm'] - best_reverse['tm'])
    dimer_analysis = check_primer_dimers(best_forward['sequence'], best_reverse['sequence'])
    protocol = suggest_pcr_protocol(best_forward, best_reverse, expected_size)
    
    all_candidates = forward_candidates[:5] + reverse_candidates[:5]
    
    print(f"✓ Found primers: Forward at {best_forward['position']}, Reverse at {best_reverse['position']}")
    print(f"✓ Expected product: {expected_size} bp, Tm diff: {tm_diff:.1f}°C")
    
    return {
        'forward_primer': best_forward,
        'reverse_primer': best_reverse,
        'expected_product_size': expected_size,
        'tm_difference': tm_diff,
        'dimer_analysis': dimer_analysis,
        'pcr_protocol': protocol,
        'all_candidates': all_candidates
    }


# Test function
if __name__ == "__main__":
    test_seq = "ATGCTAGGATCGTACCTTGATCGGAATTCGATCGTACGATTAAGCTAGCTTGCTAGCTAGCTAGCTAGCTAGCTAGCT"
    print("Testing PCR Primer Designer...")
    print(f"Input sequence: {test_seq}")
    print(f"Length: {len(test_seq)} bp\n")
    
    results = design_primers(test_seq)
    
    if results['forward_primer']:
        print(f"Forward: {results['forward_primer']['sequence']}")
        print(f"  Tm: {results['forward_primer']['tm']}°C")
        print(f"  Quality: {results['forward_primer']['quality_grade']}\n")
    
    if results['reverse_primer']:
        print(f"Reverse: {results['reverse_primer']['sequence']}")
        print(f"  Tm: {results['reverse_primer']['tm']}°C")
        print(f"  Quality: {results['reverse_primer']['quality_grade']}\n")