import React from 'react';

// Official MADS social pages. Brand icons are inline SVG (lucide has no brand icons).
export const SOCIAL_LINKS = [
  {
    key: 'youtube',
    label: 'YouTube',
    handle: '@gamingmads3865',
    href: 'https://www.youtube.com/@gamingmads3865',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    handle: '@xgamingmads',
    href: 'https://www.tiktok.com/@xgamingmads',
  },
];

export const YouTubeIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
  </svg>
);

export const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 0 0-.8-.1 5.7 5.7 0 1 0 5.7 5.7V9a7.4 7.4 0 0 0 4.3 1.4V7.3a4.3 4.3 0 0 1-3.2-1.5Z" />
  </svg>
);

export const SOCIAL_ICONS = { youtube: YouTubeIcon, tiktok: TikTokIcon };

// Round icon buttons, used in the footer.
export const SocialIconRow = ({ className = '' }) => (
  <div className={`soc-row ${className}`}>
    {SOCIAL_LINKS.map(({ key, label, href }) => {
      const Icon = SOCIAL_ICONS[key];
      return (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`MADS TOPUP on ${label}`}
          title={label}
          className={`soc-btn is-${key}`}
        >
          <Icon />
        </a>
      );
    })}
  </div>
);
