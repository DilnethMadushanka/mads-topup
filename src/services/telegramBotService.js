import { createRequire } from 'module';
import crypto from 'crypto';
import { GAMES_DATA } from '../data/games.js';
import { lookupFreePlayerIgn } from './playerLookup.js';
import { getResellerProfileByKey, getResellerProfileByKeyAsync, deductResellerWalletBalance, saveOrderToFirestore } from './firestoreService.js';

const require = createRequire(import.meta.url);
const { Bot, longPoll } = require('node-telegram-bot-api');

let botInstance = null;

// Chat session bindings: chatId -> resellerProfile
const boundChatSessions = new Map();

// Security Rate Limiter: chatId -> { failedAttempts, lockoutUntil }
const authRateLimiter = new Map();

// Concurrent Order Lock: chatId -> boolean
const processingLocks = new Set();

// Message Deduplication & Stale Message Filtering
const processedMsgIds = new Set();
let botStartTime = Math.floor(Date.now() / 1000);

// 24/7 Active Engine Health & Refresh Loop State
let botStatus = 'ONLINE';
let lastHealthCheckTime = null;
let nextHealthCheckTime = null;
let autoRecoveryCount = 0;
let lastLatencyMs = 0;
let healthCheckTimer = null;

/**
 * Restart Telegram Bot long-polling safely on connection drops
 */
export function restartTelegramPolling() {
  if (!botInstance) return false;
  try {
    if (typeof botInstance.stop === 'function') {
      try { botInstance.stop(); } catch (e) {}
    }
    if (typeof botInstance.startPolling === 'function') {
      botInstance.startPolling();
    } else if (typeof longPoll === 'function') {
      longPoll(botInstance);
    }
    console.log('🔄 [Telegram Bot Engine] Long-polling re-initialized successfully.');
    return true;
  } catch (err) {
    console.warn('⚠️ [Telegram Bot Polling Restart Note]:', err.message);
    return false;
  }
}

/**
 * Execute Telegram API getMe health check & refresh connection
 * Runs automatically every 2 hours
 */
export async function checkBotHealthAndRefresh(isManual = false) {
  const token = (typeof process !== 'undefined' && process.env.TELEGRAM_BOT_TOKEN) || '';
  if (!token) {
    botStatus = 'OFFLINE';
    return { success: false, status: botStatus, error: 'TELEGRAM_BOT_TOKEN missing' };
  }

  const startMs = Date.now();
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    });

    const elapsed = Date.now() - startMs;
    const data = await res.json().catch(() => null);

    if (res.ok && data?.ok) {
      lastLatencyMs = elapsed;
      lastHealthCheckTime = new Date().toISOString();
      nextHealthCheckTime = new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString();
      botStatus = 'ONLINE';

      const tag = isManual ? '[Manual Refresh]' : '[2-Hour Refresh Engine]';
      console.log(`🤖 ${tag} 🟢 Bot status: ONLINE | Latency: ${lastLatencyMs}ms | @${data.result.username} | Next check in 2 hours`);

      return {
        success: true,
        status: botStatus,
        botUsername: data.result.username,
        latencyMs: lastLatencyMs,
        lastCheck: lastHealthCheckTime,
        nextCheck: nextHealthCheckTime,
        autoRecoveryCount
      };
    } else {
      throw new Error(data?.description || `HTTP ${res.status}`);
    }
  } catch (err) {
    botStatus = 'RECOVERING';
    autoRecoveryCount++;
    console.warn(`⚠️ [Telegram Bot Health Check Warning]: Telegram API check failed (${err.message}). Initiating auto-recovery...`);
    restartTelegramPolling();

    lastHealthCheckTime = new Date().toISOString();
    nextHealthCheckTime = new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString();

    return {
      success: false,
      status: botStatus,
      error: err.message,
      autoRecoveryCount,
      lastCheck: lastHealthCheckTime,
      nextCheck: nextHealthCheckTime
    };
  }
}

/**
 * Start recurring 2-hour automated refresh and health-check loop
 */
export function startBotHealthCheckLoop(intervalMs = 2 * 60 * 60 * 1000) {
  if (healthCheckTimer) clearInterval(healthCheckTimer);

  // Initial check 10 seconds post startup
  setTimeout(() => {
    checkBotHealthAndRefresh(false).catch(() => {});
  }, 10000);

  // Recurring interval check every 2 hours
  healthCheckTimer = setInterval(() => {
    checkBotHealthAndRefresh(false).catch(() => {});
  }, intervalMs);

  console.log('⏰ Telegram Bot 24/7 Health Engine active (Automated refresh every 2 hours).');
}

/**
 * Retrieve current 24/7 engine health status
 */
export function getTelegramBotHealthStatus() {
  const uptimeSeconds = Math.floor(Date.now() / 1000) - botStartTime;
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  return {
    status: botStatus,
    uptime: `${hours}h ${minutes}m`,
    uptimeSeconds,
    lastLatencyMs,
    lastHealthCheckTime: lastHealthCheckTime || new Date().toISOString(),
    nextHealthCheckTime: nextHealthCheckTime || new Date(Date.now() + (2 * 60 * 60 * 1000)).toISOString(),
    autoRecoveryCount,
    refreshIntervalHours: 2,
    gamesSupported: GAMES_DATA.length,
    botUsername: 'mads_shell_topup_bot'
  };
}

/**
 * Force manual Telegram bot refresh
 */
export function forceTelegramBotRefresh() {
  return checkBotHealthAndRefresh(true);
}

/**
 * Match game in website catalog (GAMES_DATA)
 */
