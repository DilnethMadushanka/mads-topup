// Moongold API Client & Simulator Service
// Provider: https://moongold.id / https://moongold.com API engine

export const getMoongoldConfig = () => {
  const stored = localStorage.getItem('mads_moongold_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
  }
  return {
    apiKey: '',
    secretKey: '',
    baseUrl: 'https://api.moongold.com/v1',
    autoFulfill: true,
    simulationMode: true,
    merchantBalanceLkr: 145800.00,
    merchantBalanceUsd: 480.00
  };
};

export const saveMoongoldConfig = (config) => {
  localStorage.setItem('mads_moongold_config', JSON.stringify(config));
};

export const checkPlayerIGN = async (gameId, playerId, zoneId = '') => {
  const config = getMoongoldConfig();
  
  // Simulate network delay
  await new Promise(res => setTimeout(res, 800));

  if (config.simulationMode || !config.apiKey) {
    // Realistic IGN lookup simulator
    const mockNames = {
      freefire: ['🔥 S L _ S L A Y E R 🔥', '⚡ M A D S _ K I N G ⚡', '☠️ V I P E R _ Y T ☠️', '🇱🇰 L A N K A N _ B O S S'],
      pubg: ['MADS〆NOOB', 'MAD〆VIPER', 'SL丨LEGEND', 'OP丨GHOST'],
      mlbb: ['MythicGlory_SL', 'MADS_Savage', 'ChouGod_LK', 'MLBB_PRO_99']
    };
    const names = mockNames[gameId] || ['Player_' + playerId.slice(-4)];
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    return {
      success: true,
      ign: randomName,
      status: 'VERIFIED',
      message: 'Moongold IGN Lookup Success'
    };
  }

  // Real Moongold API Endpoint call
  try {
    const response = await fetch(`${config.baseUrl}/player-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
        'X-SECRET-KEY': config.secretKey
      },
      body: JSON.stringify({
        game: gameId,
        user_id: playerId,
        zone_id: zoneId
      })
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return {
      success: false,
      message: 'Failed to connect to Moongold API: ' + err.message
    };
  }
};

export const dispatchMoongoldOrder = async (orderData) => {
  const config = getMoongoldConfig();

  // Simulate API response time
  await new Promise(res => setTimeout(res, 1200));

  if (config.simulationMode || !config.apiKey) {
    const isSuccess = Math.random() > 0.05; // 95% instant success in demo
    const moongoldRef = 'MG-' + Math.floor(10000000 + Math.random() * 90000000);
    
    return {
      success: isSuccess,
      moongoldRef: moongoldRef,
      status: isSuccess ? 'COMPLETED' : 'PROCESSING',
      message: isSuccess 
        ? 'Moongold Topup Success! Items credited instantly.' 
        : 'Moongold queue busy. Order queued for automated retries.',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const response = await fetch(`${config.baseUrl}/order/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': config.apiKey,
        'X-SECRET-KEY': config.secretKey
      },
      body: JSON.stringify({
        service_code: orderData.game.moongoldCode,
        target_id: orderData.playerId,
        target_zone: orderData.zoneId || '',
        item_code: orderData.package.id
      })
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return {
      success: false,
      status: 'FAILED',
      message: 'Moongold API Error: ' + err.message
    };
  }
};
