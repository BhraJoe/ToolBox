// ─── CSS Transform Generator ──────────────────────────────────────────────

export type TransformMode = "2d" | "3d";

export interface TransformOrigin {
  horizontal: "left" | "center" | "right" | "custom";
  horizontalCustom: string; // percentage
  vertical: "top" | "center" | "bottom" | "custom";
  verticalCustom: string; // percentage
  z: string; // for 3D
}

export interface TransformConfig {
  mode: TransformMode;
  // Translate
  translateX: number; // -300 to 300 px
  translateY: number; // -300 to 300 px
  translateZ: number; // -300 to 300 px (3D only)
  // Rotate
  rotate: number; // -360 to 360 deg (2D)
  rotateX: number; // -180 to 180 deg (3D)
  rotateY: number; // -180 to 180 deg (3D)
  rotateZ: number; // -360 to 360 deg (3D)
  // Scale
  scale: number; // 0 to 3 (uniform)
  scaleX: number; // 0 to 3
  scaleY: number; // 0 to 3
  scaleZ: number; // 0 to 3 (3D)
  uniformScale: boolean;
  // Skew
  skewX: number; // -90 to 90 deg
  skewY: number; // -90 to 90 deg
  // Transform origin
  origin: TransformOrigin;
  // Preview
  previewColor: string;
  previewBackgroundColor: string;
  showGuides: boolean;
  perspective: number; // 3D only
  perspectiveOriginX: string; // 3D only
  perspectiveOriginY: string; // 3D only
  preserve3d: boolean; // 3D only
}

export interface TransformPreset {
  name: string;
  config: TransformConfig;
}

export const DEFAULT_ORIGIN: TransformOrigin = {
  horizontal: "center",
  horizontalCustom: "50%",
  vertical: "center",
  verticalCustom: "50%",
  z: "0px",
};

export function createDefaultConfig(): TransformConfig {
  return {
    mode: "2d",
    // Translate
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    // Rotate
    rotate: 0,
    rotateX: 0,
    rotateY: 0,
    rotateZ: 0,
    // Scale
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    uniformScale: true,
    // Skew
    skewX: 0,
    skewY: 0,
    // Transform origin
    origin: { ...DEFAULT_ORIGIN },
    // Preview
    previewColor: "#2563eb",
    previewBackgroundColor: "#f8fafc",
    showGuides: true,
    // 3D
    perspective: 1000,
    perspectiveOriginX: "50%",
    perspectiveOriginY: "50%",
    preserve3d: false,
  };
}

export function areOriginEqual(o1: TransformOrigin, o2: TransformOrigin): boolean {
  return (
    o1.horizontal === o2.horizontal &&
    o1.horizontalCustom === o2.horizontalCustom &&
    o1.vertical === o2.vertical &&
    o1.verticalCustom === o2.verticalCustom &&
    o1.z === o2.z
  );
}

export function clampTranslation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-300, Math.min(300, Math.round(value)));
}

export function clampRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((value % 360) + 360) % 360;
}

export function clampSkew(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-90, Math.min(90, Math.round(value)));
}

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(3, Math.round(value * 100) / 100));
}

export function clampPerspective(value: number): number {
  if (!Number.isFinite(value)) return 1000;
  return Math.max(100, Math.min(3000, Math.round(value)));
}

export function formatTransformValue(value: number, unit: string): string {
  const num = Math.round(Math.abs(value) * 1000) / 1000;
  if (value === 0) return "0";
  return `${value < 0 ? "-" : ""}${num}${unit}`;
}

