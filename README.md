# AI-Powered Career Guidance and Skill Gap Analysis System

AICTE/IBM SkillsBuild internship project.

## Goal
Recommend suitable career roles from a student's skills/interests, identify missing skills, recommend a learning roadmap, and match the student to sample job roles.

## Technology
- Python
- Streamlit
- Pandas
- Scikit-learn
- TF-IDF + cosine similarity
- Optional PDF resume text extraction with pypdf
- Node.js backend API using the built-in HTTP server
- React/Vite responsive browser dashboard served by the Node.js backend

## Run
```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Ubuntu/Linux: source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Open the URL shown by Streamlit.

## React frontend and Node.js backend

The backend reuses the CSV files and provides career recommendations, skill-gap analysis, job matching, and health endpoints. The React frontend is built into `frontend/dist` and then served by the Node.js server.

```bash
cd frontend
npm install
npm run build

cd backend
npm start
```

The responsive dashboard is available at `http://localhost:3000`. During frontend development, use `npm run dev` inside `frontend`; Vite runs on port `5173` and proxies `/api` to the backend on port `3000`. The API is available under `/api`. Example requests:

```text
GET /api/health
GET /api/careers/recommend?skills=Python,SQL&interests=backend
GET /api/skill-gap?role=Backend%20Developer&skills=Python,SQL
POST /api/recommendations
```

### Login, signup, and admin workspace

The React dashboard now opens with a login/signup screen. Accounts and career profiles are stored in MySQL, passwords are hashed with Node's built-in `scrypt`, and a short-lived HTTP-only cookie session protects the workspace. The first account using `ADMIN_EMAIL` receives the admin role; the local default is `admin@northstar.local`.

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your local MySQL credentials.
cd backend
npm start
```

The backend creates the `ai_career_guidance` schema plus `users` and `profiles` tables automatically. Each authenticated recommendation submission upserts the user's education, branch, skills, interests, and preferred location. After signing up with the configured admin email, open the `Admin` button in the workspace header to view registered users and dataset counts. This built-in flow is suitable for the local prototype; use a production identity provider and a non-root MySQL user before deploying publicly.

Run the backend tests with `npm test` from the `backend` directory. The Python Streamlit app remains independently runnable as described above.

## Important
The included job data is a demonstration dataset for the internship prototype. It is not a live job board.