function findGameInCatalog(gameArg) {
  if (!gameArg) return GAMES_DATA[0];
  const g = String(gameArg).toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const game of GAMES_DATA) {
    const gId = game.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const gName = game.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (gId === g || gName.includes(g) || g.includes(gId)) {
      return game;
    }
  }

  // Common Aliases
  if (g.includes('ml') || g.includes('legend') || g.includes('moba')) return GAMES_DATA.find(g => g.id === 'mobilelegends');
  if (g.includes('ffsg') || g.includes('sg') || g.includes('my')) return GAMES_DATA.find(g => g.id === 'freefire_sg');
  if (g.includes('ffid') || g.includes('id') || g.includes('indo')) return GAMES_DATA.find(g => g.id === 'freefire_id');
  if (g.includes('ff') || g.includes('freefire') || g.includes('garena')) return GAMES_DATA.find(g => g.id === 'freefire_sg');
  if (g.includes('pubg') || g.includes('uc') || g.includes('tencent')) return GAMES_DATA.find(g => g.id === 'pubg');
  if (g.includes('bs') || g.includes('blood') || g.includes('strike')) return GAMES_DATA.find(g => g.id === 'bloodstrike');
  if (g.includes('df') || g.includes('delta') || g.includes('force')) return GAMES_DATA.find(g => g.id === 'deltaforce');
  if (g.includes('gs') || g.includes('shell')) return GAMES_DATA.find(g => g.id === 'garenashells');

  return GAMES_DATA[0];
}

/**
 * Match package in selected game & calculate wholesale price (5% reseller discount)
 */
function findPackageInGame(game, pkgArg) {
  if (!game || !game.packages || game.packages.length === 0) {
    const num = parseInt(pkgArg) || 100;
    return {
      name: `${num} Items`,
      countText: `${num} Items`,
      priceLkr: 500,
      currencyIcon: '💎',
      currencyName: 'Items'
    };
  }

  const rawStr = String(pkgArg || '').trim().toLowerCase();
  const pClean = rawStr.replace(/[^a-z0-9]/g, '');

  // 1. Direct match by exact package ID (e.g. 'ml-78', 'ff-100', 'pubg-60')
  let match = game.packages.find(p => p.id.toLowerCase() === rawStr || p.id.toLowerCase().replace(/[^a-z0-9]/g, '') === pClean);

  // 2. Exact match by package total amount (e.g. 86 diamonds for 78+8, 172 for 156+16, 257 for 234+23, 706 for 625+81)
  if (!match) {
    const num = parseInt(pClean);
    if (!isNaN(num)) {
      match = game.packages.find(p => p.amount === num);
    }
  }

  // 3. Match by ID suffix or prefix number (e.g. '78' matches 'ml-78', '100' matches 'ff-100')
  if (!match) {
    const num = parseInt(pClean);
    if (!isNaN(num)) {
      match = game.packages.find(p => 
        p.id.endsWith(`-${num}`) || 
        p.id === `${game.id}-${num}` || 
        p.name.startsWith(`${num} `) || 
        p.name.startsWith(`${num}+`)
      );
    }
  }

  // 4. Match by name or bonus substring
  if (!match) {
    match = game.packages.find(p => p.name.toLowerCase().includes(pClean) || (p.bonus && p.bonus.toLowerCase().includes(pClean)));
  }

  // Fallback to first package if no match
  const selected = match || game.packages[0];
  const wholesalePrice = Math.round(selected.priceLkr * 0.95);

  return {
    ...selected,
    name: selected.name,
    countText: `${selected.amount || selected.name} ${game.currencyName}`,
    priceLkr: wholesalePrice,
    retailPriceLkr: selected.priceLkr,
    currencyIcon: game.currencyIcon || '💎',
    currencyName: game.currencyName || 'Items'
  };
}

/**
 * Dispatch Live Order to MooGold Reseller API
 */
