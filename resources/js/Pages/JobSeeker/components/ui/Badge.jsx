// Every chip is orange with white text (callers may still pass `tone`; it is ignored).
export default function Badge({ children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-[#ECA406] text-white`}>
      {children}
    </span>
  );
}
