import { Injectable } from '@angular/core';
import gadmData from '../../../src/assets/gadm/gadm41_ECU_2.json';

@Injectable({
  providedIn: 'root',
})
export class OverpassServiceLocal {
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
    'Simón Bolívar',
  ];

  private allCantones = (gadmData as any).features || (gadmData as any);

  getGuayasCantones(): any {
    const guayas = this.allCantones.filter((f: any) => {
      const province = f.properties?.NAME_1 || '';
      return province.toLowerCase().includes('guayas');
    });

    // Normalizar nombre
    guayas.forEach(
      (f: { properties: { name: any; NAME_2: any } }) =>
        (f.properties.name = f.properties?.NAME_2 || f.properties?.name || 'Sin nombre')
    );

    return {
      type: 'FeatureCollection',
      features: guayas,
    };
  }

  getCantonByName(name: string): any {
    const guayas = this.getGuayasCantones();
    const canton = guayas.features.find(
      (f: { properties: { name: string } }) =>
        f.properties.name.toLowerCase() === name.toLowerCase()
    );

    return canton ? { type: 'FeatureCollection', features: [canton] } : null;
  }

  getGuayasProvince(): any {
    const guayasCantones = this.getGuayasCantones().features;

    const allCoords: any[] = [];
    guayasCantones.forEach((f: { geometry: { type: string; coordinates: any } }) => {
      if (f.geometry.type === 'Polygon') {
        allCoords.push(f.geometry.coordinates);
      } else if (f.geometry.type === 'MultiPolygon') {
        allCoords.push(...f.geometry.coordinates);
      }
    });

    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Guayas' },
          geometry: { type: 'MultiPolygon', coordinates: allCoords },
        },
      ],
    };
  }

  getCantonesNames(): string[] {
    return this.cantonesGuayas;
  }
}
