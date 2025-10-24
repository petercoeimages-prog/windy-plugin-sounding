/**
 * Standalone Windy Sounding Analysis Plugin
 * This version works as an external script overlay
 */

(function() {
  'use strict';
  
  console.log('🌩️ Loading Sounding Analysis Plugin...');
  
  // Check if already loaded
  if (window.WindySoundingPlugin) {
    console.log('⚠️ Plugin already loaded');
    return;
  }
  
  // Plugin state
  const plugin = {
    isOpen: false,
    data: null,
    lat: null,
    lon: null
  };
  
  // Create plugin UI
  function createPluginUI() {
    // Remove existing plugin if present
    const existing = document.getElementById('windy-sounding-plugin');
    if (existing) existing.remove();
    
    // Create main container
    const container = document.createElement('div');
    container.id = 'windy-sounding-plugin';
    container.innerHTML = `
      <style>
        #windy-sounding-plugin {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #sounding-trigger-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          font-size: 28px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #sounding-trigger-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        
        #sounding-panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 420px;
          max-height: 85vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          overflow: hidden;
          display: none;
          flex-direction: column;
        }
        
        #sounding-panel.open {
          display: flex;
        }
        
        .sounding-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .sounding-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .sounding-header-info {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 4px;
        }
        
        .sounding-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 20px;
          transition: background 0.2s;
        }
        
        .sounding-close:hover {
          background: rgba(255,255,255,0.3);
        }
        
        .sounding-content {
          overflow-y: auto;
          padding: 16px;
          flex: 1;
        }
        
        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }
        
        .loading-spinner {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .severity-alert {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .severity-alert h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .severity-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
        }
        
        .severity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .severity-value {
          font-weight: bold;
          padding: 4px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.2);
        }
        
        .param-section {
          margin-bottom: 20px;
        }
        
        .param-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .param-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        
        .param-card {
          padding: 12px;
          border-radius: 8px;
          transition: transform 0.2s;
        }
        
        .param-card:hover {
          transform: translateY(-2px);
        }
        
        .param-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .param-value {
          font-size: 22px;
          font-weight: bold;
          line-height: 1;
        }
        
        .param-unit {
          font-size: 12px;
          font-weight: normal;
          margin-left: 4px;
          opacity: 0.8;
        }
        
        .severity-low { background: #d4edda; color: #155724; }
        .severity-moderate { background: #fff3cd; color: #856404; }
        .severity-high { background: #f8d7da; color: #721c24; }
        .severity-extreme { background: #dc3545; color: white; }
        .severity-none { background: #f8f9fa; color: #6c757d; }
        
        .cta-box {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 16px;
          border-radius: 8px;
          margin-top: 20px;
        }
        
        .cta-box h3 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }
        
        .cta-box p {
          font-size: 13px;
          margin: 0 0 12px 0;
          opacity: 0.9;
        }
        
        .cta-btn {
          width: 100%;
          background: white;
          color: #667eea;
          border: none;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cta-btn:hover {
          background: #f8f9fa;
          transform: translateY(-1px);
        }
        
        .demo-locations {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          margin-top: 16px;
        }
        
        .demo-locations h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #666;
        }
        
        .demo-btn {
          background: white;
          border: 1px solid #ddd;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          margin-right: 8px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        
        .demo-btn:hover {
          background: #667eea;
          color: white;
          border-color: #667eea;
        }
      </style>
      
      <button id="sounding-trigger-btn" title="Open Sounding Analysis">☁️</button>
      
      <div id="sounding-panel">
        <div class="sounding-header">
          <div>
            <h2>🌩️ Sounding Analysis</h2>
            <div class="sounding-header-info" id="location-info">Click map to analyze</div>
          </div>
          <button class="sounding-close" id="sounding-close-btn">×</button>
        </div>
        <div class="sounding-content" id="sounding-content">
          <div class="loading-state">
            <p>Click on the map to analyze atmospheric conditions at any location</p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Event listeners
    document.getElementById('sounding-trigger-btn').addEventListener('click', togglePanel);
    document.getElementById('sounding-close-btn').addEventListener('click', closePanel);
    
    // Listen for map clicks
    if (window.W && W.map) {
      W.map.on('click', handleMapClick);
      console.log('✅ Map click listener attached');
    } else {
      console.warn('⚠️ Windy map not available yet, will retry...');
      setTimeout(() => {
        if (window.W && W.map) {
          W.map.on('click', handleMapClick);
          console.log('✅ Map click listener attached (delayed)');
        }
      }, 2000);
    }
  }
  
  function togglePanel() {
    const panel = document.getElementById('sounding-panel');
    plugin.isOpen = !plugin.isOpen;
    panel.classList.toggle('open', plugin.isOpen);
    
    if (plugin.isOpen && !plugin.data) {
      showClickPrompt();
    }
  }
  
  function closePanel() {
    plugin.isOpen = false;
    document.getElementById('sounding-panel').classList.remove('open');
  }
  
  function showClickPrompt() {
    const content = document.getElementById('sounding-content');
    content.innerHTML = `
      <div class="loading-state">
        <p style="font-size: 16px; margin-bottom: 16px;">📍 Click anywhere on the map</p>
        <p style="color: #999; font-size: 14px;">to analyze atmospheric conditions at that location</p>
      </div>
    `;
  }
  
  function handleMapClick(e) {
    plugin.lat = e.latlng.lat;
    plugin.lon = e.latlng.lng;
    
    // Auto-open panel if closed
    if (!plugin.isOpen) {
      plugin.isOpen = true;
      document.getElementById('sounding-panel').classList.add('open');
    }
    
    loadSoundingData(plugin.lat, plugin.lon);
  }
  
  function showLoading() {
    const content = document.getElementById('sounding-content');
    content.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Analyzing atmospheric data...</p>
      </div>
    `;
  }
  
  async function loadSoundingData(lat, lon) {
    showLoading();
    
    // Update location info
    document.getElementById('location-info').textContent = 
      `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`;
    
    try {
      // Simulate data fetch (in real implementation, fetch from Windy API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate simulated data (in production, get real data from Windy)
      const data = generateSimulatedData(lat, lon);
      plugin.data = data;
      
      renderData(data, lat, lon);
    } catch (error) {
      showError(error);
    }
  }
  
  function generateSimulatedData(lat, lon) {
    // Generate realistic-looking data based on location
    const tempFactor = Math.abs(lat) < 30 ? 1.2 : 0.8;
    
    return {
      cape: Math.floor(Math.random() * 3000 * tempFactor),
      mucape: Math.floor(Math.random() * 3500 * tempFactor),
      cin: -Math.floor(Math.random() * 150),
      lcl: 800 + Math.floor(Math.random() * 200),
      li: -Math.random() * 8,
      pwat: Math.floor(Math.random() * 60 * tempFactor),
      shear_0_1km: Math.random() * 25,
      shear_0_6km: Math.random() * 40,
      srh_0_1km: Math.floor(Math.random() * 400),
      srh_0_3km: Math.floor(Math.random() * 500),
      scp: Math.random() * 8,
      stp: Math.random() * 4,
      ehi: Math.random() * 5,
      ship: Math.random() * 2.5
    };
  }
  
  function renderData(data, lat, lon) {
    const content = document.getElementById('sounding-content');
    
    const severeSupercell = data.scp >= 4 ? 'EXTREME' : data.scp >= 1 ? 'MODERATE' : 'LOW';
    const severeTornado = data.stp >= 2 ? 'SIGNIFICANT' : data.stp >= 1 ? 'MODERATE' : 'LOW';
    
    content.innerHTML = `
      <div class="severity-alert">
        <h3>⚠️ Severe Weather Potential</h3>
        <div class="severity-grid">
          <div class="severity-item">
            <span>Supercells:</span>
            <span class="severity-value">${severeSupercell}</span>
          </div>
          <div class="severity-item">
            <span>Tornadoes:</span>
            <span class="severity-value">${severeTornado}</span>
          </div>
        </div>
      </div>
      
      <div class="param-section">
        <h3>🌡️ Thermodynamic</h3>
        <div class="param-grid">
          ${renderParam('CAPE', data.cape, 'J/kg', [1000, 2500, 4000])}
          ${renderParam('MUCAPE', data.mucape, 'J/kg', [1000, 2500, 4000])}
          ${renderParam('CIN', Math.abs(data.cin), 'J/kg', [50, 100, 200])}
          ${renderParam('LCL', data.lcl, 'hPa', [900, 850, 800])}
          ${renderParam('LI', Math.abs(data.li).toFixed(1), '°C', [3, 6, 8])}
          ${renderParam('PWAT', data.pwat, 'mm', [30, 45, 60])}
        </div>
      </div>
      
      <div class="param-section">
        <h3>💨 Kinematic</h3>
        <div class="param-grid">
          ${renderParam('0-1km Shear', data.shear_0_1km.toFixed(1), 'm/s', [10, 15, 20])}
          ${renderParam('0-6km Shear', data.shear_0_6km.toFixed(1), 'm/s', [15, 25, 35])}
          ${renderParam('0-1km SRH', data.srh_0_1km, 'm²/s²', [100, 200, 300])}
          ${renderParam('0-3km SRH', data.srh_0_3km, 'm²/s²', [150, 300, 450])}
        </div>
      </div>
      
      <div class="param-section">
        <h3>📊 Composite Indices</h3>
        <div class="param-grid">
          ${renderParam('SCP', data.scp.toFixed(2), '', [1, 4, 10])}
          ${renderParam('STP', data.stp.toFixed(2), '', [1, 2, 4])}
          ${renderParam('EHI', data.ehi.toFixed(2), '', [1, 2, 4])}
          ${renderParam('SHIP', data.ship.toFixed(2), '', [0.5, 1.0, 2.0])}
        </div>
      </div>
      
      <div class="cta-box">
        <h3>🔬 Detailed Analysis</h3>
        <p>For comprehensive sounding analysis with Skew-T diagrams, hodographs, and advanced modifications:</p>
        <button class="cta-btn" onclick="window.open('http://localhost:7861?lat=${lat}&lon=${lon}', '_blank')">
          Open Full Analysis Tool →
        </button>
      </div>
      
      <div class="demo-locations">
        <h4>Quick Test Locations:</h4>
        <button class="demo-btn" onclick="window.WindySoundingPlugin.loadLocation(-37.8136, 144.9631)">Melbourne</button>
        <button class="demo-btn" onclick="window.WindySoundingPlugin.loadLocation(-33.8688, 151.2093)">Sydney</button>
        <button class="demo-btn" onclick="window.WindySoundingPlugin.loadLocation(35.6762, 139.6503)">Tokyo</button>
        <button class="demo-btn" onclick="window.WindySoundingPlugin.loadLocation(35.4676, -97.5164)">Oklahoma</button>
      </div>
    `;
  }
  
  function renderParam(label, value, unit, thresholds) {
    const numValue = parseFloat(value);
    const severity = getSeverityClass(numValue, thresholds);
    
    return `
      <div class="param-card ${severity}">
        <div class="param-label">${label}</div>
        <div class="param-value">
          ${value}<span class="param-unit">${unit}</span>
        </div>
      </div>
    `;
  }
  
  function getSeverityClass(value, thresholds) {
    if (value === null || value === undefined || isNaN(value)) return 'severity-none';
    if (value >= thresholds[2]) return 'severity-extreme';
    if (value >= thresholds[1]) return 'severity-high';
    if (value >= thresholds[0]) return 'severity-moderate';
    return 'severity-low';
  }
  
  function showError(error) {
    const content = document.getElementById('sounding-content');
    content.innerHTML = `
      <div class="loading-state">
        <p style="color: #dc3545; font-weight: 600;">⚠️ Error loading data</p>
        <p style="color: #666; font-size: 14px;">${error.message}</p>
      </div>
    `;
  }
  
  // Public API
  window.WindySoundingPlugin = {
    loadLocation: function(lat, lon) {
      plugin.lat = lat;
      plugin.lon = lon;
      
      if (!plugin.isOpen) {
        plugin.isOpen = true;
        document.getElementById('sounding-panel').classList.add('open');
      }
      
      loadSoundingData(lat, lon);
    },
    close: closePanel,
    toggle: togglePanel
  };
  
  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPluginUI);
  } else {
    createPluginUI();
  }
  
  console.log('✅ Sounding Analysis Plugin loaded successfully!');
  console.log('💡 Click the cloud button or click anywhere on the map to analyze');
})();
