"""
DNA Sequence Analyzer - Flask Backend API
Provides endpoints for mutations, alignment, CRISPR, and primer design
Now with FREE AI explanations powered by Groq!
"""
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from algorithms.alignment import needleman_wunsch, smith_waterman, calculate_alignment_stats
from algorithms.mutation_finder import find_mutations
from algorithms.crispr import find_pam_sites
from algorithms.primer_design import design_primers
import requests
import os
import sys

from flask_cors import CORS

CORS(app, resources={r"/*": {"origins": "*"}})

# Load environment variables
load_dotenv()

# CRITICAL: Never hardcode API keys! Always use environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("\n" + "="*70)
    print("WARNING: GROQ_API_KEY not found in environment variables!")
    print("AI explanations will be DISABLED.")
    print("To enable AI features:")
    print("1. Create a .env file in the project root")
    print("2. Add: GROQ_API_KEY=your_actual_key_here")
    print("3. Get a free key from: https://console.groq.com")
    print("="*70 + "\n")

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# Rate limiting configuration (simple in-memory)
from collections import defaultdict
from datetime import datetime, timedelta

request_counts = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 30  # requests per minute per IP


def check_rate_limit(ip_address):
    """Simple rate limiting by IP address"""
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old requests
    request_counts[ip_address] = [
        timestamp for timestamp in request_counts[ip_address]
        if timestamp > cutoff
    ]
    
    # Check limit
    if len(request_counts[ip_address]) >= MAX_REQUESTS_PER_WINDOW:
        return False
    
    # Add current request
    request_counts[ip_address].append(now)
    return True


def validate_dna_sequence(sequence):
    """
    Validate that a sequence contains only valid DNA bases
    
    Args:
        sequence: DNA sequence string
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not sequence:
        return False, "Sequence cannot be empty"
    
    # Check length limits
    if len(sequence) > 100000:
        return False, "Sequence too long. Maximum 100,000 bp allowed."
    
    valid_bases = set('ATGCN')
    invalid_chars = set(sequence.upper()) - valid_bases
    
    if invalid_chars:
        return False, f"Invalid characters found: {', '.join(sorted(invalid_chars))}. Only A, T, G, C allowed."
    
    return True, None


@app.before_request
def before_request():
    """Apply rate limiting to all requests"""
    # Skip rate limiting for health check
    if request.endpoint == 'health':
        return None
    
    client_ip = request.remote_addr
    if not check_rate_limit(client_ip):
        return jsonify({
            'error': 'Rate limit exceeded. Maximum 30 requests per minute.'
        }), 429


@app.route('/api/mutations', methods=['POST'])
def mutations():
    """Find mutations between two DNA sequences"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        seq1 = data.get('sequence1', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        seq2 = data.get('sequence2', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not seq1 or not seq2:
            return jsonify({'error': 'Both sequences are required'}), 400
        
        is_valid1, error1 = validate_dna_sequence(seq1)
        if not is_valid1:
            return jsonify({'error': f'Sequence 1: {error1}'}), 400
        
        is_valid2, error2 = validate_dna_sequence(seq2)
        if not is_valid2:
            return jsonify({'error': f'Sequence 2: {error2}'}), 400
        
        result = find_mutations(seq1, seq2)
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in mutations endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error. Please try again.'}), 500


