"""
DNA Sequence Analyzer - Flask Backend API
Provides endpoints for mutations, alignment, CRISPR, and primer design
Now with FREE AI explanations powered by Groq!

FIXES APPLIED:
✓ Added proper CORS preflight handling (OPTIONS requests)
✓ Added /api/ai-explain endpoint for frontend
✓ Fixed environment variable loading
✓ Added comprehensive error handling
✓ Added request validation
"""
import os
import sys
import requests
from datetime import datetime, timedelta
from collections import defaultdict

from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

from algorithms.alignment import needleman_wunsch, smith_waterman, calculate_alignment_stats
from algorithms.mutation_finder import find_mutations
from algorithms.crispr import find_pam_sites
from algorithms.primer_design import design_primers

# Load environment variables FIRST
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# ===== FIXED CORS CONFIGURATION =====
# More specific CORS setup to handle preflight requests properly
CORS(app,
     resources={
         r"/api/*": {
             "origins": [
                 "https://dna-analyzer-taupe.vercel.app",
                 "http://localhost:3000",
                 "http://localhost:5000"
             ],
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "max_age": 3600
         }
     })

# ===== HANDLE PREFLIGHT REQUESTS (FIX FOR CORS ERRORS) =====
@app.before_request
def handle_preflight():
    """Handle CORS preflight OPTIONS requests"""
    if request.method == "OPTIONS":
        response = make_response()
        origin = request.headers.get("Origin")
        allowed_origins = [
            "https://dna-analyzer-taupe.vercel.app",
            "http://localhost:3000",
            "http://localhost:5000"
        ]
        
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
        else:
            response.headers["Access-Control-Allow-Origin"] = "*"
        
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response, 200

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
def apply_rate_limiting():
    """Apply rate limiting to all requests (except health check)"""
    # Skip rate limiting for health check and OPTIONS requests
    if request.endpoint in ['health', 'handle_preflight'] or request.method == "OPTIONS":
        return None
    
    client_ip = request.remote_addr
    if not check_rate_limit(client_ip):
        return jsonify({
            'error': 'Rate limit exceeded. Maximum 30 requests per minute.'
        }), 429


@app.route('/api/mutations', methods=['POST', 'OPTIONS'])
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


@app.route('/api/align', methods=['POST', 'OPTIONS'])
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


@app.route('/api/crispr', methods=['POST', 'OPTIONS'])
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


@app.route('/api/primers', methods=['POST', 'OPTIONS'])
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


# ===== NEW ENDPOINT: AI EXPLANATION =====
@app.route('/api/ai-explain', methods=['POST', 'OPTIONS'])
def ai_explain():
    """
    Get AI explanation for DNA sequence analysis results
    Uses Groq API for fast, free AI explanations
    """
    try:
        # Check if API key is configured
        if not GROQ_API_KEY:
            return jsonify({
                'error': 'AI service not configured',
                'message': 'AI explanations are currently unavailable. Please contact the administrator.',
                'ai_enabled': False
            }), 503
        
        # Get request data
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        sequence = data.get('sequence', '')
        tool = data.get('tool', 'DNA Analysis')
        context = data.get('context', '')
        
        if not sequence:
            return jsonify({'error': 'DNA sequence is required'}), 400
        
        # Validate sequence
        is_valid, error_msg = validate_dna_sequence(sequence)
        if not is_valid:
            return jsonify({'error': f'Invalid sequence: {error_msg}'}), 400
        
        # Build the prompt for AI
        prompt = f"""Provide a detailed, comprehensive explanation of this DNA sequence analysis:

SEQUENCE: {sequence[:200]}{'...' if len(sequence) > 200 else ''}
SEQUENCE LENGTH: {len(sequence)} bp
ANALYSIS TOOL: {tool}
CONTEXT: {context if context else 'General analysis'}

Please provide:
1. Key characteristics of this sequence
2. Biological significance
3. Practical implications
4. Recommendations for further analysis
5. Important considerations and best practices

Be thorough, scientific, but accessible to both students and researchers."""

        # Call Groq API
        print(f"[AI] Calling Groq API for: {tool}")
        
        groq_response = requests.post(
            GROQ_API_URL,
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'mixtral-8x7b-32768',  # Fast model
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert molecular biologist and bioinformatics specialist. Provide clear, comprehensive, and scientifically accurate explanations of DNA sequence analysis results.'
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': 0.7,
                'max_tokens': 1500
            },
            timeout=30
        )
        
        # Check for API errors
        if groq_response.status_code != 200:
            error_detail = groq_response.json() if groq_response.text else 'Unknown error'
            print(f"[ERROR] Groq API returned {groq_response.status_code}: {error_detail}")
            return jsonify({
                'error': 'AI service error',
                'status': groq_response.status_code,
                'details': str(error_detail)
            }), groq_response.status_code
        
        # Extract explanation from response
        result = groq_response.json()
        explanation = result.get('choices', [{}])[0].get('message', {}).get('content', '')
        
        if not explanation:
            return jsonify({
                'error': 'No explanation generated',
                'response': result
            }), 500
        
        print(f"[AI] ✓ Explanation generated ({len(explanation)} chars)")
        
        return jsonify({
            'explanation': explanation,
            'tool': tool,
            'sequence_length': len(sequence),
            'ai_model': 'mixtral-8x7b-32768',
            'status': 'success'
        }), 200
        
    except requests.exceptions.Timeout:
        print("[ERROR] Groq API request timed out")
        return jsonify({
            'error': 'AI service timeout',
            'message': 'The request took too long. Please try again.'
        }), 504
    
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] Connection error: {str(e)}")
        return jsonify({
            'error': 'Connection error',
            'message': 'Could not connect to AI service. Check your internet connection.'
        }), 503
    
    except Exception as e:
        print(f"[ERROR] Unexpected error in ai_explain: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred.',
            'details': str(e) if os.getenv('FLASK_DEBUG') else None
        }), 500


