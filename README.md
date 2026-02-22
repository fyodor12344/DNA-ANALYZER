# 🧬 Cancer Gene Mutation Analyzer
### Research-Grade · Multi-Gene Panel · VCF Support

> A browser-based, research-grade platform for cancer genomics mutation analysis — no backend required. Identify, classify, and annotate mutations in TP53, BRCA1, KRAS, and EGFR with codon-level resolution, HGVS notation, protein domain mapping, and NGS-compatible VCF file support.

---

## 🔬 Overview

The **Cancer Gene Mutation Analyzer** is a fully client-side genomics tool designed for cancer mutation research, clinical education, and bioinformatics workflows. It provides multi-level mutation analysis across four clinically critical cancer genes, generating research-grade reports accessible directly in the browser — no installation, no server, no cost.

Originally developed as a TP53-specific tool, the platform has been extended into a **multi-gene cancer panel** supporting the most commonly mutated genes in human malignancies.

---

## ✨ Features

### 🧫 Multi-Gene Panel
| Gene | Type | Transcript | Key Cancer Association |
|------|------|-----------|----------------------|
| **TP53** | Tumor Suppressor | NM_000546.6 | ~50% of all human cancers |
| **BRCA1** | Tumor Suppressor | NM_007294.4 | Hereditary breast & ovarian cancer |
| **KRAS** | Oncogene | NM_004985.5 | Pancreatic, colorectal, lung cancer |
| **EGFR** | Oncogene | NM_005228.5 | Non-small cell lung cancer (NSCLC) |

### 🔍 Mutation Detection Engine
- **SNP detection** with codon-level resolution
- **Insertion & deletion** classification
- **Frameshift mutation** identification
- **In-frame vs. out-of-frame** indel classification
- **Multi-allelic variant** support

### 📍 Annotation & Interpretation
- **HGVS notation** (standard nomenclature: `NM_000546.6:p.R175H`)
- **Protein domain mapping** — pinpoints which functional domain is affected
- **Biochemical property analysis** — charge, polarity, and size changes per amino acid substitution
- **Gene-specific biological interpretation** — clinically relevant notes per mutation type
- **Confidence scoring** for each detected variant

### 📂 VCF File Support (NGS-Compatible)
- Upload standard `.vcf` files from sequencing pipelines
- Drag-and-drop interface
- Multi-variant VCF parsing with variant selector
- Handles multi-allelic sites (`ALT` comma-separated)
- Parse error reporting per malformed line

### 📄 Report Generation
- Export full mutation report as `.txt`
- Includes: transcript reference, mutation summary table, domain annotation, biological interpretation, VCF source metadata, and methods note
- Gene-specific report naming (`KRAS_Mutation_Report_2025-01-01.txt`)

### 🤖 AI Explanation
- One-click clinical summary generation
- Gene-aware — references correct cancer associations, therapeutic implications, and domain significance

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/dna-analyzer.git
cd dna-analyzer

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🧪 Usage

### Manual Sequence Entry
1. Select your target gene (TP53 / BRCA1 / KRAS / EGFR)
2. Configure reading frame and strand direction
3. Paste your **Reference** and **Alternate** DNA sequences
4. Click **Analyze Mutations**
5. View annotated results, domain mapping, and biological interpretation
6. Export PDF report or get AI explanation

### VCF File Upload
1. Switch to the **VCF File Upload** tab
2. Drag and drop your `.vcf` file or click to browse
3. Select a variant from the parsed list
4. Sequences are auto-loaded — click **Analyze Mutations**

### Sample Mutations
Use the **Load Sample Mutations** dropdown to explore:
- Wild-type (no mutations)
- SNP / Missense substitution
- In-frame insertion
- Frameshift insertion

---

## 🏗️ Architecture

```
src/
├── components/
│   ├── MutationFinder/        # Core mutation detection tab
│   ├── GenePanel/             # Gene selector component
│   └── VCFUploader/           # VCF file parsing & UI
├── data/
│   ├── genePanel.js           # Gene definitions, domains, transcripts
│   ├── codonTable.js          # Codon → amino acid lookup
│   └── sampleMutations.js     # Example sequences
├── utils/
│   ├── detectMutations.js     # Core alignment & classification logic
│   ├── hgvsNotation.js        # HGVS string generation
│   ├── domainMapping.js       # AA position → protein domain
│   └── vcfParser.js           # VCF format parser
└── App.jsx
```

