import { useState } from "react";
import { COLORS } from "../styles/theme";
import { mockJobs } from "../data/mockData";
import Pill from "../components/Pill";

export default function JobsView() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const filters = ["All","Full-time","Part-time","Remote","Davao"];
  const filtered = mockJobs.filter(j =>
    (!search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase())) &&
    (filter === "All" || j.type.includes(filter) || j.location.includes(filter))
  );

  return (
    <div style={{ padding:"28px 32px" }}>
      <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, color:COLORS.brownDeep, marginBottom:6 }}>Browse Opportunities</h2>
      <p style={{ color:COLORS.textLight, fontSize:13, marginBottom:22 }}>Matched by your verified skill profile</p>

      <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search jobs or companies…"
          style={{
            flex:1, minWidth:200, padding:"10px 16px", borderRadius:9,
            border:`1.5px solid ${COLORS.parchmentDeep}`, background:COLORS.cream,
            fontSize:13, fontFamily:"'DM Sans', sans-serif", color:COLORS.textDark,
            outline:"none"
          }}
        />
        {filters.map(f => (
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"8px 16px", borderRadius:20, border:`1.5px solid ${filter===f ? COLORS.rust : COLORS.parchmentDeep}`,
            background: filter===f ? COLORS.rust : "transparent",
            color: filter===f ? COLORS.cream : COLORS.textMid,
            fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans', sans-serif"
          }}>{f}</button>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns: selected ? "1fr 380px":"1fr", gap:20 }}>
        <div>
          {filtered.map(job => (
            <div key={job.id} onClick={()=>setSelected(selected?.id===job.id ? null : job)}
              className="card-hover" style={{
                background: selected?.id===job.id ? COLORS.brownMid : COLORS.cream,
                borderRadius:12, padding:"20px 22px", marginBottom:12,
                border:`1.5px solid ${selected?.id===job.id ? COLORS.rust : COLORS.parchmentDeep}`,
                cursor:"pointer", transition:"all 0.2s"
              }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:5 }}>
                    <span style={{ fontSize:16, fontWeight:600, color: selected?.id===job.id ? COLORS.parchment : COLORS.brownDeep }}>{job.title}</span>
                    {job.verified && <span className="sbph-badge badge-verified" style={{fontSize:9}}>✓ Verified</span>}
                  </div>
                  <div style={{ fontSize:13, color: selected?.id===job.id ? COLORS.parchmentDark : COLORS.textMid, marginBottom:10 }}>
                    {job.company} · {job.location} · {job.type} · {job.posted}
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {job.skills.map(s => (
                      <Pill key={s} color={selected?.id===job.id ? COLORS.parchment : COLORS.brownMid}
                        bg={selected?.id===job.id ? "rgba(253,246,232,0.1)" : COLORS.parchmentDark}>
                        {s}
                      </Pill>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign:"right", marginLeft:16 }}>
                  <div style={{
                    fontFamily:"'Playfair Display', serif", fontSize:26, fontWeight:700,
                    color: job.match >= 90 ? "#7AC050" : job.match >= 75 ? COLORS.goldLight : COLORS.brownLight
                  }}>{job.match}%</div>
                  <div style={{ fontSize:10, color: selected?.id===job.id ? COLORS.parchmentDark : COLORS.textLight }}>skill match</div>
                  <div style={{ fontSize:13, fontWeight:600, color: selected?.id===job.id ? COLORS.goldLight : COLORS.rustBright, marginTop:6 }}>{job.salary}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div style={{
            background:COLORS.cream, borderRadius:14, padding:"24px 22px",
            border:`1.5px solid ${COLORS.parchmentDeep}`, height:"fit-content",
            position:"sticky", top:100
          }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <span className="sbph-badge badge-open">Open</span>
              <button onClick={()=>setSelected(null)} style={{
                background:"transparent", border:"none", color:COLORS.textLight,
                cursor:"pointer", fontSize:18, lineHeight:1
              }}>×</button>
            </div>
            <h3 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, color:COLORS.brownDeep, marginBottom:4, marginTop:10 }}>
              {selected.title}
            </h3>
            <p style={{ color:COLORS.textMid, fontSize:13, marginBottom:16 }}>{selected.company}</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
              {[["📍 Location", selected.location],["💼 Type", selected.type],["💰 Salary", selected.salary],["📅 Posted", selected.posted]].map(([k,v]) => (
                <div key={k} style={{ background:COLORS.parchment, borderRadius:8, padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:COLORS.textLight, marginBottom:3 }}>{k.split(" ")[0]}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:COLORS.textDark }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:12, fontWeight:600, color:COLORS.textMid, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Required Skills</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {selected.skills.map(s => <Pill key={s}>{s}</Pill>)}
              </div>
            </div>
            <div style={{ background: `${COLORS.success}12`, border:`1px solid ${COLORS.success}30`, borderRadius:10, padding:"12px 14px", marginBottom:18 }}>
              <div style={{ fontSize:11, color:COLORS.success, fontWeight:600, marginBottom:4 }}>YOUR SKILL MATCH</div>
              <div style={{ fontFamily:"'Playfair Display', serif", fontSize:28, color:COLORS.success, fontWeight:700 }}>{selected.match}%</div>
              <div style={{ fontSize:11, color:COLORS.textLight, marginTop:2 }}>Based on your verified badges</div>
            </div>
            <button style={{
              width:"100%", padding:"13px", borderRadius:10, border:"none",
              background:`linear-gradient(90deg, ${COLORS.rust}, ${COLORS.brownMid})`,
              color:COLORS.cream, fontWeight:700, fontSize:14, cursor:"pointer",
              fontFamily:"'DM Sans', sans-serif", letterSpacing:"0.03em"
            }}>Apply Now →</button>
            <button style={{
              width:"100%", padding:"10px", borderRadius:10, marginTop:8,
              border:`1.5px solid ${COLORS.brownLight}`, background:"transparent",
              color:COLORS.brownLight, fontWeight:500, fontSize:13, cursor:"pointer",
              fontFamily:"'DM Sans', sans-serif"
            }}>Save Job</button>
          </div>
        )}
      </div>
    </div>
  );
}
