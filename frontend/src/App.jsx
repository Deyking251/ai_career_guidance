import { useCallback, useEffect, useState } from "react";

const DEFAULT_PROFILE = {
  name: "Student",
  education: "B.Tech / B.E.",
  branch: "Computer Science",
  skills: ["Python", "SQL", "HTML", "CSS"],
  interests: "software development, backend, data",
  location: "Kolkata",
};

function percent(value) {
  return `${Math.round(Number(value ?? 0) * 100)}%`;
}

function initials(name) {
  return String(name || "User")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "signup"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to continue.");
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message || "Unable to continue.");
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError("");
  };

  return (
    <main className="auth-shell">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card" aria-labelledby="authTitle">
        <div className="brand-lockup auth-brand"><div className="brand-mark" aria-hidden="true">N</div><div><p className="brand-name">northstar<span>.</span></p><p className="brand-tagline">career intelligence</p></div></div>
        <div className="auth-intro"><p className="eyebrow accent-eyebrow">A clearer way forward</p><h1 id="authTitle">{mode === "login" ? "Welcome back." : "Start your next chapter."}</h1><p>{mode === "login" ? "Sign in to continue exploring your career map." : "Create your account and turn your skills into direction."}</p></div>
        <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button type="button" className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          <button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signup"); setError(""); }}>Create account</button>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && <><label className="field-label" htmlFor="authName">Your name</label><input id="authName" value={form.name} onChange={(event) => updateField("name", event.target.value)} autoComplete="name" placeholder="Aarav Sharma" required /></>}
          <label className="field-label" htmlFor="authEmail">Email address</label>
          <input id="authEmail" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} autoComplete="email" placeholder="you@example.com" required />
          <label className="field-label" htmlFor="authPassword">Password</label>
          <input id="authPassword" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" minLength="8" required />
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting}><span>{submitting ? "Opening your workspace…" : mode === "login" ? "Sign in" : "Create my account"}</span><span className="button-arrow" aria-hidden="true">↗</span></button>
        </form>
        <p className="auth-switch">{mode === "login" ? "New to northstar?" : "Already have an account?"} <button type="button" onClick={switchMode}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
        <p className="auth-note">Your account keeps your workspace access separate from the career recommendation data.</p>
      </section>
    </main>
  );
}

function AdminPage({ user, onBack, onSignOut }) {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview", { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Admin data could not be loaded.");
        setOverview(result);
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <main className="admin-shell">
      <header className="admin-topbar"><button className="back-button" type="button" onClick={onBack}>← Back to workspace</button><div className="topbar-actions"><span className="admin-user">{user.name} · Administrator</span><button className="text-button" type="button" onClick={onSignOut}>Sign out</button><span className="avatar">{initials(user.name)}</span></div></header>
      <section className="admin-intro"><p className="eyebrow accent-eyebrow">Control room</p><h1>Workspace overview.</h1><p>Keep an eye on the people and career data powering northstar.</p></section>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <section className="admin-stat-grid" aria-label="Workspace statistics">
        <article className="admin-stat-card"><span>Registered users</span><strong>{overview?.stats.totalUsers ?? "—"}</strong><small>Accounts with workspace access</small></article>
        <article className="admin-stat-card"><span>Career paths</span><strong>{overview?.stats.totalCareers ?? "—"}</strong><small>Mapped recommendation signals</small></article>
        <article className="admin-stat-card"><span>Sample roles</span><strong>{overview?.stats.totalJobs ?? "—"}</strong><small>Demonstration job records</small></article>
      </section>
      <section className="admin-panel"><div className="section-heading"><div><p className="eyebrow">User access</p><h2>Recent accounts</h2></div><span className="section-count">Admin only</span></div>{overview?.users?.length ? <div className="admin-user-list">{overview.users.map((account) => <div className="admin-user-row" key={account.id}><div className="admin-user-avatar">{initials(account.name)}</div><div><strong>{account.name}</strong><span>{account.email}</span></div><span className={`role-badge ${account.role}`}>{account.role}</span><time>{new Date(account.createdAt).toLocaleDateString()}</time></div>)}</div> : <div className="admin-empty">No accounts yet.</div>}</section>
      <p className="admin-footnote">Prototype admin controls · Add a production identity provider before deploying publicly.</p>
    </main>
  );
}