export function generateTransformValue(config: TransformConfig): string {
  const parts: string[] = [];
  const mode3d = config.mode === "3d";

  // Translate
  if (config.translateX !== 0 || config.translateY !== 0) {
    const tx = formatTransformValue(config.translateX, "px");
    const ty = formatTransformValue(config.translateY, "px");
    parts.push(`translate(${tx}, ${ty})`);
    if (mode3d && config.translateZ !== 0) {
      const tz = formatTransformValue(config.translateZ, "px");
      parts.push(`translateZ(${tz})`);
    }
  } else if (mode3d && config.translateZ !== 0) {
    const tz = formatTransformValue(config.translateZ, "px");
    parts.push(`translateZ(${tz})`);
  }

  // Rotate
  if (mode3d) {
    const rx = formatTransformValue(config.rotateX, "deg");
    const ry = formatTransformValue(config.rotateY, "deg");
    const rz = formatTransformValue(config.rotateZ, "deg");

    if (config.rotate !== 0) {
      const r2d = formatTransformValue(config.rotate, "deg");
      parts.push(`rotate(${r2d})`);
    }
    if (rx !== "0deg") parts.push(`rotateX(${rx})`);
    if (ry !== "0deg") parts.push(`rotateY(${ry})`);
    if (rz !== "0deg") parts.push(`rotateZ(${rz})`);
  } else {
    const r = formatTransformValue(config.rotate, "deg");
    if (r !== "0deg") parts.push(`rotate(${r})`);
  }

  // Scale
  const sx = formatTransformValue(config.scaleX, "");
  const sy = formatTransformValue(config.scaleY, "");
  const sz = formatTransformValue(config.scaleZ, "");

  if (config.uniformScale) {
    const s = formatTransformValue(config.scale, "");
    if (s !== "1") parts.push(`scale(${s})`);
  } else {
    if (sx !== "1") parts.push(`scaleX(${sx})`);
    if (sy !== "1") parts.push(`scaleY(${sy})`);
    if (mode3d && sz !== "1") parts.push(`scaleZ(${sz})`);
  }

  // Skew
  const skx = formatTransformValue(config.skewX, "deg");
  const sky = formatTransformValue(config.skewY, "deg");
  if (skx !== "0deg") parts.push(`skewX(${skx})`);
  if (sky !== "0deg") parts.push(`skewY(${sky})`);

  if (parts.length === 0) return "none";
  return parts.join(" ");
}

export function generateTransformOrigin(config: TransformOrigin): string {
  const { horizontal, vertical, z } = config;

  let originX: string;
  if (horizontal === "custom") {
    originX = config.horizontalCustom;
  } else {
    originX = horizontal === "left" ? "0%" : horizontal === "center" ? "50%" : "100%";
  }

  let originY: string;
  if (vertical === "custom") {
    originY = config.verticalCustom;
  } else {
    originY = vertical === "top" ? "0%" : vertical === "center" ? "50%" : "100%";
  }

  return `${originX} ${originY} ${z}`;
}

export function generate3DCss(config: TransformConfig): string {
  const lines: string[] = [];
  lines.push('.transform-3d-container {');

  // Perspective
  lines.push(`  perspective: ${config.perspective}px;`);
  lines.push(`  perspective-origin: ${config.perspectiveOriginX} ${config.perspectiveOriginY};`);
  lines.push(`  transform-style: ${config.preserve3d ? 'preserve-3d' : 'flat'};`);

  lines.push('}');
  lines.push('');
  lines.push('.transform-3d-element {');

  // Transform
  const transform = generateTransformValue(config);
  if (transform === 'none') {
    lines.push('  transform: none;');
  } else {
    lines.push(`  transform: ${transform};`);
  }

  // Origin
  const origin = generateTransformOrigin(config.origin);
  if (origin !== "50% 50% 0px") {
    lines.push(`  transform-origin: ${origin};`);
  }

  lines.push('}');

  return lines.join('\n');
}

export function generate2dCss(config: TransformConfig): string {
  const lines: string[] = [];
  lines.push('.transform-box {');

  const transform = generateTransformValue(config);
  if (transform === 'none') {
    lines.push('  transform: none;');
  } else {
    lines.push(`  transform: ${transform};`);
  }

  const origin = generateTransformOrigin(config.origin);
  if (origin !== "50% 50% 0px") {
    lines.push(`  transform-origin: ${origin};`);
  }

  lines.push('}');

  return lines.join('\n');
}

export function generateCss(config: TransformConfig): string {
  if (config.mode === "3d") {
    return generate3DCss(config);
  }
  return generate2dCss(config);
}