# ===== ORIGINAL EXPLAIN ENDPOINT (for backward compatibility) =====
@app.route('/api/explain', methods=['POST', 'OPTIONS'])
def explain_with_ai():
    """Generate AI explanations using FREE Groq API with extended responses"""
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
                'model': 'mixtral-8x7b-32768',
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are an expert molecular biology assistant. Provide comprehensive, detailed explanations of scientific results. Include biological significance, practical implications, interpretation guidelines, and actionable recommendations. Use clear language that both students and researchers can understand. Be thorough but organized - use sections, examples, and specific details to make complex concepts accessible.'
                    },
                    {
                        'role': 'user',
                        'content': context
                    }
                ],
                'max_tokens': 1500,
                'temperature': 0.7
            },
            timeout=45
        )
        
        if response.status_code != 200:
            error_data = response.json()
            error_msg = error_data.get('error', {}).get('message', 'Unknown error')
            print(f"Groq API error: {error_msg}")
            return jsonify({'error': f'AI service error: {error_msg}'}), response.status_code
        
        result = response.json()
        explanation = result['choices'][0]['message']['content']
        
        print(f"AI explanation generated for {tool} (length: {len(explanation)} chars)")
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
    """Build detailed context string for AI based on tool type"""
    
    if tool == "PCR Primer Designer":
        fwd = results.get('forward_primer', {})
        rev = results.get('reverse_primer', {})
        
        return f"""I designed PCR primers for amplification. Please provide a comprehensive analysis:

FORWARD PRIMER:
- Sequence: {fwd.get('sequence', 'N/A')}
- Melting Temperature (Tm): {fwd.get('tm', 'N/A')}°C
- GC Content: {fwd.get('gc_content', 'N/A')}%
- Quality Score: {fwd.get('quality_score', 'N/A')}/100
- Quality Grade: {fwd.get('quality_grade', 'N/A')}
- Issues: {', '.join(fwd.get('issues', [])) if fwd.get('issues') else 'None detected'}

REVERSE PRIMER:
- Sequence: {rev.get('sequence', 'N/A')}
- Melting Temperature (Tm): {rev.get('tm', 'N/A')}°C
- GC Content: {rev.get('gc_content', 'N/A')}%
- Quality Score: {rev.get('quality_score', 'N/A')}/100
- Quality Grade: {rev.get('quality_grade', 'N/A')}
- Issues: {', '.join(rev.get('issues', [])) if rev.get('issues') else 'None detected'}

AMPLICON DETAILS:
- Product Size: {results.get('product_size', 'N/A')} bp
- Tm Difference: {abs(fwd.get('tm', 0) - rev.get('tm', 0)):.1f}°C

Please provide a detailed analysis covering:
1. Overall primer quality assessment and suitability for PCR
2. Explanation of the Tm values and whether they're optimal
3. GC content analysis and implications
4. Any potential issues (primer dimers, hairpins, mispriming risks)
5. Recommended PCR conditions (annealing temperature, extension time)
6. Troubleshooting suggestions if quality is suboptimal
7. Best practices for using these primers"""
    
    elif tool == "Mutation Finder":
        summary = results.get('summary', {})
        mutations = results.get('mutations', [])
        
        mutation_details = []
        for i, m in enumerate(mutations[:10], 1):
            mutation_details.append(
                f"{i}. Position {m.get('position')}: {m.get('type')} - "
                f"{m.get('from_base', '?')} → {m.get('to_base', '?')} "
                f"[{m.get('mutation_class', 'Unknown')}]"
            )
        
        mutation_list = '\n'.join(mutation_details) if mutation_details else "No mutations detected"
        
        return f"""I performed comparative sequence analysis and found the following mutations:

SUMMARY STATISTICS:
- Total Mutations: {summary.get('total_mutations', 0)}
- Single Nucleotide Polymorphisms (SNPs): {summary.get('snps', 0)}
- Insertions: {summary.get('insertions', 0)}
- Deletions: {summary.get('deletions', 0)}

FUNCTIONAL CLASSIFICATION:
- Silent Mutations: {summary.get('silent_mutations', 0)}
- Missense Mutations: {summary.get('missense_mutations', 0)}
- Nonsense Mutations: {summary.get('nonsense_mutations', 0)}

DETAILED MUTATION LIST (showing first 10):
{mutation_list}

Please provide comprehensive analysis:
1. Biological significance of these mutation types
2. Interpretation of silent vs. missense vs. nonsense mutations
3. Potential functional impacts on the protein product
4. Clinical or research implications
5. Patterns or hotspots in the mutations
6. Recommendations for follow-up analysis
7. What these mutations might tell us about evolutionary relationships or disease"""
    
    elif tool == "CRISPR Finder":
        sites_count = results.get('total_sites', 0)
        forward = results.get('forward_strand_sites', 0)
        reverse = results.get('reverse_strand_sites', 0)
        sites = results.get('sites', [])
        
        site_details = []
        for i, site in enumerate(sites[:8], 1):
            site_details.append(
                f"{i}. Position {site.get('position')}: {site.get('pam_sequence')} "
                f"({site.get('strand')} strand, {site.get('cut_position')} bp from start)"
            )
        
        site_list = '\n'.join(site_details) if site_details else "No PAM sites found"
        
        return f"""I analyzed a DNA sequence for CRISPR-Cas9 targeting sites:

SUMMARY:
- Total PAM Sites Found: {sites_count}
- Forward Strand Sites: {forward}
- Reverse Strand Sites: {reverse}

PAM SITE DETAILS (showing first 8):
{site_list}

Please provide detailed explanation:
1. What are PAM (Protospacer Adjacent Motif) sites and why they're essential for CRISPR
2. How to evaluate and choose the best PAM site for gene editing
3. Considerations for on-target vs. off-target effects
4. Guide RNA design recommendations for these sites
5. Strand selection strategy (forward vs. reverse)
6. Potential challenges and how to address them
7. Best practices for experimental validation
8. Tips for maximizing editing efficiency and specificity"""
    
    elif tool == "Sequence Alignment":
        return f"""I performed sequence alignment with the following results:

ALIGNMENT DETAILS:
- Algorithm Used: {results.get('algorithm', 'N/A')}
- Alignment Score: {results.get('score', 'N/A')}
- Overall Similarity: {results.get('similarity_percentage', 'N/A')}%

DETAILED STATISTICS:
- Matching Positions: {results.get('matches', 'N/A')}
- Mismatched Positions: {results.get('mismatches', 'N/A')}
- Gap Positions: {results.get('gaps', 'N/A')}
- Total Alignment Length: {results.get('length', 'N/A')} positions

Please provide comprehensive analysis:
1. Interpretation of the alignment score and similarity percentage
2. What this level of similarity indicates about sequence relationship
3. Biological implications of matches, mismatches, and gaps
4. Whether these sequences are likely homologs, orthologs, or paralogs
5. Evolutionary insights from the alignment pattern
6. Recommendations for further analysis
7. How to use this information in research or diagnostics
8. Confidence level and potential limitations of the alignment"""
    
    elif tool == "DNA Sequence Analyzer":
        return f"""I performed comprehensive DNA sequence analysis:

SEQUENCE CHARACTERISTICS:
- Length: {results.get('length', 'N/A')} base pairs
- GC Content: {results.get('gc_content', 'N/A')}%
- AT Content: {results.get('at_content', 'N/A')}%
- Melting Temperature (Tm): {results.get('tm', 'N/A')}°C

CODING POTENTIAL:
- Open Reading Frames (ORFs) Detected: {results.get('orfs_found', 'N/A')}
- Longest ORF: {results.get('longest_orf', {}).get('length_nt', 'N/A')} nucleotides
  ({results.get('longest_orf', {}).get('length_aa', 'N/A')} amino acids)

Please provide detailed interpretation:
1. What the GC content reveals about the sequence (stability, gene density, organism type)
2. Significance of the melting temperature for molecular biology applications
3. Interpretation of ORF analysis and coding potential
4. Sequence composition implications for cloning and expression
5. Recommendations for molecular biology experiments
6. Potential challenges or considerations
7. How these metrics compare to typical sequences
8. Next steps for characterization or functional analysis"""
    
    else:
        return f"""Please provide a comprehensive, detailed explanation of these {tool} results:

DATA:
{str(results)[:1000]}

Include:
1. Interpretation of key metrics and values
2. Biological significance
3. Practical implications
4. Recommendations for next steps
5. Potential applications or considerations"""


