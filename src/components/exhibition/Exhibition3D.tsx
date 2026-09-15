"use client";

/**
 * The 3D presentation layer of the exhibition. It consumes controller state
 * and cues; it never resolves gameplay. Ball timing reads the authoritative
 * clock via `controller.progress`, animation aligns to the release/contact
 * markers from the asset manifest, and everything freezes under pause because
 * the mixers only advance when the snapshot is not paused.
 */

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  AdditiveBlending,
  AnimationClip,
  AnimationMixer,
  BackSide,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Fog,
  Float32BufferAttribute,
  LinearFilter,
  NearestFilter,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  MeshBasicMaterial,
  MeshToonMaterial,
  Matrix4,
  Quaternion,
  Vector3,
  Group,
  Mesh,
  type AnimationAction,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import type { Cell, Loc } from "@/game/plate";
import type { PlateController, PlateCue, PlateSnapshot } from "@/shine/plate-controller.ts";
import { AimGrid } from "./AimGrid";
import { loadManifest, type CharacterAsset, type SceneManifest } from "./scene/manifest";
import {
  isEmissiveLanternMaterial,
  isEmptyStandSurface,
  isLanternGlowNode,
  LANTERN_EMISSIVE_INTENSITY,
  LANTERN_HALO,
  LANTERN_LIGHT,
  SCRIPTED_PLAY_LIGHT,
  FRAME_LANTERNS,
  frameLanternScreenV,
  lanternHaloPoints,
  lanternHaloSize,
  lanternHaloOpacity,
  lanternLightCandidates,
  MOUND_RIM,
  moundRimIntensity,
  MOUND_CURTAIN,
  NIGHT_FOG,
  NIGHT_RIG,
  NIGHT_SKY,
  selectLanternLights,
  STAND_NIGHT_COLOR,
  STAND_WASH,
  standWashOn,
  type LanternPoint,
} from "./scene/night";
import {
  compactBoneName,
  findClipName,
  heroFitScale,
  heroOverBudget,
  matchesContractBone,
  rewriteTrackName,
} from "./scene/rig-bind";
import {
  AOI_BACK_ONE,
  batNightAlbedo,
  fillBlackHidesObject,
  fillBlackPaintsMesh,
  beatFlashAt,
  HERO_LOOK,
  heroCurtainSkipsToneMap,
  heroAtlasNearestMin,
  heroKeepsAtlasMips,
  heroMatGlow,
  heroNightAlbedo,
  isBatProp,
  REINA_LOCK_TINT,
  kitMatTint,
  REINA_ATLAS_CURTAIN_EMIT,
  REINA_CURTAIN_EMIT,
  reinaAtlasCurtainEmit,
  reinaCurtainWeights,
  reinaNamedCurtainEmit,
  type HeroLookRole,
} from "./scene/kit-look";
import { heroKeyFor, heroLookFor, heroRequests } from "./scene/roster";
import {
  BALL_VISUAL,
  ballLeavesBat,
  ballScaleAtFlight,
  ballScaleAtOutgoing,
  beatSightFlash,
  BATTER_ROTATION_Y,
  batterStandX,
  firstPitchPlateScale,
  firstPitchPlateZ,
  CAMERA_FOV,
  CAMERA_LOCK,
  deliveryLeaveStartMs,
  deliveryTimeScale,
  plantSinkY,
  CAMERA_PUNCH,
  cameraPunchOffset,
  cameraPunchOn,
  MITT_RECEIVE,
  mittAlreadyHome,
  mittHoldShows,
  mittTellDurS,
  catcherReceives,
  FIRST_PITCH_PLATE,
  aimGridBox,
  aimGridPhoneStrip,
  worldSitShows,
  firstPitchPlateFrameBars,
  firstPitchPlateOpacity,
  firstPitchPlateSight,
  FLASH_SIGHT,
  flashDiscMaxScale,
  heldClipSnaps,
  pitcherFreezesThrow,
  outgoingBallLook,
  outgoingBallClearsBatter,
  outgoingSightShows,
  mittCarrySightShows,
  incomingSightShows,
  flashFollowsOutgoing,
  outgoingSightT,
  planOutgoing,
  RELEASE_POINT as RELEASE_POINT_V,
  mittFaceOnScore,
  mittFacesCatcher,
  pickThrowPoseTime,
  pitcherSetGloveLift,
  setMittNearFace,
  releaseFromThrowingHand,
  releaseThrowTime,
  shortLandscapeFilm,
  SOCKET_OFFSETS,
  swingBatRotDeg,
  swingArmLDeg,
  swingArmRDeg,
  swingBatRollDeg,
  swingBatSweepDeg,
  swingLoadBatSweepDeg,
  swingBatWeight,
  swingBatYawDeg,
  swingZoneWeight,
  swingBodyYawDeg,
  swingOpensThrough,
  swingPhase,
  swingStrideM,
  swingStrideThighDeg,
  type SocketOffset,
} from "./scene/presentation";
import { applyToonMaterials, heroToonRamp, toonRampLastStep } from "./scene/toon";
import { releaseActorMixer } from "./scene/actor-mixer";
import type { ExhibitionTier } from "./quality";

// ── world constants (mirror the manifest contract) ──────────────────────────

const MOUND = new Vector3(0, 0, -18.44);
const RELEASE_POINT = new Vector3(RELEASE_POINT_V[0], RELEASE_POINT_V[1], RELEASE_POINT_V[2]);
const liveReleaseOrigin = new Vector3(RELEASE_POINT.x, RELEASE_POINT.y, RELEASE_POINT.z);
// Scratch for the two-hand bat axis (authored swing clip): the barrel runs
// from the bottom hand (hand.L) through the top hand (hand.R).
const _batHandL = new Vector3();
const _batHandR = new Vector3();
const _batDir = new Vector3();
const _batOne = new Vector3(1, 1, 1);
const _batUp = new Vector3(0, 1, 0);
const _batQ = new Quaternion();
const _batM = new Matrix4();
const _batMInv = new Matrix4();
let throwHandReady = false;
const MITT_POINT = new Vector3(MITT_RECEIVE[0], MITT_RECEIVE[1], MITT_RECEIVE[2]);
const ZONE = { halfW: 0.2159, top: 1.05, bottom: 0.45 };
const WORLD_UP = new Vector3(0, 1, 0);
const WORLD_X = new Vector3(1, 0, 0);
const WORLD_Z = new Vector3(0, 0, 1);
const _head = new Vector3();
const _batBox = new Box3();
const _handR = new Vector3();
const _handL = new Vector3();
const _batGrip = new Vector3();
const _batTip = new Vector3();
const _batCorner = new Vector3();
const _footL = new Vector3();
const _footR = new Vector3();

/** Put the bat back on its tuned socket offset after the two-hand override. */
function restoreBatSocket(bat: Object3D | null) {
  const local = bat?.userData.socketLocal as { p: Vector3; q: Quaternion; s: Vector3 } | undefined;
  if (!bat || !local) return;
  bat.position.copy(local.p);
  bat.quaternion.copy(local.q);
  bat.scale.copy(local.s);
}

function rememberThrowingHand(hand: Object3D | null) {
  if (!hand) return;
  hand.updateWorldMatrix(true, false);
  hand.getWorldPosition(_handR);
  const [x, y, z] = releaseFromThrowingHand([_handR.x, _handR.y, _handR.z]);
  liveReleaseOrigin.set(x, y, z);
  throwHandReady = true;
}

function clearThrowHand() {
  throwHandReady = false;
}

function debugForceBatThrough(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as { __dsForceBatThrough?: unknown }).__dsForceBatThrough);
}

