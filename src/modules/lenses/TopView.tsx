import { useId } from 'react';
import { fieldOfView, formatDistance } from '../../engine';
import type { SensorFormat } from '../../engine';
import { BUILDINGS_BEHIND_M, LENS_SCENE, PATH_HALF_WIDTH_M, PLAZA_START_M } from '../../lens/scene';
import { formatDegrees } from '../../lens/framing';
import { cn } from '../../lib/cn';

const W = 400;
const H = 400;
const PAD_T = 34;
const PAD_B = 44;
const GRID_STEPS = [1, 2, 5, 10, 20, 50, 100];

export interface TopViewProps {
  focalMm: number;
  sensor: SensorFormat;
  distanceM: number;
  className?: string;
}

/**
 * Vista cenital a escala: la cámara, su cono de visión horizontal, el sujeto y el fondo.
 * La escala se ajusta para que siempre quepan cámara y sujeto; la barra de escala la indica.
 */
export function TopView({ focalMm, sensor, distanceM, className }: TopViewProps) {
  const gradId = useId();
  const clipId = useId();
  const d = distanceM;
  const hFov = fieldOfView(focalMm, sensor).h;
  const half = (hFov / 2) * (Math.PI / 180);
  const tanH = Math.tan(half);

  const zFar = Math.max(26, Math.min(136, 2.6 * d));
  const zNear = -d - Math.max(2.4, 0.14 * d);
  const scale = (H - PAD_T - PAD_B) / (zFar - zNear);
  const X = (x: number) => W / 2 + x * scale;
  const Y = (z: number) => PAD_T + (zFar - z) * scale;
  const xHalf = W / 2 / scale;
  const grid = GRID_STEPS.find((s) => s * scale >= 34) ?? 100;
  const inCone = (x: number, z: number) => z + d > 0 && Math.abs(x) <= (z + d) * tanH;

  const camX = X(0);
  const camY = Y(-d);
  const rayLen = (zFar - zNear + 40) / Math.cos(half);
  const rayDx = Math.sin(half) * rayLen * scale;
  const rayDy = Math.cos(half) * rayLen * scale;

  const buildingsVisible = BUILDINGS_BEHIND_M < zFar;
  const coverWidth = 2 * (BUILDINGS_BEHIND_M + d) * tanH;

  const gridX: number[] = [];
  for (let x = Math.ceil(-xHalf / grid) * grid; x <= xHalf; x += grid) gridX.push(x);
  const gridZ: number[] = [];
  for (let z = Math.ceil(zNear / grid) * grid; z <= zFar; z += grid) gridZ.push(z);

  const subjectR = Math.max(4.5, 0.28 * scale);
  const midY = (camY + Y(0)) / 2;
  const showDim = camY - Y(0) > 26;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn('block h-auto w-full', className)}
      role="img"
      aria-label={`Vista cenital a escala: la cámara está a ${formatDistance(d)} del sujeto y su cono de visión horizontal abre ${formatDegrees(hFov)}. A la altura de los edificios, ${BUILDINGS_BEHIND_M} m detrás del sujeto, el encuadre abarca ${Math.round(coverWidth)} m de ancho.`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--color-amber)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-amber)" stopOpacity="0.05" />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} rx="10" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width={W} height={H} className="fill-ink" />
        {/* Retícula en metros */}
        <g className="stroke-line" strokeWidth="1">
          {gridX.map((x) => (
            <line key={`gx${x}`} x1={X(x)} x2={X(x)} y1={0} y2={H} opacity={x === 0 ? 0 : 0.7} />
          ))}
          {gridZ.map((z) => (
            <line key={`gz${z}`} x1={0} x2={W} y1={Y(z)} y2={Y(z)} opacity="0.7" />
          ))}
        </g>
        {/* Paseo y plaza */}
        <rect x={X(-PATH_HALF_WIDTH_M)} y={Y(PLAZA_START_M)} width={2 * PATH_HALF_WIDTH_M * scale} height={Math.max(0, Y(zNear - 5) - Y(PLAZA_START_M))} className="fill-raised" opacity="0.8" />
        <rect x={0} y={Y(150)} width={W} height={Math.max(0, Y(PLAZA_START_M) - Y(150))} className="fill-raised" opacity="0.45" />
        {/* Edificios */}
        {LENS_SCENE.buildings.map((b, i) => {
          if (b.z > zFar + 30 || X(b.x1) < 0 || X(b.x0) > W) return null;
          return (
            <rect
              key={`b${i}`}
              x={X(b.x0)}
              y={Y(b.z + b.depth)}
              width={(b.x1 - b.x0) * scale}
              height={b.depth * scale}
              className="fill-panel-2 stroke-line-strong"
              strokeWidth="1"
            />
          );
        })}
        {/* Árboles */}
        {LENS_SCENE.trees.map((t, i) => {
          if (t.z > zFar + 5 || t.z < zNear - 5 || Math.abs(t.x) > xHalf + 5) return null;
          const inside = inCone(t.x, t.z);
          return <circle key={`t${i}`} cx={X(t.x)} cy={Y(t.z)} r={Math.max(2, t.crown * scale)} fill="#3d5a43" opacity={inside ? 0.85 : 0.35} />;
        })}
        {/* Farolas */}
        {LENS_SCENE.lamps.map((l, i) => {
          if (l.z > zFar + 2 || l.z < zNear - 2) return null;
          const inside = inCone(l.x, l.z);
          return <circle key={`l${i}`} cx={X(l.x)} cy={Y(l.z)} r={Math.max(1.6, 0.18 * scale)} className={inside ? 'fill-amber-strong' : 'fill-faint'} opacity={inside ? 0.95 : 0.5} />;
        })}
        {/* Cono de visión */}
        <path
          d={`M${camX} ${camY} L${camX - rayDx} ${camY - rayDy} L${camX + rayDx} ${camY - rayDy} Z`}
          fill={`url(#${gradId})`}
          className="stroke-amber"
          strokeWidth="1.25"
          strokeOpacity="0.8"
          strokeLinejoin="round"
        />
        {/* Ancho cubierto en la fila de edificios */}
        {buildingsVisible && (
          <line
            x1={X(-coverWidth / 2)}
            x2={X(coverWidth / 2)}
            y1={Y(BUILDINGS_BEHIND_M)}
            y2={Y(BUILDINGS_BEHIND_M)}
            className="stroke-amber"
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}
        {/* Eje óptico y cota de distancia */}
        <line x1={camX} x2={camX} y1={camY} y2={Y(0)} className="stroke-muted" strokeWidth="1" strokeDasharray="3 3" />
        {showDim && (
          <g className="osd" fontSize="11">
            <rect x={camX + 8} y={midY - 9} width={formatDistance(d).length * 6.9 + 10} height="18" rx="4" className="fill-bg stroke-line-strong" />
            <text x={camX + 13} y={midY + 4} className="fill-fg">
              {formatDistance(d)}
            </text>
          </g>
        )}
        {/* Sujeto */}
        <circle cx={X(0)} cy={Y(0)} r={subjectR + 3} className="fill-fg" opacity="0.16" />
        <circle cx={X(0)} cy={Y(0)} r={subjectR} className="fill-fg" />
        {/* Cámara */}
        <g transform={`translate(${camX} ${camY})`}>
          <rect x="-9" y="0" width="18" height="11" rx="2.5" className="fill-amber" />
          <path d="M-5 0 L-6.5 -6 L6.5 -6 L5 0 Z" className="fill-amber-strong" />
        </g>
      </g>
      {/* Rótulos */}
      <g className="osd stroke-ink" fontSize="11" strokeWidth="4" strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>
        <text x={X(0) + subjectR + 6} y={Y(0) + 4} className="fill-fg">
          Sujeto
        </text>
        <text x={camX - 14} y={camY + 9} textAnchor="end" className="fill-amber">
          {formatDegrees(hFov)}
        </text>
        {buildingsVisible ? (
          <text x={W / 2} y={Math.max(14, Y(BUILDINGS_BEHIND_M) - 8)} textAnchor="middle" className="fill-amber">
            {Math.round(coverWidth)} m de fachada en cuadro
          </text>
        ) : (
          <text x={W / 2} y="20" textAnchor="middle" className="fill-faint">
            ▲ Edificios a {BUILDINGS_BEHIND_M} m · {Math.round(coverWidth)} m en cuadro
          </text>
        )}
        {/* Barra de escala */}
        <g transform={`translate(16 ${H - 18})`}>
          <line x1="0" x2={grid * scale} y1="0" y2="0" className="stroke-fg" strokeWidth="2" />
          <line x1="0" x2="0" y1="-4" y2="4" className="stroke-fg" strokeWidth="1.5" />
          <line x1={grid * scale} x2={grid * scale} y1="-4" y2="4" className="stroke-fg" strokeWidth="1.5" />
          <text x={grid * scale + 8} y="4" className="fill-muted">
            {grid} m
          </text>
        </g>
      </g>
    </svg>
  );
}
