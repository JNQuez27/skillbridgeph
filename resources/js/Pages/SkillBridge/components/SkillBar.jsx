import { IconCheck } from "./Icons";

export default function SkillBar({ skill }) {
  const isVerified = skill.verification?.status === "verified";
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:500, color:"#0C4A6E" }}>{skill.name}</span>
          {isVerified && (
            <span
              className="sbph-badge"
              style={{ fontSize:9, gap:4, background:"#DCFCE7", color:"#15803D" }}
            >
              <IconCheck size={10} /> Verified
            </span>
          )}
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:"#0369A1" }}>{skill.level}%</span>
      </div>
      <div style={{ background:"#E0F2FE", borderRadius:6, height:6, overflow:"hidden" }}>
        <div style={{
          width:`${skill.level}%`, height:"100%", borderRadius:6,
          background:"linear-gradient(90deg, #0369A1, #16A34A)",
          transition:"width 0.8s ease"
        }}/>
      </div>
    </div>
  );
}