function debugBatYawOverride(): number | null {
  if (typeof window === "undefined") return null;
  const n = (window as { __dsBatYaw?: unknown }).__dsBatYaw;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function applySwingStridePose(thigh: Object3D, phase: number) {
  const deg = swingStrideThighDeg(phase);
  if (deg === 0) return;
  // +X @ 20° kicked foot.L to y=1.14 toward the camera. Opposite sign,
  // smaller angle. Kill it if a GPU still shows y above ~0.16.
  thigh.rotateOnWorldAxis(WORLD_X, MathUtils.degToRad(-deg));
}

function applySwingTorsoPose(spine: Object3D, phase: number) {
  const yaw = swingBodyYawDeg(phase);
  if (yaw === 0) return;
  // Waist origin: world +Y here is opposite the old group local +Y. Sign
  // is camera-proven against barrel tip x (pull is negative).
  spine.rotateOnWorldAxis(WORLD_UP, MathUtils.degToRad(-yaw));
}

function applySwingArmPose(arm: Object3D, side: "R" | "L", weight: number) {
  const deg = side === "R" ? swingArmRDeg(weight) : swingArmLDeg(weight);
  if (deg.x === 0 && deg.y === 0) return;
  // Through only. Hands follow bat weight so the 150 ms tell is in the zone.
  // Positive world-X raised them; keep the presentation constants negative.
  if (deg.x !== 0) arm.rotateOnWorldAxis(WORLD_X, MathUtils.degToRad(deg.x));
  if (deg.y !== 0) arm.rotateOnWorldAxis(WORLD_UP, MathUtils.degToRad(deg.y));
}

function debugSetGloveLift(): [number, number, number] | null {
  if (typeof window === "undefined") return null;
  const n = (window as { __dsSetGloveRot?: unknown }).__dsSetGloveRot;
  if (!Array.isArray(n) || n.length < 3) return null;
  const x = Number(n[0]);
  const y = Number(n[1]);
  const z = Number(n[2]);
  if (![x, y, z].every(Number.isFinite)) return null;
  return [x, y, z];
}

function applySetGloveLift(arm: Object3D, deg: readonly [number, number, number]) {
  if (deg[0] !== 0) arm.rotateOnWorldAxis(WORLD_X, MathUtils.degToRad(deg[0]));
  if (deg[1] !== 0) arm.rotateOnWorldAxis(WORLD_UP, MathUtils.degToRad(deg[1]));
  if (deg[2] !== 0) arm.rotateOnWorldAxis(WORLD_Z, MathUtils.degToRad(deg[2]));
}

function hideOutgoingSight(sight: Mesh | null) {
  if (sight) sight.visible = false;
}

function paintOutgoingSight(
  sight: Mesh | null,
  opts: { pos: Vector3; scale: number; color: string; show: boolean },
) {
  if (!sight) return;
  const mat = sight.material;
  if (mat && !Array.isArray(mat)) {
    const basic = mat as MeshBasicMaterial;
    basic.color.set(opts.color);
    basic.toneMapped = false;
    basic.depthTest = false;
    basic.depthWrite = false;
  }
  sight.position.copy(opts.pos);
  sight.scale.setScalar(opts.scale);
  sight.renderOrder = 20;
  sight.visible = opts.show;
}

function paintBallLook(
  mesh: Mesh,
  look: { color: string; emissive: string },
  opts?: { throughBatter?: boolean },
) {
  const mat = mesh.material;
  if (!mat || Array.isArray(mat)) return;
  const toon = mat as MeshToonMaterial;
  toon.color.set(look.color);
  if (toon.emissive) toon.emissive.set(look.emissive);
  // Family hues have to survive the night grade. Cream incoming stays mapped.
  toon.toneMapped = look.color === BALL_VISUAL.color;
  const through = Boolean(opts?.throughBatter);
  toon.depthTest = !through;
  toon.depthWrite = !through;
  mesh.renderOrder = through ? 12 : 0;
}

function applySwingBatPose(bat: Object3D, weight: number, phase: number) {
  const rot = swingBatRotDeg(weight);
  bat.rotation.set(MathUtils.degToRad(rot[0]), MathUtils.degToRad(rot[1]), MathUtils.degToRad(rot[2]));
  const zone = swingZoneWeight(weight);
  const override = debugBatYawOverride();
  const yaw = override != null ? override * zone : swingBatYawDeg(zone);
  if (yaw !== 0) bat.rotateOnWorldAxis(WORLD_UP, MathUtils.degToRad(yaw));
  // Yaw + sweep stop at the zone cut. Dest 1 on those axes weather-vaned
  // to a vertical bat (hy44 single r400). World-Z roll did not read.
  const sweep = swingBatSweepDeg(zone) + swingLoadBatSweepDeg(phase);
  if (sweep !== 0) bat.rotateOnWorldAxis(WORLD_X, MathUtils.degToRad(sweep));
  const roll = swingBatRollDeg(weight);
  if (roll !== 0) bat.rotateOnWorldAxis(WORLD_Z, MathUtils.degToRad(roll));
}

function batBarrelTip(bat: Object3D, into: Vector3): Vector3 {
  _batBox.setFromObject(bat);
  bat.getWorldPosition(_batGrip);
  let best = 0;
  into.copy(_batGrip);
  for (const x of [_batBox.min.x, _batBox.max.x]) {
    for (const y of [_batBox.min.y, _batBox.max.y]) {
      for (const z of [_batBox.min.z, _batBox.max.z]) {
        _batCorner.set(x, y, z);
        const d = _batCorner.distanceToSquared(_batGrip);
        if (d > best) {
          best = d;
          into.copy(_batCorner);
        }
      }
    }
  }
  return into;
}

/** Zone coordinates (cells 0..3 on each axis) → world point over the plate. */
function applyCatcherFilm(cam: PerspectiveCamera, viewW: number, viewH: number) {
  const film = shortLandscapeFilm(viewW, viewH);
  if (!film) cam.clearViewOffset();
  else cam.setViewOffset(film.fullW, film.fullH, film.x, film.y, film.w, film.h);
  cam.updateProjectionMatrix();
  if (debugFpsEnabled()) {
    (window as unknown as { __dsFilm?: unknown }).__dsFilm = film;
  }
}

function plateCross(loc: Loc): Vector3 {
  return new Vector3((loc.x / 3 - 0.5) * ZONE.halfW * 2, ZONE.top - (loc.y / 3) * (ZONE.top - ZONE.bottom), 0);
}

interface ZoneRect {
  left: number;
  top: number;
  width: number;
  height: number;
  canvasH?: number;
  canvasW?: number;
  viewH?: number;
}

function gridBoxStyle(rect: ZoneRect, stage?: string): CSSProperties {
  return aimGridBox({ ...rect, stage });
}

interface Props {
  controller: PlateController;
  snapshot: PlateSnapshot;
  tier: ExhibitionTier;
  reduced: boolean;
  heat: number[];
  ghost: Cell | null;
  onAim: (c: Cell) => void;
  sitChosen?: boolean;
  onReady: () => void;
  onFatal: () => void;
  onContextLost?: () => void;
}

function debugFpsEnabled() {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("debug") === "1" || q.get("fps") === "1";
}

function debugHoldClock() {
  return typeof window !== "undefined" && Boolean((window as { __dsHoldClock?: boolean }).__dsHoldClock);
}

export default function Exhibition3D(props: Props) {
  const [manifest, setManifest] = useState<SceneManifest | null>(null);
  const baseDpr = props.tier === "mobile" ? 1 : 1.5;
  const [dprScale, setDprScale] = useState(1);
  const [zoneRect, setZoneRect] = useState<ZoneRect | null>(null);
  const { controller, onFatal, onContextLost } = props;
  const showFps = useMemo(debugFpsEnabled, []);
  const fpsNode = useRef<HTMLSpanElement>(null);
  // Unmount (Leave / Run it back) makes R3F force-lose the old context on
  // purpose; that event is disposal, not a loss the session should report.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    loadManifest()
      .then((m) => {
        if (alive) setManifest(m);
      })
      .catch(() => {
        if (alive) onFatal();
      });
    return () => {
      alive = false;
    };
  }, [onFatal]);

  const onCreated = useCallback(
    (state: { gl: { domElement: HTMLCanvasElement } }) => {
      state.gl.domElement.addEventListener("webglcontextlost", (e) => {
        if (!alive.current) return;
        e.preventDefault();
        controller.pause("hidden");
        onContextLost?.();
      });
    },
    [controller, onContextLost],
  );

  useEffect(() => {
    if (!debugFpsEnabled() || !zoneRect) return;
    const box = aimGridBox({ ...zoneRect, stage: props.snapshot.stage });
    const phoneStrip = aimGridPhoneStrip(zoneRect.canvasW ?? 0, zoneRect.canvasH ?? 0);
    (window as unknown as { __dsGrid?: unknown }).__dsGrid = {
      ...box,
      w: Math.round(box.width),
      h: Math.round(box.height),
      canvasH: zoneRect.canvasH ?? null,
      canvasW: zoneRect.canvasW ?? null,
      phoneStrip,
      batterX: batterStandX(phoneStrip),
    };
  }, [zoneRect, props.snapshot.stage]);

  if (!manifest) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-ink">
        <p className="font-display text-xs uppercase tracking-widest text-cream/70">Lighting the lanterns…</p>
      </div>
    );
  }

  const showGrid = worldSitShows(props.snapshot.stage, props.sitChosen);

  return (
    <div className="absolute inset-0" style={{ background: NIGHT_SKY }}>
      <Canvas
        dpr={Math.min(baseDpr * dprScale, baseDpr)}
        shadows={props.tier === "desktop"}
        gl={{ antialias: props.tier === "desktop", powerPreference: "high-performance", alpha: false }}
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 400, position: [...CAMERA_LOCK.position] }}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <SceneRoot
            {...props}
            manifest={manifest}
            onZoneRect={setZoneRect}
            onDegrade={() => setDprScale(0.75)}
            fpsNode={showFps ? fpsNode : null}
          />
        </Suspense>
      </Canvas>
      {showFps ? (
        <span
          ref={fpsNode}
          className="pointer-events-none absolute left-1 top-1 z-[1] font-mono text-[9px] tabular-nums text-cream/35"
          data-debug-fps
          aria-hidden
        />
      ) : null}
      {zoneRect && showGrid ? (
        <div className="absolute" style={gridBoxStyle(zoneRect, props.snapshot.stage)}>
          <AimGrid snapshot={props.snapshot} heat={props.heat} ghost={props.ghost} onAim={props.onAim} sitChosen={props.sitChosen} compact />
        </div>
      ) : null}
    </div>
  );
}

// ── scene ────────────────────────────────────────────────────────────────────

function SceneRoot({
  controller,
  snapshot,
  tier,
  reduced,
  sitChosen,
  manifest,
  onReady,
  onZoneRect,
  onDegrade,
  fpsNode,
}: Props & {
  manifest: SceneManifest;
  onZoneRect: (r: ZoneRect) => void;
  onDegrade: () => void;
  fpsNode: RefObject<HTMLSpanElement | null> | null;
}) {
  // Aoi vs Reina unless `?batter=` / `?pitcher=` names a built roster hero.
  const heroes = useMemo(() => {
    const want = heroRequests(typeof window === "undefined" ? "" : window.location.search);
    const batterKey = heroKeyFor("batter", want.batter, manifest.assets);
    const pitcherKey = heroKeyFor("pitcher", want.pitcher, manifest.assets);
    return {
      batterKey,
      pitcherKey,
      batter: manifest.assets[batterKey] ?? manifest.assets.aoi,
      pitcher: manifest.assets[pitcherKey] ?? manifest.assets.reina,
    };
  }, [manifest]);
  const [fieldGltf, batterGltf, pitcherGltf, propsGltf] = useLoader(
    GLTFLoader,
    [
      manifest.assets.field.url,
      heroes.batter.url,
      heroes.pitcher.url,
      manifest.assets.props.url,
    ],
    (loader) => {
      loader.setWithCredentials(true);
    },
  );
  const { camera, gl, scene, size } = useThree();
  const paused = snapshot.paused;
  const phoneStrip = aimGridPhoneStrip(size.width, size.height);
  const batterX = batterStandX(phoneStrip);

  // Boost lantern emissives and collect glow centers before the toon convert
  // (toon preserves emissive; the authored non-black check needs the source).
  const lanternCandidates = useMemo(() => collectFieldLanterns(fieldGltf.scene), [fieldGltf]);
  const lanternLights = useMemo(
    () => selectLanternLights(lanternLightCandidates(lanternCandidates), tier),
    [lanternCandidates, tier],
  );
  const lanternHalos = useMemo(() => lanternHaloPoints(lanternCandidates), [lanternCandidates]);
  useLayoutEffect(() => {
    applyHeroNightExposure(batterGltf.scene, heroLookFor("batter"), phoneStrip);
    applyHeroNightExposure(pitcherGltf.scene, heroLookFor("pitcher"), phoneStrip);
    applyBatNightLook(propsGltf.scene, phoneStrip);
  }, [batterGltf, pitcherGltf, propsGltf, phoneStrip]);
  useEffect(() => {
    if (!debugFpsEnabled()) return;
    (window as unknown as { __dsNight?: unknown }).__dsNight = {
      phoneStrip,
      tier,
      canvas: [size.width, size.height],
      albedo: {
        aoi: heroNightAlbedo(heroLookFor("batter"), phoneStrip),
        reina: heroNightAlbedo(heroLookFor("pitcher"), phoneStrip),
        bat: batNightAlbedo(phoneStrip),
      },
      batMats: collectBatNightDump(propsGltf.scene),
      aoiMats: collectHeroNightDump(batterGltf.scene),
      reinaMats: collectHeroNightDump(pitcherGltf.scene),
      phoneAoiRamp: phoneStrip,
      frames: FRAME_LANTERNS.map((l) => ({
        name: l.name,
        pos: l.pos,
        screenV: Number(frameLanternScreenV(l.pos).toFixed(3)),
      })),
      halos: lanternHalos.length,
    };
  }, [phoneStrip, tier, size.width, size.height, lanternHalos, propsGltf, batterGltf, pitcherGltf]);

  // Toon-convert everything once.
  useMemo(() => {
    applyToonMaterials(fieldGltf.scene);
    applyToonMaterials(batterGltf.scene);
    applyToonMaterials(pitcherGltf.scene);
    applyToonMaterials(propsGltf.scene);
    applyHeroLook(batterGltf.scene, heroLookFor("batter"));
    applyHeroLook(pitcherGltf.scene, heroLookFor("pitcher"));
    darkenEmptyStands(fieldGltf.scene);
    fieldGltf.scene.traverse((obj) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh && isLanternGlowNode(mesh.name)) mesh.castShadow = false;
    });
    return true;
  }, [fieldGltf, batterGltf, pitcherGltf, propsGltf]);

  const standMats = useMemo(() => collectStandMats(fieldGltf.scene), [fieldGltf]);
  const washStands = standWashOn({ strikes: snapshot.game.count.strikes, stage: snapshot.stage });
  useEffect(() => {
    applyStandWash(standMats, washStands);
    if (debugFpsEnabled()) {
      const w = window as unknown as { __dsStands?: unknown };
      w.__dsStands = {
        wash: washStands,
        mats: standMats.length,
        strikes: snapshot.game.count.strikes,
        stage: snapshot.stage,
      };
    }
  }, [standMats, washStands, snapshot.game.count.strikes, snapshot.stage]);

  useEffect(() => {
    for (const [who, asset] of [
      [heroes.batterKey, heroes.batter],
      [heroes.pitcherKey, heroes.pitcher],
    ] as const) {
      const sized = asset as CharacterAsset & { triangles?: number; bytes?: number };
      if (heroOverBudget(sized)) {
        console.warn("[exhibition] hero over budget", who, sized.triangles, sized.bytes, HERO_BUDGET_HINT);
      }
    }
  }, [heroes]);

  // Locked catcher-side camera; recompute the projected zone rect on resize.
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    // Locked catcher-side cam: centered behind the plate, elevated, looking down
    // the tunnel to the mound. Punch translates this lock; it never looks at a
    // new target. Zone projection always uses the un-punched lock.
    cam.position.set(CAMERA_LOCK.position[0], CAMERA_LOCK.position[1], CAMERA_LOCK.position[2]);
    cam.lookAt(CAMERA_LOCK.lookAt[0], CAMERA_LOCK.lookAt[1], CAMERA_LOCK.lookAt[2]);
    applyCatcherFilm(cam, size.width, size.height);
    const corners = [
      new Vector3(-ZONE.halfW, ZONE.top, 0),
      new Vector3(ZONE.halfW, ZONE.top, 0),
      new Vector3(-ZONE.halfW, ZONE.bottom, 0),
      new Vector3(ZONE.halfW, ZONE.bottom, 0),
    ];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of corners) {
      const v = c.clone().project(cam);
      const px = (v.x * 0.5 + 0.5) * size.width;
      const py = (1 - (v.y * 0.5 + 0.5)) * size.height;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    onZoneRect({
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      canvasH: size.height,
      canvasW: size.width,
      viewH: typeof window !== "undefined" ? window.innerHeight : size.height,
    });
  }, [camera, size.width, size.height, onZoneRect]);

  // Compile all materials before the first pitch is offered.
  useEffect(() => {
    scene.background = new Color(NIGHT_SKY);
    scene.fog = new Fog(NIGHT_FOG.color, NIGHT_FOG.near, NIGHT_FOG.far);
    gl.setClearColor(NIGHT_SKY, 1);
    gl.compile(scene, camera);
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame-time watchdog: sustained >40ms average over 5s degrades once.
  const watch = useRef({ acc: 0, n: 0, since: 0, fired: false });
  const fpsAcc = useRef({ t: 0, n: 0 });
  useFrame((_, delta) => {
    const w = watch.current;
    if (!w.fired) {
      w.acc += delta;
      w.n += 1;
      if (w.since === 0) w.since = performance.now();
      if (performance.now() - w.since >= 5000) {
        const avgMs = (w.acc / Math.max(1, w.n)) * 1000;
        if (avgMs > 40) {
          w.fired = true;
          onDegrade();
        }
        w.acc = 0;
        w.n = 0;
        w.since = performance.now();
      }
    }
    const el = fpsNode?.current;
    if (el) {
      const a = fpsAcc.current;
      a.t += delta;
      a.n += 1;
      if (a.t >= 0.5) {
        el.textContent = `${Math.round(a.n / a.t)}`;
        a.t = 0;
        a.n = 0;
      }
    }
  });

  return (
    <>
      <CameraLock controller={controller} paused={paused} reduced={reduced} />
      <NightSky />
      <NightLighting desktop={tier === "desktop"} lanterns={lanternLights} phoneStrip={phoneStrip} />
      {/* FrameLanterns off: at the catcher cam they stood on the infield. */}
      <LanternHalos points={lanternHalos} />
      <primitive object={fieldGltf.scene} />
      <CharacterActor
        gltf={batterGltf}
        asset={heroes.batter}
        controller={controller}
        paused={paused}
        reduced={reduced}
        position={[batterX, 0, 0.55]}
        rotationY={BATTER_ROTATION_Y}
        propMesh={findProp(propsGltf, "prop_bat")}
        propSocket={heroes.batter.sockets?.bat_grip ?? "hand.R"}
        propOffset={SOCKET_OFFSETS.bat_grip}
      />
      <CharacterActor
        gltf={pitcherGltf}
        asset={heroes.pitcher}
        controller={controller}
        paused={paused}
        reduced={reduced}
        position={[MOUND.x, 0, MOUND.z]}
        rotationY={0}
        bodyScale={HERO_LOOK.reina.height}
        propMesh={findProp(propsGltf, "prop_mitt")}
        propSocket={heroes.pitcher.sockets?.glove ?? "hand.L"}
        propOffset={SOCKET_OFFSETS.pitcher_glove}
      />
      {/* LOOK: empty closed mitt up near the face is Reina's mark at 18 m.
          The ball stays on hand.R — never in the webbing. */}
      <Ball controller={controller} paused={paused} />
      <FirstPitchPlate snapshot={snapshot} reduced={reduced} paused={paused} aimed={sitChosen} />
      <LookProofHook />
    </>
  );
}

/** ?debug=1: `window.__dsFillBlack()` for the LOOK test at the locked cam. */
function LookProofHook() {
  const { gl, scene } = useThree();
  useEffect(() => {
    if (!debugFpsEnabled()) return;
    const w = window as unknown as { __dsFillBlack?: () => number };
    w.__dsFillBlack = () => {
      // LOOK is "fill her black" — the heroes, not the park. A black
      // field + black sky ate Reina last time; only the skyline showed.
      const card = "#e6d4b0";
      scene.background = new Color(card);
      scene.fog = null;
      gl.setClearColor(card, 1);
      let meshes = 0;
      scene.traverse((obj) => {
        const light = obj as { isLight?: boolean; intensity?: number };
        if (light.isLight && typeof light.intensity === "number") {
          light.intensity = 0;
          return;
        }
        const sprite = obj as { isSprite?: boolean; visible?: boolean };
        if (sprite.isSprite) {
          sprite.visible = false;
          return;
        }
        const mesh = obj as Mesh & { isSkinnedMesh?: boolean };
        if (!mesh.isMesh) return;
        if (fillBlackHidesObject("mesh", mesh.name, Boolean(mesh.isSkinnedMesh))) {
          mesh.visible = false;
          return;
        }
        if (!fillBlackPaintsMesh(mesh.name)) {
          meshes += 1;
          return;
        }
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          const m = mat as MeshBasicMaterial & { emissive?: { set: (c: string) => void }; map?: unknown; needsUpdate?: boolean };
          if (m.color) m.color.set("#000000");
          if (m.emissive) {
            m.emissive.set("#000000");
            (m as { emissiveIntensity?: number }).emissiveIntensity = 0;
          }
          m.map = null;
          m.needsUpdate = true;
        }
        meshes += 1;
      });
      return meshes;
    };
    return () => {
      delete w.__dsFillBlack;
    };
  }, [gl, scene]);
  return null;
}

