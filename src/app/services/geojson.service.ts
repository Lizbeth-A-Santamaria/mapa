import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeoJsonService {
  /**
   * Convierte datos de Overpass a GeoJSON
   */
  overpassToGeoJson(overpassData: any): any {
    // Si ya es un FeatureCollection válido, devolverlo directamente
    if (overpassData.type === 'FeatureCollection' && Array.isArray(overpassData.features)) {
      return overpassData;
    }

    const features: any[] = [];

    // Si es un objeto con elementos de Overpass
    if (overpassData.elements && Array.isArray(overpassData.elements)) {
      overpassData.elements.forEach((element: any) => {
        if (element.type === 'relation') {
          const feature = this.relationToFeature(element);
          if (feature) {
            features.push(feature);
          }
        } else if (element.type === 'way') {
          const feature = this.wayToFeature(element);
          if (feature) {
            features.push(feature);
          }
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /**
   * Convierte una relación OSM a feature GeoJSON
   */
  private relationToFeature(relation: any): any | null {
    if (!relation.tags || !relation.geometry) {
      return null;
    }

    try {
      // Para relaciones multipolígono, necesitamos procesar los anillos
      const coordinates = this.extractRelationCoordinates(relation);

      if (coordinates.length === 0) {
        return null;
      }

      return {
        type: 'Feature',
        properties: relation.tags,
        geometry: {
          type: coordinates.length === 1 ? 'Polygon' : 'MultiPolygon',
          coordinates: coordinates.length === 1 ? coordinates[0] : coordinates
        }
      };
    } catch (error) {
      console.error('Error procesando relación:', error);
      return null;
    }
  }

  /**
   * Convierte un way OSM a feature GeoJSON
   */
  private wayToFeature(way: any): any | null {
    if (!way.tags || !way.geometry) {
      return null;
    }

    try {
      const coordinates = way.geometry.map((point: any) => [point.lon, point.lat]);

      if (coordinates.length < 2) {
        return null;
      }

      return {
        type: 'Feature',
        properties: way.tags,
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      };
    } catch (error) {
      console.error('Error procesando way:', error);
      return null;
    }
  }

  /**
   * Extrae coordenadas de una relación OSM
   */
  private extractRelationCoordinates(relation: any): any[] {
    if (!relation.geometry) {
      return [];
    }

    // Convertir la geometría de Overpass a coordenadas GeoJSON
    const rings: any[] = [];
    const ring: [number, number][] = [];

    relation.geometry.forEach((point: any) => {
      ring.push([point.lon, point.lat]);
    });

    if (ring.length > 0) {
      // Cerrar el anillo si no está cerrado
      if (
        ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1]
      ) {
        ring.push(ring[0]);
      }
      rings.push(ring);
    }

    return rings.length > 0 ? [rings] : [];
  }

  /**
   * Calcula el bounding box de un GeoJSON
   */
  calculateBounds(geoJson: any): [[number, number], [number, number]] | null {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    if (geoJson.features && geoJson.features.length > 0) {
      geoJson.features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
          this.extractBoundsFromCoordinates(feature.geometry.coordinates, {
            minLat: (v: number) => { minLat = Math.min(minLat, v); },
            maxLat: (v: number) => { maxLat = Math.max(maxLat, v); },
            minLon: (v: number) => { minLon = Math.min(minLon, v); },
            maxLon: (v: number) => { maxLon = Math.max(maxLon, v); }
          });
        }
      });
    }

    if (minLat !== Infinity) {
      return [[minLat, minLon], [maxLat, maxLon]];
    }
    return null;
  }

  /**
   * Extrae los límites de las coordenadas
   */
  private extractBoundsFromCoordinates(coordinates: any[], bounds: any): void {
    const processCoord = (coord: any) => {
      if (Array.isArray(coord)) {
        if (typeof coord[0] === 'number' && typeof coord[1] === 'number') {
          // Es una coordenada [lon, lat]
          bounds.minLon(coord[0]);
          bounds.maxLon(coord[0]);
          bounds.minLat(coord[1]);
          bounds.maxLat(coord[1]);
        } else {
          // Es un array de coordenadas, procesar recursivamente
          coord.forEach((c: any) => processCoord(c));
        }
      }
    };
    processCoord(coordinates);
  }
}
