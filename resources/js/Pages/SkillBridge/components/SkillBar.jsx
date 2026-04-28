import { COLORS } from "../styles/theme";

export default function SkillBar({ skill }) {
  const isVerified = skill.verification?.status === "verified";
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:500, color:COLORS.textDark }}>{skill.name}</span>
          {isVerified && <span className="sbph-badge badge-verified" style={{fontSize:9}}>✓ Verified</span>}
        </div>
        <span style={{ fontSize:12, fontWeight:600, color:COLORS.brownLight }}>{skill.level}%</span>
      </div>
      <div style={{ background: COLORS.parchmentDeep, borderRadius:6, height:6, overflow:"hidden" }}>
        <div style={{
          width:`${skill.level}%`, height:"100%", borderRadius:6,
          background:`linear-gradient(90deg, ${COLORS.rust}, ${COLORS.gold})`,
          transition:"width 0.8s ease"
        }}/>
      </div>
    </div>
  );
}
