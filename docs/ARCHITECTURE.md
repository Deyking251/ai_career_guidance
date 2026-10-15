# System Architecture

```text
Student
   |
   +---------------------> Streamlit Web UI
   |                              |
   |                              v
   |                         Python prototype engine
   |
   +---------------------> React/Vite browser UI (`frontend/`)
                                  |
                                  v
                           Node.js API (`backend/`)
                                  |
                                  v
                         Recommendation and skill-gap services
                                  |
                                  v
                         Shared CSV data files
   |
   +--> Student Profile
   |
   +--> Career Recommendation
   |       |
   |       v
   |   TF-IDF Vectorizer
   |       |
   |       v
   |   Cosine Similarity
   |
   +--> Skill Gap Engine
   |       |
   |       v
   |   Required Skills - Student Skills
   |
   +--> Learning Roadmap
   |
   +--> Job Recommendation
   |       |
   |       v
   |   TF-IDF + Location Boost
   |
   +--> Resume Analyzer
           |
           v
       PDF text extraction
           |
           v
       Skill keyword matching

Node.js API endpoints:
- `GET /api/health`
- `GET /api/careers`
- `GET /api/careers/recommend`
- `GET /api/skill-gap`
- `GET /api/jobs/recommend`
- `POST /api/recommendations`

Data Layer:
- data/careers.csv
- data/jobs.csv
