const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&family=Cinzel:wght@400;600&display=swap');
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
`;
