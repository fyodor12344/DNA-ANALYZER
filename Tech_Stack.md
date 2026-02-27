# DNA Analyzer: Technical Stack

If judges ask you what your technical stack is, this is the exact architecture you are using. Explain that you built a modern, decoupled web application.

## Frontend (Client-Side)
*   **Core Framework:** React 19 (managed via Vite for lightning-fast module bundling and hot module replacement).
*   **Styling:** Custom CSS and Tailwind CSS methodologies for a responsive, dark-mode specialized aesthetic inspired by high-end scientific software.
*   **Routing:** React Router v7 for seamless Client-Side Routing (Single Page Application architecture).
*   **Data Visualization:** Chart.js & Recharts for rendering the interactive composition graphs and metrics.
*   **PDF Generation:** jsPDF and html2canvas for directly exporting local, formatted scientific reports from the browser.
*   **Local Algorithms:** Vanilla JavaScript implementations of massive scientific models (SantaLucia 1998 Nearest-Neighbor Thermodynamics, BLOSUM62 Scoring, in silico Codon Translation, IUPAC dual-strand regex parsing).

## Backend (Microservice API)
*   **Host Environment:** Render (Free Tier Containerization) `https://dna-analyzer-1-ipxr.onrender.com`.
*   **Architecture Strategy:** The backend is designed as an asynchronous microservice. Because heavy bioinformatic math (like $O(n \times m)$ Needleman-Wunsch 2D dynamic programming matrices) would freeze the browser's UI thread, that specific calculation is offloaded to this external container and the result is safely returned via generic JSON payloads.
*   **AI Integration:** The backend serves as an isolated proxy to securely interface with AI language models (to generate the 'Get AI Explanation' outputs) without exposing API keys on the client-side.

## Key Design Philosophy to Mention
*"My architecture relies heavily on Edge Computing. By purposefully writing the most computationally complex algorithms—like the entire Nearest-Neighbor Thermodynamic Engine—in Vanilla JavaScript directly inside the browser, I bypassed the need for expensive cloud database connections and eliminated severe API latency, making the tool instantly responsive."*
