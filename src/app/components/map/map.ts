import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import * as L from 'leaflet';
import { OverpassService } from '../../services/overpass.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="map-container">
      <div class="sidebar">
        <h2>🗺️ Cantones de Guayas</h2>
        
        <div class="loading" *ngIf="isLoading()">
          <div class="spinner"></div>
          <p>{{ loadingMessage() }}</p>
        </div>
        
        <div class="error" *ngIf="error()">{{ error() }}</div>
        
        <div class="canton-list" *ngIf="!isLoading()">
          <button 
            *ngFor="let canton of cantones()"
            [class.active]="selectedCanton() === canton"
            [class.disabled]="!cantonesValidos().has(canton)"
            [disabled]="!cantonesValidos().has(canton)"
            (click)="selectCantonByName(canton)"
            class="canton-button"
            [title]="!cantonesValidos().has(canton) ? 'Sin datos de área disponibles en la API' : ''"
          >
            {{ canton }}
            <span *ngIf="!cantonesValidos().has(canton)" class="invalid-badge">⚠️</span>
          </button>
        </div>
        
        <button 
          *ngIf="selectedCanton() && !isLoading()"
          (click)="resetMap()"
          class="reset-button"
        >
          🔄 Ver Guayas completo
        </button>
        
        <div class="info" *ngIf="!isLoading() && !selectedCanton()">
          <p>👆 Selecciona un cantón para enfocarte en él</p>
        </div>
      </div>
      <div id="map"></div>
    </div>
  `,
  styles: [`
    .map-container {
      display: flex;
      height: 100vh;
      width: 100%;
    }

    .sidebar {
      width: 300px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      border-right: 1px solid #0f3460;
      padding: 20px;
      overflow-y: auto;
      box-shadow: 2px 0 10px rgba(0,0,0,0.3);
      z-index: 1000;
    }

    .sidebar h2 {
      margin-top: 0;
      font-size: 20px;
      color: #e94560;
      margin-bottom: 20px;
      text-align: center;
      border-bottom: 2px solid #0f3460;
      padding-bottom: 15px;
    }

    .loading {
      padding: 30px;
      text-align: center;
      color: #fff;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #0f3460;
      border-top: 4px solid #e94560;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      padding: 15px;
      background-color: rgba(233, 69, 96, 0.2);
      border-left: 4px solid #e94560;
      color: #ff6b8a;
      margin-bottom: 15px;
      border-radius: 4px;
      font-size: 14px;
    }

    .canton-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: calc(100vh - 250px);
      overflow-y: auto;
      padding-right: 5px;
    }

    .canton-button {
      padding: 12px 15px;
      border: 2px solid #0f3460;
      background-color: rgba(15, 52, 96, 0.5);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      text-align: left;
      transition: all 0.3s ease;
      font-weight: 500;
      color: #fff;
    }

    .canton-button:hover {
      background-color: rgba(233, 69, 96, 0.3);
      border-color: #e94560;
      transform: translateX(5px);
    }

    .canton-button.active {
      background: linear-gradient(135deg, #e94560 0%, #0f3460 100%);
      color: white;
      border-color: #e94560;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(233, 69, 96, 0.4);
      transform: translateX(5px);
    }

    .canton-button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background-color: rgba(15, 52, 96, 0.3);
      border-color: #ff6b6b;
    }

    .canton-button.disabled:hover {
      background-color: rgba(15, 52, 96, 0.3);
      border-color: #ff6b6b;
      transform: none;
    }

    .invalid-badge {
      float: right;
      font-size: 12px;
      margin-top: 2px;
    }

    .reset-button {
      width: 100%;
      padding: 14px;
      margin-top: 20px;
      background: linear-gradient(135deg, #e94560 0%, #b83b5e 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 15px;
      font-weight: bold;
      transition: all 0.3s ease;
    }

    .reset-button:hover {
      background: linear-gradient(135deg, #ff6b8a 0%, #e94560 100%);
      box-shadow: 0 4px 15px rgba(233, 69, 96, 0.5);
    }

    .info {
      margin-top: 20px;
      padding: 15px;
      background-color: rgba(15, 52, 96, 0.5);
      border-radius: 8px;
      color: #aaa;
      font-size: 13px;
      text-align: center;
    }

    #map {
      flex: 1;
      z-index: 1;
    }

    ::-webkit-scrollbar {
      width: 6px;
    }

    ::-webkit-scrollbar-track {
      background: #1a1a2e;
    }

    ::-webkit-scrollbar-thumb {
      background: #e94560;
      border-radius: 3px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: #ff6b8a;
    }
  `]
})
export class MapComponent implements OnInit {
  cantones = signal<string[]>([]);
  cantonesValidos = signal<Set<string>>(new Set());
  selectedCanton = signal<string | null>(null);
  isLoading = signal(true);
  loadingMessage = signal('Cargando mapa de Guayas...');
  error = signal<string | null>(null);

  private map: L.Map | null = null;
  private guayasLayer: L.GeoJSON | null = null;
  private cantonesLayer: L.GeoJSON | null = null;
  private selectedCantonLayer: L.GeoJSON | null = null;
  private maskLayer: L.Polygon | null = null;

  private cantonesCache: Map<string, any> = new Map();
  private guayasGeoJson: any = null;
  private allCantonesGeoJson: any = null;

  constructor(private overpassService: OverpassService) {}

  async ngOnInit(): Promise<void> {
    try {
      console.log('🚀 Iniciando componente del mapa...');
      this.initializeMap();
      await this.loadData();
    } catch (error: any) {
      console.error('❌ Error en ngOnInit:', error);
      this.error.set('Error: ' + (error?.message || 'Error desconocido'));
    }
  }

  private initializeMap(): void {
    console.log('🗺️ Inicializando mapa...');
    const guayasCenter: [number, number] = [-2.0, -79.9];

    this.map = L.map('map', {
      center: guayasCenter,
      zoom: 9,
      minZoom: 6,
      maxZoom: 18
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    console.log('✓ Mapa OpenStreetMap cargado');
  }

  private async loadData(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      console.log('📥 Obteniendo lista de cantones...');
      const cantonesNames = this.overpassService.getCantonesNames();
      console.log('📍 Cantones obtenidos:', cantonesNames);
      this.cantones.set(cantonesNames);

      console.log('⏳ Cargando provincia de Guayas...');
      this.loadingMessage.set('Cargando límites de Guayas...');
      this.guayasGeoJson = await this.overpassService.getGuayasProvince();
      console.log('✓ Guayas GeoJSON:', this.guayasGeoJson);
      this.displayGuayasProvince();

      console.log('⏳ Cargando cantones en background...');
      this.loadingMessage.set('Cargando cantones...');
      this.loadCantonesInBackground();

      this.isLoading.set(false);
    } catch (error: any) {
      console.error('❌ Error cargando datos:', error);
      this.error.set('Error al cargar datos: ' + (error?.message || 'Error desconocido'));
      this.isLoading.set(false);
    }
  }

  private async loadCantonesInBackground(): Promise<void> {
    try {
      console.log('📥 Obteniendo todos los cantones...');
      this.allCantonesGeoJson = await this.overpassService.getGuayasCantones();

      console.log('📊 Cantones GeoJSON features ANTES DE FILTRAR:', this.allCantonesGeoJson?.features?.length || 0);

      const setCantonesValidos = new Set<string>();
      const nombresReales: string[] = [];

      if (this.allCantonesGeoJson?.features) {
        // FILTRAR: Solo Polygons y MultiPolygons (NO LineStrings)
        const cantonesValidos = this.allCantonesGeoJson.features.filter((feature: any) => {
          const tipo = feature.geometry?.type;
          const esValido = tipo === 'Polygon' || tipo === 'MultiPolygon';
          const name = feature.properties?.name || 'Sin nombre';
          
          if (esValido) {
            setCantonesValidos.add(name);
            nombresReales.push(name);
            console.log(`  ✓ ${name}: geometría type=${tipo}`);
          } else {
            console.warn(`  ⚠️ IGNORANDO ${name}: es ${tipo} (necesita ser Polygon o MultiPolygon)`);
          }
          
          return esValido;
        });

        this.allCantonesGeoJson.features = cantonesValidos;
        console.log(`📊 Cantones GeoJSON features DESPUÉS DE FILTRAR: ${cantonesValidos.length}`);

        cantonesValidos.forEach((feature: any) => {
          const name = feature.properties?.name;
          if (name) {
            this.cantonesCache.set(name, {
              type: 'FeatureCollection',
              features: [feature]
            });
          }
        });

        // Actualizar la lista de cantones con los nombres REALES de la API
        this.cantones.set(nombresReales.sort());
      }

      // Actualizar signal con cantones válidos
      this.cantonesValidos.set(setCantonesValidos);
      console.log(`🟢 Set de cantones válidos actualizado:`, setCantonesValidos);

      if (!this.selectedCanton()) {
        console.log('🎨 Pintando todos los cantones válidos...');
        this.displayAllCantones();
      }
    } catch (error) {
      console.error('❌ Error cargando cantones en background:', error);
    }
  }

  private displayGuayasProvince(): void {
    if (!this.map || !this.guayasGeoJson) {
      console.error('❌ No se puede mostrar Guayas: map o guayasGeoJson no existen');
      return;
    }

    console.log('🎨 Mostrando provincia de Guayas...');
    
    // Crear máscara blanca/pastel para el resto del mundo
    this.createWorldMask();

    this.guayasLayer = L.geoJSON(this.guayasGeoJson, {
      style: {
        color: '#059669',
        weight: 3,
        opacity: 1,
        fillColor: '#e8f5e9',
        fillOpacity: 0.7
      }
    }).addTo(this.map);

    const bounds = this.guayasLayer.getBounds();
    console.log('📍 Bounds de Guayas:', bounds);
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
      console.log('✓ Vista ajustada a Guayas');
    }
  }

  private createWorldMask(): void {
    if (!this.map || !this.guayasGeoJson) return;

    console.log('🎭 Creando máscara mundial blanca/pastel...');
    
    const feature = this.guayasGeoJson.features[0];
    
    // Rectángulo que cubre todo el mundo
    const worldBounds: L.LatLngExpression[] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ];

    let holes: L.LatLngExpression[][] = [];

    if (feature.geometry.type === 'Polygon') {
      holes = [this.convertCoordinates(feature.geometry.coordinates[0])];
    } else if (feature.geometry.type === 'MultiPolygon') {
      holes = feature.geometry.coordinates.map((poly: any) =>
        this.convertCoordinates(poly[0])
      );
    }

    // Máscara blanca/pastel que cubre TODO el mundo menos Guayas
    const worldMask = L.polygon([worldBounds, ...holes], {
      color: '#e0e0e0',
      weight: 2,
      fillColor: '#f5f5f5',
      fillOpacity: 1,
      interactive: false,
      pane: 'tilePane'
    }).addTo(this.map);

    console.log('✓ Máscara mundial creada');
  }

  private displayAllCantones(): void {
    if (!this.map || !this.allCantonesGeoJson) {
      console.error('❌ No se puede mostrar cantones: map o allCantonesGeoJson no existen');
      return;
    }

    if (this.cantonesLayer) {
      console.log('🗑️ Removiendo capa anterior de cantones');
      this.map.removeLayer(this.cantonesLayer);
    }

    console.log(`🎨 Creando capa de ${this.allCantonesGeoJson.features.length} cantones...`);

    this.cantonesLayer = L.geoJSON(this.allCantonesGeoJson, {
      style: {
        color: '#22c55e',
        weight: 2.5,
        opacity: 0.9,
        fillColor: '#86efac',
        fillOpacity: 0.4,
        dashArray: '3, 3'
      },
      onEachFeature: (feature: any, layer: L.Layer) => {
        const name = feature.properties?.name || 'Sin nombre';
        console.log(`  ✓ Renderizando en mapa: ${name}`);
        layer.bindPopup(`<strong>${name}</strong><br>Click para enfocarse`);

        layer.on('click', () => {
          console.log(`🖱️ Cantón clickeado: ${name}`);
          this.selectCantonByName(name);
        });

        layer.on('mouseover', () => {
          (layer as any).setStyle({
            fillOpacity: 0.6,
            weight: 3.5,
            color: '#16a34a'
          });
        });

        layer.on('mouseout', () => {
          if (this.selectedCanton() !== name) {
            (layer as any).setStyle({
              fillOpacity: 0.4,
              weight: 2.5,
              color: '#22c55e'
            });
          }
        });
      }
    }).addTo(this.map);

    console.log('✓ Capa de cantones creada y añadida al mapa');
  }

  async selectCantonByName(cantonName: string): Promise<void> {
    try {
      console.log(`\n🎯 Seleccionando cantón: ${cantonName}`);
      this.isLoading.set(true);
      this.loadingMessage.set(`Cargando ${cantonName}...`);
      this.selectedCanton.set(cantonName);

      this.clearSelectionLayers();

      let cantonData = this.cantonesCache.get(cantonName);
      console.log(`  📦 En cache: ${cantonData ? 'SÍ' : 'NO'}`);

      if (!cantonData) {
        console.log(`  📥 Cargando desde API...`);
        cantonData = await this.overpassService.getCantonByName(cantonName);
        if (cantonData?.features?.length > 0) {
          this.cantonesCache.set(cantonName, cantonData);
          console.log(`  ✓ Guardado en cache`);
        }
      }

      if (cantonData?.features?.length > 0) {
        // VERIFICAR que tenga geometría válida (Polygon o MultiPolygon)
        const feature = cantonData.features[0];
        const geometryType = feature.geometry?.type;
        console.log(`✓ Datos del cantón obtenidos: ${cantonData.features.length} feature(s)`);
        console.log(`  Geometría type: ${geometryType}`);

        // Si es LineString, mostrar error
        if (geometryType === 'LineString') {
          const mensaje = `❌ ${cantonName} no tiene datos de área disponibles en la API (solo contorno)`;
          console.warn(mensaje);
          this.error.set(mensaje);
          this.isLoading.set(false);
          this.selectedCanton.set('');
          return;
        }

        if (geometryType !== 'Polygon' && geometryType !== 'MultiPolygon') {
          const mensaje = `❌ ${cantonName} tiene geometría inválida (${geometryType})`;
          console.error(mensaje);
          this.error.set(mensaje);
          this.isLoading.set(false);
          this.selectedCanton.set('');
          return;
        }

        // Continuar con la selección si es válida
        if (this.guayasLayer) {
          this.guayasLayer.setStyle({ fillOpacity: 0, opacity: 0.2 });
        }
        if (this.cantonesLayer) {
          this.cantonesLayer.setStyle({ fillOpacity: 0, opacity: 0.1 });
        }

        this.createMask(cantonData);

        this.selectedCantonLayer = L.geoJSON(cantonData, {
          style: {
            color: '#e94560',
            weight: 4,
            opacity: 1,
            fillColor: '#e94560',
            fillOpacity: 0.3
          }
        }).addTo(this.map!);

        const bounds = this.selectedCantonLayer.getBounds();
        console.log(`📍 Bounds del cantón:`, bounds);
        if (bounds.isValid()) {
          this.map!.fitBounds(bounds, { padding: [80, 80] });
          console.log(`✓ Zoom enfocado en ${cantonName}`);
        }
      } else {
        console.error(`❌ No se encontró geometría para ${cantonName}`);
        this.error.set(`No se encontró la geometría para ${cantonName}`);
      }

      this.isLoading.set(false);
    } catch (error: any) {
      console.error('❌ Error seleccionando cantón:', error);
      this.error.set(`Error al cargar ${cantonName}`);
      this.isLoading.set(false);
    }
  }

  private createMask(cantonData: any): void {
    if (!this.map) {
      console.error('❌ Mapa no existe para crear máscara');
      return;
    }

    console.log('🎭 Creando máscara oscura...');
    const worldBounds: L.LatLngExpression[] = [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
      [-90, -180]
    ];

    const feature = cantonData.features[0];
    let holes: L.LatLngExpression[][] = [];

    if (feature.geometry.type === 'Polygon') {
      console.log('  📐 Tipo: Polygon');
      holes = [this.convertCoordinates(feature.geometry.coordinates[0])];
    } else if (feature.geometry.type === 'MultiPolygon') {
      console.log('  📐 Tipo: MultiPolygon');
      holes = feature.geometry.coordinates.map((poly: any) =>
        this.convertCoordinates(poly[0])
      );
    }

    this.maskLayer = L.polygon([worldBounds, ...holes], {
      color: 'transparent',
      fillColor: '#000',
      fillOpacity: 0.6
    }).addTo(this.map);

    console.log('✓ Máscara creada');
  }

  private convertCoordinates(coords: number[][]): L.LatLngExpression[] {
    return coords.map(coord => [coord[1], coord[0]] as L.LatLngExpression);
  }

  private clearSelectionLayers(): void {
    if (this.selectedCantonLayer && this.map) {
      this.map.removeLayer(this.selectedCantonLayer);
      this.selectedCantonLayer = null;
    }
    if (this.maskLayer && this.map) {
      this.map.removeLayer(this.maskLayer);
      this.maskLayer = null;
    }
  }

  resetMap(): void {
    console.log('\n🔄 Reseteando a vista de Guayas...');
    this.selectedCanton.set(null);
    this.error.set(null);

    this.clearSelectionLayers();

    if (this.guayasLayer) {
      this.guayasLayer.setStyle({
        color: '#e94560',
        weight: 3,
        opacity: 1,
        fillColor: '#e94560',
        fillOpacity: 0.1
      });
    }
    if (this.cantonesLayer) {
      this.cantonesLayer.setStyle({
        color: '#059669',
        weight: 2,
        opacity: 0.9,
        fillColor: '#10b981',
        fillOpacity: 0.25
      });
    }

    if (this.guayasLayer && this.map) {
      const bounds = this.guayasLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
        console.log('✓ Vista reseteada');
      }
    }
  }
}
