import { COLORS } from "../styles/theme";

export default function StatCard({ label, value, icon, color = COLORS.rust, helper }) {
  return (
    <div style={{
      background: COLORS.cream, borderRadius:12, padding:"16px 20px",
      border:`1px solid ${COLORS.parchmentDeep}`, flex:1, minWidth:120
    }}>
      {icon && <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>}
      <div style={{ fontSize:24, fontWeight:700, color, fontFamily:"'Playfair Display', serif" }}>{value}</div>
      <div style={{ fontSize:12, color: COLORS.textLight, marginTop:2 }}>{label}</div>
      {helper && <div style={{ fontSize:11, color: COLORS.textLight, marginTop:6 }}>{helper}</div>}
    </div>
  );
}
