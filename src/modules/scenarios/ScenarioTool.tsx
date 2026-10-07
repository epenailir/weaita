/** Herramienta específica de cada escenario (calculadoras y medidores ligados a la cámara). */
import type { ToolKind } from './playbook';
import type { ToolProps } from './model';
import { HyperfocalTool } from './HyperfocalTool';
import { MeteringTool } from './MeteringTool';
import { MotionTool } from './MotionTool';
import { StarRulesTool } from './StarRulesTool';
import { ZoneFocusTool } from './ZoneFocusTool';

export function ScenarioTool({ kind, ...props }: ToolProps & { kind: ToolKind }) {
  switch (kind) {
    case 'metering':
      return <MeteringTool {...props} />;
    case 'motion':
      return <MotionTool {...props} />;
    case 'hyperfocal':
      return <HyperfocalTool {...props} />;
    case 'stars':
      return <StarRulesTool {...props} />;
    case 'zone':
      return <ZoneFocusTool {...props} />;
  }
}