@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok', 
        'message': 'DNA Analyzer API is running',
        'version': '1.0.0',
        'ai_enabled': bool(GROQ_API_KEY),
        'ai_config': {
            'model': 'mixtral-8x7b-32768',
            'max_tokens': 1500,
            'provider': 'Groq'
        },
        'rate_limit': f'{MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW}s',
        'cors_enabled': True,
        'endpoints': {
            'mutations': '/api/mutations',
            'alignment': '/api/align',
            'crispr': '/api/crispr',
            'primers': '/api/primers',
            'ai_explain': '/api/ai-explain',
            'explain': '/api/explain (legacy)',
            'health': '/api/health'
        }
    })


@app.route('/api/info', methods=['GET', 'OPTIONS'])
def info():
    """Get API information and documentation"""
    return jsonify({
        'name': 'DNA Sequence Analyzer API',
        'version': '1.0.0',
        'description': 'Professional bioinformatics analysis tools with AI explanations',
        'developer': {
            'name': 'Pushkar Barsagade',
            'email': 'barsagadepushkar26@gmail.com'
        },
        'features': [
            'Mutation Detection (SNPs, Insertions, Deletions)',
            'Sequence Alignment (Global & Local)',
            'CRISPR PAM Site Finder',
            'PCR Primer Design with Tm calculation',
            'AI-powered detailed result explanations (Groq API)'
        ],
        'limits': {
            'max_sequence_length': '100,000 bp',
            'max_alignment_length': '10,000 bp',
            'rate_limit': f'{MAX_REQUESTS_PER_WINDOW} requests per minute'
        },
        'ai_endpoints': {
            'ai_explain': '/api/ai-explain (recommended)',
            'explain': '/api/explain (legacy, full result context)'
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
            '/api/ai-explain',
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
    print(f"CORS: Enabled ✓")
    print(f"  - Allowed Origins: https://dna-analyzer-taupe.vercel.app, http://localhost:3000")
    print(f"  - Methods: GET, POST, OPTIONS")
    print(f"  - Preflight Handling: Enabled ✓")
    print(f"AI Explanations: {'ENABLED ✓ (Groq - 1500 tokens)' if GROQ_API_KEY else 'DISABLED ✗ (No API key)'}")
    print(f"Rate Limit: {MAX_REQUESTS_PER_WINDOW} requests per minute")
    print("=" * 70)
    print("\nAvailable Endpoints:")
    print("  POST /api/mutations    - Find mutations between sequences")
    print("  POST /api/align        - Perform sequence alignment")
    print("  POST /api/crispr       - Find CRISPR PAM sites")
    print("  POST /api/primers      - Design PCR primers")
    print("  POST /api/ai-explain   - Get AI explanation (new endpoint)")
    print("  POST /api/explain      - Get AI explanation (legacy endpoint)")
    print("  GET  /api/health       - Health check")
    print("  GET  /api/info         - API information")
    print("=" * 70)
    
    if not GROQ_API_KEY:
        print("\n⚠️  WARNING: AI features disabled - no GROQ_API_KEY found")
        print("   To enable: Add GROQ_API_KEY to your .env file")
        print("   Get free key from: https://console.groq.com\n")
    else:
        print("\n✅ AI service configured and ready!\n")
    
    print("✅ Server ready to accept requests!\n")
    
    app.run(debug=True, port=5000, host='0.0.0.0')