export function randomTransformConfig(): TransformConfig {
  const config = createDefaultConfig();

  // Randomize some properties
  config.translateX = Math.floor(Math.random() * 601) - 300;
  config.translateY = Math.floor(Math.random() * 601) - 300;

  config.rotate = Math.floor(Math.random() * 720) - 360;

  config.scale = parseFloat((Math.random() * 2 + 0.5).toFixed(2));

  config.skewX = Math.floor(Math.random() * 180) - 90;
  config.skewY = Math.floor(Math.random() * 180) - 90;

  config.origin.horizontal = (['left', 'center', 'right'] as const)[Math.floor(Math.random() * 3)];
  config.origin.vertical = (['top', 'center', 'bottom'] as const)[Math.floor(Math.random() * 3)];

  config.previewColor = `#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`;

  if (Math.random() > 0.5) {
    config.mode = "3d";
    config.translateZ = Math.floor(Math.random() * 401) - 200;
    config.rotateX = Math.floor(Math.random() * 360) - 180;
    config.rotateY = Math.floor(Math.random() * 360) - 180;
    config.scaleZ = parseFloat((Math.random() * 2 + 0.5).toFixed(2));
    config.perspective = Math.floor(Math.random() * 2900) + 100;
    config.preserve3d = Math.random() > 0.5;
  }

  return config;
}

export const TRANSFORM_PRESETS: TransformPreset[] = [
  {
    name: "Original",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Move Right",
    config: {
      mode: "2d",
      translateX: 150,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Move Up",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: -150,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Rotate 45°",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 45,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Rotate -45°",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: -45,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Grow",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1.5,
      scaleX: 1.5,
      scaleY: 1.5,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Shrink",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 0.5,
      scaleX: 0.5,
      scaleY: 0.5,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Horizontal Flip",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: -1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: false,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Vertical Flip",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: -1,
      scaleZ: 1,
      uniformScale: false,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Skew",
    config: {
      mode: "2d",
      translateX: 0,
      translateY: 0,
      translateZ: 0,
      rotate: 0,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 30,
      skewY: 20,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "Tilted Card",
    config: {
      mode: "2d",
      translateX: 50,
      translateY: -30,
      translateZ: 0,
      rotate: 15,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      scale: 1.1,
      scaleX: 1.1,
      scaleY: 1.1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 5,
      skewY: 5,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1000,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: false,
    },
  },
  {
    name: "3D Tilt",
    config: {
      mode: "3d",
      translateX: 0,
      translateY: 0,
      translateZ: 50,
      rotate: 0,
      rotateX: 30,
      rotateY: -20,
      rotateZ: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      uniformScale: true,
      skewX: 0,
      skewY: 0,
      origin: { ...DEFAULT_ORIGIN },
      previewColor: "#2563eb",
      previewBackgroundColor: "#f8fafc",
      showGuides: true,
      perspective: 1200,
      perspectiveOriginX: "50%",
      perspectiveOriginY: "50%",
      preserve3d: true,
    },
  },
];

export function getActivePresetName(config: TransformConfig): string | undefined {
  const match = TRANSFORM_PRESETS.find((preset) => {
    const p = preset.config;
    return (
      config.mode === p.mode &&
      config.translateX === p.translateX &&
      config.translateY === p.translateY &&
      config.translateZ === p.translateZ &&
      config.rotate === p.rotate &&
      config.rotateX === p.rotateX &&
      config.rotateY === p.rotateY &&
      config.rotateZ === p.rotateZ &&
      config.scale === p.scale &&
      config.scaleX === p.scaleX &&
      config.scaleY === p.scaleY &&
      config.scaleZ === p.scaleZ &&
      config.uniformScale === p.uniformScale &&
      config.skewX === p.skewX &&
      config.skewY === p.skewY &&
      areOriginEqual(config.origin, p.origin) &&
      config.previewColor === p.previewColor &&
      config.previewBackgroundColor === p.previewBackgroundColor &&
      config.showGuides === p.showGuides &&
      config.perspective === p.perspective &&
      config.perspectiveOriginX === p.perspectiveOriginX &&
      config.perspectiveOriginY === p.perspectiveOriginY &&
      config.preserve3d === p.preserve3d
    );
  });

  return match?.name;
}

export function applyPreset(name: string): TransformConfig | undefined {
  const preset = TRANSFORM_PRESETS.find((p) => p.name === name);
  if (!preset) return undefined;
  return JSON.parse(JSON.stringify(preset.config));
}