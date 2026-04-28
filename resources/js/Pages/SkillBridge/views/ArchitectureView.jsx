import { COLORS } from "../styles/theme";

export default function ArchitectureView() {
  return (
    <div style={{ padding:"28px 32px" }}>
      <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, color:COLORS.brownDeep, marginBottom:6 }}>System Architecture</h2>
      <p style={{ color:COLORS.textLight, fontSize:13, marginBottom:28 }}>Laravel 11 · REST API · MySQL · Redis · Inertia React</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
        {[
          {
            icon:"⚙️", title:"Backend Stack", color: COLORS.brownMid, items:[
              "Laravel 11 (PHP 8.3) · REST API",
              "Sanctum · JWT Authentication",
              "Laravel Queues (Redis) for async tasks",
              "Horizon for job monitoring",
              "Eloquent ORM · Repository Pattern",
              "Spatie Permission (RBAC)",
            ]
          },
          {
            icon:"🖥️", title:"Frontend Stack", color: COLORS.rust, items:[
              "React + Inertia.js SPA",
              "Vite build system",
              "Zustand or Context state management",
              "Laravel Echo + Pusher (real-time)",
              "Axios HTTP client",
              "Tailwind CSS (custom parchment theme)",
            ]
          },
          {
            icon:"🗄️", title:"Database & Cache", color: COLORS.info, items:[
              "MySQL 8.0 · Primary data store",
              "Redis · Sessions, cache, queues",
              "Elasticsearch · Full-text job search",
              "Laravel Scout (search integration)",
              "Cloudinary · File & portfolio storage",
              "DB Indexing on skills, location, match_score",
            ]
          },
          {
            icon:"☁️", title:"DevOps & Deployment", color: COLORS.success, items:[
              "Docker + docker-compose",
              "AWS EC2 (App) · RDS (MySQL) · ElastiCache",
              "Nginx reverse proxy · SSL via Certbot",
              "GitHub Actions CI/CD pipeline",
              "Laravel Telescope (debugging)",
              "Sentry · Error monitoring",
            ]
          },
        ].map(block => (
          <div key={block.title} style={{ background:COLORS.cream, borderRadius:12, padding:"20px", border:`1px solid ${COLORS.parchmentDeep}` }}>
            <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
              <span style={{ fontSize:22 }}>{block.icon}</span>
              <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:16, color:COLORS.brownDeep }}>{block.title}</h4>
            </div>
            {block.items.map(item => (
              <div key={item} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
                <span style={{ color:block.color, fontSize:10, marginTop:4, flexShrink:0 }}>◆</span>
                <span style={{ fontSize:12, color:COLORS.textMid, lineHeight:1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ background:COLORS.cream, borderRadius:12, padding:"22px 24px", border:`1px solid ${COLORS.parchmentDeep}`, marginBottom:20 }}>
        <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, color:COLORS.brownDeep, marginBottom:18 }}>Core Database Tables</h4>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:14 }}>
          {[
            { table:"users", fields:["id","name","email","password","role","location","avatar_url","created_at"] },
            { table:"skills", fields:["id","name","category","description","is_active"] },
            { table:"user_skills", fields:["id","user_id FK","skill_id FK","level","is_verified","badge","verified_at"] },
            { table:"jobs", fields:["id","employer_id FK","title","description","location","salary_min","salary_max","type","is_active"] },
            { table:"job_skills", fields:["job_id FK","skill_id FK","weight","is_required"] },
            { table:"applications", fields:["id","user_id FK","job_id FK","status","match_score","applied_at"] },
            { table:"assessments", fields:["id","skill_id FK","user_id FK","score","status","completed_at"] },
            { table:"messages", fields:["id","sender_id FK","receiver_id FK","application_id FK","body","read_at"] },
          ].map(t => (
            <div key={t.table} style={{ background:COLORS.parchment, borderRadius:10, overflow:"hidden", border:`1px solid ${COLORS.parchmentDeep}` }}>
              <div style={{ background:COLORS.brownMid, padding:"9px 14px" }}>
                <span style={{ fontFamily:"'DM Sans', sans-serif", fontSize:12, fontWeight:700, color:COLORS.goldLight, letterSpacing:"0.05em" }}>
                  {t.table.toUpperCase()}
                </span>
              </div>
              {t.fields.map(f => (
                <div key={f} style={{
                  padding:"5px 14px", fontSize:11, color:COLORS.textMid,
                  borderBottom:`1px solid ${COLORS.parchmentDeep}44`,
                  fontFamily:"'DM Sans', monospace"
                }}>
                  {f.includes("FK") ? <><span style={{ color:COLORS.rust }}>{f.replace(" FK","")}</span> <span style={{ color:COLORS.textLight, fontSize:9 }}>FK</span></> :
                   f==="id" ? <span style={{ color:COLORS.gold, fontWeight:600 }}>{f}</span> : f}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:COLORS.cream, borderRadius:12, padding:"22px 24px", border:`1px solid ${COLORS.parchmentDeep}` }}>
        <h4 style={{ fontFamily:"'Playfair Display', serif", fontSize:18, color:COLORS.brownDeep, marginBottom:16 }}>Security & Matching Logic</h4>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:COLORS.textMid, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Security Layer</div>
            {["Laravel Sanctum (API tokens) + optional OAuth2","RBAC: job_seeker | employer | admin via Spatie","Rate limiting on login & assessment endpoints","HTTPS enforced · CSRF protection on all forms","Input sanitization · SQL injection prevention via Eloquent","PII encryption at rest (email, phone)"].map(i => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:7 }}>
                <span style={{ color:COLORS.success, fontSize:11, marginTop:3 }}>✓</span>
                <span style={{ fontSize:12, color:COLORS.textMid }}>{i}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:COLORS.textMid, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Matching Algorithm</div>
            {[
              ["Skill Score", "40%", "Verified badge weight"],
              ["Assessment Score", "30%", "Task performance"],
              ["Location Relevance", "15%", "km-based distance"],
              ["Profile Completeness", "10%", "Portfolio + bio"],
              ["Experience Level", "5%", "Years / projects"],
            ].map(([k,pct,desc]) => (
              <div key={k} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, color:COLORS.textDark, fontWeight:500 }}>{k}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:COLORS.rust }}>{pct}</span>
                </div>
                <div style={{ background:COLORS.parchmentDeep, borderRadius:4, height:5 }}>
                  <div style={{ width:pct, height:"100%", borderRadius:4, background:`linear-gradient(90deg, ${COLORS.rust}, ${COLORS.gold})` }}/>
                </div>
                <div style={{ fontSize:10, color:COLORS.textLight, marginTop:2 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
