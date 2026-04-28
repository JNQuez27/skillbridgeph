import { COLORS } from "../styles/theme";

export default function Pill({ children, color = COLORS.brownMid, bg = COLORS.parchmentDark }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", padding:"2px 10px",
      borderRadius:20, fontSize:11, fontWeight:600, letterSpacing:"0.03em",
      background: bg, color, border:`1px solid ${color}22`, whiteSpace:"nowrap"
    }}>{children}</span>
  );
}