@app.route('/api/align', methods=['POST'])
def align():
    """Perform sequence alignment"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        seq1 = data.get('sequence1', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        seq2 = data.get('sequence2', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        algorithm = data.get('algorithm', 'global')
        
        if not seq1 or not seq2:
            return jsonify({'error': 'Both sequences are required'}), 400
        
        # Limit sequence length for alignment (computationally expensive)
        if len(seq1) > 10000 or len(seq2) > 10000:
            return jsonify({'error': 'Sequences too long for alignment. Maximum 10,000 bp.'}), 400
        
        is_valid1, error1 = validate_dna_sequence(seq1)
        if not is_valid1:
            return jsonify({'error': f'Sequence 1: {error1}'}), 400
        
        is_valid2, error2 = validate_dna_sequence(seq2)
        if not is_valid2:
            return jsonify({'error': f'Sequence 2: {error2}'}), 400
        
        if algorithm == 'global':
            align1, align2, score = needleman_wunsch(seq1, seq2)
            algorithm_name = 'Needleman-Wunsch (Global Alignment)'
        else:
            align1, align2, score = smith_waterman(seq1, seq2)
            algorithm_name = 'Smith-Waterman (Local Alignment)'
        
        stats = calculate_alignment_stats(align1, align2)
        
        result = {
            'algorithm': algorithm_name,
            'alignment1': align1,
            'alignment2': align2,
            'score': score,
            'matches': stats['matches'],
            'mismatches': stats['mismatches'],
            'gaps': stats['gaps'],
            'length': stats['length'],
            'similarity_percentage': stats['similarity_percentage']
        }
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in align endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error. Please try again.'}), 500


@app.route('/api/crispr', methods=['POST'])
def crispr():
    """Find CRISPR PAM sites"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        sequence = data.get('sequence', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not sequence:
            return jsonify({'error': 'Sequence is required'}), 400
        
        is_valid, error = validate_dna_sequence(sequence)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        result = find_pam_sites(sequence)
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in crispr endpoint: {str(e)}")
        return jsonify({'error': 'Internal server error. Please try again.'}), 500


@app.route('/api/primers', methods=['POST'])
def primers():
    """Design PCR primers with enhanced analysis"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        sequence = data.get('sequence', '').upper().replace(' ', '').replace('\n', '').replace('\r', '')
        
        if not sequence:
            return jsonify({'error': 'Sequence is required'}), 400
        
        is_valid, error = validate_dna_sequence(sequence)
        if not is_valid:
            return jsonify({'error': error}), 400
        
        if len(sequence) < 50:
            return jsonify({'error': 'Sequence too short. Minimum 50 bp required for primer design.'}), 400
        
        if len(sequence) > 50000:
            return jsonify({'error': 'Sequence too long. Maximum 50,000 bp for primer design.'}), 400
        
        target_tm = data.get('target_tm', 60)
        primer_length = data.get('primer_length', 20)
        product_size_range = data.get('product_size_range', [200, 500])
        
        if not isinstance(target_tm, (int, float)) or target_tm < 40 or target_tm > 75:
            return jsonify({'error': 'Target Tm must be between 40 and 75°C'}), 400
        
        if not isinstance(primer_length, int) or primer_length < 15 or primer_length > 30:
            return jsonify({'error': 'Primer length must be between 15 and 30 bp'}), 400
        
        if not isinstance(product_size_range, list) or len(product_size_range) != 2:
            return jsonify({'error': 'Product size range must be a list of [min, max]'}), 400
        
        min_size, max_size = product_size_range
        if min_size >= max_size or min_size < 50:
            return jsonify({'error': 'Invalid product size range. Min must be < Max and >= 50'}), 400
        
        result = design_primers(
            sequence=sequence,
            target_tm=target_tm,
            primer_length=primer_length,
            product_size_range=tuple(product_size_range)
        )
        
        if not result.get('forward_primer') or not result.get('reverse_primer'):
            return jsonify({
                'error': 'Could not find suitable primers for this sequence. Try adjusting parameters.',
                'partial_results': result
            }), 422
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in primers endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error. Please try again.'}), 500


@app.route('/api/explain', methods=['POST'])
def explain_with_ai():
    """Generate AI explanations using FREE Groq API"""
    try:
        # Check if API key is configured
        if not GROQ_API_KEY:
            return jsonify({
                'error': 'AI service not configured. Please contact the administrator.',
                'explanation': 'AI explanations are currently unavailable. The service needs to be configured with an API key.'
            }), 503
        
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        tool = data.get('tool', 'Unknown Tool')
        results = data.get('data', {})
        
        if not results:
            return jsonify({'error': 'No data provided'}), 400
        
        context = build_ai_context(tool, results)
        
        response = requests.post(
            GROQ_API_URL,
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a helpful molecular biology assistant. Explain scientific results in simple, conversational language that students and researchers can easily understand. Be practical, clear, and actionable. Keep responses concise and focused.'
                    },
                    {
                        'role': 'user',
                        'content': context
                    }
                ],
                'max_tokens': 800,
                'temperature': 0.7
            },
            timeout=30
        )
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
            print(f"Groq API error: {error_msg}")
            return jsonify({'error': f'AI service error: {error_msg}'}), response.status_code
        
        result = response.json()
        explanation = result['choices'][0]['message']['content']
        
        print(f"AI explanation generated for {tool}")
        return jsonify({'explanation': explanation})
    
    except requests.exceptions.Timeout:
        return jsonify({'error': 'AI service timeout. Please try again.'}), 504
    
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Could not connect to AI service. Check your internet connection.'}), 503
    
    except Exception as e:
        print(f"Error in AI explanation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal error processing AI request.'}), 500


def build_ai_context(tool, results):
    """Build context string for AI based on tool type"""
    
    if tool == "PCR Primer Designer":
        fwd = results.get('forward_primer', {})
        rev = results.get('reverse_primer', {})
        
        return f"""I designed PCR primers with these results:

Forward Primer:
- Sequence: {fwd.get('sequence', 'N/A')}
- Tm: {fwd.get('tm', 'N/A')}°C
- GC Content: {fwd.get('gc_content', 'N/A')}%
- Quality: {fwd.get('quality_grade', 'N/A')} ({fwd.get('quality_score', 'N/A')}/100)

Reverse Primer:
- Sequence: {rev.get('sequence', 'N/A')}
- Tm: {rev.get('tm', 'N/A')}°C
- GC Content: {rev.get('gc_content', 'N/A')}%
- Quality: {rev.get('quality_grade', 'N/A')} ({rev.get('quality_score', 'N/A')}/100)

Explain briefly: Are these primers suitable for PCR? Any concerns?"""
    
    elif tool == "Mutation Finder":
        summary = results.get('summary', {})
        mutations = results.get('mutations', [])
        
        mutation_examples = '\n'.join([
            f"  - Position {m.get('position')}: {m.get('type')} - {m.get('mutation_class', 'Unknown')}"
            for m in mutations[:5]
        ]) if mutations else "No mutations found"
        
        return f"""I compared two DNA sequences and found these mutations:

Summary:
- Total Mutations: {summary.get('total_mutations', 0)}
- SNPs: {summary.get('snps', 0)}
- Insertions: {summary.get('insertions', 0)}
- Deletions: {summary.get('deletions', 0)}
- Silent: {summary.get('silent_mutations', 0)}
- Missense: {summary.get('missense_mutations', 0)}
- Nonsense: {summary.get('nonsense_mutations', 0)}

Examples:
{mutation_examples}

Explain briefly: What do these mutations mean biologically? Any concerning patterns?"""
    
    elif tool == "CRISPR Finder":
        sites_count = results.get('total_sites', 0)
        forward = results.get('forward_strand_sites', 0)
        reverse = results.get('reverse_strand_sites', 0)
        
        return f"""I found {sites_count} CRISPR PAM sites in my DNA sequence:
- Forward strand: {forward}
- Reverse strand: {reverse}

Explain briefly: What are PAM sites and how do I choose the best one for CRISPR editing?"""
    
    elif tool == "Sequence Alignment":
        return f"""I performed sequence alignment with these results:

Algorithm: {results.get('algorithm', 'N/A')}
Score: {results.get('score', 'N/A')}
Similarity: {results.get('similarity_percentage', 'N/A')}%
- Matches: {results.get('matches', 'N/A')}
- Mismatches: {results.get('mismatches', 'N/A')}
- Gaps: {results.get('gaps', 'N/A')}