async function sendMoongoldLiveOrder(game, pkg, playerId, zoneId, orderRef) {
  const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || '';
  const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || '';
  const baseUrl = 'https://moogold.com/wp-json/v1/api';
  const apiPath = 'order/create_order';

  const categoryId = game.moongoldCategoryId || (game.id === 'freefire_sg' ? '50' : '1');
  const productId = pkg.moongoldProductId || '15972928';

  const dataPayload = {
    category: categoryId,
    'product-id': productId,
    quantity: '1'
  };

  const gId = (game.id || '').toLowerCase();
  if (gId.includes('pubg')) {
    dataPayload['Character ID'] = playerId;
  } else if (gId.includes('freefire') || gId.includes('ff')) {
    dataPayload['Player ID'] = playerId;
  } else {
    dataPayload['User ID'] = playerId;
    if (zoneId) {
      dataPayload['Server ID'] = zoneId;
      dataPayload['Server'] = zoneId;
    }
  }

  const partnerOrderId = crypto.randomUUID ? crypto.randomUUID() : (`ORD-TG-${Date.now()}`);

  const bodyObj = {
    path: apiPath,
    data: dataPayload,
    partnerOrderId
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + apiPath;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const authSignature = hmac.digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

  console.log(`[Moongold Live Order Attempt] Ref: ${orderRef}, ProductID: ${productId}, UserID: ${playerId}, Zone: ${zoneId}`);

  try {
    const res = await fetch(`${baseUrl}/${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuth,
        'auth': authSignature,
        'timestamp': timestamp.toString(),
        'User-Agent': 'Mozilla/5.0'
      },
      body: payloadStr,
      signal: AbortSignal.timeout(8000)
    });

    const resText = await res.text();
    console.log(`[Moongold API Response] HTTP ${res.status}:`, resText);

    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}

    if (res.ok && resJson && (resJson.order_id || resJson.status === 'processing' || resJson.status === true || resJson.status === 1)) {
      return {
        success: true,
        moongoldRef: String(resJson.order_id || partnerOrderId),
        message: resJson.message || 'Order placed successfully'
      };
    } else {
      return {
        success: false,
        moongoldRef: partnerOrderId,
        error: resJson?.err_message || resJson?.message || resText.substring(0, 200) || `HTTP ${res.status}`
      };
    }
  } catch (err) {
    console.error('[Moongold API Network Error]:', err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Check Order Status from MooGold Reseller API
 */
async function checkMoongoldOrderStatus(orderId) {
  if (!orderId) return null;
  const partnerId = process.env.MOONGOLD_PARTNER_ID || process.env.VITE_MOONGOLD_PARTNER_ID || '';
  const secretKey = process.env.MOONGOLD_SECRET_KEY || process.env.VITE_MOONGOLD_SECRET_KEY || '';
  const baseUrl = 'https://moogold.com/wp-json/v1/api';
  const apiPath = 'order/order_detail';

  const bodyObj = {
    path: apiPath,
    order_id: String(orderId)
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const payloadStr = JSON.stringify(bodyObj);
  const stringToSign = payloadStr + timestamp + apiPath;

  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(stringToSign);
  const authSignature = hmac.digest('hex');
  const basicAuth = 'Basic ' + Buffer.from(`${partnerId}:${secretKey}`).toString('base64');

  try {
    const res = await fetch(`${baseUrl}/${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': basicAuth,
        'auth': authSignature,
        'timestamp': timestamp.toString(),
        'User-Agent': 'Mozilla/5.0'
      },
      body: payloadStr,
      signal: AbortSignal.timeout(4000)
    });

    const resText = await res.text();
    let resJson = null;
    try { resJson = JSON.parse(resText); } catch (e) {}

    if (resJson) {
      const orderStatus = String(resJson.order_status || resJson.status || '').toLowerCase();
      return {
        status: orderStatus,
        data: resJson
      };
    }
  } catch (err) {}
  return null;
}

