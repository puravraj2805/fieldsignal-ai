'use client';

import { useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Popup } from 'react-map-gl';
import type { MapLayerMouseEvent } from 'react-map-gl';
import { getStateStats, fmt } from '@/lib/production';
import type { ProductionRecord } from '@/types';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

const INITIAL_VIEW = { longitude: -96, latitude: 38.5, zoom: 3.4 };

interface Props {
  data: ProductionRecord[];
  latestYear: number;
  focusedState: string | null;
  onFocusedStateChange: (s: string) => void;
}

type Selected = { lng: number; lat: number; name: string } | null;

export function MapPanelClient({ data, latestYear, focusedState, onFocusedStateChange }: Props) {
  const [selected, setSelected] = useState<Selected>(null);

  // Sum oil production per state for the latest year in the filtered dataset
  const oilByState = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of data) {
      if (r.production_type === 'oil' && r.year === latestYear) {
        m[r.region] = (m[r.region] ?? 0) + r.value;
      }
    }
    return m;
  }, [data, latestYear]);

  const maxOil = useMemo(
    () => Math.max(1, ...Object.values(oilByState)),
    [oilByState]
  );

  // Mapbox 'match' expression: each tracked state → amber with opacity ∝ share of max
  const fillColorExpr = useMemo(() => {
    const pairs: unknown[] = [];
    for (const [state, oil] of Object.entries(oilByState)) {
      const t = oil / maxOil;
      pairs.push(state, `rgba(251,191,36,${(0.12 + t * 0.78).toFixed(2)})`);
    }
    return ['match', ['get', 'name'], ...pairs, 'rgba(51,65,85,0.35)'];
  }, [oilByState, maxOil]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const name: string = feature?.properties?.name ?? '';
      if (name) {
        setSelected({ lng: e.lngLat.lng, lat: e.lngLat.lat, name });
        onFocusedStateChange(name);
      } else {
        setSelected(null);
      }
    },
    [onFocusedStateChange]
  );

  // Highlight uses the parent-controlled focusedState; popup uses local selected coords
  const highlightName = focusedState ?? selected?.name ?? '';

  // Popup shows stats for the focused state if we have coords, else for whatever was clicked
  const popupState = selected;
  const stats = popupState ? getStateStats(data, popupState.name) : null;
  const inDataset = popupState ? popupState.name in oilByState : false;

  return (
    <Map
      mapboxAccessToken={TOKEN}
      initialViewState={INITIAL_VIEW}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      interactiveLayerIds={['state-fills']}
      onClick={handleClick}
      cursor="default"
    >
      <Source id="us-states" type="geojson" data="/us-states.geojson">
        {/* Choropleth fill — oil production for latestYear */}
        <Layer
          id="state-fills"
          type="fill"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          paint={{ 'fill-color': fillColorExpr as any, 'fill-opacity': 0.85 }}
        />
        {/* Dim overlay on all non-focused states when a state is highlighted */}
        {highlightName && (
          <Layer
            id="state-dim"
            type="fill"
            filter={['!=', ['get', 'name'], highlightName]}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paint={{ 'fill-color': '#0f172a', 'fill-opacity': 0.42 } as any}
          />
        )}
        {/* State border lines */}
        <Layer
          id="state-borders"
          type="line"
          paint={{ 'line-color': '#475569', 'line-width': 0.8 }}
        />
        {/* Amber outline on focused/selected state */}
        <Layer
          id="state-highlight"
          type="line"
          filter={['==', ['get', 'name'], highlightName]}
          paint={{ 'line-color': '#14b8a6', 'line-width': 2.5 }}
        />
      </Source>

      {popupState && (
        <Popup
          longitude={popupState.lng}
          latitude={popupState.lat}
          onClose={() => setSelected(null)}
          closeOnClick={false}
          maxWidth="240px"
        >
          <div className="fs-popup">
            <p className="fs-popup-title">{popupState.name}</p>
            {inDataset && stats ? (
              <table className="fs-popup-table">
                <tbody>
                  <tr>
                    <td>Oil {latestYear}</td>
                    <td>{stats.oilKbbl ? fmt(stats.oilKbbl) + ' Kbbl' : '—'}</td>
                  </tr>
                  <tr>
                    <td>Gas {latestYear}</td>
                    <td>{stats.gasMMcf ? fmt(stats.gasMMcf) + ' MMCF' : '—'}</td>
                  </tr>
                  <tr>
                    <td>Oil YoY</td>
                    <td>
                      {stats.oilYoYPct !== null
                        ? `${stats.oilYoYPct >= 0 ? '+' : ''}${stats.oilYoYPct}%`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="fs-popup-empty">Not in EIA dataset</p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}
