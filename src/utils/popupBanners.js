// Popup ad banners. The admin can publish several banners; the popup shows them as a slider.
// Older configs had one banner stored in the top-level fields; they still read as one slide.

export const MAX_POPUP_BANNERS = 5;

const BANNER_FIELDS = ['title', 'description', 'imageUrl', 'buttonText', 'buttonLink', 'badge'];

export const emptyPopupBanner = () => ({
  id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  enabled: true,
  title: '',
  description: '',
  imageUrl: '',
  buttonText: '',
  buttonLink: '#catalog',
  badge: '',
});

const toBanner = (b, i) => {
  const out = { id: String(b?.id || `b${i}`), enabled: b?.enabled !== false };
  BANNER_FIELDS.forEach((k) => { out[k] = String(b?.[k] ?? (k === 'buttonLink' ? '#catalog' : '')); });
  if (!out.buttonLink) out.buttonLink = '#catalog';
  return out;
};

// Every banner in the config (on and off), in order. The realtime database can hand an
// array back as an object with numeric keys, so both shapes are accepted.
export const getAllPopupBanners = (cfg) => {
  if (!cfg) return [];
  const raw = cfg.banners;
  if (raw && typeof raw === 'object') {
    const list = Array.isArray(raw)
      ? raw
      : Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);
    return list.filter(Boolean).map(toBanner);
  }
  const legacy = toBanner(cfg, 0);
  return BANNER_FIELDS.some((k) => k !== 'buttonLink' && legacy[k]) ? [legacy] : [];
};

const hasContent = (b) => Boolean(b.imageUrl || b.title || b.description);

// Banners visitors should see: switched on and with something to show.
export const getActivePopupBanners = (cfg) => getAllPopupBanners(cfg).filter((b) => b.enabled && hasContent(b));