---

## 🧬 Scientific Background

### Supported Mutation Classes
| Class | Description | Clinical Significance |
|-------|-------------|----------------------|
| **Missense** | Single AA substitution | Variable — depends on domain and biochemical change |
| **Nonsense** | Premature stop codon | Usually loss-of-function; NMD may degrade mRNA |
| **Silent** | No AA change | Generally benign; may affect splicing or translation |
| **Frameshift** | Reading frame disrupted | Typically severe loss-of-function |
| **In-frame Indel** | AA inserted/deleted, frame preserved | Moderate — depends on domain location |

### HGVS Notation Standard
All mutations are reported following [HGVS nomenclature guidelines](https://hgvs-nomenclature.org/), mapped to canonical transcripts:
- Missense: `NM_000546.6:p.R175H`
- Nonsense: `NM_000546.6:p.R213*`
- Frameshift: `NM_000546.6:p.V143fs`
- Silent: `NM_000546.6:p.R175=`

---

## 📊 Limitations & Future Development

### Current Limitations
- TP53 analysis restricted to sequences ≤ 5,000 bp (browser memory constraint)
- Complex indel misclassification in ~25% of multi-base structural variants
- No splice variant analysis
- Pathogenicity scoring (SIFT/PolyPhen-2/CADD) not yet integrated
- Benchmarked on 500 variants; full IARC TP53 database validation pending

### Planned Future Directions
- [ ] **Pathogenicity scoring** — SIFT, PolyPhen-2, and CADD composite scores
- [ ] **3D protein structure visualization** — map mutations onto p53/KRAS crystal structures
- [ ] **Population frequency integration** — gnomAD allele frequencies with Indian subpopulation data
- [ ] **Splice variant analysis** — exon boundary detection and splicing impact prediction
- [ ] **Hotspot heatmap** — visual mutation frequency map across the protein
- [ ] **Extended gene panel** — PTEN, RB1, APC, PIK3CA, BRAF
- [ ] **Clinical trial matcher** — link detected mutations to relevant ongoing trials
- [ ] **Transformer-based pathogenicity classifier** — deep learning on large mutational datasets

---

## 🏥 Clinical Relevance

This tool is designed to support **educational and research use** in cancer genomics. It is **not a clinical diagnostic device** and should not be used as the sole basis for clinical decisions.

For clinical genetic testing, consult certified laboratory services and licensed genetic counselors.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite
- **Styling:** Tailwind CSS + inline styles
- **Deployment:** Vercel
- **No backend / No database** — fully client-side

---

## 📁 Repository Structure

```
dna-analyzer/
├── src/                  # React source code
├── public/               # Static assets
├── backend/              # Legacy / experimental (not used in production)
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── vercel.json
```

---

## 🤝 Contributing

Contributions are welcome. For major changes, please open an issue first to discuss what you'd like to change.

```bash
# Fork the repo, create a branch
git checkout -b feature/pathogenicity-scorer

# Make your changes, then
git commit -m "feat: add SIFT pathogenicity scoring"
git push origin feature/pathogenicity-scorer
# Open a Pull Request
```

---

## 👨‍💻 Author

**Pushkar**
- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Project: [dna-analyzer-taupe.vercel.app](https://dna-analyzer-taupe.vercel.app)

---

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [HGVS Nomenclature](https://hgvs-nomenclature.org/) — mutation notation standard
- [IARC TP53 Database](https://tp53.isb-cgc.org/) — reference mutation data
- [ClinVar](https://www.ncbi.nlm.nih.gov/clinvar/) — clinical variant classification
- [gnomAD](https://gnomad.broadinstitute.org/) — population allele frequency reference
- [UniProt](https://www.uniprot.org/) — protein domain annotations

---

<div align="center">
  <strong>Built for cancer genomics research · Maharashtra State Science Competition 2025</strong><br/>
  <em>Making research-grade mutation analysis accessible to everyone</em>
</div>
