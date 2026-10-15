# Concept Note

## Title
AI-Powered Career Guidance and Skill Gap Analysis System for Students

## SDG Alignment
SDG 8: Decent Work and Economic Growth.

## Problem Statement
Many students have difficulty mapping their existing skills and interests to suitable career roles. They also lack a clear understanding of the additional skills required for their target roles. This project proposes an AI-assisted system that provides career recommendations, skill-gap analysis, learning roadmaps and sample job-role matching.

## Objectives
1. Recommend suitable career roles from student skills and interests.
2. Identify skills required by a selected career.
3. Highlight skill gaps.
4. Generate a simple personalized learning roadmap.
5. Match student profiles with sample job roles.
6. Provide a prototype resume skill analyzer.

## Methodology
Student profile data is converted into text features. TF-IDF represents the profile and career/job descriptions. Cosine similarity calculates relevance. A rule-based skill-gap engine compares student skills against required skills. Resume PDFs are converted to text and checked for selected skill keywords.

## Expected Outcome
A functional web prototype that demonstrates AI-assisted career guidance and provides an understandable pathway from current skills to target career roles.

## Limitations
The prototype uses a demonstration dataset. Job recommendations are not live listings. Resume analysis is keyword-based and should not be treated as a definitive ATS score.

## Future Scope
- Live job APIs.
- Larger validated datasets.
- Multilingual support.
- LLM-based career conversations.
- User accounts and historical progress.
- Recommendation evaluation using real student feedback.