Explain briefly: What does this alignment tell me about these sequences? Are they related?"""
    
    elif tool == "DNA Sequence Analyzer":
        return f"""I analyzed a DNA sequence with these results:

Length: {results.get('length', 'N/A')} bp
GC Content: {results.get('gc_content', 'N/A')}%
AT Content: {results.get('at_content', 'N/A')}%
Tm: {results.get('tm', 'N/A')}°C
ORFs Found: {results.get('orfs_found', 'N/A')}
Longest ORF: {results.get('longest_orf', {}).get('length_nt', 'N/A')} nt

Explain briefly: What do these metrics tell me about this sequence?"""
    
    else:
        return f"""Please briefly explain these {tool} results: {str(results)[:500]}"""


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'message': 'DNA Analyzer API is running',
        'version': '1.0.0',
        'ai_enabled': bool(GROQ_API_KEY),
        'rate_limit': f'{MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW}s',
        'endpoints': {
            'mutations': '/api/mutations',
            'alignment': '/api/align',
            'crispr': '/api/crispr',
            'primers': '/api/primers',
            'explain': '/api/explain',
            'health': '/api/health'
        }
    })


@app.route('/api/info', methods=['GET'])
def info():
    """Get API information and documentation"""
    return jsonify({
        'name': 'DNA Sequence Analyzer API',
        'version': '1.0.0',
        'description': 'Professional bioinformatics analysis tools',
        'developer': {
            'name': 'Pushkar Barsagade',
            'email': 'barsagadepushkar26@gmail.com'
        },
        'features': [
            'Mutation Detection (SNPs, Insertions, Deletions)',
            'Sequence Alignment (Global & Local)',
            'CRISPR PAM Site Finder',
            'PCR Primer Design with Tm calculation',
            'AI-powered result explanations'
        ],
        'limits': {
            'max_sequence_length': '100,000 bp',
            'max_alignment_length': '10,000 bp',
            'rate_limit': f'{MAX_REQUESTS_PER_WINDOW} requests per minute'
        }
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Endpoint not found',
        'available_endpoints': [
            '/api/mutations',
            '/api/align',
            '/api/crispr',
            '/api/primers',
            '/api/explain',
            '/api/health',
            '/api/info'
        ]
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed. Check the HTTP method.'}), 405


@app.errorhandler(429)
def rate_limit_exceeded(error):
    return jsonify({
        'error': f'Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per minute.'
    }), 429


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error. Please try again later.'}), 500


if __name__ == '__main__':
    print("=" * 70)
    print("DNA SEQUENCE ANALYZER BACKEND")
    print("=" * 70)
    print(f"Version: 1.0.0")
    print(f"Developer: Pushkar Barsagade")
    print(f"Email: barsagadepushkar26@gmail.com")
    print("=" * 70)
    print(f"Server: http://localhost:5000")
    print(f"CORS: Enabled for frontend requests")
    print(f"AI Explanations: {'ENABLED (Groq)' if GROQ_API_KEY else 'DISABLED (No API key)'}")
    print(f"Rate Limit: {MAX_REQUESTS_PER_WINDOW} requests per minute")
    print("=" * 70)
    print("\nAvailable Endpoints:")
    print("  POST /api/mutations    - Find mutations between sequences")
    print("  POST /api/align        - Perform sequence alignment")
    print("  POST /api/crispr       - Find CRISPR PAM sites")
    print("  POST /api/primers      - Design PCR primers")
    print("  POST /api/explain      - Get AI explanations (if enabled)")
    print("  GET  /api/health       - Health check")
    print("  GET  /api/info         - API information")
    print("=" * 70)
    
    if not GROQ_API_KEY:
        print("\n⚠️  WARNING: AI features disabled - no GROQ_API_KEY found")
        print("   To enable: Add GROQ_API_KEY to your .env file\n")
    
    print("\n✅ Server ready to accept requests!\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')