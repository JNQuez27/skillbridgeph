import { COLORS } from "../styles/theme";

export default function LandingView({ onPickRole }) {
  return (
    <div style={{ minHeight:"100vh" }}>
      <div style={{
        background:`linear-gradient(135deg, ${COLORS.brownDeep} 0%, ${COLORS.brownMid} 50%, ${COLORS.rust} 100%)`,
        padding:"80px 40px 100px", textAlign:"center", position:"relative", overflow:"hidden"
      }}>
        {[320,520,720].map((r,i) => (
          <div key={i} style={{
            position:"absolute", borderRadius:"50%", border:`1px solid rgba(200,144,32,${0.08+i*0.04})`,
            width:r, height:r, top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none"
          }}/>
        ))}
        <div style={{
          display:"inline-block", padding:"6px 18px", borderRadius:20,
          background:"rgba(200,144,32,0.15)", border:"1px solid rgba(200,144,32,0.35)",
          color:COLORS.goldLight, fontSize:12, fontWeight:600, letterSpacing:"0.1em",
          textTransform:"uppercase", marginBottom:24
        }}>Proof-Based Hiring Platform · Philippines</div>
        <h1 style={{
          fontFamily:"'Cinzel', serif", fontSize:"clamp(2rem, 5vw, 3.8rem)",
          color:"#FDF6E8", fontWeight:600, lineHeight:1.15, marginBottom:20, letterSpacing:"0.02em"
        }}>
          Your Skills Are Your<br/>
          <span style={{ color: COLORS.goldLight }}>Resume.</span>
        </h1>
        <p style={{
          color:"rgba(253,246,232,0.75)", fontSize:17, maxWidth:560,
          margin:"0 auto 36px", lineHeight:1.7
        }}>
          SkillBridge PH connects Filipino applicants to employers through verified skills—not paper credentials. Get hired on merit.
        </p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={() => onPickRole("jobseeker")} style={{
            padding:"14px 32px", borderRadius:10, border:"none", cursor:"pointer",
            background: COLORS.gold, color: COLORS.brownDeep, fontWeight:700, fontSize:15,
            fontFamily:"'DM Sans', sans-serif", letterSpacing:"0.02em"
          }}>Find Work → </button>
          <button onClick={() => onPickRole("employer")} style={{
            padding:"14px 32px", borderRadius:10, cursor:"pointer",
            background:"transparent", color:"#FDF6E8", fontWeight:600, fontSize:15,
            border:"1.5px solid rgba(253,246,232,0.4)", fontFamily:"'DM Sans', sans-serif"
          }}>Hire Talent</button>
        </div>
        <div style={{
          display:"flex", justifyContent:"center", gap:40, marginTop:60,
          borderTop:"1px solid rgba(200,144,32,0.2)", paddingTop:32, flexWrap:"wrap"
        }}>
          {[["12,400+","Verified Applicants"],["850+","Partner Companies"],["94%","Placement Rate"],["48hrs","Avg. Time to Hire"]].map(([v,l]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, fontWeight:700, color:COLORS.goldLight }}>{v}</div>
              <div style={{ fontSize:12, color:"rgba(253,246,232,0.6)", marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:"60px 40px", maxWidth:1100, margin:"0 auto" }}>
        <h2 style={{
          fontFamily:"'Playfair Display', serif", fontSize:32, textAlign:"center",
          color:COLORS.brownDeep, marginBottom:12
        }}>How SkillBridge PH Works</h2>
        <p style={{ textAlign:"center", color:COLORS.textLight, marginBottom:48 }}>
          A 5-step system replacing guesswork with verified data
        </p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:20 }}>
          {[
            { num:"01", title:"Create Profile", desc:"Build your digital identity with skills, portfolio, and education details." },
            { num:"02", title:"Verify Skills", desc:"Complete task-based assessments and earn trusted skill badges." },
            { num:"03", title:"Get Matched", desc:"Our algorithm pairs you with jobs matching your verified skills and location." },
            { num:"04", title:"Apply & Chat", desc:"Apply in one tap. Communicate directly with shortlisting employers." },
            { num:"05", title:"Get Hired", desc:"Employers decide based on real performance data—not your school name." },
          ].map(f => (
            <div key={f.num} className="card-hover" style={{
              background:COLORS.cream, borderRadius:14, padding:"24px 20px",
              border:`1px solid ${COLORS.parchmentDeep}`, cursor:"default"
            }}>
              <div style={{
                fontFamily:"'Cinzel', serif", fontSize:28, fontWeight:600,
                color:COLORS.parchmentDeep, marginBottom:12
              }}>{f.num}</div>
              <div style={{ fontSize:15, fontWeight:600, color:COLORS.brownMid, marginBottom:8 }}>{f.title}</div>
              <div style={{ fontSize:13, color:COLORS.textLight, lineHeight:1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background:COLORS.brownDeep, padding:"60px 40px" }}>
        <div style={{ maxWidth:900, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
          {[
            { title:"For Applicants", cta:"Start Free", nav:"jobseeker",
              items:["Free profile & skill verification","Smart job matching","Direct employer messaging","Track application status"] },
            { title:"For Employers", cta:"Post Jobs", nav:"employer",
              items:["Post jobs & define skill requirements","Access pre-screened candidates","Filter by verified score + location","Subscription, pay-per-hire, or boost"] },
          ].map(r => (
            <div key={r.title} style={{
              background:"rgba(253,246,232,0.06)", borderRadius:16, padding:"32px 28px",
              border:`1px solid rgba(200,144,32,0.2)`
            }}>
              <h3 style={{
                fontFamily:"'Playfair Display', serif", fontSize:22, color:COLORS.goldLight, marginBottom:20
              }}>{r.title}</h3>
              {r.items.map(item => (
                <div key={item} style={{
                  display:"flex", alignItems:"flex-start", gap:10, marginBottom:12
                }}>
                  <span style={{ color:COLORS.gold, fontSize:14, marginTop:1 }}>✦</span>
                  <span style={{ color:"rgba(253,246,232,0.8)", fontSize:13, lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
              <button onClick={() => onPickRole(r.nav)} style={{
                marginTop:20, padding:"12px 24px", borderRadius:8, border:`1.5px solid ${COLORS.gold}`,
                background:"transparent", color:COLORS.goldLight, fontWeight:600, fontSize:13,
                cursor:"pointer", fontFamily:"'DM Sans', sans-serif"
              }}>{r.cta} →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
