declare module 'expo-maps' {
  import * as React from 'react';
  export interface MapViewProps {
    [key: string]: any;
  }
  export const MapView: React.ComponentType<MapViewProps>;
  export const Marker: React.ComponentType<any>;
}