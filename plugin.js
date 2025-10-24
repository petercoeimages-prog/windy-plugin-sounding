/**
 * Windy Sounding Analysis Plugin
 * Displays atmospheric parameters and links to full analysis tool
 */

W.define('plugins/windy-plugin-sounding', function(rootScope, store, picker, utils, map) {
  
  // Plugin initialization
  const pluginDataLoader = {
    
    // Called when plugin is opened
    onopen: function() {
      console.log('Sounding plugin opened');
      this.loadData();
    },
    
    // Called when plugin is closed
    onclose: function() {
      console.log('Sounding plugin closed');
    },
    
    // Load atmospheric data from Windy
    loadData: async function() {
      const { lat, lon } = picker.getLatLon();
      
      if (!lat || !lon) {
        this.renderNoData();
        return;
      }
      
      // Show loading state
      this.renderLoading();
      
      try {
        // Get data from Windy's data store
        const data = await this.fetchWindyData(lat, lon);
        this.renderData(data, lat, lon);
      } catch (error) {
        console.error('Error loading data:', error);
        this.renderError(error);
      }
    },
    
    // Fetch atmospheric profile data from Windy
    fetchWindyData: async function(lat, lon) {
      // Get current model and timestamp
      const product = store.get('product');
      const overlay = store.get('overlay');
      const timestamp = store.get('timestamp');
      
      // Request atmospheric profile data
      const soundingData = await W.request({
        url: `https://node.windy.com/forecast/meteogram/${product}/${lat}/${lon}`,
        params: { step: timestamp }
      });
      
      // Calculate derived parameters from the sounding
      return this.calculateParameters(soundingData);
    },
    
    // Calculate severe weather parameters from raw sounding data
    calculateParameters: function(rawData) {
      // Extract pressure levels and variables
      const levels = rawData['data-series'];
      
      // Basic calculations (simplified - in production use full algorithms)
      const surface = levels[0];
      const calculations = {
        // Thermodynamic
        cape: this.estimateCAPE(levels),
        mucape: this.estimateMUCAPE(levels),
        cin: this.estimateCIN(levels),
        lcl: this.estimateLCL(surface),
        li: this.estimateLiftedIndex(levels),
        pwat: this.calculatePWAT(levels),
        
        // Kinematic
        shear_0_1km: this.calculateShear(levels, 0, 1000),
        shear_0_6km: this.calculateShear(levels, 0, 6000),
        srh_0_1km: this.calculateSRH(levels, 0, 1000),
        srh_0_3km: this.calculateSRH(levels, 0, 3000),
        
        // Composite
        scp: 0, // Will calculate after other params
        stp: 0,
        ehi: 0,
        ship: 0
      };
      
      // Calculate composite indices
      calculations.scp = this.calculateSCP(calculations);
      calculations.stp = this.calculateSTP(calculations);
      calculations.ehi = this.calculateEHI(calculations);
      calculations.ship = this.calculateSHIP(calculations);
      
      return calculations;
    },
    
    // Simplified parameter calculations
    estimateCAPE: function(levels) {
      // Simplified CAPE estimation
      // In production, use proper parcel theory calculations
      const temp = levels[0].temp;
      const dewpoint = levels[0].dewpoint;
      const spread = temp - dewpoint;
      return Math.max(0, (temp - 15) * 100 - spread * 50);
    },
    
    estimateMUCAPE: function(levels) {
      return this.estimateCAPE(levels) * 1.15; // Rough approximation
    },
    
    estimateCIN: function(levels) {
      const spread = levels[0].temp - levels[0].dewpoint;
      return -Math.max(0, spread * 10);
    },
    
    estimateLCL: function(surface) {
      const spread = surface.temp - surface.dewpoint;
      return surface.pressure - (spread * 30); // Rough approximation
    },
    
    estimateLiftedIndex: function(levels) {
      const surfaceTemp = levels[0].temp;
      const temp500 = levels.find(l => l.pressure <= 500)?.temp || -10;
      return temp500 - (surfaceTemp - 20);
    },
    
    calculatePWAT: function(levels) {
      // Simplified precipitable water calculation
      let pwat = 0;
      for (let i = 0; i < levels.length - 1; i++) {
        const rh = levels[i].rh || 50;
        const dp = levels[i + 1].pressure - levels[i].pressure;
        pwat += (rh / 100) * Math.abs(dp) * 0.01;
      }
      return pwat;
    },
    
    calculateShear: function(levels, heightStart, heightEnd) {
      const start = levels.find(l => l.height >= heightStart);
      const end = levels.find(l => l.height >= heightEnd);
      
      if (!start || !end) return 0;
      
      const du = (end.wind_u || 0) - (start.wind_u || 0);
      const dv = (end.wind_v || 0) - (start.wind_v || 0);
      return Math.sqrt(du * du + dv * dv);
    },
    
    calculateSRH: function(levels, heightStart, heightEnd) {
      // Simplified SRH calculation
      const shear = this.calculateShear(levels, heightStart, heightEnd);
      return shear * shear * 10; // Rough approximation
    },
    
    calculateSCP: function(params) {
      return (params.mucape / 1000) * (params.srh_0_3km / 50) * (params.shear_0_6km / 20);
    },
    
    calculateSTP: function(params) {
      const lclFactor = Math.max(0, (2000 - params.lcl) / 1000);
      return (params.cape / 1500) * (params.srh_0_1km / 150) * (params.shear_0_6km / 20) * lclFactor;
    },
    
    calculateEHI: function(params) {
      return (params.cape * params.srh_0_3km) / 160000;
    },
    
    calculateSHIP: function(params) {
      return (params.mucape * params.shear_0_6km) / 50000;
    },
    
    // Rendering functions
    renderLoading: function() {
      const container = document.querySelector('#windy-plugin-sounding .plugin-content');
      container.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading atmospheric data...</p>
        </div>
      `;
    },
    
    renderNoData: function() {
      const container = document.querySelector('#windy-plugin-sounding .plugin-content');
      container.innerHTML = `
        <div class="no-data">
          <p>Click on the map to analyze atmospheric conditions</p>
        </div>
      `;
    },
    
    renderError: function(error) {
      const container = document.querySelector('#windy-plugin-sounding .plugin-content');
      container.innerHTML = `
        <div class="error-container">
          <p>Error loading data: ${error.message}</p>
        </div>
      `;
    },
    
    renderData: function(data, lat, lon) {
      const container = document.querySelector('#windy-plugin-sounding .plugin-content');
      
      const html = `
        <div class="sounding-data">
          <div class="location-info">
            <strong>Location:</strong> ${lat.toFixed(3)}°, ${lon.toFixed(3)}°
          </div>
          
          <!-- Severity Assessment -->
          <div class="severity-box">
            <h3>⚠️ Severe Weather Potential</h3>
            <div class="severity-grid">
              <div>
                <span class="label">Supercells:</span>
                <span class="value ${this.getSeverityClass(data.scp, [1, 4, 10])}">
                  ${this.getSeverityLabel(data.scp, [1, 4, 10])}
                </span>
              </div>
              <div>
                <span class="label">Tornadoes:</span>
                <span class="value ${this.getSeverityClass(data.stp, [1, 2, 4])}">
                  ${this.getSeverityLabel(data.stp, [1, 2, 4])}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Thermodynamic Parameters -->
          <div class="param-section">
            <h3>🌡️ Thermodynamic</h3>
            <div class="param-grid">
              ${this.renderParam('CAPE', data.cape, 'J/kg', [1000, 2500, 4000])}
              ${this.renderParam('MUCAPE', data.mucape, 'J/kg', [1000, 2500, 4000])}
              ${this.renderParam('CIN', Math.abs(data.cin), 'J/kg', [50, 100, 200])}
              ${this.renderParam('LCL', data.lcl, 'hPa', [900, 850, 800])}
              ${this.renderParam('LI', Math.abs(data.li), '°C', [3, 6, 8])}
              ${this.renderParam('PWAT', data.pwat, 'mm', [30, 45, 60])}
            </div>
          </div>
          
          <!-- Kinematic Parameters -->
          <div class="param-section">
            <h3>💨 Kinematic</h3>
            <div class="param-grid">
              ${this.renderParam('0-1km Shear', data.shear_0_1km, 'm/s', [10, 15, 20])}
              ${this.renderParam('0-6km Shear', data.shear_0_6km, 'm/s', [15, 25, 35])}
              ${this.renderParam('0-1km SRH', data.srh_0_1km, 'm²/s²', [100, 200, 300])}
              ${this.renderParam('0-3km SRH', data.srh_0_3km, 'm²/s²', [150, 300, 450])}
            </div>
          </div>
          
          <!-- Composite Indices -->
          <div class="param-section">
            <h3>📊 Composite Indices</h3>
            <div class="param-grid">
              ${this.renderParam('SCP', data.scp, '', [1, 4, 10])}
              ${this.renderParam('STP', data.stp, '', [1, 2, 4])}
              ${this.renderParam('EHI', data.ehi, '', [1, 2, 4])}
              ${this.renderParam('SHIP', data.ship, '', [0.5, 1.0, 2.0])}
            </div>
          </div>
          
          <!-- Link to Full Analysis -->
          <div class="full-analysis-link">
            <h3>🔬 Detailed Analysis</h3>
            <p>For comprehensive sounding analysis including Skew-T diagrams and hodographs:</p>
            <button onclick="window.open('http://localhost:7861?lat=${lat}&lon=${lon}', '_blank')" class="btn-primary">
              Open Full Analysis Tool →
            </button>
          </div>
        </div>
      `;
      
      container.innerHTML = html;
    },
    
    renderParam: function(label, value, unit, thresholds) {
      const severity = this.getSeverityClass(value, thresholds);
      return `
        <div class="param-box ${severity}">
          <div class="param-label">${label}</div>
          <div class="param-value">
            ${value !== null && value !== undefined ? value.toFixed(value < 10 ? 1 : 0) : 'N/A'}
            <span class="param-unit">${unit}</span>
          </div>
        </div>
      `;
    },
    
    getSeverityClass: function(value, thresholds) {
      if (value === null || value === undefined) return 'severity-none';
      if (value >= thresholds[2]) return 'severity-extreme';
      if (value >= thresholds[1]) return 'severity-high';
      if (value >= thresholds[0]) return 'severity-moderate';
      return 'severity-low';
    },
    
    getSeverityLabel: function(value, thresholds) {
      if (value === null || value === undefined) return 'N/A';
      if (value >= thresholds[2]) return 'EXTREME';
      if (value >= thresholds[1]) return 'HIGH';
      if (value >= thresholds[0]) return 'MODERATE';
      return 'LOW';
    }
  };
  
  // Listen for picker changes (when user clicks on map)
  picker.on('pickerOpened', () => {
    pluginDataLoader.loadData();
  });
  
  picker.on('pickerMoved', () => {
    pluginDataLoader.loadData();
  });
  
  return pluginDataLoader;
});