function FirstPitchPlate({
  snapshot,
  reduced,
  paused,
  aimed,
}: {
  snapshot: PlateSnapshot;
  reduced: boolean;
  aimed?: boolean;
  paused: boolean;
}) {
  const mats = useRef<MeshBasicMaterial[]>([]);
  const elapsed = useRef(0);
  const wasOn = useRef(false);
  const { size } = useThree();
  const phoneStrip = aimGridPhoneStrip(size.width, size.height);
  const on = firstPitchPlateSight({
    pitchesSeen: snapshot.game.pitchesSeen,
    stage: snapshot.stage,
    phoneStrip,
    swung: snapshot.game.events.some((e) => e.t === "swing"),
    paIndex: snapshot.game.paIndex,
    aimed,
  });
  const plateScale = firstPitchPlateScale(phoneStrip);
  const w = ZONE.halfW * 2 * plateScale;
  const h = (ZONE.top - ZONE.bottom) * plateScale;
  const bars = firstPitchPlateFrameBars(w, h);
  useFrame((_, delta) => {
    if (on && !wasOn.current) elapsed.current = 0;
    wasOn.current = on;
    if (on && !paused && !debugHoldClock()) elapsed.current += delta;
    const opacity = firstPitchPlateOpacity(elapsed.current, reduced);
    for (const m of mats.current) if (m) m.opacity = opacity;
    if (debugFpsEnabled()) {
      (window as unknown as { __dsFirstPlate?: unknown }).__dsFirstPlate = {
        on,
        opacity: Number(opacity.toFixed(3)),
        stage: snapshot.stage,
        pitchesSeen: snapshot.game.pitchesSeen,
        aimed: aimed !== false,
        bars: bars.length,
        scale: plateScale,
        z: firstPitchPlateZ(phoneStrip),
      };
    }
  });
  if (!on) return null;
  return (
    <group name="firstPitchPlate" position={[0, (ZONE.top + ZONE.bottom) / 2, firstPitchPlateZ(phoneStrip)]}>
      {bars.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0]} renderOrder={8}>
          <planeGeometry args={[b.w, b.h]} />
          <meshBasicMaterial
            ref={(m) => {
              if (m) mats.current[i] = m;
            }}
            color={FIRST_PITCH_PLATE.color}
            transparent
            opacity={FIRST_PITCH_PLATE.opacityMin}
            depthTest={false}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function findProp(gltf: GLTF, name: string): Object3D | null {
  return gltf.scene.getObjectByName(name) ?? null;
}

/** Navy varsity 1. Atlas has no kit_number_back. Parent to chest. */
function makeAoiBackOne(): Group {
  const g = new Group();
  g.name = "aoi_back_one";
  const mat = new MeshBasicMaterial({
    color: AOI_BACK_ONE.color,
    toneMapped: false,
    depthTest: AOI_BACK_ONE.depthTest,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const stem = new Mesh(new BoxGeometry(AOI_BACK_ONE.stemW, AOI_BACK_ONE.stemH, AOI_BACK_ONE.depth), mat);
  stem.name = "aoi_back_one_stem";
  const serif = new Mesh(new BoxGeometry(AOI_BACK_ONE.stemW * 0.7, AOI_BACK_ONE.stemW * 0.55, AOI_BACK_ONE.depth), mat);
  serif.name = "aoi_back_one_serif";
  serif.position.set(-AOI_BACK_ONE.stemW * 0.55, AOI_BACK_ONE.stemH * 0.32, 0);
  g.add(stem, serif);
  return g;
}

/** Socket bone lookup: contract `hand.R`, compact `handR`, Mixamo `RightHand`. */
function findSocketBone(root: Object3D, socket: string): Object3D | null {
  let found: Object3D | null = null;
  root.traverse((o) => {
    if (!found && matchesContractBone(o.name, socket)) found = o;
  });
  return found;
}

const HERO_BUDGET_HINT = "replace the GLB and bump manifest ?v=; keep ≤28.5k tris / 3MB";

type StandMat = { emissive?: { set: (c: string) => void }; emissiveIntensity?: number };

function collectStandMats(root: Object3D): StandMat[] {
  const out: StandMat[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as StandMat & { name?: string };
      if (isEmptyStandSurface(mesh.name, named.name ?? "")) out.push(named);
    }
  });
  return out;
}

function applyStandWash(mats: readonly StandMat[], on: boolean) {
  for (const mat of mats) {
    mat.emissive?.set(on ? STAND_WASH.color : "#000000");
    if (mat.emissiveIntensity != null) mat.emissiveIntensity = on ? STAND_WASH.intensity : 0;
  }
}

function darkenEmptyStands(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as { name?: string; color?: { set: (c: string) => void } };
      if (named.color && isEmptyStandSurface(mesh.name, named.name ?? "")) {
        named.color.set(STAND_NIGHT_COLOR);
      }
    }
  });
}

function applyHeroLook(root: Object3D, role: HeroLookRole) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as {
        name?: string;
        map?: unknown;
        color?: { set: (c: string) => void };
        emissive?: { set: (c: string) => void };
        emissiveIntensity?: number;
      };
      const tint = kitMatTint(named.name ?? "", role, Boolean(named.map));
      if (tint && named.color) named.color.set(tint);
      if (role === "reina" && /lock/i.test(named.name ?? "") && named.color) {
        named.color.set(REINA_LOCK_TINT);
      }
      const glow = heroMatGlow(named.name ?? "", role);
      if (glow && named.emissive) {
        named.emissive.set(glow.color);
        named.emissiveIntensity = glow.intensity;
      } else if (role === "reina" && named.emissive && /kit_|hair_/i.test(named.name ?? "")) {
        named.emissive.set("#000000");
        named.emissiveIntensity = 0;
      }
      if (heroCurtainSkipsToneMap(named.name ?? "", role)) {
        (named as { toneMapped?: boolean }).toneMapped = false;
      }
      if (role === "reina" && !/curtain|lock/i.test(named.name ?? "") && !/kit_curtain/i.test(mesh.name)) {
        applyReinaCurtainEmit(mesh, named);
      }
      applyHeroNightMips(named, role);
    }
  });
}

function applyHeroNightMips(
  mat: { map?: unknown },
  role: HeroLookRole,
) {
  const map = mat.map as Texture | undefined;
  if (map && !heroKeepsAtlasMips(role)) {
    map.generateMipmaps = false;
    map.minFilter = heroAtlasNearestMin(role) ? NearestFilter : LinearFilter;
    map.magFilter = LinearFilter;
    map.needsUpdate = true;
  }
}

type NightAlbedoMat = {
  name?: string;
  color?: { r: number; g: number; b: number; setRGB: (r: number, g: number, b: number) => void };
  gradientMap?: unknown;
  emissiveIntensity?: number;
  toneMapped?: boolean;
  userData?: { nightAlbedoBase?: { r: number; g: number; b: number }; curtainVerts?: number };
};

function isBatObject(obj: Object3D): boolean {
  let walk: Object3D | null = obj;
  while (walk) {
    const mats = (walk as Mesh).isMesh
      ? Array.isArray((walk as Mesh).material)
        ? ((walk as Mesh).material as { name?: string }[])
        : [((walk as Mesh).material as { name?: string } | undefined)]
      : [];
    if (isBatProp(walk.name, mats.map((m) => m?.name ?? "").join(" "))) return true;
    walk = walk.parent;
  }
  return false;
}

