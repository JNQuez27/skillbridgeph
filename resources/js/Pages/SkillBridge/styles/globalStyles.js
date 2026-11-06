// Fonts are loaded non-render-blocking from the page <head> (see resources/views/app.blade.php).
export const globalStyles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* Touch targets: every control at least 44px tall (WCAG 2.5.5). */
  button, select, input:not([type=checkbox]):not([type=radio]) { min-height: 44px; }
  /* On phones the account button shows only the avatar, so long names never push the menu off-screen. */
  @media (max-width: 480px) { .sbph-username { display: none; } .sbph-usertrigger { padding: 4px; } }
  body { font-family: 'DM Sans', sans-serif; background: #EAF6FF; color: #0B1D3A; }
  /* Scrollbar themed to the blue palette (accent #0369A1 on light #E0F2FE track) */
  html { scrollbar-color: #0369A1 #E0F2FE; scrollbar-width: thin; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: #E0F2FE; }
  ::-webkit-scrollbar-thumb { background: #0369A1; border-radius: 6px; border: 2px solid #E0F2FE; }
  ::-webkit-scrollbar-thumb:hover { background: #075985; }
  .sbph-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
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
    padding: 13px 2px;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .sbph-nav-link::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 6px;
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

  /* ---- Responsive navbar ---- */
  .sbph-nav { position: sticky; top: 0; z-index: 100; background: #F7FBFF; border-bottom: 1px solid #BDDFFF; height: 64px; display: flex; align-items: center; padding: 0 clamp(16px, 4vw, 40px); }
  .sbph-nav-wrap { width: 100%; max-width: 1240px; margin: 0 auto; display: flex; align-items: center; gap: 16px; }
  .sbph-brand { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
  .sbph-brand-icon { width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0B1D3A, #2F7DE1, #56A0F0); background-size: 200% 200%; animation: sbphGradientShift 4s ease-in-out infinite alternate; box-shadow: 0 4px 14px rgba(47,125,225,0.30); transition: transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease; flex-shrink: 0; }
  .sbph-brand-icon svg { width: 24px; height: 24px; display: block; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.12)); }
  .sbph-brand:hover .sbph-brand-icon { transform: scale(1.06) rotate(-2deg); box-shadow: 0 8px 24px rgba(47,125,225,0.45); }
  .sbph-brand-text { font-size: clamp(16px, 2.4vw, 20px); font-weight: 800; letter-spacing: -0.3px; color: #0B1D3A; display: inline-flex; align-items: center; gap: 3px; }
  .sbph-brand-ph { background: linear-gradient(135deg, #2F7DE1, #0B1D3A); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; transition: background 0.3s ease; }
  .sbph-brand:hover .sbph-brand-ph { background: linear-gradient(135deg, #0B1D3A, #2F7DE1); -webkit-background-clip: text; background-clip: text; color: transparent; }
  @keyframes sbphGradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
  .sbph-nav-center { display: flex; align-items: center; gap: 20px; flex: 1; justify-content: center; font-size: 12px; font-weight: 600; }
  @media (max-width: 1180px) { .sbph-nav-center { gap: 10px; } .sbph-username { display: none; } .sbph-usertrigger { padding: 4px; } }
  .sbph-nav-actions { display: flex; align-items: center; gap: 10px; margin-left: auto; }
  .sbph-bottomnav { display: none; }
  @media (max-width: 640px) {
    .sbph-bottomnav { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 70; background: #fff; border-top: 1px solid #BAE6FD; box-shadow: 0 -6px 20px rgba(12,74,110,0.08); padding: 4px 4px calc(4px + env(safe-area-inset-bottom)); }
    .sbph-bottomnav-item { flex: 1; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-size: 11px; font-weight: 600; color: #475569; text-decoration: none; border-radius: 10px; }
    .sbph-bottomnav-item.active { color: #0369A1; background: #F0F9FF; }
    .sbph-bottomnav-item:focus-visible { outline: 2px solid #0369A1; outline-offset: -2px; }
    .sbph-main--bottomnav { padding-bottom: 76px; }
    .sbph-applicant-page { padding: 18px 16px !important; }
    .sbph-profile-hero:not(.keep) { display: none !important; }
  }
  .sbph-bell { position: relative; width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; border: 1px solid #BDDFFF; background: transparent; color: #0C4A6E; cursor: pointer; transition: border-color 0.2s ease, box-shadow 0.2s ease; }
  .sbph-bell:hover { border-color: #0369A1; box-shadow: 0 4px 14px rgba(3,105,161,0.12); }
  .sbph-bell:focus-visible, .sbph-bell-item:focus-visible { outline: 2px solid #0369A1; outline-offset: 2px; }
  .sbph-bell-count { position: absolute; top: 4px; right: 4px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #B91C1C; color: #fff; font-size: 11px; font-weight: 700; line-height: 18px; text-align: center; }
  .sbph-bell-panel { position: absolute; top: calc(100% + 10px); right: 0; width: min(340px, calc(100vw - 32px)); background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 18px 40px rgba(11,29,58,0.16); z-index: 10; overflow: hidden; }
  .sbph-bell-item { display: flex; gap: 10px; align-items: flex-start; width: 100%; text-align: left; padding: 10px; border: none; background: transparent; border-radius: 10px; cursor: pointer; font-family: inherit; min-height: 44px; }
  .sbph-bell-item:hover { background: #F0F9FF; }
  .sbph-bell-dot { width: 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: #0369A1; flex-shrink: 0; }
  @media (max-width: 480px) { .sbph-bell-panel { position: fixed; top: 68px; right: 16px; } }
  .sbph-auth-cta { display: flex; align-items: center; gap: 10px; }
  .sbph-cta { text-decoration: none; padding: 9px 15px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; transition: background 0.2s ease, border-color 0.2s ease, transform 0.12s ease; }
  .sbph-cta:active { transform: translateY(1px); }
  .sbph-cta--ghost { color: #0B1D3A; border: 1px solid #BDDFFF; }
  .sbph-cta--ghost:hover { border-color: #2F7DE1; }
  .sbph-cta--solid { color: #F7FBFF; background: #0B1D3A; }
  .sbph-cta--solid:hover { background: #1C3B66; }
  .sbph-hamburger { display: none; width: 44px; height: 44px; border-radius: 12px; border: 1px solid #BDDFFF; background: #F7FBFF; cursor: pointer; align-items: center; justify-content: center; flex-direction: column; gap: 4px; transition: border-color 0.2s ease; flex-shrink: 0; }
  .sbph-hamburger:hover { border-color: #2F7DE1; }
  .sbph-hamburger span { display: block; width: 18px; height: 2px; background: #0B1D3A; border-radius: 2px; transition: transform 0.25s ease, opacity 0.2s ease; }
  .sbph-hamburger[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
  .sbph-hamburger[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
  .sbph-hamburger[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
  .sbph-drawer { position: sticky; top: 64px; z-index: 99; background: #F7FBFF; border-bottom: 1px solid #BDDFFF; overflow: hidden; max-height: 0; transition: max-height 0.32s cubic-bezier(0.22,1,0.36,1); }
  .sbph-drawer.open { max-height: 400px; }
  .sbph-drawer-inner { display: flex; flex-direction: column; gap: 2px; padding: 10px clamp(16px, 4vw, 40px) 18px; }
  .sbph-drawer .sbph-nav-link { padding: 13px 4px; font-size: 15px; }
  .sbph-drawer .sbph-nav-link::after { bottom: 6px; }
  .sbph-drawer-cta { display: flex; gap: 10px; margin-top: 10px; }
  .sbph-drawer-cta .sbph-cta { flex: 1; text-align: center; padding: 12px 16px; }
  @media (max-width: 1000px) {
    .sbph-nav-center { display: none; }
    .sbph-auth-cta { display: none; }
    .sbph-hamburger { display: inline-flex; }
  }
  @media (min-width: 1001px) {
    .sbph-drawer { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sbph-hamburger span, .sbph-drawer { transition: none; }
    .sbph-brand-icon { animation: none; }
  }
`;
