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
    logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=200&q=80',
    gradient: 'from-red-600 via-rose-500 to-amber-500',
    requiresServer: false,
    idLabel: 'Player ID (UID)',
    idPlaceholder: 'e.g. 248901234',
    popular: true,
    moongoldCode: 'FREEFIRE_SG',
    packages: [
      { id: 'ff-100', name: '100 Diamonds', amount: 100, bonus: '10 Bonus', priceLkr: 320, priceUsd: 1.10, isPopular: false },
      { id: 'ff-210', name: '210 Diamonds', amount: 210, bonus: '21 Bonus', priceLkr: 640, priceUsd: 2.10, isPopular: false },
      { id: 'ff-530', name: '530 Diamonds', amount: 530, bonus: '53 Bonus', priceLkr: 1580, priceUsd: 5.20, isPopular: true },
      { id: 'ff-1080', name: '1,080 Diamonds', amount: 1080, bonus: '108 Bonus', priceLkr: 3150, priceUsd: 10.40, isPopular: false },
      { id: 'ff-2200', name: '2,200 Diamonds', amount: 2200, bonus: '220 Bonus', priceLkr: 6300, priceUsd: 20.50, isPopular: false },
      { id: 'ff-weekly', name: 'Weekly Membership', amount: 450, bonus: 'Daily Rewards', priceLkr: 650, priceUsd: 2.15, isPopular: true, isSpecial: true },
      { id: 'ff-monthly', name: 'Monthly Membership', amount: 2600, bonus: 'Super Discount', priceLkr: 3200, priceUsd: 10.50, isPopular: false, isSpecial: true }
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
    logo: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=200&q=80',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    requiresServer: false,
    idLabel: 'Character ID (5-12 Digits)',
    idPlaceholder: 'e.g. 5123984712',
    popular: true,
    moongoldCode: 'PUBGM_GLOBAL',
    packages: [
      { id: 'pubg-60', name: '60 UC', amount: 60, bonus: '', priceLkr: 360, priceUsd: 1.15, isPopular: false },
      { id: 'pubg-325', name: '325 UC', amount: 325, bonus: '+25 Extra', priceLkr: 1850, priceUsd: 6.00, isPopular: true },
      { id: 'pubg-660', name: '660 UC', amount: 660, bonus: '+60 Extra', priceLkr: 3650, priceUsd: 11.95, isPopular: false },
      { id: 'pubg-1800', name: '1,800 UC', amount: 1800, bonus: '+300 Extra', priceLkr: 9800, priceUsd: 32.00, isPopular: false },
      { id: 'pubg-3850', name: '3,850 UC', amount: 3850, bonus: '+850 Extra', priceLkr: 19500, priceUsd: 64.00, isPopular: false },
      { id: 'pubg-rp', name: 'Royale Pass Pack', amount: 360, bonus: 'Pass Included', priceLkr: 2100, priceUsd: 6.80, isPopular: true, isSpecial: true }
    ]
  },
  {
    id: 'mlbb',
    name: 'Mobile Legends',
    category: 'MOBA',
    publisher: 'Moonton',
    currencyName: 'Diamonds',
    currencyIcon: '💎',
    badge: 'INSTANT DELIVERY',
    banner: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=200&q=80',
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    requiresServer: true,
    idLabel: 'User ID',
    idPlaceholder: 'e.g. 12345678',
    serverLabel: 'Zone / Server ID',
    serverPlaceholder: 'e.g. 1234',
    popular: true,
    moongoldCode: 'MLBB_GLOBAL',
    packages: [
      { id: 'ml-86', name: '86 Diamonds', amount: 86, bonus: '9 Bonus', priceLkr: 460, priceUsd: 1.50, isPopular: false },
      { id: 'ml-172', name: '172 Diamonds', amount: 172, bonus: '18 Bonus', priceLkr: 920, priceUsd: 3.00, isPopular: false },
      { id: 'ml-257', name: '257 Diamonds', amount: 257, bonus: '30 Bonus', priceLkr: 1380, priceUsd: 4.50, isPopular: true },
      { id: 'ml-706', name: '706 Diamonds', amount: 706, bonus: '84 Bonus', priceLkr: 3750, priceUsd: 12.20, isPopular: false },
      { id: 'ml-2195', name: '2,195 Diamonds', amount: 2195, bonus: '360 Bonus', priceLkr: 11400, priceUsd: 37.00, isPopular: false },
      { id: 'ml-twilight', name: 'Twilight Pass', amount: 1, bonus: 'Exclusive Skin', priceLkr: 3100, priceUsd: 10.00, isPopular: true, isSpecial: true }
    ]
  },
  {
    id: 'codm',
    name: 'Call of Duty Mobile',
    category: 'FPS',
    publisher: 'Activision',
    currencyName: 'CP',
    currencyIcon: '🎯',
    badge: 'NEW & FAST',
    banner: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=1200&q=80',
    logo: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=200&q=80',
    gradient: 'from-slate-700 to-red-800',
    requiresServer: false,
    idLabel: 'Player ID / OpenID',
    idPlaceholder: 'e.g. 671982736192',
    popular: false,
    moongoldCode: 'CODM_GLOBAL',
    packages: [
      { id: 'cod-80', name: '80 CP', amount: 80, bonus: '', priceLkr: 350, priceUsd: 1.10, isPopular: false },
      { id: 'cod-420', name: '420 CP', amount: 420, bonus: '+20 Extra', priceLkr: 1750, priceUsd: 5.70, isPopular: true },
      { id: 'cod-880', name: '880 CP', amount: 880, bonus: '+80 Extra', priceLkr: 3600, priceUsd: 11.80, isPopular: false },
      { id: 'cod-2400', name: '2,400 CP', amount: 2400, bonus: '+400 Extra', priceLkr: 9200, priceUsd: 30.00, isPopular: false }
    ]
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