function collectHeroNightDump(root: Object3D) {
  const rows: {
    mat: string;
    rgb: [number, number, number];
    dim?: number;
    ramp?: number | null;
    toneMapped?: boolean;
    atlasMin?: string;
  }[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as NightAlbedoMat & { name?: string; map?: { minFilter?: number } };
      const name = named.name ?? "";
      if (!/skin_hero|kit_/i.test(name)) continue;
      if (rows.some((r) => r.mat === name)) continue;
      if (!named.color) continue;
      const base = named.userData?.nightAlbedoBase;
      const minF = named.map?.minFilter;
      rows.push({
        mat: name,
        rgb: [Number(named.color.r.toFixed(3)), Number(named.color.g.toFixed(3)), Number(named.color.b.toFixed(3))],
        dim: base ? Number((named.color.r / (base.r || 1)).toFixed(3)) : undefined,
        ramp: toonRampLastStep(named.gradientMap as { image?: { data?: ArrayLike<number> } }),
        toneMapped: named.toneMapped !== false,
        atlasMin: minF === NearestFilter ? "nearest" : minF === LinearFilter ? "linear" : minF != null ? String(minF) : undefined,
      });
    }
  });
  return rows;
}

function collectBatNightDump(root: Object3D) {
  const rows: {
    mesh: string;
    mat: string;
    rgb: [number, number, number];
    dim?: number;
    ramp?: number | null;
    toneMapped?: boolean;
  }[] = [];
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !isBatObject(mesh)) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as NightAlbedoMat & { name?: string };
      if (!named.color) continue;
      const base = named.userData?.nightAlbedoBase;
      rows.push({
        mesh: mesh.name,
        mat: named.name ?? "",
        rgb: [Number(named.color.r.toFixed(3)), Number(named.color.g.toFixed(3)), Number(named.color.b.toFixed(3))],
        dim: base
          ? Number((named.color.r / (base.r || 1)).toFixed(3))
          : undefined,
        ramp: toonRampLastStep(named.gradientMap as { image?: { data?: ArrayLike<number> } }),
        toneMapped: named.toneMapped !== false,
      });
    }
  });
  return rows;
}

function applyBatNightLook(root: Object3D, phoneStrip: boolean) {
  const dim = batNightAlbedo(phoneStrip);
  const ramp = heroToonRamp("aoi", phoneStrip);
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh || !isBatObject(mesh)) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as NightAlbedoMat;
      if (named.gradientMap) named.gradientMap = ramp;
      if (!named.color) continue;
      const ud = (named.userData ??= {});
      if (!ud.nightAlbedoBase) {
        ud.nightAlbedoBase = { r: named.color.r, g: named.color.g, b: named.color.b };
      }
      const base = ud.nightAlbedoBase;
      named.color.setRGB(base.r * dim, base.g * dim, base.b * dim);
    }
  });
}

function applyHeroNightExposure(root: Object3D, role: HeroLookRole, phoneStrip: boolean) {
  const dim = heroNightAlbedo(role, phoneStrip);
  const ramp = heroToonRamp(role, phoneStrip);
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const named = mat as NightAlbedoMat;
      if (named.gradientMap) named.gradientMap = ramp;
      if (role === "reina" && named.emissiveIntensity != null) {
        if (named.userData?.curtainVerts) {
          named.emissiveIntensity = reinaAtlasCurtainEmit(phoneStrip);
        } else if (/curtain/i.test(named.name ?? "")) {
          named.emissiveIntensity = reinaNamedCurtainEmit(phoneStrip);
          named.toneMapped = !heroCurtainSkipsToneMap(named.name ?? "", role, phoneStrip);
        }
      }
      if (!named.color) continue;
      const ud = (named.userData ??= {});
      if (!ud.nightAlbedoBase) {
        ud.nightAlbedoBase = { r: named.color.r, g: named.color.g, b: named.color.b };
      }
      const base = ud.nightAlbedoBase;
      named.color.setRGB(base.r * dim, base.g * dim, base.b * dim);
    }
  });
}

function readTextureImageData(image: unknown): { data: Uint8ClampedArray; width: number; height: number } | null {
  if (!image || typeof document === "undefined") return null;
  const src = image as { width?: number; height?: number };
  const w = src.width ?? 0;
  const h = src.height ?? 0;
  if (!(w > 0) || !(h > 0)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image as CanvasImageSource, 0, 0);
  } catch {
    return null;
  }
  return ctx.getImageData(0, 0, w, h);
}

function applyReinaCurtainEmit(
  mesh: Mesh,
  mat: {
    map?: unknown;
    emissive?: { set: (c: string) => void };
    emissiveIntensity?: number;
    emissiveMap?: unknown;
    needsUpdate?: boolean;
  },
) {
  const map = mat.map as { image?: unknown; flipY?: boolean } | undefined;
  if (!map?.image || !mat.emissive) return;
  const pos = mesh.geometry.getAttribute("position");
  const uv = mesh.geometry.getAttribute("uv");
  if (!pos || !uv) return;
  const atlas = readTextureImageData(map.image);
  if (!atlas) return;
  const weights = reinaCurtainWeights(pos.array, uv.array, atlas);
  let lit = 0;
  for (const w of weights) lit += w > 0 ? 1 : 0;
  if (lit < 8) return;
  mesh.geometry.setAttribute("curtain", new Float32BufferAttribute(weights, 1));
  const named = mat as typeof mat & {
    onBeforeCompile?: (shader: { vertexShader: string; fragmentShader: string }) => void;
    customProgramCacheKey?: () => string;
    userData?: { curtainVerts?: number };
  };
  named.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float curtain;\nvarying float vCurtain;",
      )
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCurtain = curtain;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vCurtain;")
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vCurtain;",
      );
  };
  named.customProgramCacheKey = () => "reina-curtain-emit";
  named.userData = { ...(named.userData ?? {}), curtainVerts: lit };
  mat.emissive.set(REINA_ATLAS_CURTAIN_EMIT.color);
  mat.emissiveIntensity = REINA_ATLAS_CURTAIN_EMIT.intensity;
  mat.emissiveMap = null;
  mat.needsUpdate = true;
}

function CameraLock({
  controller,
  paused,
  reduced,
}: {
  controller: PlateController;
  paused: boolean;
  reduced: boolean;
}) {
  const { camera, size } = useThree();
  const punch = useRef({ elapsed: 0, active: false });
  const lockQuat = useRef<Quaternion | null>(null);

  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.position.set(CAMERA_LOCK.position[0], CAMERA_LOCK.position[1], CAMERA_LOCK.position[2]);
    cam.lookAt(CAMERA_LOCK.lookAt[0], CAMERA_LOCK.lookAt[1], CAMERA_LOCK.lookAt[2]);
    lockQuat.current = cam.quaternion.clone();
    return controller.onCue((cue: PlateCue) => {
      if (cue.t === "prepare" || cue.t === "dead") {
        punch.current = { elapsed: 0, active: false };
        return;
      }
      if (cue.t === "resolved" && !reduced && cameraPunchOn(cue.beat, cue.spec)) {
        punch.current = { elapsed: 0, active: true };
      }
    });
  }, [camera, controller, reduced]);

  useFrame((_, delta) => {
    const cam = camera as PerspectiveCamera;
    if (punch.current.active && !paused) {
      punch.current.elapsed += delta * 1000;
      if (punch.current.elapsed >= CAMERA_PUNCH.durationMs) {
        punch.current = { elapsed: 0, active: false };
      }
    }
    const off = cameraPunchOffset(punch.current.active ? punch.current.elapsed : 0, reduced);
    cam.position.set(
      CAMERA_LOCK.position[0] + off[0],
      CAMERA_LOCK.position[1] + off[1],
      CAMERA_LOCK.position[2] + off[2],
    );
    if (lockQuat.current) cam.quaternion.copy(lockQuat.current);
    applyCatcherFilm(cam, size.width, size.height);
  });

  return null;
}

function collectFieldLanterns(root: Object3D): LanternPoint[] {
  const pts: LanternPoint[] = [];
  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.isMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const named = mat as { name?: string; emissive?: { r: number; g: number; b: number }; emissiveIntensity?: number };
        if (!named.emissive) continue;
        const rgb: [number, number, number] = [named.emissive.r, named.emissive.g, named.emissive.b];
        if (isEmissiveLanternMaterial(named.name ?? "", rgb)) {
          named.emissiveIntensity = LANTERN_EMISSIVE_INTENSITY;
        }
      }
    }
    if (isLanternGlowNode(obj.name)) {
      const p = new Vector3();
      obj.getWorldPosition(p);
      pts.push({ name: obj.name, pos: [p.x, p.y, p.z] });
    }
  });
  return pts;
}

function NightSky() {
  return (
    <group>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[220, 24, 16]} />
        <meshBasicMaterial color={NIGHT_SKY} side={BackSide} depthWrite={false} fog={false} />
      </mesh>
      <mesh position={[0, 14, -90]} renderOrder={-1}>
        <planeGeometry args={[320, 48]} />
        <meshBasicMaterial color="#10182e" depthWrite={false} fog={false} />
      </mesh>
    </group>
  );
}

