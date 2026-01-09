import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OverpassService {
  // geoBoundaries GeoJSON via jsdelivr CDN (tiene CORS habilitado)
  // ADM1 = Provincias, ADM2 = Cantones
  private geoBoundariesUrl = 'https://cdn.jsdelivr.net/gh/wmgeolab/geoBoundaries@main/releaseData/gbOpen/ECU/ADM2/geoBoundaries-ECU-ADM2.geojson';
  
  // Cache de datos
  private cantonesData: any = null;
  private guayasData: any = null;

  // Los 24 cantones reales de Guayas (nombres como aparecen en geoBoundaries)
  private cantonesGuayas = [
    'Guayaquil',
    'Durán',
    'Samborondón',
    'Daule',
    'Milagro',
    'Naranjal',
    'Playas',
    'Yaguachi',
    'Balao',
    'Balzar',
    'Colimes',
    'El Empalme',
    'El Triunfo',
    'General Antonio Elizalde',
    'Isidro Ayora',
    'Lomas de Sargentillo',
    'Marcelino Maridueña',
    'Naranjito',
    'Nobol',
    'Palestina',
    'Pedro Carbo',
    'Salitre',
    'Santa Lucía',
    'Simón Bolívar'
  ];

  constructor(private http: HttpClient) {}

  /**
   * Carga los datos de geoBoundaries (cantones de Ecuador)
   */
  private async loadGeoBoundariesData(): Promise<any> {
    if (this.cantonesData) {
      return this.cantonesData;
    }

    console.log('📡 Conectando con geoBoundaries CDN...');
    
    // Descargar el GeoJSON directamente desde jsdelivr CDN
    this.cantonesData = await firstValueFrom(
      this.http.get<any>(this.geoBoundariesUrl).pipe(timeout(60000))
    );

    console.log(`✓ ${this.cantonesData.features.length} cantones de Ecuador cargados`);
    return this.cantonesData;
  }

  /**
   * Obtiene la provincia de Guayas (uniendo todos sus cantones)
   */
  async getGuayasProvince(): Promise<any> {
    try {
      console.log('🗺️ Obteniendo provincia de Guayas...');
      
      const allCantones = await this.loadGeoBoundariesData();
      
      // Filtrar solo cantones de Guayas
      const guayasCantones = allCantones.features.filter((f: any) => {
        const name = f.properties?.shapeName || f.properties?.shapeGroup || '';
        const province = f.properties?.shapeGroup || f.properties?.ADM1_ES || '';
        return province.toLowerCase().includes('guayas');
      });

      console.log(`✓ ${guayasCantones.length} cantones encontrados en Guayas`);

      // Crear un polígono envolvente de Guayas (usando el primer cantón como base)
      // En realidad usaremos el MultiPolygon de todos los cantones juntos
      if (guayasCantones.length > 0) {
        // Combinar todas las geometrías en un MultiPolygon
        const allCoords: any[] = [];
        guayasCantones.forEach((canton: any) => {
          if (canton.geometry.type === 'Polygon') {
            allCoords.push(canton.geometry.coordinates);
          } else if (canton.geometry.type === 'MultiPolygon') {
            allCoords.push(...canton.geometry.coordinates);
          }
        });

        this.guayasData = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: { name: 'Guayas' },
            geometry: {
              type: 'MultiPolygon',
              coordinates: allCoords
            }
          }]
        };

        console.log('✓ Guayas cargado desde geoBoundaries');
        return this.guayasData;
      }

      throw new Error('No se encontraron cantones de Guayas');
    } catch (error) {
      console.error('Error cargando Guayas:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los cantones de Guayas
   */
  async getGuayasCantones(): Promise<any> {
    try {
      console.log('📡 Obteniendo cantones de Guayas...');
      
      const allCantones = await this.loadGeoBoundariesData();
      
      // Filtrar solo cantones de Guayas
      const guayasCantones = allCantones.features.filter((f: any) => {
        const province = f.properties?.shapeGroup || f.properties?.ADM1_ES || '';
        return province.toLowerCase().includes('guayas');
      });

      // Mapear nombres para que coincidan con nuestra lista
      const features = guayasCantones.map((f: any) => {
        const originalName = f.properties?.shapeName || f.properties?.ADM2_ES || 'Sin nombre';
        return {
          ...f,
          properties: {
            ...f.properties,
            name: originalName
          }
        };
      });

      console.log(`✓ ${features.length} cantones de Guayas cargados`);
      
      // Mostrar nombres encontrados
      features.forEach((f: any) => {
        console.log(`   ✓ ${f.properties.name}: ${f.geometry.type}`);
      });

      return {
        type: 'FeatureCollection',
        features: features
      };
    } catch (error) {
      console.error('Error cargando cantones:', error);
      throw error;
    }
  }

  /**
   * Obtiene un cantón específico por nombre
   */
  async getCantonByName(cantonName: string): Promise<any> {
    try {
      const allCantones = await this.getGuayasCantones();
      
      const canton = allCantones.features.find((f: any) => {
        const name = f.properties?.name || '';
        return name.toLowerCase().includes(cantonName.toLowerCase()) ||
               cantonName.toLowerCase().includes(name.toLowerCase());
      });

      if (canton) {
        return {
          type: 'FeatureCollection',
          features: [canton]
        };
      }

      throw new Error(`${cantonName} no encontrado`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtiene lista de nombres de cantones disponibles
   */
  getCantonesNames(): string[] {
    return this.cantonesGuayas;
  }
}
