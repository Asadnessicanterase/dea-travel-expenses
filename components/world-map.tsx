// @ts-nocheck
"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

// Dynamically import react-simple-maps to avoid SSR and type issues
const ComposableMap = dynamic(
  () => import("react-simple-maps").then((mod) => mod.ComposableMap as any),
  { ssr: false }
) as any;

const Geographies = dynamic(
  () => import("react-simple-maps").then((mod) => mod.Geographies as any),
  { ssr: false }
) as any;

const Geography = dynamic(
  () => import("react-simple-maps").then((mod) => mod.Geography as any),
  { ssr: false }
) as any;

const Marker = dynamic(
  () => import("react-simple-maps").then((mod) => mod.Marker as any),
  { ssr: false }
) as any;

const ZoomableGroup = dynamic(
  () => import("react-simple-maps").then((mod) => mod.ZoomableGroup as any),
  { ssr: false }
) as any;

interface WorldMapProps {
  destinations: Array<{
    country: string;
    city: string | null;
    tripCount: number;
    totalCost: number;
    avgCost: number;
  }>;
  countryCoordinates: Record<string, [number, number]>;
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const WorldMapComponent = ({ destinations, countryCoordinates }: WorldMapProps) => {
  return (
    <div className="w-full h-[500px] bg-blue-50 rounded-lg overflow-hidden">
      <ComposableMap
        projectionConfig={{
          scale: 147,
        }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }: any) =>
              geographies.map((geo: any) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#D6D6DA"
                  stroke="#FFFFFF"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#9CA3AF", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {destinations.map((dest) => {
            const coordinates = countryCoordinates[dest.country];
            if (!coordinates) return null;
            
            return (
              <Marker key={dest.country} coordinates={coordinates}>
                <g>
                  <circle
                    r={Math.min(10, 4 + dest.tripCount * 2)}
                    fill="#EF4444"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    opacity={0.85}
                  />
                  <title>
                    {dest.city ? `${dest.city}, ${dest.country}` : dest.country}
                    {'\n'}Trips: {dest.tripCount}
                    {'\n'}Total Cost: €{dest.totalCost.toFixed(2)}
                  </title>
                </g>
              </Marker>
            );
          })}
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export const WorldMap = memo(WorldMapComponent);