function FrameLanterns() {
  return (
    <>
      {FRAME_LANTERNS.map((l) => (
        <group key={l.name} position={l.pos}>
          <mesh position={[0, -1.15, 0]}>
            <cylinderGeometry args={[0.045, 0.055, 2.2, 6]} />
            <meshStandardMaterial color="#2a1c12" roughness={0.9} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color={LANTERN_HALO.core} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}

let sharedGlow: CanvasTexture | null = null;

/** 64px radial falloff, white → transparent; tinted by the sprite material. */
function glowTexture(): CanvasTexture {
  if (sharedGlow) return sharedGlow;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  sharedGlow = new CanvasTexture(c);
  return sharedGlow;
}

/**
 * The "lanterns emit" read without a bloom pass: one additive, unmapped,
 * depth-tested halo sprite per visible lantern. Cheap enough for mobile
 * (a few dozen quads), and it is what turns a pale prop sphere into a light.
 */
function LanternHalos({ points }: { points: readonly LanternPoint[] }) {
  const map = useMemo(glowTexture, []);
  const { size } = useThree();
  const phoneStrip = aimGridPhoneStrip(size.width, size.height);
  const halo = lanternHaloSize(phoneStrip);
  const haloOpacity = lanternHaloOpacity(phoneStrip);
  return (
    <>
      {points.map((l) => (
        <sprite key={l.name} position={l.pos} scale={[halo, halo, 1]} renderOrder={2}>
          <spriteMaterial
            map={map}
            color={LANTERN_HALO.color}
            opacity={haloOpacity}
            blending={AdditiveBlending}
            transparent
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
            fog={false}
          />
        </sprite>
      ))}
    </>
  );
}

function NightLighting({
  desktop,
  lanterns,
  phoneStrip,
}: {
  desktop: boolean;
  lanterns: readonly LanternPoint[];
  phoneStrip: boolean;
}) {
  return (
    <>
      <color attach="background" args={[NIGHT_SKY]} />
      <fog attach="fog" args={[NIGHT_FOG.color, NIGHT_FOG.near, NIGHT_FOG.far]} />
      <ambientLight color={NIGHT_RIG.ambient.color} intensity={NIGHT_RIG.ambient.intensity} />
      <hemisphereLight
        color={NIGHT_RIG.hemisphere.sky}
        groundColor={NIGHT_RIG.hemisphere.ground}
        intensity={NIGHT_RIG.hemisphere.intensity}
      />
      <directionalLight
        color={NIGHT_RIG.key.color}
        intensity={NIGHT_RIG.key.intensity}
        position={NIGHT_RIG.key.position}
        castShadow={desktop}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight color={NIGHT_RIG.fill.color} intensity={NIGHT_RIG.fill.intensity} position={NIGHT_RIG.fill.position} />
      <pointLight
        color={MOUND_RIM.color}
        intensity={moundRimIntensity(phoneStrip)}
        distance={MOUND_RIM.distance}
        decay={MOUND_RIM.decay}
        position={MOUND_RIM.position}
        castShadow={false}
      />
      <pointLight
        color={MOUND_CURTAIN.color}
        intensity={MOUND_CURTAIN.intensity}
        distance={MOUND_CURTAIN.distance}
        decay={MOUND_CURTAIN.decay}
        position={MOUND_CURTAIN.position}
        castShadow={false}
      />
      {lanterns.map((l) => {
        const scripted = l.name.startsWith("scripted_");
        const spec = scripted ? SCRIPTED_PLAY_LIGHT : LANTERN_LIGHT;
        return (
          <pointLight
            key={l.name}
            color={spec.color}
            intensity={spec.intensity}
            distance={spec.distance}
            decay={spec.decay}
            position={l.pos}
            castShadow={false}
          />
        );
      })}
    </>
  );
}

// ── characters ───────────────────────────────────────────────────────────────

/** Compact Mixamo / VRM / Tencent bone names so PropertyBinding can bind. */
function prepareCharacterGltf(gltf: GLTF) {
  const scene = gltf.scene as Object3D & { userData: { shineClipsBound?: boolean } };
  if (scene.userData.shineClipsBound) return;
  scene.userData.shineClipsBound = true;
  scene.traverse((obj) => {
    const compact = compactBoneName(obj.name);
    if (compact) obj.name = compact;
  });
  gltf.animations = gltf.animations.map((clip) => {
    const tracks = clip.tracks.flatMap((track) => {
      const rewritten = rewriteTrackName(track.name);
      if (!rewritten) return [];
      if (rewritten !== track.name) track.name = rewritten;
      return [track];
    });
    return tracks.length === clip.tracks.length ? clip : new AnimationClip(clip.name, clip.duration, tracks);
  });
}

function CharacterActor({
  gltf,
  asset,
  controller,
  paused,
  reduced,
  position,
  rotationY,
  propMesh,
  propSocket,
  propOffset,
  bodyScale,
}: {
  gltf: GLTF;
  asset: CharacterAsset;
  controller: PlateController;
  paused: boolean;
  reduced: boolean;
  position: [number, number, number];
  rotationY: number;
  propMesh?: Object3D | null;
  propSocket?: string;
  propOffset?: SocketOffset;
  bodyScale?: number;
}) {
  const group = useRef<Group>(null);
  const plantGroup = useRef<Group>(null);
  const plantDone = useRef(false);
  const swingBody = useRef<Group>(null);
  const swingRig = useRef<{
    spine: Object3D | null;
    thighL: Object3D | null;
    armR: Object3D | null;
    armL: Object3D | null;
    handR: Object3D | null;
    handL: Object3D | null;
    footL: Object3D | null;
    footR: Object3D | null;
  }>({
    spine: null,
    thighL: null,
    armR: null,
    armL: null,
    handR: null,
    handL: null,
    footL: null,
    footR: null,
  });
  const plantedSwing = useRef<{
    spine: Quaternion;
    thigh: Quaternion;
    armR: Quaternion;
    armL: Quaternion;
  } | null>(null);
  const plantedSetArmL = useRef<Quaternion | null>(null);
  const mixer = useMemo(() => {
    prepareCharacterGltf(gltf);
    return new AnimationMixer(gltf.scene);
  }, [gltf]);
  const fitScale = useMemo(() => {
    prepareCharacterGltf(gltf);
    const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    return heroFitScale(size.y);
  }, [gltf]);
  const actions = useMemo(() => {
    const map: Record<string, AnimationAction> = {};
    for (const clip of gltf.animations) map[clip.name] = mixer.clipAction(clip);
    return map;
  }, [gltf, mixer]);
  const actionFor = useCallback(
    (name: string) => {
      const key = findClipName(Object.keys(actions), name);
      return key ? actions[key] : undefined;
    },
    [actions],
  );
  const current = useRef<AnimationAction | null>(null);
  const batProp = useRef<Object3D | null>(null);
  const batThrough = useRef(false);
  const batOpened = useRef(true);
  const throughAt = useRef(0);
  const throwAt = useRef<number | null>(null);
  const throwScanGltf = useRef<GLTF | null>(null);
  const prepareAt = useRef(0);
  const lastPlayError = useRef<string | null>(null);
  const holdTimer = useRef<number | null>(null);
  const idleName = asset.role === "batter" ? "idle_bat" : asset.role === "pitcher" ? "idle_set" : "idle_crouch";

  const clearHold = useCallback(() => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const holdPose = useCallback(
    (ms: number) => {
      clearHold();
      const action = current.current;
      if (!action || ms <= 0) return;
      action.paused = true;
      mixer.update(0);
      // ?debug=1 keeps the pose frozen so a still can prove contact / release.
      if (debugFpsEnabled()) return;
      holdTimer.current = window.setTimeout(() => {
        holdTimer.current = null;
        if (current.current === action) action.paused = false;
      }, ms);
    },
    [clearHold, mixer],
  );

  const stampThrowPose = useCallback(() => {
    const action = actionFor("pitch_delivery");
    const release = asset.clips.pitch_delivery?.markers?.release ?? 0.9;
    const at = throwAt.current ?? releaseThrowTime(release);
    if (!action) return;
    clearHold();
    current.current?.stop();
    action.reset();
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.play();
    action.paused = true;
    action.time = Math.min(Math.max(0, at), action.getClip().duration);
    mixer.update(0);
    gltf.scene.updateMatrixWorld(true);
    current.current = action;
    rememberThrowingHand(swingRig.current.handR);
  }, [actionFor, asset.clips.pitch_delivery, clearHold, mixer, gltf]);

  // ?debug=1 evidence: what the mixer actually bound, sampled after the
  // StrictMode remount settles. Read via window.__dsDump[role].
  useEffect(() => {
    if (!debugFpsEnabled()) return;
    const timer = window.setTimeout(() => {
      const bones: string[] = [];
      let skeletonBones: string[] = [];
      gltf.scene.traverse((o) => {
        const anyO = o as Object3D & { isBone?: boolean; isSkinnedMesh?: boolean; skeleton?: { bones: Object3D[] } };
        if (anyO.isBone) bones.push(o.name);
        if (anyO.isSkinnedMesh && anyO.skeleton && skeletonBones.length === 0) {
          skeletonBones = anyO.skeleton.bones.map((b) => b.name);
        }
      });
      const idle = actionFor(idleName);
      const clip = idle?.getClip();
      const anyIdle = idle as unknown as
        | { _propertyBindings?: { binding: { path: string; node?: Object3D | null }; _cacheIndex: number | null }[] }
        | undefined;
      const anyMixer = mixer as unknown as { _nActiveActions: number; _nActiveBindings: number; _bindings: unknown[]; _actions: unknown[] };
      const probe = gltf.scene.getObjectByName("upper_armL") ?? gltf.scene.getObjectByName("upper_arm.L");
      const curtainBoxes: { name: string; min: number[]; max: number[] }[] = [];
      if (asset.role === "pitcher") {
        const box = new Box3();
        gltf.scene.traverse((o) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh || !/kit_curtain/i.test(mesh.name)) return;
          box.setFromObject(mesh);
          curtainBoxes.push({
            name: mesh.name,
            min: box.min.toArray().map((v) => Number(v.toFixed(3))),
            max: box.max.toArray().map((v) => Number(v.toFixed(3))),
          });
        });
      }
      const dump = {
        role: asset.role,
        curtainBoxes: asset.role === "pitcher" ? curtainBoxes : undefined,
        idle: idleName,
        tracks: clip?.tracks.map((t) => t.name) ?? [],
        bones,
        skeletonBones,
        bindings:
          anyIdle?._propertyBindings?.map((pm) => ({ path: pm.binding.path, node: pm.binding.node?.name ?? null, cacheIndex: pm._cacheIndex })) ?? null,
        running: idle?.isRunning() ?? null,
        weight: idle?.getEffectiveWeight() ?? null,
        time: idle?.time ?? null,
        mixer: { activeActions: anyMixer._nActiveActions, activeBindings: anyMixer._nActiveBindings, bindings: anyMixer._bindings.length, actions: anyMixer._actions.length },
        probe: probe ? { name: probe.name, quat: probe.quaternion.toArray().map((v) => Number(v.toFixed(3))) } : null,
        lastPlayError: lastPlayError.current,
        kit:
          asset.role === "pitcher"
            ? (() => {
                const rows: {
                  name: string;
                  mapped: boolean;
                  emit: number;
                  emitHex: string | null;
                  emitMap: boolean;
                  toneMapped?: boolean;
                  curtainVerts?: number;
                }[] = [];
                gltf.scene.traverse((o) => {
                  const mesh = o as Mesh;
                  if (!mesh.isMesh) return;
                  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                  for (const mat of mats) {
                    const named = mat as MeshBasicMaterial & {
                      name?: string;
                      map?: unknown;
                      emissiveIntensity?: number;
                      toneMapped?: boolean;
                      emissive?: { getHexString?: () => string };
                    };
                    const name = named.name ?? "";
                    if (!/kit_|hair_|skin_hero/i.test(name)) continue;
                    if (rows.some((r) => r.name === name)) continue;
                    const em = named.emissive;
                    rows.push({
                      name,
                      mapped: Boolean(named.map),
                      emit: Number((named.emissiveIntensity ?? 0).toFixed(2)),
                      emitHex: em?.getHexString ? `#${em.getHexString()}` : null,
                      emitMap: Boolean((named as { userData?: { curtainVerts?: number } }).userData?.curtainVerts),
                      toneMapped: named.toneMapped !== false,
                      curtainVerts: (named as { userData?: { curtainVerts?: number } }).userData?.curtainVerts,
                    });
                  }
                });
                return rows;
              })()
            : undefined,
        backOne:
          asset.role === "batter"
            ? (() => {
                const one = gltf.scene.getObjectByName("aoi_back_one");
                if (!one) return null;
                one.updateWorldMatrix(true, false);
                const p = one.getWorldPosition(new Vector3());
                return {
                  pos: [Number(p.x.toFixed(3)), Number(p.y.toFixed(3)), Number(p.z.toFixed(3))],
                  visible: one.visible,
                };
              })()
            : undefined,
      };
      const w = window as unknown as { __dsDump?: Record<string, unknown> };
      w.__dsDump = { ...(w.__dsDump ?? {}), [asset.role]: dump };
      console.info(
        "[exhibition-dump]",
        asset.role,
        JSON.stringify({ ...dump, tracks: dump.tracks.length, bones: dump.bones.length, skeletonBones: dump.skeletonBones.length, unbound: dump.bindings?.filter((b) => !b.node).length }),
      );
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [gltf, actions, mixer, idleName, asset.role, actionFor]);

  const play = useCallback(
    (name: string, opts?: { once?: boolean; startAt?: number; delayS?: number; fade?: number; holdMs?: number }) => {
      const action = actionFor(name);
      if (!action) return null;
      const fade = opts?.fade ?? 0.12;
      const prev = current.current;
      clearHold();
      action.paused = false;
      action.reset();
      action.setLoop(opts?.once ? LoopOnce : LoopRepeat, opts?.once ? 1 : Infinity);
      action.clampWhenFinished = Boolean(opts?.once);
      if (opts?.startAt != null && Number.isFinite(opts.startAt)) action.time = opts.startAt;
      if (opts?.delayS && opts.delayS > 0) action.startAt(mixer.time + opts.delayS);
      try {
        action.play();
      } catch (err) {
        lastPlayError.current = `${name}: ${String(err)}`;
        console.warn("[exhibition-play]", name, err);
        return null;
      }
      // Stamp the pose now. Hidden-tab pause skips mixer.update(delta), which
      // used to leave bind/T-pose even when the action was playing.
      // Held takes snap: a 50 ms fade then pause freezes idle on the mesh
      // for the whole contact window.
      if (prev && prev !== action) {
        if (heldClipSnaps({ fade, holdMs: opts?.holdMs })) {
          prev.stop();
          action.enabled = true;
          action.setEffectiveWeight(1);
        } else {
          prev.crossFadeTo(action, fade, false);
        }
      } else {
        action.setEffectiveWeight(1);
      }
      mixer.update(0);
      current.current = action;
      if (asset.role === "batter" && name === idleName) {
        action.time = 0;
        action.paused = true;
        mixer.update(0);
      }
      if (opts?.holdMs) holdPose(opts.holdMs);
      return action;
    },
    [actionFor, mixer, clearHold, holdPose, asset.role, idleName],
  );

  const backToIdle = useCallback(() => play(idleName, { fade: 0.25 }), [play, idleName]);

  // Return to idle whenever a one-shot finishes and nothing else took over.
  useEffect(() => {
    const onFinish = (e: { action: AnimationAction }) => {
      if (e.action !== current.current) return;
      if (debugFpsEnabled() && e.action.paused) return;
      backToIdle();
    };
    mixer.addEventListener("finished", onFinish);
    return () => mixer.removeEventListener("finished", onFinish);
  }, [mixer, backToIdle]);

  // Start idle whenever the asset (re)mounts.
  useEffect(() => {
    backToIdle();
  }, [gltf, backToIdle]);

  useEffect(() => {
    plantedSwing.current = null;
    plantedSetArmL.current = null;
    plantDone.current = false;
    if (plantGroup.current) plantGroup.current.position.y = 0;
    swingRig.current = {
      spine: findSocketBone(gltf.scene, "spine"),
      thighL: findSocketBone(gltf.scene, "thigh.L"),
      armR: findSocketBone(gltf.scene, "upper_arm.R"),
      armL: findSocketBone(gltf.scene, "upper_arm.L"),
      handR: findSocketBone(gltf.scene, "hand.R"),
      handL: findSocketBone(gltf.scene, "hand.L"),
      footL: findSocketBone(gltf.scene, "foot.L"),
      footR: findSocketBone(gltf.scene, "foot.R"),
    };
  }, [gltf, asset.role]);

  useLayoutEffect(() => {
    if (asset.role !== "pitcher") return;
    if (throwScanGltf.current === gltf && throwAt.current != null) return;
    const stage = controller.getSnapshot().stage;
    if (stage === "prepare" || stage === "flight") return;
    const action = actionFor("pitch_delivery");
    const hand = swingRig.current.handR ?? findSocketBone(gltf.scene, "hand.R");
    if (!action || !hand) return;
    const idle = actionFor(idleName);
    idle?.stop();
    const marker = asset.clips.pitch_delivery?.markers?.release ?? 0.9167;
    const dur = action.getClip().duration;
    const samples: { t: number; handR: [number, number, number] }[] = [];
    action.reset();
    action.enabled = true;
    action.setEffectiveWeight(1);
    action.setLoop(LoopOnce, 1);
    action.play();
    action.paused = true;
    for (let i = 0; i <= 24; i++) {
      const t = (dur * i) / 24;
      action.time = t;
      mixer.update(0);
      gltf.scene.updateMatrixWorld(true);
      hand.updateWorldMatrix(true, false);
      const p = hand.getWorldPosition(_handR);
      samples.push({ t, handR: [p.x, p.y, p.z] });
    }
    throwAt.current = pickThrowPoseTime(samples, marker);
    throwScanGltf.current = gltf;
    action.stop();
    // Snap, do not fade: a 250 ms crossfade after stop() is bind/T-pose
    // on the first look after Step in (§1.5).
    play(idleName, { fade: 0 });
  }, [asset.role, asset.clips.pitch_delivery, actionFor, mixer, gltf, controller, idleName, play]);

  useEffect(() => {
    if (asset.role !== "pitcher" || !debugFpsEnabled()) return;
    const w = window as unknown as {
      __dsScrubPitcher?: (t: number) => unknown;
      __dsMittRot?: (rx: number, ry: number, rz: number) => unknown;
      __dsProbeGlove?: (x: number, y: number, z: number) => unknown;
      __dsSetGloveRot?: [number, number, number];
    };
    w.__dsProbeGlove = (x: number, y: number, z: number) => {
      w.__dsSetGloveRot = [x, y, z];
      const arm = swingRig.current.armL;
      const hand = swingRig.current.handL;
      const head = findSocketBone(gltf.scene, "head");
      if (!arm || !hand || !head) return { ok: false };
      if (!plantedSetArmL.current) plantedSetArmL.current = arm.quaternion.clone();
      arm.quaternion.copy(plantedSetArmL.current);
      applySetGloveLift(arm, [x, y, z]);
      arm.updateWorldMatrix(true, true);
      hand.updateWorldMatrix(true, false);
      head.updateWorldMatrix(true, false);
      const hl = hand.getWorldPosition(_handL).toArray() as [number, number, number];
      const hd = head.getWorldPosition(_head).toArray() as [number, number, number];
      const gap = Math.hypot(hl[0] - hd[0], hl[1] - hd[1], hl[2] - hd[2]);
      return {
        ok: true,
        rotDeg: [x, y, z],
        handL: hl.map((n) => Number(n.toFixed(3))),
        head: hd.map((n) => Number(n.toFixed(3))),
        mittHeadGap: Number(gap.toFixed(3)),
        nearFace: setMittNearFace(hl, hd),
      };
    };
    w.__dsMittRot = (rx: number, ry: number, rz: number) => {
      const obj = swingRig.current.handL?.children.find((c) => /mitt|glove|prop/i.test(c.name));
      if (!obj) return { ok: false };
      obj.rotation.set(MathUtils.degToRad(rx), MathUtils.degToRad(ry), MathUtils.degToRad(rz));
      obj.updateWorldMatrix(true, true);
      _batBox.setFromObject(obj);
      const span: [number, number, number] = [
        Number((_batBox.max.x - _batBox.min.x).toFixed(3)),
        Number((_batBox.max.y - _batBox.min.y).toFixed(3)),
        Number((_batBox.max.z - _batBox.min.z).toFixed(3)),
      ];
      return {
        ok: true,
        rotDeg: [rx, ry, rz],
        span,
        faces: mittFacesCatcher(span),
        faceOn: Number(mittFaceOnScore(span).toFixed(2)),
      };
    };
    w.__dsScrubPitcher = (t: number, clip = "pitch_delivery") => {
      const action = actionFor(clip);
      if (!action) return { ok: false, clip };
      clearHold();
      action.reset();
      action.paused = true;
      action.enabled = true;
      action.setEffectiveWeight(1);
      action.setLoop(LoopOnce, 1);
      action.play();
      action.time = Math.max(0, Math.min(Number(t) || 0, action.getClip().duration));
      mixer.update(0);
      gltf.scene.updateMatrixWorld(true);
      current.current = action;
      const hr = swingRig.current.handR;
      const hl = swingRig.current.handL;
      const head = findSocketBone(gltf.scene, "head");
      const footL = swingRig.current.footL;
      hr?.updateWorldMatrix(true, false);
      hl?.updateWorldMatrix(true, false);
      head?.updateWorldMatrix(true, false);
      footL?.updateWorldMatrix(true, false);
      return {
        ok: true,
        clip,
        time: Number(action.time.toFixed(4)),
        duration: Number(action.getClip().duration.toFixed(4)),
        handR: hr ? hr.getWorldPosition(_handR).toArray().map((n) => Number(n.toFixed(3))) : null,
        handL: hl ? hl.getWorldPosition(_handL).toArray().map((n) => Number(n.toFixed(3))) : null,
        head: head ? head.getWorldPosition(new Vector3()).toArray().map((n) => Number(n.toFixed(3))) : null,
        footL: footL ? footL.getWorldPosition(new Vector3()).toArray().map((n) => Number(n.toFixed(3))) : null,
      };
    };
    return () => {
      delete w.__dsScrubPitcher;
      delete w.__dsMittRot;
      delete w.__dsProbeGlove;
    };
  }, [asset.role, actionFor, mixer, gltf, clearHold]);

  useEffect(() => {
    return () => {
      clearHold();
      releaseActorMixer(mixer);
    };
  }, [mixer, clearHold]);

  // Attach the prop to its socket bone with the per-rig offset. The cleanup
  // matters: StrictMode re-runs effects, and the loader caches gltf.scene, so
  // without it a remount would leave a second bat in the hand.
  useEffect(() => {
    if (!propMesh || !propSocket) return;
    const bone = findSocketBone(gltf.scene, propSocket);
    if (!bone) return;
    const instance = propMesh.clone();
    // The VRoid/Mixamo rig carries 0.01 scale on every bone; without the
    // inverse the bat attaches 8mm long. Offsets are authored in world meters.
    bone.updateWorldMatrix(true, false);
    const ws = new Vector3();
    bone.getWorldScale(ws);
    const inv = new Vector3(1 / Math.max(ws.x, 1e-6), 1 / Math.max(ws.y, 1e-6), 1 / Math.max(ws.z, 1e-6));
    const off = propOffset ?? { pos: [0, 0, 0], rotDeg: [0, 0, 0] };
    instance.scale.multiply(inv);
    if (off.scale && off.scale > 0) instance.scale.multiplyScalar(off.scale);
    instance.position.set(off.pos[0] * inv.x, off.pos[1] * inv.y, off.pos[2] * inv.z);
    instance.rotation.set(
      MathUtils.degToRad(off.rotDeg[0]),
      MathUtils.degToRad(off.rotDeg[1]),
      MathUtils.degToRad(off.rotDeg[2]),
    );
    bone.add(instance);
    if (asset.role === "batter") {
      batProp.current = instance;
      instance.userData.socketLocal = { p: instance.position.clone(), q: instance.quaternion.clone(), s: instance.scale.clone() };
    }
    return () => {
      if (batProp.current === instance) batProp.current = null;
      bone.remove(instance);
    };
  }, [gltf, propMesh, propSocket, propOffset]);

  // Aoi #1: atlas has no kit_number_back. Chest wrap, not a card.
  useEffect(() => {
    if (asset.role !== "batter") return;
    const chest = findSocketBone(gltf.scene, "chest");
    if (!chest) return;
    const stale = chest.getObjectByName("aoi_back_one");
    if (stale) chest.remove(stale);
    const instance = makeAoiBackOne();
    chest.updateWorldMatrix(true, false);
    const ws = new Vector3();
    chest.getWorldScale(ws);
    const inv = new Vector3(1 / Math.max(ws.x, 1e-6), 1 / Math.max(ws.y, 1e-6), 1 / Math.max(ws.z, 1e-6));
    instance.scale.multiply(inv);
    instance.position.set(AOI_BACK_ONE.pos[0] * inv.x, AOI_BACK_ONE.pos[1] * inv.y, AOI_BACK_ONE.pos[2] * inv.z);
    instance.rotation.set(
      MathUtils.degToRad(AOI_BACK_ONE.rotDeg[0]),
      MathUtils.degToRad(AOI_BACK_ONE.rotDeg[1]),
      MathUtils.degToRad(AOI_BACK_ONE.rotDeg[2]),
    );
    chest.add(instance);
    return () => {
      chest.remove(instance);
      instance.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) for (const m of mat) m.dispose();
        else mat.dispose();
      });
    };
  }, [gltf, asset.role]);

  // Cue-driven acting.
  useEffect(() => {
    return controller.onCue((cue: PlateCue) => {
      if (asset.role === "pitcher") {
        if (cue.t === "prepare") {
          clearThrowHand();
          prepareAt.current = performance.now();
          // Wind-up: play delivery so the scanned throw pose lands at the
          // leave window (prepareMs − THROW_SHOW_MS). Authored release /
          // full prepareMs put post-reclip throwAt (~0.885) after p1200.
          const delivery = play("pitch_delivery", { once: true, fade: 0.1 });
          if (delivery) {
            const release = asset.clips.pitch_delivery?.markers?.release ?? 0.9167;
            const poseAt = throwAt.current ?? release;
            delivery.timeScale = deliveryTimeScale(poseAt, deliveryLeaveStartMs(cue.prepareMs));
          } else {
            backToIdle();
          }
        }
        if (cue.t === "flight") {
          stampThrowPose();
          gltf.scene.updateMatrixWorld(true);
          rememberThrowingHand(swingRig.current.handR);
        }
        if (cue.t === "reaction" || cue.t === "idle") {
          if (debugFpsEnabled() && current.current?.paused) return;
          backToIdle();
        }
        return;
      }
      if (asset.role === "batter") {
        if (cue.t === "prepare") {
          const idle = actionFor(idleName) ?? actions[idleName];
          if (idle && current.current !== idle) {
            current.current?.stop();
            idle.reset();
            idle.paused = false;
            idle.enabled = true;
            idle.setEffectiveWeight(1);
            idle.play();
            current.current = idle;
          }
        }
        // Authored swing_contact T-poses the front arm and yanks her off
        // side-on. Idle stays on the mixer; runtime swingPhase owns the cut.
        // Do not play `take` — that clip floats the front foot.
        if (cue.t === "resolved") {
          batThrough.current = cue.swung;
          batOpened.current = swingOpensThrough(cue.beat, cue.swung);
          throughAt.current = performance.now();
        }
        if (cue.t === "idle") {
          // ?debug=1 freezes the 150 ms tell (take coil, or swung bat arc).
          if (debugFpsEnabled() && (current.current?.paused || batThrough.current || throughAt.current > 0)) return;
          batThrough.current = false;
          batOpened.current = true;
          throughAt.current = 0;
          restoreBatSocket(batProp.current);
          backToIdle();
        }
        return;
      }
      // Catcher receives anything the bat does not touch.
      if (cue.t === "resolved" && catcherReceives(cue.beat)) {
        play("catch_receive", { once: true });
      }
    });
  }, [controller, asset, play, backToIdle, reduced, holdPose, mixer, actionFor, idleName, actions, stampThrowPose]);

  // Time advances only while live. update(0) while paused keeps the current
  // clip pose on the mesh instead of dropping back to bind.
  useFrame((_, delta) => {
    if (asset.role === "pitcher") {
      const stage = controller.getSnapshot().stage;
      const delivery = actionFor("pitch_delivery");
      if (
        delivery &&
        pitcherFreezesThrow({ stage, clipTime: delivery.time, throwAt: throwAt.current })
      ) {
        current.current = delivery;
        delivery.enabled = true;
        delivery.setEffectiveWeight(1);
        delivery.paused = true;
        delivery.timeScale = 0;
        if (throwAt.current != null) delivery.time = throwAt.current;
        mixer.update(0);
        gltf.scene.updateMatrixWorld(true);
        rememberThrowingHand(swingRig.current.handR);
      }
    }
    mixer.update(paused || debugHoldClock() ? 0 : delta);
    if (!plantDone.current && plantGroup.current) {
      const fl = swingRig.current.footL;
      const fr = swingRig.current.footR;
      if (fl && fr) {
        gltf.scene.updateMatrixWorld(true);
        fl.updateWorldMatrix(true, false);
        fr.updateWorldMatrix(true, false);
        const dy = plantSinkY([fl.getWorldPosition(_footL).y, fr.getWorldPosition(_footR).y]);
        if (dy !== 0) plantGroup.current.position.y += dy;
        plantDone.current = true;
      }
    }
    if (asset.role === "batter") {
      const stage = controller.getSnapshot().stage;
      const u = controller.progress(performance.now());
      const through = batThrough.current || debugForceBatThrough();
      const opened = debugForceBatThrough() ? true : batOpened.current;
      const throughAgeMs = throughAt.current > 0 ? performance.now() - throughAt.current : undefined;
      const phase = swingPhase({ stage, through, u, throughAgeMs, opened });
      const w = swingBatWeight({ stage, through, u, throughAgeMs, opened });
      const { spine, thighL, armR, armL } = swingRig.current;
      // mixer.update(0) (pause / ?debug=1 hold) does not rewrite bones.
      // rotateOnWorldAxis then stacks — through stills kicked foot.L to y=1.8.
      if (spine && thighL && armR && armL && !plantedSwing.current) {
        plantedSwing.current = {
          spine: spine.quaternion.clone(),
          thigh: thighL.quaternion.clone(),
          armR: armR.quaternion.clone(),
          armL: armL.quaternion.clone(),
        };
      }
      if (plantedSwing.current && spine) {
        spine.quaternion.copy(plantedSwing.current.spine);
        applySwingTorsoPose(spine, phase);
      }
      if (plantedSwing.current && thighL) {
        thighL.quaternion.copy(plantedSwing.current.thigh);
        applySwingStridePose(thighL, phase);
      }
      if (plantedSwing.current && armR) {
        armR.quaternion.copy(plantedSwing.current.armR);
        applySwingArmPose(armR, "R", w);
      }
      if (plantedSwing.current && armL) {
        armL.quaternion.copy(plantedSwing.current.armL);
        applySwingArmPose(armL, "L", w);
      }
      if (batProp.current) applySwingBatPose(batProp.current, w, phase);
      if (swingBody.current) {
        swingBody.current.rotation.y = 0;
        swingBody.current.position.z = 0;
      }
    }
    if (asset.role === "pitcher") {
      const stage = controller.getSnapshot().stage;
      const lift = debugSetGloveLift() ?? pitcherSetGloveLift({ stage, ballOut: throwHandReady });
      const armL = swingRig.current.armL;
      if (armL && lift.some((n) => n !== 0)) {
        if (!plantedSetArmL.current) plantedSetArmL.current = armL.quaternion.clone();
        armL.quaternion.copy(plantedSetArmL.current);
        applySetGloveLift(armL, lift);
        armL.updateWorldMatrix(true, true);
      }
    }
    if (debugFpsEnabled()) {
      const w = window as unknown as { __dsPose?: Record<string, unknown> };
      const clip = current.current?.getClip();
      const stage = controller.getSnapshot().stage;
      const u = controller.progress(performance.now());
      const through = batThrough.current || debugForceBatThrough();
      const opened = debugForceBatThrough() ? true : batOpened.current;
      const throughAgeMs = throughAt.current > 0 ? performance.now() - throughAt.current : undefined;
      const phase = swingPhase({ stage, through, u, throughAgeMs, opened });
      const batW = swingBatWeight({ stage, through, u, throughAgeMs, opened });
      const tip = batProp.current ? batBarrelTip(batProp.current, _batTip) : null;
      w.__dsPose = {
        ...(w.__dsPose ?? {}),
        [asset.role]: {
          clip: clip?.name ?? null,
          time: current.current ? Number(current.current.time.toFixed(3)) : null,
          paused: current.current?.paused ?? null,
          holding: holdTimer.current != null || Boolean(debugFpsEnabled() && current.current?.paused),
          bat: asset.role === "batter" && batProp.current
            ? {
                through,
                phase: Number(phase.toFixed(3)),
                age: throughAgeMs != null ? Number(throughAgeMs.toFixed(0)) : null,
                w: Number(batW.toFixed(3)),
                yaw: Number(swingBatYawDeg(swingZoneWeight(batW)).toFixed(1)),
                sweep: Number((swingBatSweepDeg(swingZoneWeight(batW)) + swingLoadBatSweepDeg(phase)).toFixed(1)),
                roll: Number(swingBatRollDeg(batW).toFixed(1)),
                armR: swingArmRDeg(batW),
                body: Number(swingBodyYawDeg(phase).toFixed(1)),
                stride: Number(swingStrideM(phase).toFixed(3)),
                thigh: Number(swingStrideThighDeg(phase).toFixed(1)),
                planted: Boolean(plantedSwing.current),
                torso: swingRig.current.spine?.name ?? null,
                feet: [
                  swingRig.current.footL
                    ? [
                        Number(swingRig.current.footL.getWorldPosition(_footL).x.toFixed(3)),
                        Number(_footL.y.toFixed(3)),
                        Number(_footL.z.toFixed(3)),
                      ]
                    : null,
                  swingRig.current.footR
                    ? [
                        Number(swingRig.current.footR.getWorldPosition(_footR).x.toFixed(3)),
                        Number(_footR.y.toFixed(3)),
                        Number(_footR.z.toFixed(3)),
                      ]
                    : null,
                ],
                rot: swingBatRotDeg(batW).map((n) => Number(n.toFixed(1))),
                handR: swingRig.current.handR
                  ? [
                      Number(swingRig.current.handR.getWorldPosition(_handR).x.toFixed(3)),
                      Number(_handR.y.toFixed(3)),
                      Number(_handR.z.toFixed(3)),
                    ]
                  : null,
                tip: tip ? [Number(tip.x.toFixed(2)), Number(tip.y.toFixed(2)), Number(tip.z.toFixed(2))] : null,
              }
            : undefined,
          handR: swingRig.current.handR
            ? [
                Number(swingRig.current.handR.getWorldPosition(_handR).x.toFixed(3)),
                Number(_handR.y.toFixed(3)),
                Number(_handR.z.toFixed(3)),
              ]
            : null,
          handL: swingRig.current.handL
            ? [
                Number(swingRig.current.handL.getWorldPosition(_handL).x.toFixed(3)),
                Number(_handL.y.toFixed(3)),
                Number(_handL.z.toFixed(3)),
              ]
            : null,
          mitt: asset.role === "pitcher"
            ? (() => {
                const obj = swingRig.current.handL?.children.find((c) => /mitt|glove|prop/i.test(c.name));
                if (obj) _batBox.setFromObject(obj);
                const span = obj
                  ? [
                      Number((_batBox.max.x - _batBox.min.x).toFixed(2)),
                      Number((_batBox.max.y - _batBox.min.y).toFixed(2)),
                      Number((_batBox.max.z - _batBox.min.z).toFixed(2)),
                    ]
                  : null;
                const rot = SOCKET_OFFSETS.pitcher_glove.rotDeg;
                const head = findSocketBone(gltf.scene, "head");
                head?.updateWorldMatrix(true, false);
                const hd = head ? head.getWorldPosition(_head).toArray() as [number, number, number] : null;
                const hl = swingRig.current.handL
                  ? (swingRig.current.handL.getWorldPosition(_handL).toArray() as [number, number, number])
                  : null;
                const lift = debugSetGloveLift() ?? pitcherSetGloveLift({
                  stage: controller.getSnapshot().stage,
                  ballOut: throwHandReady,
                });
                return {
                  on: Boolean(obj),
                  names: swingRig.current.handL?.children.map((c) => c.name).slice(0, 8) ?? [],
                  scale: SOCKET_OFFSETS.pitcher_glove.scale ?? 1,
                  rotDeg: rot,
                  span,
                  faces: span ? mittFacesCatcher(span as [number, number, number]) : false,
                  faceOn: span ? Number(mittFaceOnScore(span as [number, number, number]).toFixed(2)) : null,
                  lift,
                  head: hd ? hd.map((n) => Number(n.toFixed(3))) : null,
                  nearFace: hl && hd ? setMittNearFace(hl, hd) : false,
                  mittHeadGap: hl && hd
                    ? Number(Math.hypot(hl[0] - hd[0], hl[1] - hd[1], hl[2] - hd[2]).toFixed(3))
                    : null,
                };
              })()
            : undefined,
          throwAt: asset.role === "pitcher" ? throwAt.current : undefined,
        },
      };
    }
  });

  return (
    <group ref={group} position={position} rotation-y={rotationY} scale={fitScale * (bodyScale ?? 1)}>
      <group ref={plantGroup}>
        <group ref={swingBody}>
          <primitive object={gltf.scene} />
          {/* Contact shadow: cheap and stable on every tier. */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]}>
            <circleGeometry args={[0.55, 24]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.35} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ── ball ─────────────────────────────────────────────────────────────────────

function Ball({ controller, paused }: { controller: PlateController; paused: boolean }) {
  const { camera, size } = useThree();
  const batterXRef = useRef(batterStandX(aimGridPhoneStrip(size.width, size.height)));
  batterXRef.current = batterStandX(aimGridPhoneStrip(size.width, size.height));
  const ref = useRef<Mesh>(null);
  const flashRef = useRef<Mesh>(null);
  const discRef = useRef<Mesh>(null);
  const sightRef = useRef<Mesh>(null);
  const outgoing = useRef<{
    from: Vector3;
    to: Vector3;
    arc: number;
    durS: number;
    elapsed: number;
    hold?: boolean;
    color: string;
    emissive: string;
    leavesBat?: boolean;
  } | null>(null);
  const flash = useRef<{ at: Vector3; elapsed: number; color: string; maxScale: number } | null>(null);
  const lastCross = useRef<Vector3>(plateCross({ x: 1.5, y: 1.5 }));
  // Where the flight ball was on the last rendered frame, so an early resolve
  // (swing before the plate) can carry it on to the mitt from there.
  const flight = useRef<{ durS: number; u: number; pos: Vector3; origin: Vector3 | null }>({
    durS: 0,
    u: 0,
    pos: RELEASE_POINT.clone(),
    origin: null,
  });

  useEffect(() => {
    return controller.onCue((cue: PlateCue) => {
      // A new pitch or a waved-off dead ball resets any leftover flight state.
      // hy136: do not clear on idle — foul/tip sight was still mid-path when
      // reaction ended (tip-in r280 teal=0 while dump said visible). prepare
      // / dead still hard-reset. Mitt hold hides via mittHoldShows(idle).
      if (cue.t === "prepare" || cue.t === "dead") {
        outgoing.current = null;
        flash.current = null;
        flight.current.origin = null;
        if (cue.t === "prepare") clearThrowHand();
        return;
      }
      if (cue.t === "idle") {
        flash.current = null;
        flight.current.origin = null;
        return;
      }
      if (cue.t === "flight") {
        // Origin locks on the first flight frame so the pitcher can snap
        // `hand.R` in the same cue turn first. Hardcoded RELEASE_POINT is fallback.
        flight.current = { durS: cue.durationS, u: 0, pos: liveReleaseOrigin.clone(), origin: null };
        flash.current = {
          at: liveReleaseOrigin.clone(),
          elapsed: 0,
          color: BALL_VISUAL.flashRelease,
          maxScale: BALL_VISUAL.flashReleaseScale,
        };
        return;
      }
      if (cue.t !== "resolved") return;
      // Contact / whoosh at the crossing point. Take stays dark.
      const look = beatSightFlash({ beat: cue.beat, swung: cue.swung });
      const at = beatFlashAt({
        beat: cue.beat,
        swung: cue.swung,
        cross: lastCross.current.toArray() as [number, number, number],
        batterX: batterXRef.current,
      });
      flash.current = look ? { at: new Vector3(at[0], at[1], at[2]), elapsed: 0, color: look.color, maxScale: look.maxScale } : null;
      if (!ballLeavesBat(cue.beat)) {
        // Whiff / take / walk / K: the mitt is the 150 ms ball tell. A take
        // that already crossed used to hide; an early chop used to sit on
        // Reina at r80 (hy111). Hold after arrival. Do not flash.
        const home = mittAlreadyHome(flight.current.u);
        outgoing.current = {
          from: home ? MITT_POINT.clone() : flight.current.pos.clone(),
          to: MITT_POINT.clone(),
          arc: 0,
          durS: mittTellDurS(),
          elapsed: 0,
          hold: true,
          ...outgoingBallLook(cue.beat),
        };
        return;
      }
      // Off-bat beats get the presentation flight from planOutgoing.
      const plan = planOutgoing(cue.beat, cue.spec, controller.getSnapshot().game.events.length);
      outgoing.current = plan
        ? {
            from: lastCross.current.clone(),
            to: new Vector3(plan.to[0], plan.to[1], plan.to[2]),
            arc: plan.arc,
            durS: plan.durS,
            elapsed: 0,
            ...outgoingBallLook(cue.beat),
            leavesBat: true,
          }
        : null;
    });
  }, [controller]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const frozen = debugHoldClock();
    const step = frozen || paused ? 0 : delta;

    // hy126: family spark rides this frame's outgoing point, not last frame's plate.
    const ride = outgoing.current;
    if (ride && flash.current && flashFollowsOutgoing({ leavesBat: Boolean(ride.leavesBat) })) {
      const tRide = outgoingSightT(ride.elapsed + step, ride.durS);
      if (tRide >= 1 && ride.hold) {
        flash.current.at.copy(ride.to);
      } else {
        const rideAt = ride.from.clone().lerp(ride.to, tRide);
        rideAt.y += Math.sin(tRide * Math.PI) * ride.arc;
        flash.current.at.copy(rideAt);
      }
    }

    // Contact flash: an expanding, fading shell; freezes under pause / hold.
    const fl = flashRef.current;
    const disc = discRef.current;
    if (fl || disc) {
      const f = flash.current;
      if (f) {
        f.elapsed += step;
        // A still taken before the first aged frame still needs the pop.
        const aged = frozen && f.elapsed <= 0 ? (BALL_VISUAL.flashMs / 1000) * 0.35 : f.elapsed;
        const t = Math.min(1, (aged * 1000) / BALL_VISUAL.flashMs);
        const scale = 1 + t * (f.maxScale - 1);
        const opacity = (1 - t) * 0.85;
        if (fl) {
          fl.position.copy(f.at);
          fl.scale.setScalar(scale);
          const mat = fl.material as MeshBasicMaterial;
          mat.color.set(f.color);
          mat.toneMapped = false;
          mat.depthTest = false;
          mat.opacity = opacity;
          fl.visible = t < 1;
        }
        if (disc) {
          disc.position.copy(f.at);
          disc.quaternion.copy(camera.quaternion);
          disc.scale.setScalar(1 + t * (flashDiscMaxScale(f.maxScale) - 1));
          const mat = disc.material as MeshBasicMaterial;
          mat.color.set(f.color);
          mat.toneMapped = false;
          mat.depthTest = false;
          mat.opacity = (1 - t) * FLASH_SIGHT.discOpacity;
          disc.visible = t < 1;
        }
        if (!frozen && t >= 1) flash.current = null;
      } else {
        if (fl) fl.visible = false;
        if (disc) disc.visible = false;
      }
    }
    if (debugFpsEnabled()) {
      const f = flash.current;
      const d = discRef.current;
      (window as unknown as { __dsFlash?: unknown }).__dsFlash = f
        ? {
            color: f.color,
            visible: Boolean(d?.visible),
            ms: Number((f.elapsed * 1000).toFixed(0)),
            at: f.at.toArray().map((n) => Number(n.toFixed(2))),
            toneMapped: false,
            follow: flashFollowsOutgoing({ leavesBat: Boolean(outgoing.current?.leavesBat) }),
          }
        : { visible: false };
    }

    const s = controller.getSnapshot();
    const sight = sightRef.current;
    if (s.stage === "prepare") {
      // LOOK set: empty mitt, no ball. Last THROW_SHOW_MS is the throw-hand
      // hold (hy116): freeze at throwAt lights throwHandReady.
      if (!throwHandReady) {
        hideOutgoingSight(sight);
        mesh.visible = false;
        if (debugFpsEnabled()) {
          (window as unknown as { __dsBall?: unknown }).__dsBall = { hold: false, visible: false };
        }
        return;
      }
      // hy134: leave speck is an unlit sight ball — toon washed out at 18m.
      const showSight = incomingSightShows({ stage: "prepare" });
      const holdScale = ballScaleAtFlight(0);
      paintBallLook(mesh, outgoingBallLook(null));
      mesh.position.copy(liveReleaseOrigin);
      mesh.scale.setScalar(holdScale);
      paintOutgoingSight(sight, {
        pos: liveReleaseOrigin,
        scale: holdScale,
        color: BALL_VISUAL.color,
        show: showSight,
      });
      mesh.visible = !showSight;
      if (debugFpsEnabled()) {
        (window as unknown as { __dsBall?: unknown }).__dsBall = {
          hold: true,
          pos: liveReleaseOrigin.toArray().map((v) => Number(v.toFixed(2))),
          visible: true,
          scale: holdScale,
          type: s.pitch?.type ?? null,
          sight: showSight,
        };
      }
      return;
    }
    if (s.stage === "flight" && !flight.current.origin) {
      flight.current.origin = liveReleaseOrigin.clone();
      if (flash.current && flash.current.elapsed < 0.05) {
        flash.current.at.copy(flight.current.origin);
      }
    }
    if (frozen && s.stage === "flight") {
      hideOutgoingSight(sight);
      mesh.visible = true;
      return;
    }
    if (s.stage === "flight" && s.pitch) {
      const origin = flight.current.origin ?? liveReleaseOrigin;
      const u = Math.min(controller.progress(performance.now()), 1.06);
      const cross = plateCross(s.pitch.loc);
      lastCross.current = cross;
      const end = u <= 1 ? cross : cross.clone().lerp(MITT_POINT, (u - 1) / 0.06);
      const p = origin.clone().lerp(u <= 1 ? cross : end, Math.min(u, 1));
      if (u > 1) p.copy(end);
      // Slight presentation arc by pitch type; never decides anything.
      const drop = s.pitch.type === "curve" ? 0.35 : s.pitch.type === "changeup" ? 0.22 : s.pitch.type === "slider" ? 0.15 : 0.08;
      p.y += Math.sin(Math.min(u, 1) * Math.PI) * drop;
      // hy134: tunnel cream is an unlit sight ball — mid-park toon died on night dither.
      const showSight = incomingSightShows({ stage: "flight" });
      const flightScale = ballScaleAtFlight(Math.min(u, 1));
      paintBallLook(mesh, outgoingBallLook(null));
      mesh.position.copy(p);
      mesh.scale.setScalar(flightScale);
      paintOutgoingSight(sight, {
        pos: p,
        scale: flightScale,
        color: BALL_VISUAL.color,
        show: showSight,
      });
      mesh.visible = !showSight;
      flight.current.u = u;
      flight.current.pos.copy(p);
      if (debugFpsEnabled()) {
        (window as unknown as { __dsBall?: unknown }).__dsBall = {
          u: Number(u.toFixed(3)),
          pos: p.toArray().map((v) => Number(v.toFixed(2))),
          visible: true,
          scale: flightScale,
          type: s.pitch.type,
          sight: showSight,
        };
      }
      return;
    }
    const out = outgoing.current;
    // Off-bat flights and the mitt carry run to their own end; a short
    // reaction stage must not blink the ball out mid-air. `prepare` resets.
    // `prepare` is not in the Stage union any more; keep the guard as written.
    if (out && s.stage !== "flight" && (s.stage as string) !== "prepare") {
      out.elapsed += step;
      const t = outgoingSightT(out.elapsed, out.durS);
      if (t >= 1 && out.hold) {
        const keep = mittHoldShows(s.stage);
        hideOutgoingSight(sight);
        paintBallLook(mesh, { color: out.color, emissive: out.emissive }, {
          throughBatter: outgoingBallClearsBatter({ leavesBat: Boolean(out.leavesBat) }),
        });
        mesh.position.copy(out.to);
        mesh.scale.setScalar(ballScaleAtOutgoing(out.to.z));
        mesh.visible = keep;
        if (flash.current && flashFollowsOutgoing({ leavesBat: Boolean(out.leavesBat) })) {
          flash.current.at.copy(out.to);
        }
        if (debugFpsEnabled()) {
          (window as unknown as { __dsBall?: unknown }).__dsBall = {
            out: 1,
            pos: out.to.toArray().map((v) => Number(v.toFixed(2))),
            visible: keep,
            scale: mesh.scale.x,
            hold: true,
            color: out.color,
          };
        }
        return;
      }
      const p = out.from.clone().lerp(out.to, t);
      p.y += Math.sin(t * Math.PI) * out.arc;
      paintBallLook(mesh, { color: out.color, emissive: out.emissive }, {
        throughBatter: outgoingBallClearsBatter({ leavesBat: Boolean(out.leavesBat) }),
      });
      mesh.position.copy(p);
      mesh.scale.setScalar(ballScaleAtOutgoing(p.z));
      const travelM = out.from.distanceTo(out.to);
      const showSight =
        outgoingSightShows({ leavesBat: Boolean(out.leavesBat) }) ||
        mittCarrySightShows({ leavesBat: Boolean(out.leavesBat), t, travelM });
      paintOutgoingSight(sight, {
        pos: p,
        scale: ballScaleAtOutgoing(p.z),
        color: out.color,
        show: t < 1 && showSight,
      });
      mesh.visible = t < 1 && !showSight;
      if (flash.current && flashFollowsOutgoing({ leavesBat: Boolean(out.leavesBat) })) {
        flash.current.at.copy(p);
      }
      if (debugFpsEnabled()) {
        (window as unknown as { __dsBall?: unknown }).__dsBall = {
          out: Number(t.toFixed(3)),
          pos: p.toArray().map((v) => Number(v.toFixed(2))),
          visible: t < 1,
          scale: ballScaleAtOutgoing(p.z),
          color: out.color,
          through: outgoingBallClearsBatter({ leavesBat: Boolean(out.leavesBat) }),
          sight: showSight,
        };
      }
      return;
    }
    hideOutgoingSight(sight);
    mesh.visible = false;
  });

  return (
    <>
      {/* Oversized + self-lit so the ball reads on both quality tiers. */}
      <mesh ref={ref} visible={false} scale={BALL_VISUAL.scale}>
        <sphereGeometry args={[BALL_VISUAL.radius, 16, 12]} />
        <meshToonMaterial
          color={BALL_VISUAL.color}
          emissive={BALL_VISUAL.emissive}
          emissiveIntensity={BALL_VISUAL.emissiveIntensity}
        />
      </mesh>
      {/* hy127: unlit family tell. The toon ball dies on her cream. */}
      <mesh ref={sightRef} visible={false} renderOrder={20}>
        <sphereGeometry args={[BALL_VISUAL.radius, 16, 12]} />
        <meshBasicMaterial color={BALL_VISUAL.color} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={flashRef} visible={false}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshBasicMaterial color={BALL_VISUAL.flashColor} transparent opacity={0.85} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      {/* Camera-facing disc: the color tell at the locked fov-35 camera. */}
      <mesh ref={discRef} visible={false}>
        <circleGeometry args={[FLASH_SIGHT.discRadius, 24]} />
        <meshBasicMaterial
          color={BALL_VISUAL.flashColor}
          transparent
          opacity={FLASH_SIGHT.discOpacity}
          depthWrite={false}
          depthTest={false}
          side={DoubleSide}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </>
  );
}
