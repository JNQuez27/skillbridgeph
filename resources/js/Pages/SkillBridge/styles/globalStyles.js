const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=Cinzel:wght@400;600&family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');
`;

export const globalStyles = `
  ${fonts}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F5E2B8; color: #1E0E04; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #E8CFA0; }
  ::-webkit-scrollbar-thumb { background: #A06030; border-radius: 3px; }
  .sbph-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .badge-verified { background: #4A7A30; color: #D4F0B8; }
  .badge-open { background: #2858A0; color: #C8DFF8; }
  .badge-premium { background: #9A3018; color: #FFD8C0; }
  .badge-pending { background: #7A4A20; color: #F0D0A0; }
  .badge-hired { background: #2A6A2A; color: #C0F0C0; }
  .card-hover:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(30,14,4,0.18); transition: all 0.25s; }
  .sbph-nav-link {
    position: relative;
    color: #2A4A73;
    text-decoration: none;
    padding: 4px 2px;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .sbph-nav-link::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: -6px;
    height: 2px;
    width: 100%;
    background: #0369A1;
    border-radius: 2px;
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.28s cubic-bezier(0.22,1,0.36,1);
  }
  .sbph-nav-link:hover { color: #0B1D3A; }
  .sbph-nav-link:hover::after { transform: scaleX(1); }
  .sbph-nav-link.active { color: #0B1D3A; font-weight: 700; }
  .sbph-nav-link.active::after { transform: scaleX(1); background: #0369A1; }
  @media (prefers-reduced-motion: reduce) {
    .sbph-nav-link::after { transition: none; }
  }
  .sbph-usertrigger { display: flex; align-items: center; gap: 10px; background: transparent; border: 1px solid #BDDFFF; border-radius: 999px; padding: 4px 6px 4px 14px; cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .sbph-usertrigger:hover { border-color: #0369A1; box-shadow: 0 4px 14px rgba(3,105,161,0.12); }
  .sbph-menu-item { display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; color: #1C3B66; transition: background 0.18s ease, color 0.18s ease; font-family: 'Source Sans 3', 'DM Sans', sans-serif; }
  .sbph-menu-item:hover { background: #EAF6FF; color: #0B1D3A; }
  .sbph-menu-item.active { background: #0369A1; color: #fff; }
  .sbph-menu-item svg { flex-shrink: 0; }
  .sbph-menu-item--danger { color: #B91C1C; }
  .sbph-menu-item--danger:hover { background: #FEF2F2; color: #991B1B; }
`;
