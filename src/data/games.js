export const GAMES_DATA = [
  {
    id: 'freefire',
    name: 'Free Fire',
    category: 'Battle Royale',
    publisher: 'Garena',
    currencyName: 'Diamonds',
    currencyIcon: '💎',
    badge: 'HOT & INSTANT',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    logo: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png',
    gradient: 'from-red-600 via-rose-500 to-amber-500',
    requiresServer: false,
    idLabel: 'Player ID (UID)',
    idPlaceholder: 'e.g. 248901234',
    popular: true,
    moongoldCode: 'FREEFIRE_SG',
    packages: [
      { id: 'ff-10', name: '10 Diamonds', amount: 10, bonus: '', priceLkr: 35, priceUsd: 0.12, image: '/product_images/prod_10_Diamonds_1768964623_diamondpng.png', isPopular: false },
      { id: 'ff-100', name: '100 Diamonds', amount: 100, bonus: '10 Bonus', priceLkr: 320, priceUsd: 1.10, image: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png', isPopular: false },
      { id: 'ff-210', name: '210 Diamonds', amount: 210, bonus: '21 Bonus', priceLkr: 640, priceUsd: 2.10, image: '/product_images/prod_220_Diamonds_1768964821_diamondpng.png', isPopular: false },
      { id: 'ff-530', name: '530 Diamonds', amount: 530, bonus: '53 Bonus', priceLkr: 1580, priceUsd: 5.20, image: '/product_images/prod_520_1769709482_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: true },
      { id: 'ff-1080', name: '1,080 Diamonds', amount: 1080, bonus: '108 Bonus', priceLkr: 3150, priceUsd: 10.40, image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false },
      { id: 'ff-weekly', name: 'Weekly Membership', amount: 450, bonus: 'Daily Rewards', priceLkr: 650, priceUsd: 2.15, image: '/product_images/prod_FWeekly_Card_1768964388_PhotoshopExtension_Image_5.png', isPopular: true, isSpecial: true },
      { id: 'ff-monthly', name: 'Monthly Membership', amount: 2600, bonus: 'Super Discount', priceLkr: 3200, priceUsd: 10.50, image: '/product_images/prod_FMonthly_Card_1768964434_PhotoshopExtension_Image_5.png', isPopular: false, isSpecial: true }
    ]
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    category: 'Battle Royale',
    publisher: 'Tencent Games',
    currencyName: 'UC',
    currencyIcon: '🪙',
    badge: 'AUTOMATED 24/7',
    banner: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    logo: '/product_images/prod_60UC_1769659496_prod_UC1800_1768626430_prod.webp',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    requiresServer: false,
    idLabel: 'Character ID (5-12 Digits)',
    idPlaceholder: 'e.g. 5123984712',
    popular: true,
    moongoldCode: 'PUBGM_GLOBAL',
    packages: [
      { id: 'pubg-60', name: '60 UC', amount: 60, bonus: '', priceLkr: 360, priceUsd: 1.15, image: '/product_images/prod_60UC_1769659496_prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-325', name: '325 UC', amount: 325, bonus: '+25 Extra', priceLkr: 1850, priceUsd: 6.00, image: '/product_images/prod_UC325_1769659505_prod_UC1800_1768626430_prod.webp', isPopular: true },
      { id: 'pubg-660', name: '660 UC', amount: 660, bonus: '+60 Extra', priceLkr: 3650, priceUsd: 11.95, image: '/product_images/prod_UC660_1769659516_prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-1800', name: '1,800 UC', amount: 1800, bonus: '+300 Extra', priceLkr: 9800, priceUsd: 32.00, image: '/product_images/prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-3850', name: '3,850 UC', amount: 3850, bonus: '+850 Extra', priceLkr: 19500, priceUsd: 64.00, image: '/product_images/prod_UC3850_1768626544_prod.webp', isPopular: false }
    ]
  },
  {
    id: 'bloodstrike',
    name: 'Blood Strike',
    category: 'FPS',
    publisher: 'NetEase Games',
    currencyName: 'Gold',
    currencyIcon: '⚡',
    badge: 'INSTANT TOPUP',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    logo: '/product_images/prod_10016Gold_1768633617_Blood_Strike_105.webp',
    gradient: 'from-red-700 to-rose-900',
    requiresServer: false,
    idLabel: 'User ID (UID)',
    idPlaceholder: 'e.g. 981247192',
    popular: true,
    moongoldCode: 'BLOODSTRIKE_GLOBAL',
    packages: [
      { id: 'bs-100', name: '100 Gold', amount: 100, bonus: '+16 Extra', priceLkr: 350, priceUsd: 1.15, image: '/product_images/prod_10016Gold_1768633617_Blood_Strike_105.webp', isPopular: false },
      { id: 'bs-300', name: '300 Gold', amount: 300, bonus: '+52 Extra', priceLkr: 1050, priceUsd: 3.45, image: '/product_images/prod_30052Gold_1768633690_Blood_Strike_105.webp', isPopular: true },
      { id: 'bs-1000', name: '1,000 Gold', amount: 1000, bonus: '+210 Extra', priceLkr: 3500, priceUsd: 11.50, image: '/product_images/prod_1000210Gold_1768633835_Blood_Strike_105.webp', isPopular: false },
      { id: 'bs-pass', name: 'Strike Pass Elite', amount: 1, bonus: 'Pass Included', priceLkr: 1650, priceUsd: 5.40, image: '/product_images/prod_StrikePassElite_1768633270_oss-9f462633fe821e56e7e67c0342939461.webp', isPopular: true, isSpecial: true }
    ]
  },
  {
    id: 'valorant',
    name: 'Valorant',
    category: 'FPS',
    publisher: 'Riot Games',
    currencyName: 'VP',
    currencyIcon: '🎯',
    badge: 'RIOT CODES',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    logo: '/product_images/prod_1000_VP_1776444995_valorant-topup.png',
    gradient: 'from-rose-600 to-red-700',
    requiresServer: false,
    idLabel: 'Riot ID',
    idPlaceholder: 'e.g. Player#SL1',
    popular: true,
    moongoldCode: 'VALORANT_GLOBAL',
    packages: [
      { id: 'val-475', name: '475 VP', amount: 475, bonus: '', priceLkr: 1650, priceUsd: 5.40, image: '/product_images/prod_475_VP_1776444960_valorant-topup.png', isPopular: false },
      { id: 'val-1000', name: '1,000 VP', amount: 1000, bonus: '', priceLkr: 3350, priceUsd: 11.00, image: '/product_images/prod_1000_VP_1776444995_valorant-topup.png', isPopular: true },
      { id: 'val-2050', name: '2,050 VP', amount: 2050, bonus: '', priceLkr: 6700, priceUsd: 22.00, image: '/product_images/prod_2050_VP_1776445046_valorant-topup.png', isPopular: false }
    ]
  },
  {
    id: 'garenashells',
    name: 'Garena Shells',
    category: 'Cards & Vouchers',
    publisher: 'Garena',
    currencyName: 'Shells',
    currencyIcon: '🐚',
    badge: 'GARENA CODES',
    banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
    logo: '/gift_cards/shell.png',
    gradient: 'from-purple-600 to-indigo-700',
    requiresServer: false,
    idLabel: 'Garena Account ID / Mobile',
    idPlaceholder: 'e.g. 0771234567',
    popular: true,
    moongoldCode: 'GARENA_SHELLS',
    packages: [
      { id: 'gs-33', name: '33 Shells', amount: 33, bonus: 'Instant PIN', priceLkr: 290, priceUsd: 0.95, image: '/gift_cards/shell.png', isPopular: false },
      { id: 'gs-100', name: '100 Shells', amount: 100, bonus: 'Instant PIN', priceLkr: 860, priceUsd: 2.80, image: '/gift_cards/shell.png', isPopular: true },
      { id: 'gs-bot', name: 'Shell Bot Automated Topup', amount: 300, bonus: 'Direct Auto Credit', priceLkr: 2500, priceUsd: 8.20, image: '/gift_cards/shellbot.png', isPopular: true, isSpecial: true }
    ]
  }
];

export const BLOG_POSTS = [
  {
    id: 'blog-1',
    title: 'Top Up Free Fire Diamonds Instantly via Moongold API in Sri Lanka',
    date: 'Sep 08, 2026',
    author: 'MADS Admin',
    summary: 'Discover how MADS TOPUP delivers Free Fire diamonds directly to your UID in under 2 seconds with zero password risks.',
    image: '/blog_images/cover_d18ea674c7.jpg',
    tag: 'GUIDE'
  },
  {
    id: 'blog-2',
    title: 'Garena Shells & PUBG UC: Best LKR Exchange Rates 2026',
    date: 'Sep 05, 2026',
    author: 'Esports News',
    summary: 'Everything you need to know about purchasing cheap Garena Shells, Weekly Cards, and PUBG UC with local bank transfer and eZ Cash.',
    image: '/blog_images/cover_d3246d118d.jpg',
    tag: 'UPDATES'
  }
];

export const PAYMENT_METHODS = [
  {
    id: 'bank',
    name: 'Bank Transfer (Sri Lanka)',
    subtitle: 'Commercial Bank / Sampath / BOC / HNB',
    icon: '🏦',
    badge: '0% FEE',
    popular: true,
    accountDetails: {
      bankName: 'Commercial Bank of Ceylon',
      accountName: 'MADS TOPUP PVT LTD',
      accountNumber: '8004920194',
      branch: 'Colombo Fort',
      instructions: 'Please upload transfer receipt screenshot or reference code after transfer.'
    }
  },
  {
    id: 'ezcash',
    name: 'eZ Cash / mCash',
    subtitle: 'Dialog / Mobitel Instant Mobile Wallet',
    icon: '📱',
    badge: 'INSTANT',
    popular: true,
    accountDetails: {
      number: '077 123 4567',
      name: 'MADS TOPUP Official',
      instructions: 'Transfer funds to the eZ Cash number and enter your Transaction ID.'
    }
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    subtitle: 'Visa, Mastercard, LankaPay',
    icon: '💳',
    badge: 'AUTO CHECKOUT',
    popular: false,
    accountDetails: {
      instructions: 'Instant automatic payment processing via Secure LankaPay Gateway.'
    }
  },
  {
    id: 'binance',
    name: 'Binance Pay / Crypto',
    subtitle: 'USDT (TRC20), Pay ID',
    icon: '⚡',
    badge: 'WEB3',
    popular: false,
    accountDetails: {
      payId: '829104721',
      trc20Address: 'TY9xK8...xP2qZ',
      instructions: 'Pay exact USDT equivalent and submit TxHash.'
    }
  }
];