function App() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [skillInput, setSkillInput] = useState("");
  const [careers, setCareers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [gap, setGap] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [careerTotal, setCareerTotal] = useState(0);
  const [apiStatus, setApiStatus] = useState("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authState, setAuthState] = useState({ status: "loading", user: null });
  const [view, setView] = useState("dashboard");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Not signed in");
        const result = await response.json();
        setAuthState({ status: "ready", user: result.user });
      })
      .catch(() => setAuthState({ status: "ready", user: null }));
  }, []);

  const handleAuthenticated = (user) => {
    setAuthState({ status: "ready", user });
    setView("dashboard");
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setAuthState({ status: "ready", user: null });
    setView("dashboard");
  };

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const addSkills = (value) => {
    const newSkills = String(value).split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean);
    if (newSkills.length === 0) return;
    setProfile((current) => ({
      ...current,
      skills: [...current.skills, ...newSkills.filter((skill) => !current.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase()))],
    }));
    setSkillInput("");
  };

  const fetchGap = useCallback(async (role, skills) => {
    if (!role) return;
    const params = new URLSearchParams({ role, skills: skills.join(",") });
    const response = await fetch(`/api/skill-gap?${params}`);
    if (!response.ok) throw new Error("We couldn’t load the skill gap for that role.");
    setGap(await response.json());
  }, []);

  const analyzeProfile = useCallback(async (nextProfile) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      if (!response.ok) throw new Error("The career map could not be generated.");
      const result = await response.json();
      const nextCareers = result.careers ?? [];
      setCareers(nextCareers);
      setJobs(result.jobs ?? []);
      const nextRole = nextCareers[0]?.role ?? "";
      setSelectedRole(nextRole);
      await fetchGap(nextRole, nextProfile.skills);
    } catch (requestError) {
      setError(requestError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fetchGap]);

  useEffect(() => {
    if (!authState.user) return undefined;
    let active = true;
    fetch("/api/health")
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((health) => { if (active) { setCareerTotal(health.careers ?? 0); setApiStatus("live"); } })
      .catch(() => { if (active) setApiStatus("error"); });
    const loadWorkspace = async () => {
      let nextProfile = { ...DEFAULT_PROFILE, name: authState.user.name || DEFAULT_PROFILE.name };
      try {
        const response = await fetch("/api/profile", { credentials: "include" });
        if (response.ok) {
          const result = await response.json();
          if (result.profile) nextProfile = { ...nextProfile, ...result.profile, name: nextProfile.name };
        }
      } catch {
        // A first-time user simply starts with the default profile.
      }
      if (active) {
        setProfile(nextProfile);
        analyzeProfile(nextProfile);
      }
    };
    loadWorkspace();
    return () => { active = false; };
  }, [analyzeProfile, authState.user]);

  useEffect(() => {
    if (authState.user?.name) setProfile((current) => ({ ...current, name: authState.user.name }));
  }, [authState.user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const pendingSkills = skillInput.split(/[,;\n]/).map((skill) => skill.trim()).filter(Boolean);
    const nextSkills = [...profile.skills, ...pendingSkills.filter((skill) => !profile.skills.some((existing) => existing.toLowerCase() === skill.toLowerCase()))];
    const nextProfile = nextSkills.length === profile.skills.length ? profile : { ...profile, skills: nextSkills };
    if (nextProfile !== profile) {
      setProfile(nextProfile);
      setSkillInput("");
    }
    analyzeProfile(nextProfile);
  };

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    fetchGap(role, profile.skills).catch((requestError) => setError(requestError.message));
  };

  const handleCareerClick = (role) => {
    handleRoleChange(role);
    document.getElementById("gapHeading")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const removeSkill = (skill) => {
    setProfile((current) => ({ ...current, skills: current.skills.filter((currentSkill) => currentSkill !== skill) }));
  };

  const topCareer = careers[0];
  const score = topCareer ? Math.round(topCareer.score * 100) : 0;
  const coverage = gap?.required.length ? Math.round(((gap.required.length - gap.missing.length) / gap.required.length) * 100) : 0;
  const roadmap = gap?.missing.length ? gap.missing.slice(0, 3) : ["Advanced projects", "System design", "Interview preparation"];

  if (authState.status === "loading") return <main className="auth-loading"><div className="brand-mark">N</div><p>Opening your workspace…</p></main>;
  if (!authState.user) return <AuthScreen onAuthenticated={handleAuthenticated} />;
  if (view === "admin" && authState.user.role === "admin") return <AdminPage user={authState.user} onBack={() => setView("dashboard")} onSignOut={handleSignOut} />;

  return (
    <div className="app-shell">
      <div className="page-glow page-glow-one" />
      <div className="page-glow page-glow-two" />

      <aside className="profile-panel" aria-label="Your profile">
        <div className="brand-lockup"><div className="brand-mark" aria-hidden="true">N</div><div><p className="brand-name">northstar<span>.</span></p><p className="brand-tagline">career intelligence</p></div></div>
        <div className="profile-intro"><p className="eyebrow">Your starting point</p><h2>Shape your next move.</h2><p>Tell us where you are. We’ll help map the way forward.</p></div>

        <form id="profileForm" className="profile-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="name">Your name</label>
          <input id="name" value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} autoComplete="name" />
          <label className="field-label" htmlFor="education">Education</label>
          <select id="education" value={profile.education} onChange={(event) => updateProfile("education", event.target.value)}>{["B.Tech / B.E.", "BCA", "MCA", "B.Sc.", "M.Sc.", "Other"].map((option) => <option key={option}>{option}</option>)}</select>
          <label className="field-label" htmlFor="branch">Specialization</label>
          <input id="branch" value={profile.branch} onChange={(event) => updateProfile("branch", event.target.value)} />
          <div className="field-heading"><label className="field-label" htmlFor="skillInput">Your skills</label><span className="field-hint">Press Enter to add</span></div>
          <div className="skill-input-wrap"><div className="skill-chips" aria-live="polite">{profile.skills.map((skill) => <span className="skill-chip" key={skill}>{skill}<button type="button" aria-label={`Remove ${skill}`} onClick={() => removeSkill(skill)}>×</button></span>)}</div><input id="skillInput" value={skillInput} onChange={(event) => setSkillInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addSkills(skillInput); } }} onBlur={() => { if (skillInput.trim()) addSkills(skillInput); }} placeholder="e.g. React" autoComplete="off" /></div>
          <label className="field-label" htmlFor="interests">What interests you?</label>
          <textarea id="interests" rows="3" value={profile.interests} onChange={(event) => updateProfile("interests", event.target.value)} />
          <label className="field-label" htmlFor="location">Preferred location</label>
          <div className="input-with-icon"><span aria-hidden="true">⌖</span><input id="location" value={profile.location} onChange={(event) => updateProfile("location", event.target.value)} /></div>
          <button className="primary-button profile-submit" type="submit" disabled={loading}><span>{loading ? "Mapping your path…" : "Analyze my path"}</span><span className="button-arrow" aria-hidden="true">↗</span></button>
        </form>
        <div className="sidebar-footer"><span className="status-dot status-dot-muted" /><span>Prototype data · Built for exploration</span></div>
      </aside>

      <main className="dashboard" id="mainContent">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>My career map</strong></div><div className="topbar-actions"><div className="api-status" role="status"><span className={`status-dot status-dot-${apiStatus === "live" ? "live" : apiStatus === "error" ? "error" : "loading"}`} /><span>{apiStatus === "live" ? `Live · ${careerTotal || careers.length || 6} careers mapped` : apiStatus === "error" ? "API connection needs attention" : "Connecting to northstar"}</span></div>{authState.user.role === "admin" && <button className="text-button" type="button" onClick={() => setView("admin")}>Admin</button>}<button className="text-button" type="button" onClick={handleSignOut}>Sign out</button><button className="avatar" type="button" aria-label={`${authState.user.name} profile`}>{initials(authState.user.name)}</button></div></header>
        <section className="welcome-row" aria-labelledby="welcomeTitle"><div><p className="eyebrow accent-eyebrow">AI-powered career mapping</p><h1 id="welcomeTitle">Your next chapter<br /><em>starts with clarity.</em></h1><p className="welcome-copy">A thoughtful view of where your skills can take you next.</p></div><div className="date-stamp"><span className="date-icon" aria-hidden="true">✦</span><span><strong>{profile.name || "Student"}</strong><br />Your map is ready to explore</span></div></section>
        {error && <div className="error-banner" role="alert">{error}</div>}

        <section className="hero-card" aria-labelledby="recommendationTitle"><div className="hero-copy"><div className="card-kicker"><span className="sparkle" aria-hidden="true">✦</span> TOP CAREER SIGNAL</div><h2 id="recommendationTitle">{topCareer?.role ?? "Finding your strongest match…"}</h2><p>{topCareer?.description ?? "We’re comparing your interests with the career library."}</p><div className="hero-meta"><span className="pill pill-warm">{topCareer ? `${score}% fit for your signal` : "Analyzing profile"}</span><span className="hero-meta-note">Based on your current skill mix</span></div></div><div className="score-orbit" style={{ background: `conic-gradient(var(--yellow) ${score * 3.6}deg, rgba(255,255,255,.12) 0deg)` }} aria-label={`${score}% career match`}><div className="score-orbit-inner"><strong>{topCareer ? `${score}%` : "—"}</strong><span>match</span></div></div></section>

        <section className="section-block" aria-labelledby="careerHeading"><div className="section-heading"><div><p className="eyebrow">01 / Direction</p><h2 id="careerHeading">Career paths worth exploring</h2></div><span className="section-count">{careers.length || "—"} paths</span></div><div className="career-list" aria-live="polite">{careers.length === 0 ? <div className="skeleton-list" aria-hidden="true"><span /><span /><span /></div> : careers.map((career, index) => <article className="career-row" key={career.role}><span className="career-rank">0{index + 1}</span><div><h3 className="career-role">{career.role}</h3><p className="career-description">{career.description}</p></div><div className="match-bar-row"><div className="match-bar"><span style={{ width: `${Math.max(2, Math.round(career.score * 100))}%` }} /></div><span className="match-percent">{percent(career.score)}</span></div><button className="career-link" type="button" aria-label={`Use ${career.role} as your target role`} onClick={() => handleCareerClick(career.role)}>↗</button></article>)}</div></section>

        <div className="two-column-grid"><section className="insight-card" aria-labelledby="gapHeading"><div className="section-heading compact-heading"><div><p className="eyebrow">02 / Momentum</p><h2 id="gapHeading">Close the gap</h2></div><span className="target-icon" aria-hidden="true">◎</span></div><label className="select-label" htmlFor="roleSelect">Target role</label><select id="roleSelect" className="role-select" value={selectedRole} onChange={(event) => handleRoleChange(event.target.value)} aria-label="Choose a target career role">{careers.map((career) => <option key={career.role}>{career.role}</option>)}</select><div className="progress-summary"><div><strong>{gap ? `${coverage}%` : "—"}</strong><span>skills covered</span></div><span>{gap ? (gap.missing.length ? `${gap.missing.length} skills to build` : "You’re ready to stretch further") : "Select a role to see your plan"}</span></div><div className="progress-track"><span style={{ width: `${coverage}%` }} /></div><div className="gap-skills" aria-live="polite">{gap?.required.map((skill) => <span className={`gap-skill ${gap.missing.includes(skill) ? "missing" : ""}`} key={skill}>{gap.missing.includes(skill) ? "+ " : "✓ "}{skill}</span>)}</div><div className="roadmap">{roadmap.map((item, index) => <div className="roadmap-item" key={item}><strong>Step 0{index + 1}</strong><span>{item} — learn fundamentals and apply them in a small project.</span></div>)}</div></section>
          <section className="insight-card jobs-card" aria-labelledby="jobsHeading"><div className="section-heading compact-heading"><div><p className="eyebrow">03 / Possibility</p><h2 id="jobsHeading">Roles in your orbit</h2></div><span className="target-icon" aria-hidden="true">↗</span></div><p className="card-supporting-text">A few sample openings that echo your current direction.</p><div className="job-list" aria-live="polite">{jobs.length === 0 ? <div className="skeleton-list skeleton-list-small" aria-hidden="true"><span /><span /><span /></div> : jobs.map((job) => <article className="job-row" key={`${job.title}-${job.company}`}><div><h3 className="job-title">{job.title}</h3><p className="job-company">{job.company} · {job.location}</p></div><strong className="job-match">{Math.round(job.match)}%</strong></article>)}</div><p className="data-note"><span aria-hidden="true">ⓘ</span> Demonstration dataset, not a live job board.</p></section></div>
        <footer className="dashboard-footer"><span>northstar career intelligence</span><span>Build your signal · Follow your curiosity</span></footer>
      </main>
    </div>
  );
}

export default App;
