/** Shared canvas / UI layout — mobile uses a shorter stage so FIT scales UI larger on phones. */

export function isTouchLayout(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('desktop') === '1') return false;
  if (params.get('mobile') === '1') return true;
  const ua = navigator.userAgent || '';
  const touch =
    'ontouchstart' in window ||
    (navigator.maxTouchPoints ?? 0) > 0 ||
    /iPhone|iPad|iPod|Android/i.test(ua);
  // iPadOS 13+ may report as Mac — treat multi-touch Mac-sized phones/tablets as mobile UI
  const iPadOs =
    /Macintosh/i.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 700;
  return touch || iPadOs || narrow;
}

export type Layout = {
  mobile: boolean;
  width: number;
  height: number;
  sidebarW: number;
  footerH: number;
  touchBarH: number;
  hudFont: string;
  hudFontSm: string;
  titleFont: string;
  btnW: number;
  btnH: number;
  btnFont: string;
  rosterFont: string;
  rosterLine: number;
  boardTop: number;
  boardMaxH: number;
};

export function getLayout(): Layout {
  const mobile = isTouchLayout();
  if (mobile) {
    return {
      mobile: true,
      // Smaller stage → FIT scales UI larger on phones
      width: 700,
      height: 400,
      sidebarW: 150,
      footerH: 0,
      touchBarH: 70,
      hudFont: '17px',
      hudFontSm: '14px',
      titleFont: '24px',
      btnW: 96,
      btnH: 56,
      btnFont: '17px',
      rosterFont: '15px',
      rosterLine: 24,
      boardTop: 72,
      boardMaxH: 240,
    };
  }
  return {
    mobile: false,
    width: 1120,
    height: 720,
    sidebarW: 236,
    footerH: 36,
    touchBarH: 40,
    hudFont: '13px',
    hudFontSm: '12px',
    titleFont: '24px',
    btnW: 88,
    btnH: 32,
    btnFont: '13px',
    rosterFont: '12px',
    rosterLine: 16,
    boardTop: 100,
    boardMaxH: 520,
  };
}
