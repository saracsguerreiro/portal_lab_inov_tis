// Robô do banner em CSS: aparece enquanto o 3D carrega e quando não há WebGL.
// Também define o ponteiro partilhado entre o banner e o robô 3D.
import { cn } from "@/lib/utils";

/** Posição do cursor (coordenadas do ecrã) partilhada pelo banner. */
export interface HeroPointer {
  x: number;
  y: number;
  active: boolean;
  touch: boolean;
}

export function RobotCss({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("robot-css", className)}>
      <div className="robot-css__float">
        <div className="robot-css__head">
          <span className="robot-css__ear robot-css__ear--l" />
          <span className="robot-css__ear robot-css__ear--r" />
          <div className="robot-css__visor">
            <i />
            <i />
          </div>
        </div>
        <div className="robot-css__body" />
      </div>
      <div className="robot-css__shadow" />
    </div>
  );
}