export function initTelegramBot() {
  if (botInstance) return botInstance;

  const token = (typeof process !== 'undefined' && process.env.TELEGRAM_BOT_TOKEN) || '';
  if (!token) return null;

  try {
    const bot = new Bot(token);
    botInstance = bot;

    console.log('🤖 MADS TOPUP Telegram Bot (@mads_shell_topup_bot) Initializing...');

    // Auto-sync official Telegram bot description & menu commands
    fetch(`https://api.telegram.org/bot${token}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '👑 Official MADS TOPUP Reseller Partner & Automated Game Top-up Bot.\n\nInstant automated delivery for Mobile Legends, Free Fire, PUBG Mobile, Blood Strike, Delta Force & Garena Shells.' })
    }).catch(() => {});

    fetch(`https://api.telegram.org/bot${token}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ short_description: '👑 MADS TOPUP Official Reseller & Automated Game Topup Bot.' })
    }).catch(() => {});

    fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'id', description: '🎮 Check Player IGN (/id ff 1017871735)' },
          { command: 'ff', description: '🔥 Check Free Fire IGN (/ff 1017871735)' },
          { command: 'ml', description: '⚔️ Check MLBB IGN (/ml 84218845 2168)' },
          { command: 'pubg', description: '🪂 Check PUBG Mobile IGN (/pubg 512345678)' },
          { command: 'auth', description: '🔑 Link Reseller Wallet (/auth SecurityKey)' },
          { command: 'topup', description: '⚡ Execute Topup (/topup ff 1017871735 100)' },
          { command: 'balance', description: '💰 View Wallet Balance & Security Key' },
          { command: 'deposit', description: '📥 Wallet Recharge Info (EZ Cash, Binance)' },
          { command: 'packages', description: '📦 View Diamond Packages & Prices (/packages ml)' },
          { command: 'games', description: '🎮 View All Website Games & Packages' },
          { command: 'status', description: '🟢 View Bot & 24/7 Engine Status' },
          { command: 'refresh', description: '🔄 Refresh & Test Bot Connection' },
          { command: 'help', description: 'ℹ️ Complete Bot Command Guide' }
        ]
      })
    }).catch(() => {});

    // Command: /start
    bot.command('start', (ctx) => {
      const welcomeText = `
👑 Welcome to MADS TOPUP All-Game Reseller Bot!

Support for ALL games on website: Mobile Legends, Free Fire, PUBG Mobile, Blood Strike, Delta Force & Garena Shells!

🔑 1. Reseller Authentication:
• /auth <SecurityKey> or /link <SecurityKey>
  (e.g. /auth MADS-SEC-50048A92 or /link RS-048A92)

🎮 2. Live Player IGN Lookup (All Games):
• /ml <ID> <Zone> - Mobile Legends (e.g. /ml 84218845 2168)
• /ff <ID> - Free Fire Real IGN (e.g. /ff 248901234)
• /pubg <ID> - PUBG Mobile Real IGN
• /check <Game> <ID> [Zone] - Check Any Game

⚡ 3. Execute Top-up (5% Reseller Wholesale Margin):
• /topup ml <ID> <Zone> <Package> (e.g. /topup ml 84218845 2168 86)
• /topup ff <ID> <Diamonds> (e.g. /topup ff 248901234 100)
• /topup pubg <ID> <UC> (e.g. /topup pubg 512345678 60)
• /topup bs <ID> <Gold> (e.g. /topup bs 981247192 100)
• /topup df <ID> <Coins> (e.g. /topup df 981247192 60)
• /topup gs <AccountID> <Shells> (e.g. /topup gs 0771234567 100)

📌 Reseller Wallet Commands:
• /balance - Live Reseller Wallet Balance & Security Key
• /deposit - EZ Cash, Binance Pay & Bank Deposit Info
• /status - Bot & API Gateway Status
• /games - List All Supported Games
• /help - Command Guide
      `.trim();
      return ctx.reply(welcomeText);
    });

    // Command: /help
    bot.command('help', (ctx) => {
      const helpText = `
ℹ️ MADS TOPUP BOT COMMAND GUIDE (ALL GAMES)

🔑 1. Account Link:
• /auth MADS-SEC-50048A92
• /link RS-048A92

🎮 2. Live IGN Lookup:
• /ml 84218845 2168
• /ff 248901234
• /pubg 5123984712
• /bs 981247192

🔥 3. Topup Commands (All Games):
• /topup ml 84218845 2168 86 (MLBB 86 Diamonds)
• /topup ff 248901234 100 (Free Fire 100 Diamonds)
• /topup pubg 5123984712 60 (PUBG 60 UC)
• /topup bs 981247192 100 (Blood Strike 100 Gold)
• /topup df 981247192 60 (Delta Force 60 Coins)
• /topup gs 0771234567 100 (Garena 100 Shells)

💼 4. Wallet Management:
• /balance - View Balance & Security Key
• /deposit - Recharge Wallet Info
      `.trim();
      return ctx.reply(helpText);
    });

    // Command: /games & /packages [game]
    const handlePackages = (ctx) => {
      try {
        const text = ctx.message?.text || ctx.msg?.text || '';
        const parts = text.split(/\s+/).filter(Boolean);
        const gameArg = parts[1]?.toLowerCase();

        if (gameArg) {
          const matchedGame = findGameInCatalog(gameArg);
          let replyText = `📦 ${matchedGame.name.toUpperCase()} PACKAGES & RESELLER WHOLESALE PRICES (5% OFF):\n\n`;

          matchedGame.packages.forEach((pkg, index) => {
            const wholesalePrice = Math.round(pkg.priceLkr * 0.95);
            replyText += `${index + 1}. ${matchedGame.currencyIcon} ${pkg.name}\n`;
            replyText += `   • Reseller Price: Rs. ${wholesalePrice.toLocaleString()} LKR (Retail: Rs. ${pkg.priceLkr.toLocaleString()})\n`;
            replyText += `   • Topup Code: ${pkg.amount || pkg.id}\n\n`;
          });

          const gAlias = matchedGame.id === 'mobilelegends' ? 'ml' : matchedGame.id === 'freefire_sg' ? 'ff' : matchedGame.id;
          replyText += `⚡ How to Order:\n• /topup ${gAlias} <player_id> ${matchedGame.requiresServer ? '<zone_id> ' : ''}<code_or_amount>`;
          return ctx.reply(replyText);
        }

        // Summary of all website games & diamond packages
        let summaryText = `📦 MADS TOPUP GAME PACKAGES & WHOLESALE PRICE LIST\n\n`;
        summaryText += `💡 Type /packages <game> (e.g. /packages ml or /packages ff) to view ALL packages for a specific game!\n\n`;

        GAMES_DATA.forEach(g => {
          const gAlias = g.id === 'mobilelegends' ? 'ml' : g.id === 'freefire_sg' ? 'ff' : g.id;
          summaryText += `${g.currencyIcon} ${g.name} (${g.packages.length} Packages):\n`;
          const top4 = g.packages.slice(0, 4);
          top4.forEach(p => {
            const wPrice = Math.round(p.priceLkr * 0.95);
            summaryText += `  • ${p.name}: Rs. ${wPrice.toLocaleString()} LKR\n`;
          });
          summaryText += `  👉 Type /packages ${gAlias} for full list\n\n`;
        });

        summaryText += `⚡ Reseller Wholesale Advantage: 5% OFF All Retail Prices Instant Deduct from Reseller Balance!`;
        return ctx.reply(summaryText);
      } catch (e) {
        console.error('Packages Error:', e);
      }
    };

    bot.command('games', handlePackages);
    bot.command('packages', handlePackages);
    bot.command('packs', handlePackages);
    bot.command('prices', handlePackages);

    // Command: /status - Live 24/7 Bot Health & Refresh Metrics
    bot.command('status', (ctx) => {
      const health = getTelegramBotHealthStatus();
      const statusText = `
🟢 MADS TOPUP TELEGRAM BOT 24/7 ENGINE STATUS

⚡ Telegram Engine: Active 24/7 (${health.status || 'ONLINE'})
🕒 Continuous Uptime: ${health.uptime || 'Active'}
⚡ API Ping Latency: ${health.lastLatencyMs ? `${health.lastLatencyMs}ms` : 'Verified (Low)'}
🔄 2-Hour Refresh Loop: ACTIVE (Next check: ${health.nextHealthCheckTime ? new Date(health.nextHealthCheckTime).toLocaleTimeString() : 'In 2 hours'})
🛡️ Connection Auto-Recoveries: ${health.autoRecoveryCount || 0}
👑 Live Player IGN Engine: ONLINE (MADS Verification Engine)
🐚 Garena Automation Engine: Active
🎮 Games Supported: ${health.gamesSupported || GAMES_DATA.length} Games (${GAMES_DATA.map(g => g.name).join(', ')})
💰 Reseller Payment Gateways: Online (EZ Cash, Binance Pay, Bank)
      `.trim();
      return ctx.reply(statusText);
    });

    // Command: /refresh - Force Instant Telegram Engine Ping & Connection Health Test
    bot.command('refresh', async (ctx) => {
      try {
        await ctx.reply('🔄 Refreshing Telegram Bot engine connection & verifying Telegram API health...');
        const health = await forceTelegramBotRefresh();

        const refreshMsg = `
✅ TELEGRAM BOT ENGINE REFRESH COMPLETE

🟢 Connection Status: ${health.status || 'ONLINE'}
⚡ Telegram API Latency: ${health.latencyMs || 0}ms
🤖 Bot Username: @${health.botUsername || 'mads_shell_topup_bot'}
🕒 Last Refresh: ${health.lastCheck ? new Date(health.lastCheck).toLocaleTimeString() : new Date().toLocaleTimeString()}
⏰ Next Scheduled Check: ${health.nextCheck ? new Date(health.nextCheck).toLocaleTimeString() : 'In 2 hours'}
🛡️ Auto-Recovery Count: ${health.autoRecoveryCount || 0}

Telegram long-polling connection is 100% active 24/7!
        `.trim();
        return ctx.reply(refreshMsg);
      } catch (e) {
        return ctx.reply(`❌ Refresh Error: ${e.message}`);
      }
    });

    // Command: /auth [SecurityKey]  or  /link [SecurityKey]
    const handleAuth = async (ctx) => {
      try {
        const chatId = ctx.message?.chat?.id || ctx.chat?.id;
        const text = ctx.message?.text || ctx.msg?.text || '';
        const parts = text.split(/\s+/).filter(Boolean);
        const matchStr = (typeof ctx.match === 'string' ? ctx.match : (Array.isArray(ctx.match) ? ctx.match[0] : ''));
        const keyArg = (matchStr || parts[1] || parts[0]?.replace(/^\/(auth|link|key)\s*/i, '') || '').trim();

        if (!chatId) return;

        // Anti-Brute-Force Rate Limiting Check
        const now = Date.now();
        const rateData = authRateLimiter.get(chatId) || { failedAttempts: 0, lockoutUntil: 0 };
        if (rateData.lockoutUntil > now) {
          const waitMins = Math.ceil((rateData.lockoutUntil - now) / 60000);
          return ctx.reply(`🛡️ SECURITY LOCKOUT ACTIVATED\n\nToo many failed auth attempts. Chat locked for ${waitMins} minute(s) to prevent key brute-forcing.`);
        }

        if (!keyArg || keyArg.startsWith('/')) {
          return ctx.reply('❌ Error: Please specify your unique Security Key or Reseller Code.\nUsage: /auth MADS-SEC-50048A92');
        }

        const reseller = await getResellerProfileByKeyAsync(keyArg);

        if (reseller) {
          boundChatSessions.set(chatId, reseller);
          authRateLimiter.delete(chatId);

          const successText = `
✅ RESELLER ACCOUNT LINKED SUCCESSFULLY!

👑 Reseller Name: ${reseller.name || 'Verified Reseller Partner'}
🏷️ Unique Reseller Code: ${reseller.resellerCode}
🔑 Security Key: ${reseller.securityKey}
💼 Wholesale Tier: Verified Reseller Partner (5% Wholesale Discount)
💰 Available LKR Balance: Rs. ${(reseller.walletBalance || 0).toLocaleString()} LKR
💵 Available USDT Balance: $${((reseller.walletBalance || 0) / 305).toFixed(2)} USDT

Your Telegram chat is now bound to your Reseller Wallet! You can use /topup for any game on the website.
          `.trim();
          return ctx.reply(successText);
        } else {
          rateData.failedAttempts += 1;
          if (rateData.failedAttempts >= 5) {
            rateData.lockoutUntil = now + (15 * 60 * 1000); // 15 mins lock
            authRateLimiter.set(chatId, rateData);
            return ctx.reply('🛡️ SECURITY LOCKOUT ACTIVATED: 5 consecutive failed authentication attempts. Chat locked for 15 minutes to prevent key brute-forcing.');
          }
          authRateLimiter.set(chatId, rateData);

          const failText = `
❌ AUTHENTICATION FAILED

Invalid Security Key or Reseller Code (${keyArg}). [Attempt ${rateData.failedAttempts}/5]
Please copy your unique Security Key from your MADS TOPUP Reseller Dashboard and try again.

Usage: /auth MADS-SEC-50048A92
          `.trim();
          return ctx.reply(failText);
        }
      } catch (err) {
        console.error('[Telegram Auth Error]:', err);
        try {
          return ctx.reply(`❌ Auth Error: ${err.message}`);
        } catch (e) {}
      }
    };

    bot.catch((err) => {
      console.error('[Telegram Bot Engine Catch]:', err.message || err);
      try {
        if (botInstance && typeof botInstance.isRunning === 'function' && !botInstance.isRunning()) {
          console.warn('⚠️ [Telegram Bot Engine] Polling stopped after catch error. Triggering auto-recovery...');
          restartTelegramPolling();
        }
      } catch (e) {}
    });

    bot.command('auth', handleAuth);
    bot.command('link', handleAuth);
    bot.command('key', handleAuth);

    // Live Player IGN Lookup Handler (All Games)
    const handlePlayerCheck = async (ctx) => {
      try {
        const text = ctx.message?.text || ctx.msg?.text || '';
        const parts = text.split(/\s+/).filter(Boolean);
        const rawCmd = (parts[0] || '').toLowerCase().replace(/^\//, '');

        let gameArg = '';
        let id = '';
        let zone = '';

        if (!rawCmd || rawCmd === 'id' || rawCmd === 'ign' || rawCmd === 'check' || rawCmd === 'lookup' || rawCmd === 'verify') {
          // Format 1: /id ff 1017871735 (Game in the middle!)
          // Format 2: /id ml 84218845 2168 (Game in the middle with Zone!)
          // Format 3: /id 1017871735 ff (Game at the end!)
          // Format 4: /id 1017871735 (No game specified -> auto-detect Free Fire)
          // Format 5: /id 84218845 2168 (No game specified -> auto-detect Mobile Legends)
          const args = parts.slice(1);
          if (args.length === 0) {
            return ctx.reply(`❌ Error: Please enter Player ID.\nUsage Examples:\n• /id ff 1017871735 (Free Fire)\n• /id ml 84218845 2168 (Mobile Legends)\n• /id pubg 5123984712 (PUBG)\n• /ff 1017871735\n• /ml 84218845 2168`);
          }

          if (isNaN(args[0])) {
            // First argument is game code (e.g., ff, ml, pubg, bs, df, gs)
            gameArg = args[0];
            id = args[1] || '';
            zone = args[2] || '';
          } else if (args.length >= 2 && isNaN(args[args.length - 1])) {
            // Last argument is game code (e.g., 1017871735 ff)
            gameArg = args[args.length - 1];
            id = args[0] || '';
            zone = args[1] !== gameArg ? args[1] : '';
          } else {
            // All args are numeric
            if (args.length === 1) {
              id = args[0];
              gameArg = 'freefire_sg';
              zone = '';
            } else {
              id = args[0];
              zone = args[1];
              gameArg = 'mobilelegends';
            }
          }
        } else {
          // Direct game shortcut command: /ff 1017871735, /ml 84218845 2168, etc.
          gameArg = rawCmd;
          id = parts[1] || '';
          zone = parts[2] || '';
        }

        const matchedGame = findGameInCatalog(gameArg);

        if (!id) {
          return ctx.reply(`❌ Error: Please enter Player ID.\nUsage Examples:\n• /id ff 1017871735\n• /id ml 84218845 2168\n• /ff 1017871735\n• /ml 84218845 2168`);
        }

        await ctx.reply(`⌛ Checking Player IGN for ${matchedGame.name}...\n🎮 Game: ${matchedGame.name}\n🆔 Player ID: ${id}${zone ? `\n🌐 Zone ID: ${zone}` : ''}`);

        try {
          const result = await lookupFreePlayerIgn(matchedGame.id, id, zone);

          if (result && result.ign) {
            const successMsg = `
✅ PLAYER IGN VERIFIED!

🎮 Game: ${matchedGame.name}
👤 Real Username (IGN): ${result.ign}
🆔 Player ID: ${id}
${zone ? `🌐 Zone ID: ${zone}\n` : ''}⚡ Status: Verified Active Player

Ready for instant wholesale top-up!
            `.trim();
            return ctx.reply(successMsg);
          } else {
            const notFoundMsg = `
⚠️ PLAYER LOOKUP NOTICE

🎮 Game: ${matchedGame.name}
🆔 Player ID: ${id}
${zone ? `🌐 Zone ID: ${zone}\n` : ''}ℹ️ Status: ID formatting valid. Ready for top-up!
            `.trim();
            return ctx.reply(notFoundMsg);
          }
        } catch (err) {
          return ctx.reply(`❌ Lookup Error: ${err.message}`);
        }
      } catch (e) {
        console.error('PlayerCheck Error:', e);
      }
    };

    bot.command('id', handlePlayerCheck);
    bot.command('ign', handlePlayerCheck);
    bot.command('check', handlePlayerCheck);
    bot.command('ml', handlePlayerCheck);
    bot.command('ff', handlePlayerCheck);
    bot.command('pubg', handlePlayerCheck);
    bot.command('bs', handlePlayerCheck);
    bot.command('df', handlePlayerCheck);
    bot.command('gs', handlePlayerCheck);
    bot.command('lookup', handlePlayerCheck);
    bot.command('verify', handlePlayerCheck);

    // Command: /balance, /reseller, /wallet
    const handleBalance = (ctx) => {
      try {
        const chatId = ctx.message?.chat?.id || ctx.chat?.id;
        const reseller = (chatId ? boundChatSessions.get(chatId) : null);

        if (!reseller) {
          const unauthMsg = `
❌ AUTHENTICATION REQUIRED

Your Telegram chat is not bound to a verified Reseller Account.

🔑 Please link your reseller wallet first:
Send: /auth <SecurityKey>
(Example: /auth MADS-SEC-50048A92)
          `.trim();
          return ctx.reply(unauthMsg);
        }

        const balanceText = `
👑 MADS TOPUP RESELLER WALLET

💼 Reseller: ${reseller?.name || 'Verified Partner'}
🏷️ Reseller Code: ${reseller?.resellerCode || 'N/A'}
🔑 Security Key: ${reseller?.securityKey || 'N/A'}
💰 Available LKR Balance: Rs. ${(reseller?.walletBalance || 0).toLocaleString()} LKR
💵 Available USDT Balance: $${((reseller?.walletBalance || 0) / 305).toFixed(2)} USDT
⚡ Wholesale Discount: 5% OFF All Game Packages (${GAMES_DATA.length} Games)

📥 To Recharge Wallet: Type /deposit
🎮 To Check Supported Games: Type /games
⚡ To Execute Top-up: Type /topup <game> <id> [zone] <package>
        `.trim();
        return ctx.reply(balanceText);
      } catch (e) {
        console.error('Balance Error:', e);
      }
    };


    bot.command('balance', handleBalance);
    bot.command('reseller', handleBalance);
    bot.command('wallet', handleBalance);

    // Command: /deposit, /recharge
    const handleDeposit = (ctx) => {
      try {
        const depositText = `
📥 RESELLER WALLET RECHARGE INSTRUCTIONS

1️⃣ EZ Cash Instant Auto-Credit:
• Transfer to Merchant: 0740436276
• Copy 14-digit RN Number and submit on site.

2️⃣ Binance Pay USDT Auto-Credit:
• Binance Pay ID: 547785111 (MADS TOPUP)
• Copy Binance Order ID & Pay ID and submit on site.

3️⃣ Bank Transfer:
• Commercial Bank: 8009124810 (MADS ENGINE)
• Send slip to @mads_support for instant credit.
        `.trim();
        return ctx.reply(depositText);
      } catch (e) {
        console.error('Deposit Error:', e);
      }
    };

    bot.command('deposit', handleDeposit);
    bot.command('recharge', handleDeposit);

    // Command: /topup [game] [player_id] [zone_id] [package]
    bot.command('topup', async (ctx) => {
      try {
        const msgDate = ctx.message?.date || 0;
        if (msgDate && msgDate < botStartTime - 5) {
          console.log(`[Telegram Bot] Ignored stale topup command sent before server startup (msgDate: ${msgDate}, bootTime: ${botStartTime})`);
          return;
        }

        const msgId = ctx.message?.message_id;
        if (msgId) {
          if (processedMsgIds.has(msgId)) {
            console.log(`[Telegram Bot] Ignored duplicate topup message ID: ${msgId}`);
            return;
          }
          processedMsgIds.add(msgId);
          if (processedMsgIds.size > 10000) {
            const arr = Array.from(processedMsgIds);
            processedMsgIds.clear();
            arr.slice(-5000).forEach(id => processedMsgIds.add(id));
          }
        }

        const chatId = ctx.message?.chat?.id || ctx.chat?.id;
        const text = ctx.message?.text || ctx.msg?.text || '';
        const parts = text.split(/\s+/).filter(Boolean);

        let reseller = (chatId ? boundChatSessions.get(chatId) : null);

        let firstArg = parts[1] || '';
        if (!reseller && firstArg) {
          const potentialKeyReseller = await getResellerProfileByKeyAsync(firstArg);
          if (potentialKeyReseller) {
            reseller = potentialKeyReseller;
            boundChatSessions.set(chatId, reseller);
            parts.splice(1, 1);
          }
        }

        if (!reseller) {
          const authRequiredText = `
🔒 AUTHENTICATION REQUIRED TO EXECUTE TOP-UP

Your Telegram chat is not bound to a verified MADS TOPUP Reseller Account.

🔑 How to Link Your Reseller Account:
1️⃣ Get your unique Security Key from your MADS TOPUP Reseller Dashboard.
2️⃣ Send command: /auth <SecurityKey>
   (Example: /auth MADS-SEC-50048A92)

Once authenticated, your Telegram chat will be linked and authorized for instant top-ups!
          `.trim();
          return ctx.reply(authRequiredText);
        }


        let gameArg = (parts[1] || 'mobilelegends').toLowerCase().replace(/[()[\]]/g, '');
        let idArg = (parts[2] || '').replace(/[()[\]]/g, '');
        let zoneArg = (parts[3] || '').replace(/[()[\]]/g, '');
        let pkgArg = (parts[4] || '').replace(/[()[\]]/g, '');

        const matchedGame = findGameInCatalog(gameArg);

        if (!matchedGame.requiresServer && parts.length === 4) {
          pkgArg = (parts[3] || '').replace(/[()[\]]/g, '');
          zoneArg = '';
        } else if (matchedGame.requiresServer && parts.length === 4 && !pkgArg) {
          pkgArg = (parts[3] || '').replace(/[()[\]]/g, '');
        }

        if (!idArg || !pkgArg) {
          const usageMsg = `
❌ TOP-UP COMMAND USAGE

Format: /topup <game> <player_id> [zone_id] <package>

Examples:
• /topup ml 84218845 2168 86 (Mobile Legends 86 Diamonds)
• /topup ff 248901234 100 (Free Fire 100 Diamonds)
• /topup pubg 5123984712 60 (PUBG 60 UC)
          `.trim();
          return ctx.reply(usageMsg);
        }

        const lockKey = `${chatId}_${matchedGame.id}_${idArg}_${pkgArg}`;
        if (processingLocks.has(lockKey)) {
          console.log(`[Telegram Bot] Ignored concurrent topup command for lock key: ${lockKey}`);
          return ctx.reply(`⚠️ TOP-UP IN PROGRESS: An order for Player ID ${idArg} is already being processed. Please wait...`);
        }
        processingLocks.add(lockKey);

        try {
          const pkgInfo = findPackageInGame(matchedGame, pkgArg);
          const orderId = 'ORD-TG-' + Math.floor(100000 + Math.random() * 900000);
          const currentBalance = reseller.walletBalance || 10000;

          if (currentBalance < pkgInfo.priceLkr) {
            const failBalanceMsg = `
❌ TOP-UP FAILED: INSUFFICIENT RESELLER BALANCE

📦 Order ID: ${orderId}
👑 Reseller: ${reseller.name} (${reseller.resellerCode})
💵 Required Wholesale Price: Rs. ${pkgInfo.priceLkr.toLocaleString()} LKR
💰 Available Wallet Balance: Rs. ${currentBalance.toLocaleString()} LKR

Please recharge your reseller wallet using /deposit and try again.
            `.trim();
            return ctx.reply(failBalanceMsg);
          }

          await ctx.reply(`⌛ Processing Top-up Order #${orderId}...\n\n${matchedGame.currencyIcon} Game: ${matchedGame.name}\n🆔 Player ID: ${idArg} ${zoneArg ? `\n🌐 Zone ID: ${zoneArg}` : ''}\n📦 Package: ${pkgInfo.name}\n\nDispatching order to MooGold API & verifying IGN...`);

          let realIgn = `Player ${idArg}`;
          try {
            const ignLookup = await lookupFreePlayerIgn(matchedGame.id, idArg, zoneArg);
            if (ignLookup && ignLookup.ign) {
              realIgn = ignLookup.ign;
            }
          } catch (e) {}

          // Dispatch live order to MooGold API
          const mgResult = await sendMoongoldLiveOrder(matchedGame, pkgInfo, idArg, zoneArg, orderId);

          if (mgResult.success) {
            try {
              await deductResellerWalletBalance(reseller.uid, pkgInfo.priceLkr);
            } catch (e) {}

            const newBalance = Math.max(0, currentBalance - pkgInfo.priceLkr);
            reseller.walletBalance = newBalance;

            const newOrder = {
              id: orderId,
              userId: reseller.uid,
              userEmail: reseller.email || '',
              resellerCode: reseller.resellerCode,
              gameId: matchedGame.id,
              gameName: matchedGame.name,
              packageName: pkgInfo.name,
              playerId: idArg,
              zoneId: zoneArg,
              ign: realIgn,
              priceLkr: pkgInfo.priceLkr,
              paymentMethod: `Reseller Wallet (${reseller.resellerCode})`,
              isResellerOrder: true,
              status: 'COMPLETED',
              moongoldRef: mgResult.moongoldRef,
              createdAt: new Date().toISOString()
            };

            try {
              await saveOrderToFirestore(reseller.uid, newOrder);
            } catch (e) {}

            const successMsg = `
✅ TOP-UP SUCCESSFUL!

📦 Order Ref ID: ${orderId}
🔖 MooGold Ref: #${mgResult.moongoldRef}
👑 Reseller: ${reseller.name} (${reseller.resellerCode})
🔑 Security Key: ${(reseller.securityKey || 'MADS-SEC-PROTECTED').slice(0, 10)}****

${matchedGame.currencyIcon} Game: ${matchedGame.name}
👤 Real IGN Name: ${realIgn}
🆔 Player ID: ${idArg} ${zoneArg ? `\n🌐 Zone ID: ${zoneArg}` : ''}

${matchedGame.currencyIcon} Topup Package: ${pkgInfo.name} (Credited Successfully!)
⚡ Quantity Added: ${pkgInfo.countText || pkgInfo.name}

💵 Wholesale Price Paid: Rs. ${pkgInfo.priceLkr.toLocaleString()} LKR
💰 Remaining Reseller Balance: Rs. ${newBalance.toLocaleString()} LKR ($${(newBalance / 305).toFixed(2)} USDT)

Order placed live on MooGold Reseller Portal & credited instantly!
            `.trim();

            await ctx.reply(successMsg);

            // Background status check for automatic refund notice if MooGold refunds later
            setTimeout(async () => {
              try {
                const detail = await checkMoongoldOrderStatus(mgResult.moongoldRef);
                if (detail && (detail.status === 'refunded' || detail.status === 'cancelled' || detail.status === 'failed')) {
                  const cancelMsg = `
⚠️ GATEWAY REFUND NOTICE

📦 Order Ref ID: ${orderId}
🔖 MooGold Ref: #${mgResult.moongoldRef}
👑 Reseller: ${reseller.name} (${reseller.resellerCode})

ℹ️ Notice: Order was refunded by MooGold gateway (Item out of stock or First Topup Bonus already claimed).

💰 Reseller Wallet Balance Refunded: Rs. ${pkgInfo.priceLkr.toLocaleString()} LKR
                  `.trim();
                  ctx.reply(cancelMsg).catch(() => {});
                }
              } catch (e) {}
            }, 3000);

            return;
          } else {
            // MooGold order failed (e.g. invalid product ID, IP whitelist needed, or insufficient supplier balance)
            // Save failed order record without deducting reseller wallet balance
            const failedOrder = {
              id: orderId,
              userId: reseller.uid,
              userEmail: reseller.email || '',
              resellerCode: reseller.resellerCode,
              gameId: matchedGame.id,
              packageName: pkgInfo.name,
              playerId: idArg,
              zoneId: zoneArg,
              priceLkr: pkgInfo.priceLkr,
              paymentMethod: `Reseller Wallet (${reseller.resellerCode})`,
              isResellerOrder: true,
              status: 'FAILED',
              error: mgResult.error,
              createdAt: new Date().toISOString()
            };
            try {
              await saveOrderToFirestore(reseller.uid, failedOrder);
            } catch (e) {}

            const failMsg = `
❌ TOP-UP GATEWAY FAILURE

📦 Order Ref ID: ${orderId}
👑 Reseller: ${reseller.name} (${reseller.resellerCode})
⚠️ Gateway Response: ${mgResult.error}

💰 Wallet Balance Untouched: Rs. ${currentBalance.toLocaleString()} LKR ($${(currentBalance / 305).toFixed(2)} USDT)

Please check product availability or contact support. No reseller funds were charged.
            `.trim();

            return ctx.reply(failMsg);
          }
        } finally {
          processingLocks.delete(lockKey);
        }
      } catch (err) {
        console.error('Topup Error:', err);
        try {
          return ctx.reply(`❌ Topup Error: ${err.message}`);
        } catch (e) {}
      }
    });


    // Start Polling runner safely with error catch
    try {
      if (typeof bot.startPolling === 'function') {
        bot.startPolling();
      } else if (typeof longPoll === 'function') {
        longPoll(bot);
      }
    } catch (pollErr) {
      console.warn('[Telegram Polling Start Note]:', pollErr.message);
    }
    console.log('🤖 Telegram Bot polling started successfully for ALL games on website!');
    startBotHealthCheckLoop();

  } catch (err) {
    console.warn('[Telegram Bot Startup Warning]:', err.message);
  }

  return botInstance;
}
