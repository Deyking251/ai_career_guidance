import re
import pandas as pd
import streamlit as st
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

st.set_page_config(page_title="AI Career Guide", page_icon="🎯", layout="wide")

DATA = pd.read_csv("data/careers.csv")
JOBS = pd.read_csv("data/jobs.csv")

def normalize_skills(text):
    if not text:
        return []
    return sorted(set(s.strip().lower() for s in re.split(r"[,;\n]", text) if s.strip()))

def career_recommendations(skills, interests):
    user_text = " ".join(skills) + " " + interests
    corpus = DATA["profile"].fillna("").tolist() + [user_text]
    vec = TfidfVectorizer(stop_words="english")
    matrix = vec.fit_transform(corpus)
    scores = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    out = DATA.copy()
    out["score"] = scores
    return out.sort_values("score", ascending=False).head(5)

def skill_gap(role, skills):
    row = DATA[DATA["role"] == role].iloc[0]
    required = normalize_skills(row["required_skills"])
    have = set(normalize_skills(",".join(skills)))
    missing = [s for s in required if s not in have]
    return required, missing

def job_recommendations(skills, interests, location):
    user = " ".join(skills) + " " + interests
    corpus = JOBS["description"].fillna("").tolist() + [user]
    vec = TfidfVectorizer(stop_words="english")
    matrix = vec.fit_transform(corpus)
    scores = cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    out = JOBS.copy()
    out["match"] = scores * 100
    if location:
        loc = location.lower()
        locmask = out["location"].str.lower().str.contains(loc, na=False)
        out.loc[locmask, "match"] += 5
    return out.sort_values("match", ascending=False).head(6)

st.title("🎯 AI-Powered Career Guidance & Skill Gap Analysis")
st.caption("AICTE / IBM SkillsBuild Internship Prototype • SDG 8: Decent Work and Economic Growth")

with st.sidebar:
    st.header("Student Profile")
    name = st.text_input("Name", "Student")
    education = st.selectbox("Education", ["B.Tech / B.E.", "BCA", "MCA", "B.Sc.", "M.Sc.", "Other"])
    branch = st.text_input("Branch / Specialization", "Computer Science")
    skills_text = st.text_area("Skills (comma separated)", "Python, SQL, HTML, CSS")
    interests = st.text_area("Interests", "software development, backend, data")
    location = st.text_input("Preferred Location", "Kolkata")
    skills = normalize_skills(skills_text)

tabs = st.tabs(["🏠 Dashboard", "🎯 Career Prediction", "🧩 Skill Gap", "📚 Roadmap", "💼 Job Match", "📄 Resume Analyzer"])

with tabs[0]:
    st.subheader(f"Welcome, {name}")
    c1, c2, c3 = st.columns(3)
    c1.metric("Skills entered", len(skills))
    c2.metric("Career roles", len(DATA))
    c3.metric("Demo jobs", len(JOBS))
    st.info("Enter your profile in the sidebar, then explore the tabs. This prototype uses a transparent TF-IDF similarity model.")

with tabs[1]:
    st.subheader("AI Career Recommendations")
    recs = career_recommendations(skills, interests)
    show = recs[["role", "score", "description"]].copy()
    show["score"] = (show["score"] * 100).round(1)
    show.columns = ["Career Role", "Match %", "Description"]
    st.dataframe(show, use_container_width=True, hide_index=True)
    st.bar_chart(recs.set_index("role")["score"])

with tabs[2]:
    st.subheader("Skill Gap Analysis")
    role = st.selectbox("Choose target career", DATA["role"].tolist())
    required, missing = skill_gap(role, skills)
    st.write("**Required skills:**", ", ".join(required))
    if missing:
        st.warning("Skills to develop: " + ", ".join(missing))
    else:
        st.success("Your entered skills cover the prototype's required skill list.")
    st.progress(min(1.0, len(set(required)-set(missing))/max(1,len(required))))

with tabs[3]:
    st.subheader("Personalized Learning Roadmap")
    role = st.selectbox("Roadmap for", DATA["role"].tolist(), key="roadmap_role")
    _, missing = skill_gap(role, skills)
    roadmap = missing[:]
    if not roadmap:
        roadmap = ["Advanced projects", "System design", "Interview preparation"]
    for i, item in enumerate(roadmap, 1):
        st.markdown(f"### Month {i}")
        st.write(f"**{item.title()}** — learn fundamentals, complete one mini-project, and add it to your portfolio.")

with tabs[4]:
    st.subheader("Sample Job Recommendations")
    jobs = job_recommendations(skills, interests, location)
    st.dataframe(jobs[["title", "company", "location", "match", "skills"]].round({"match":1}),
                 use_container_width=True, hide_index=True)

with tabs[5]:
    st.subheader("Resume Analyzer")
    uploaded = st.file_uploader("Upload a PDF resume (optional)", type=["pdf"])
    if uploaded:
        try:
            from pypdf import PdfReader
            reader = PdfReader(uploaded)
            text = "\n".join((p.extract_text() or "") for p in reader.pages).lower()
            keywords = ["python","java","sql","react","node","spring boot","machine learning","git","docker","aws","excel"]
            found = [k for k in keywords if k in text]
            missing_resume = [k for k in keywords if k not in found]
            score = round(len(found)/len(keywords)*100)
            st.metric("Prototype Resume Skill Score", f"{score}/100")
            st.write("**Detected skills:**", ", ".join(found) if found else "None")
            st.write("**Potentially missing keywords:**", ", ".join(missing_resume))
            st.caption("This is a prototype keyword-based analyzer, not an ATS guarantee.")
        except Exception as e:
            st.error(f"Could not read the PDF: {e}")
    else:
        st.info("Upload a PDF resume to test the analyzer.")

st.divider()
st.caption("Academic prototype • Demonstration job dataset • Do not treat recommendations as professional career advice.")
