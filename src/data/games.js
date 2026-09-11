export const GAMES_DATA = [
  {
    id: 'freefire_sg',
    name: 'Free Fire (SG/MY)',
    category: 'Battle Royale',
    publisher: 'Garena',
    currencyName: 'Diamonds',
    currencyIcon: '💎',
    badge: 'ACTIVE',
    flag: '🇸🇬',
    banner: '/game_logos/free_fire.webp',
    logo: '/game_logos/free_fire.webp',
    gradient: 'from-red-600 via-rose-500 to-amber-500',
    requiresServer: false,
    idLabel: 'Player ID (UID)',
    idPlaceholder: 'e.g. 248901234',
    popular: true,
    moongoldCode: 'FREEFIRE_SG',
    moongoldCategoryId: '50',
    packages: [
      { id: 'ff-25', name: '25 Diamonds', amount: 25, bonus: '', priceLkr: 110, moongoldCost: 90, priceUsd: 0.35, moongoldProductId: '11011929', image: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png', isPopular: false },
      { id: 'ff-100', name: '100 + 10 Diamonds', amount: 110, bonus: '+10 Bonus', priceLkr: 370, moongoldCost: 310, priceUsd: 1.21, moongoldProductId: '215570', image: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png', isPopular: false },
      { id: 'ff-310', name: '310 + 31 Diamonds', amount: 341, bonus: '+31 Bonus', priceLkr: 1050, moongoldCost: 920, priceUsd: 3.44, moongoldProductId: '18604785', image: '/product_images/prod_220_Diamonds_1768964821_diamondpng.png', isPopular: false },
      { id: 'ff-520', name: '520 + 52 Diamonds', amount: 572, bonus: '+52 Bonus', priceLkr: 1720, moongoldCost: 1520, priceUsd: 5.63, moongoldProductId: '18604786', image: '/product_images/prod_520_1769709482_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: true },
      { id: 'ff-1060', name: '1060 + 106 Diamonds', amount: 1166, bonus: '+106 Bonus', priceLkr: 3400, moongoldCost: 3050, priceUsd: 11.14, moongoldProductId: '18604787', image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false },
      { id: 'ff-2180', name: '2180 + 218 Diamonds', amount: 2398, bonus: '+218 Bonus', priceLkr: 6750, moongoldCost: 6100, priceUsd: 22.13, moongoldProductId: '18604788', image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false },
      { id: 'ff-5600', name: '5600 + 560 Diamonds', amount: 6160, bonus: '+560 Bonus', priceLkr: 16800, moongoldCost: 15200, priceUsd: 55.08, moongoldProductId: '18604789', image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false },
      { id: 'ff-weekly', name: 'Weekly Membership', amount: 450, bonus: 'Daily Rewards', priceLkr: 720, moongoldCost: 620, priceUsd: 2.36, moongoldProductId: '215587', image: '/product_images/prod_Weekly_1769672449_logo_2.png', isPopular: true, isSpecial: true },
      { id: 'ff-monthly', name: 'Monthly Membership', amount: 2600, bonus: 'Super Discount', priceLkr: 3450, moongoldCost: 3100, priceUsd: 11.31, moongoldProductId: '215588', image: '/product_images/prod_Monthly_Membership_1768967679_mmm_1.png', isPopular: false, isSpecial: true },
      { id: 'ff-weekly-lite', name: 'Weekly Lite', amount: 1, bonus: 'Lite Membership', priceLkr: 320, moongoldCost: 270, priceUsd: 1.00, moongoldProductId: '11012068', image: '/product_images/prod_Weekly_1769672449_logo_2.png', isPopular: false, isSpecial: true },
      { id: 'ff-evo-3d', name: 'Evo Access (3 Days)', amount: 1, bonus: 'Evo Access 3D', priceLkr: 450, moongoldCost: 380, priceUsd: 1.40, moongoldProductId: '24712531', image: '/product_images/prod_Weekly_1769672449_logo_2.png', isPopular: false, isSpecial: true },
      { id: 'ff-evo-7d', name: 'Evo Access (7 Days)', amount: 1, bonus: 'Evo Access 7D', priceLkr: 890, moongoldCost: 780, priceUsd: 2.80, moongoldProductId: '24712529', image: '/product_images/prod_Weekly_1769672449_logo_2.png', isPopular: false, isSpecial: true },
      { id: 'ff-evo-30d', name: 'Evo Access (30 Days)', amount: 1, bonus: 'Evo Access 30D', priceLkr: 2900, moongoldCost: 2600, priceUsd: 9.50, moongoldProductId: '24712527', image: '/product_images/prod_Monthly_Membership_1768967679_mmm_1.png', isPopular: false, isSpecial: true }
    ]
  },
  {
    id: 'pubg',
    name: 'PUBG Mobile',
    category: 'Battle Royale',
    publisher: 'Tencent Games',
    currencyName: 'UC',
    currencyIcon: '🪙',
    badge: 'ACTIVE',
    banner: '/game_logos/pubg.webp',
    logo: '/game_logos/pubg.webp',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    requiresServer: false,
    idLabel: 'Character ID (5-12 Digits)',
    idPlaceholder: 'e.g. 5123984712',
    popular: true,
    moongoldCode: 'PUBGM_GLOBAL',
    packages: [
      { id: 'pubg-60', name: '60 UC', amount: 60, bonus: '', priceLkr: 360, moongoldCost: 300, priceUsd: 1.18, moongoldProductId: '4085924', image: '/product_images/prod_60UC_1769659496_prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-300', name: '300 + 25 UC', amount: 325, bonus: '+25 Extra', priceLkr: 1690, moongoldCost: 1480, priceUsd: 5.54, moongoldProductId: '4085925', image: '/product_images/prod_UC325_1769659505_prod_UC1800_1768626430_prod.webp', isPopular: true },
      { id: 'pubg-600', name: '600 + 60 UC', amount: 660, bonus: '+60 Extra', priceLkr: 3350, moongoldCost: 2950, priceUsd: 10.98, moongoldProductId: '4085927', image: '/product_images/prod_UC660_1769659516_prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-1500', name: '1500 + 300 UC', amount: 1800, bonus: '+300 Extra', priceLkr: 8300, moongoldCost: 7400, priceUsd: 27.21, moongoldProductId: '4085929', image: '/product_images/prod_UC1800_1768626430_prod.webp', isPopular: true },
      { id: 'pubg-3000', name: '3000 + 850 UC', amount: 3850, bonus: '+850 Extra', priceLkr: 16300, moongoldCost: 14700, priceUsd: 53.44, moongoldProductId: '4085931', image: '/product_images/prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-6000', name: '6000 + 2100 UC', amount: 8100, bonus: '+2100 Extra', priceLkr: 32500, moongoldCost: 29500, priceUsd: 106.55, moongoldProductId: '4085933', image: '/product_images/prod_UC1800_1768626430_prod.webp', isPopular: false },
      { id: 'pubg-rp', name: 'Royale Pass (Upgrade)', amount: 1, bonus: 'Pass Included', priceLkr: 3350, moongoldCost: 2950, priceUsd: 10.98, moongoldProductId: '4085941', image: '/product_images/prod_UC660_1769659516_prod_UC1800_1768626430_prod.webp', isPopular: true, isSpecial: true },
      { id: 'pubg-ep', name: 'Elite Pass Plus', amount: 1, bonus: 'Pass Plus Included', priceLkr: 8300, moongoldCost: 7400, priceUsd: 27.21, moongoldProductId: '4085940', image: '/product_images/prod_UC1800_1768626430_prod.webp', isPopular: false, isSpecial: true }
    ]
  },
  {
    id: 'bloodstrike',
    name: 'Blood Strike',
    category: 'FPS',
    publisher: 'NetEase Games',
    currencyName: 'Gold',
    currencyIcon: '⚡',
    badge: 'ACTIVE',
    banner: '/game_logos/blood_strike.webp',
    logo: '/game_logos/blood_strike.webp',
    gradient: 'from-red-700 to-rose-900',
    requiresServer: false,
    idLabel: 'User ID (UID)',
    idPlaceholder: 'e.g. 981247192',
    popular: true,
    moongoldCode: 'BLOODSTRIKE_GLOBAL',
    packages: [
      { id: 'bs-100', name: '100 Gold', amount: 100, bonus: '', priceLkr: 380, moongoldCost: 320, priceUsd: 1.25, image: '/product_images/prod_10016Gold_1768633617_Blood_Strike_105.webp', isPopular: false },
      { id: 'bs-500', name: '500 + 20 Gold', amount: 520, bonus: '+20 Extra', priceLkr: 1790, moongoldCost: 1580, priceUsd: 5.86, image: '/product_images/prod_30052Gold_1768633690_Blood_Strike_105.webp', isPopular: true },
      { id: 'bs-pass', name: 'Strike Pass', amount: 1, bonus: 'Pass Included', priceLkr: 1650, moongoldCost: 1450, priceUsd: 5.40, image: '/product_images/prod_StrikePassElite_1768633270_oss-9f462633fe821e56e7e67c0342939461.webp', isPopular: true, isSpecial: true }
    ]
  },
  {
    id: 'deltaforce',
    name: 'Delta Force Mobile',
    category: 'FPS',
    publisher: 'TiMi Studio Group',
    currencyName: 'Coins',
    currencyIcon: '🪙',
    badge: 'ACTIVE',
    banner: '/game_logos/delta_force.jpg',
    logo: '/game_logos/delta_force.jpg',
    gradient: 'from-emerald-700 to-teal-900',
    requiresServer: false,
    idLabel: 'Player ID (UID)',
    idPlaceholder: 'e.g. 981247192',
    popular: true,
    moongoldCode: 'DELTAFORCE_GLOBAL',
    packages: [
      { id: 'df-60', name: '60 Delta Coins', amount: 60, bonus: '', priceLkr: 370, moongoldCost: 310, priceUsd: 1.21, image: '/game_logos/delta_force.jpg', isPopular: false },
      { id: 'df-300', name: '300 + 30 Delta Coins', amount: 330, bonus: '+30 Extra', priceLkr: 1720, moongoldCost: 1500, priceUsd: 5.63, image: '/game_logos/delta_force.jpg', isPopular: true },
      { id: 'df-680', name: '680 Delta Coins', amount: 680, bonus: '', priceLkr: 3600, moongoldCost: 3200, priceUsd: 11.80, image: '/game_logos/delta_force.jpg', isPopular: false }
    ]
  },
  {
    id: 'freefire_id',
    name: 'Free Fire (Indonesia)',
    category: 'Battle Royale',
    publisher: 'Garena',
    currencyName: 'Diamonds',
    currencyIcon: '💎',
    badge: 'ACTIVE',
    flag: '🇮🇩',
    banner: '/game_logos/free_fire.webp',
    logo: '/game_logos/free_fire.webp',
    gradient: 'from-red-600 via-rose-500 to-amber-500',
    requiresServer: false,
    idLabel: 'Player ID (UID)',
    idPlaceholder: 'e.g. 248901234',
    popular: true,
    moongoldCode: 'FREEFIRE_ID',
    packages: [
      { id: 'ff-id-weekly', name: 'Weekly Membership', amount: 450, bonus: 'Indo Region', priceLkr: 720, moongoldCost: 620, priceUsd: 2.36, moongoldProductId: '10034489', image: '/product_images/prod_Weekly_1769672449_logo_2.png', isPopular: true, isSpecial: true },
      { id: 'ff-id-monthly', name: 'Monthly Membership', amount: 2600, bonus: 'Indo Region', priceLkr: 3450, moongoldCost: 3100, priceUsd: 11.31, moongoldProductId: '10034484', image: '/product_images/prod_Monthly_Membership_1768967679_mmm_1.png', isPopular: false, isSpecial: true },
      { id: 'ff-id-100', name: '100 + 10 Diamonds', amount: 110, bonus: 'Indo Region', priceLkr: 370, moongoldCost: 310, priceUsd: 1.21, moongoldProductId: '899643', image: '/product_images/prod_100_Diamonds_1768964745_diamondpng.png', isPopular: false },
      { id: 'ff-id-310', name: '310 + 31 Diamonds', amount: 341, bonus: 'Indo Region', priceLkr: 1050, moongoldCost: 920, priceUsd: 3.44, moongoldProductId: '899644', image: '/product_images/prod_220_Diamonds_1768964821_diamondpng.png', isPopular: false },
      { id: 'ff-id-520', name: '520 + 52 Diamonds', amount: 572, bonus: 'Indo Region', priceLkr: 1720, moongoldCost: 1520, priceUsd: 5.63, moongoldProductId: '899645', image: '/product_images/prod_520_1769709482_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: true },
      { id: 'ff-id-1060', name: '1060 + 106 Diamonds', amount: 1166, bonus: 'Indo Region', priceLkr: 3400, moongoldCost: 3050, priceUsd: 11.14, moongoldProductId: '899646', image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false },
      { id: 'ff-id-2180', name: '2180 + 218 Diamonds', amount: 2398, bonus: 'Indo Region', priceLkr: 6750, moongoldCost: 6100, priceUsd: 22.13, moongoldProductId: '899647', image: '/product_images/prod_1060_1769709491_prod_100_1769359707_prod_1060_1767980911_Diams_copy.png', isPopular: false }
    ]
  },
  {
    id: 'garenashells',
    name: 'Garena Shells',
    category: 'Cards & Vouchers',
    publisher: 'Garena',
    currencyName: 'Shells',
    currencyIcon: '🐚',
    badge: 'ACTIVE',
    banner: '/game_logos/garena_shells.jpg',
    logo: '/game_logos/garena_shells.jpg',
    gradient: 'from-purple-600 to-indigo-700',
    requiresServer: false,
    idLabel: 'Garena Account ID / Mobile',
    idPlaceholder: 'e.g. 0771234567',
    popular: true,
    moongoldCode: 'GARENA_SHELLS',
    packages: [
      { id: 'gs-33', name: '33 Shells', amount: 33, bonus: 'Instant PIN', priceLkr: 290, moongoldCost: 245, priceUsd: 0.95, image: '/gift_cards/shell.png', isPopular: false },
      { id: 'gs-100', name: '100 Shells', amount: 100, bonus: 'Instant PIN', priceLkr: 860, moongoldCost: 740, priceUsd: 2.80, image: '/gift_cards/shell.png', isPopular: true },
      { id: 'gs-bot', name: 'Shell Bot Automated Topup', amount: 300, bonus: 'Direct Auto Credit', priceLkr: 2500, moongoldCost: 2180, priceUsd: 8.20, image: '/gift_cards/shellbot.png', isPopular: true, isSpecial: true }
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
    image: '/uploads/blog_images/cover_d18ea674c7.jpg',
    tag: 'GUIDE'
  },
  {
    id: 'blog-2',
    title: 'Garena Shells & PUBG UC: Best LKR Exchange Rates 2026',
    date: 'Sep 05, 2026',
    author: 'Esports News',
    summary: 'Everything you need to know about purchasing cheap Garena Shells, Weekly Cards, and PUBG UC with local bank transfer and eZ Cash.',
    image: '/uploads/blog_images/cover_d3246d118d.jpg',
    tag: 'UPDATES'
  }
];

export const PAYMENT_METHODS = [
  {
    id: 'wallet',
    name: 'MADS Wallet Balance',
    subtitle: 'Instant Auto-Topup using your site wallet',
    icon: '💰',
    badge: 'INSTANT',
    popular: true,
    accountDetails: null
  },
  {
    id: 'bank',
    name: 'Bank Transfer (Sri Lanka)',
    subtitle: 'Hatton National Bank (HNB) Direct Transfer',
    icon: '🏦',
    badge: '0% FEE',
    popular: true,
    accountDetails: {
      bankName: 'Hatton National Bank (HNB)',
      accountName: 'DILNETH MADUSHANKA',
      accountNumber: '011020433679',
      branch: 'BADULLA',
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
      number: '0740436276',
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
