import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { HemisphereId } from '@/lib/constants';
import { ACTIVITIES, REGIONS, regionWeight, type Activity, type RegionId } from '@/lib/brainRegions';

export type BrainSceneProps = {
  activity: Activity | null;
  region: RegionId | null;
  reset: number;
  hoveredSide?: HemisphereId | null;
  enteringSide?: HemisphereId | null;
  onHoverSide?: (side: HemisphereId | null) => void;
  onSelect: (side: HemisphereId) => void;
  onRegion: (id: RegionId) => void;
  onReady: () => void;
  onError: () => void;
};

type InteractionState = {
  isDragging: boolean;
  lastDragTime: number;
};

let cortexPromise: Promise<THREE.BufferGeometry[]> | undefined;
function loadCortex() {
  return cortexPromise ??= fetch('/models/cortex.bin', { signal: AbortSignal.timeout(20000) }).then(r => { if (!r.ok) throw new Error('Cortex unavailable'); return r.arrayBuffer(); }).then(buffer => {
    const view = new DataView(buffer); let offset = 0;
    return [0, 1].map(() => {
      const vertices = view.getUint32(offset, true); const indices = view.getUint32(offset + 4, true); offset += 8;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer, offset, vertices * 3), 3)); offset += vertices * 12;
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer, offset, indices), 1)); offset += indices * 4;
      geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const network: number[] = []; const nodes: number[] = [];
      const positions = geometry.getAttribute('position'); const index = geometry.index!;
      for (let i = 0; i < index.count; i += 30) {
        for (const j of [0, 1, 1, 2]) { const p = index.getX(i + j); network.push(positions.getX(p), positions.getY(p), positions.getZ(p)); }
      }

      // --- Dense surface sampling -----------------------------------------
      // Scatter points across the AREA of each triangle instead of reusing
      // mesh vertices. Vertices cluster wherever the mesh is finely
      // tessellated — around the sulci here — so sampling them gives a cloud
      // that is lumpy in exactly the places the anatomy is most detailed.
      // Barycentric sampling weighted by triangle area gives even density,
      // which is what reads as a dust cloud rather than a wireframe.
      //
      // The RNG is seeded, not Math.random: an unseeded cloud resamples on
      // every reload and the model visibly twitches between visits.
      let seed = 0x9e3779b9;
      const rnd = () => {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        return ((seed >>> 0) % 100000) / 100000;
      };
      const triangles = index.count / 3;
      // ~115k points per hemisphere: dense enough to read as solid volume
      // from a distance, light enough that a laptop GPU holds 60fps.
      const perTriangle = Math.max(1, Math.round(115000 / triangles));
      const ax = new THREE.Vector3(), bx = new THREE.Vector3(), cx = new THREE.Vector3();
      const nrm = new THREE.Vector3(), tmp = new THREE.Vector3();
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
        ax.fromBufferAttribute(positions, a);
        bx.fromBufferAttribute(positions, b);
        cx.fromBufferAttribute(positions, c);
        // Face normal, for pushing samples off the surface.
        nrm.copy(cx).sub(bx).cross(tmp.copy(ax).sub(bx)).normalize();
        for (let k = 0; k < perTriangle; k++) {
          // sqrt on the first weight keeps the distribution uniform over the
          // triangle; without it points pile up toward vertex A.
          let u = rnd(), v = rnd();
          u = Math.sqrt(u);
          const w0 = 1 - u, w1 = u * (1 - v), w2 = u * v;
          // Scatter off the surface along the normal. Points sitting exactly
          // on the mesh render as a hollow shell — you can see it is a
          // surface, and the silhouette has a hard edge. A little depth
          // either side turns the shell into a volume, and because the
          // offsets are biased inward the outline stays soft while the
          // interior gains the density that additive blending needs to
          // produce bright cores.
          const g = (rnd() + rnd() + rnd() - 1.5) / 1.5;   // ~gaussian, -1..1
          const off = g * 0.016 - 0.004;
          nodes.push(
            ax.x * w0 + bx.x * w1 + cx.x * w2 + nrm.x * off,
            ax.y * w0 + bx.y * w1 + cx.y * w2 + nrm.y * off,
            ax.z * w0 + bx.z * w1 + cx.z * w2 + nrm.z * off,
          );
        }
      }
      geometry.userData.network = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(network, 3));
      geometry.userData.nodes = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(nodes, 3));
      return geometry;
    });
  });
}

/**
 * A soft radial sprite for the dust points.
 *
 * Without a map, THREE.PointsMaterial draws hard squares. At this density
 * that reads as television static. A radial alpha falloff turns each point
 * into a tiny glow, and because the cloud uses additive blending the
 * overlaps accumulate into the bright cores — which is how the reference
 * page gets highlights far brighter than any colour it actually ships.
 */
let dustSprite: THREE.Texture | undefined;
function getDustSprite() {
  if (dustSprite) return dustSprite;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.28, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  dustSprite = new THREE.CanvasTexture(canvas);
  dustSprite.colorSpace = THREE.SRGBColorSpace;
  return dustSprite;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function Controls({ region, reset, interaction, enteringSide }: Pick<BrainSceneProps, 'region' | 'reset' | 'enteringSide'> & {
  interaction: React.MutableRefObject<InteractionState>;
}) {
  const { camera, gl } = useThree();
  const controls = useMemo(() => new OrbitControls(camera, gl.domElement), [camera, gl]);
  const flight = useRef<{ from: THREE.Spherical; to: THREE.Spherical; elapsed: number } | null>(null);
  const drift = useRef({ phase: 0, speed: 0 });
  const reduced = useReducedMotion();
  useEffect(() => {
    controls.disconnect(); controls.connect();
    controls.enablePan = false; controls.enableDamping = false; controls.autoRotate = false;
    controls.rotateSpeed = .55; controls.minDistance = 4.5; controls.maxDistance = 9;
    controls.minPolarAngle = .15; controls.maxPolarAngle = Math.PI - .15;
    const start = () => { flight.current = null; drift.current.speed = 0; interaction.current.isDragging = true; };
    const end = () => { interaction.current.isDragging = false; interaction.current.lastDragTime = performance.now(); };
    controls.addEventListener('start', start); controls.addEventListener('end', end);
    return () => { controls.removeEventListener('start', start); controls.removeEventListener('end', end); controls.dispose(); };
  }, [controls, interaction]);
  useEffect(() => {
    const destination = new THREE.Vector3(...(region ? REGIONS[region].camera : [0, 0, 4.7] as [number, number, number]));
    if (enteringSide) destination.setLength(4.8);
    controls.target.set(0, 0, 0);
    const from = new THREE.Spherical().setFromVector3(camera.position);
    const to = new THREE.Spherical().setFromVector3(destination);
    to.theta = from.theta + Math.atan2(Math.sin(to.theta - from.theta), Math.cos(to.theta - from.theta));
    drift.current.speed = 0;
    if (reduced) { camera.position.copy(destination); flight.current = null; controls.update(); }
    else flight.current = { from, to, elapsed: 0 };
  }, [region, reset, enteringSide, camera, controls, reduced]);
  useFrame((_, delta) => {
    const dt = Math.min(delta, .04);
    const motion = flight.current;
    if (motion) {
      motion.elapsed += dt;
      const t = Math.min(motion.elapsed / 1.8, 1);
      // Zero velocity and acceleration at each end: no snap into or out of focus.
      const ease = t * t * t * (t * (t * 6 - 15) + 10);
      camera.position.setFromSpherical(new THREE.Spherical(
        THREE.MathUtils.lerp(motion.from.radius, motion.to.radius, ease),
        THREE.MathUtils.lerp(motion.from.phi, motion.to.phi, ease),
        THREE.MathUtils.lerp(motion.from.theta, motion.to.theta, ease)
      ));
      if (t === 1) { flight.current = null; drift.current.phase = 0; }
    } else if (!reduced && !interaction.current.isDragging) {
      const resting = performance.now() - interaction.current.lastDragTime > 4000;
      drift.current.speed = THREE.MathUtils.damp(drift.current.speed, resting ? 1 : 0, 2, dt);
      // A bounded, slow orbit keeps the highlighted anatomy facing the visitor.
      const oldPhase = drift.current.phase;
      drift.current.phase += dt * .18 * drift.current.speed;
      const orbit = new THREE.Spherical().setFromVector3(camera.position);
      orbit.theta += .12 * (Math.sin(drift.current.phase) - Math.sin(oldPhase));
      camera.position.setFromSpherical(orbit);
    }
    controls.update();
  });
  return null;
}

function Sparkles({ geometry, color }: { geometry: THREE.BufferGeometry; color: string }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const reduced = useReducedMotion();
  const uniforms = useMemo(() => ({ time: { value: 0 }, tint: { value: new THREE.Color(color) }, still: { value: 0 } }), [color]);
  useFrame((state) => { if (material.current) { material.current.uniforms.time.value = state.clock.elapsedTime; material.current.uniforms.still.value = reduced ? 1 : 0; } });
  return <points geometry={geometry} raycast={() => null}>
    <shaderMaterial ref={material} uniforms={uniforms} transparent depthWrite={false} blending={THREE.AdditiveBlending}
      vertexShader={`uniform float time; uniform float still; varying float glow;
        void main() {
          float phase = dot(position, vec3(17.13, 29.7, 11.9));
          float wave = .5 + .5 * sin(time * 1.35 + phase);
          glow = mix(.08 + .75 * pow(wave, 8.0), .25, still);
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp((1.5 + glow * 4.0) * 4.8 / -p.z, 1.0, 7.0);
          gl_Position = projectionMatrix * p;
        }`}
      fragmentShader={`uniform vec3 tint; varying float glow;
        void main() {
          float r = length(gl_PointCoord - .5) * 2.0;
          float halo = 1.0 - smoothstep(.05, 1.0, r);
          gl_FragColor = vec4(mix(tint, vec3(1.0), .35), halo * halo * glow);
        }`}/>
  </points>;
}

function Hemisphere({
  geometry,
  side,
  activeSide,
  onHoverMesh,
  ...props
}: BrainSceneProps & {
  geometry: THREE.BufferGeometry;
  side: number;
  activeSide: number | null;
  onHoverMesh: (side: number | null) => void;
}) {
  const { gl } = useThree();
  const color = (props.activity === 'photography' || props.enteringSide === 'R') ? '#ffbe76' : '#00f0ff';

  const lineMatRef = useRef<THREE.LineBasicMaterial>(null);
  const pointsMatRef = useRef<THREE.PointsMaterial>(null);
  const highlightMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const reducedMotion = useReducedMotion();
  const isCurrentHovered = !props.region && activeSide === side;

  const painted = useMemo(() => {
    const weight = (x: number, y: number, z: number) => {
      if (!props.enteringSide) return regionWeight(props.region, x, y, z);
      return Math.max(...ACTIVITIES[props.enteringSide === 'L' ? 'coding' : 'photography'].regions.map(id => regionWeight(id, x, y, z)));
    };
    const create = (source: THREE.BufferGeometry) => {
      const copy = source.clone();
      const p = copy.getAttribute('position');
      const colors = new Float32Array(p.count * 3);
      const active = new THREE.Color(color);
      // Rich, vibrant, electric bioluminescent base colors (never dull)
      // Pulled far down in saturation from the old #00d4ff / #ffaa00. Against
      // a #051126 field those read as neon; the reference page never puts a
      // pixel brighter than #7d9bd1 on screen. Additive blending stacks these
      // where points overlap, so the bright cores emerge from density rather
      // than from the colour being bright to begin with.
      const base = new THREE.Color(
        (props.region || props.enteringSide)
          ? props.activity === 'photography'
            ? '#2a2114'
            : '#13243f'
          : side === 0
            ? '#2f5f9e'
            : '#7a6038'
      );
      for (let i = 0; i < p.count; i++) {
        const strength = weight(p.getX(i), p.getY(i), p.getZ(i));
        const c = strength ? active : base;
        colors.set([c.r, c.g, c.b], i * 3);
      }
      copy.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return copy;
    };
    const highlight = geometry.clone();
    const pos = geometry.getAttribute('position');
    const index = geometry.index!;
    const indices: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      if (
        weight(
          (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
          (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3,
          (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3
        )
      )
        indices.push(a, b, c);
    }
    highlight.setIndex(indices);
    const sparks: number[] = [];
    for (let i = 0; i < pos.count; i += 37) {
      if (weight(pos.getX(i), pos.getY(i), pos.getZ(i))) sparks.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    const sparkles = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(sparks, 3));
    return { lines: create(geometry.userData.network), nodes: create(geometry.userData.nodes), highlight, sparkles };
  }, [geometry, props.region, props.enteringSide, color, side]);

  useEffect(() => {
    return () => {
      painted.lines.dispose();
      painted.nodes.dispose();
      painted.highlight.dispose();
      painted.sparkles.dispose();
    };
  }, [painted]);

  // Smooth dynamic illumination interpolation on every frame
  useFrame((state, dt) => {
    const step = 1 - Math.exp(-4 * Math.min(dt, 0.04));
    const lineMat = lineMatRef.current;
    const pointsMat = pointsMatRef.current;

    const breath = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.25) * .5 + .5;
    if (highlightMatRef.current) highlightMatRef.current.opacity = THREE.MathUtils.lerp(highlightMatRef.current.opacity, .045 + breath * .035, step);
    if (props.enteringSide) {
      const chosen = side === (props.enteringSide === 'L' ? 0 : 1);
      if (lineMat) {
        lineMat.opacity = THREE.MathUtils.lerp(lineMat.opacity, chosen ? .09 + breath * .03 : 0.022, step);
        lineMat.color.set('#ffffff');
      }
      if (pointsMat) {
        pointsMat.size = THREE.MathUtils.lerp(pointsMat.size, chosen ? .019 + breath * .003 : 0.011, step);
        pointsMat.opacity = THREE.MathUtils.lerp(pointsMat.opacity, chosen ? .9 + breath * .08 : 0.5, step);
        pointsMat.color.set('#ffffff');
      }
      return;
    }
    if (props.region) {
      if (lineMat) {
        lineMat.opacity = THREE.MathUtils.lerp(lineMat.opacity, 0.07 + breath * .02, step);
        lineMat.color.lerp(new THREE.Color('#ffffff'), step);
      }
      if (pointsMat) {
        pointsMat.size = THREE.MathUtils.lerp(pointsMat.size, 0.013, step);
        pointsMat.opacity = THREE.MathUtils.lerp(pointsMat.opacity, 0.85, step);
        pointsMat.color.lerp(new THREE.Color('#ffffff'), step);
      }
      return;
    }

    if (isCurrentHovered) {
      // SUPER BRIGHT ONLY HIGHLIGHT:
      // Intense glowing neon lines and enlarged firing synaptic nodes
      const pulse = (reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.25) * 0.0015);
      if (lineMat) {
        lineMat.opacity = THREE.MathUtils.lerp(lineMat.opacity, 0.1, step);
        const brightColor =
          side === 0
            ? new THREE.Color('#66ffff').multiplyScalar(1.6)
            : new THREE.Color('#ffe169').multiplyScalar(1.6);
        lineMat.color.lerp(brightColor, step);
      }
      if (pointsMat) {
        pointsMat.size = THREE.MathUtils.lerp(pointsMat.size, 0.022 + pulse, step);
        pointsMat.opacity = THREE.MathUtils.lerp(pointsMat.opacity, 1.0, step);
        const brightPointColor =
          side === 0 ? new THREE.Color('#d4ffff') : new THREE.Color('#fff7d6');
        pointsMat.color.lerp(brightPointColor, step);
      }
    } else {
      // Unhovered side:
      // REMAINS FULLY VISIBLE in rich, vibrant, luminous appearance (NEVER disappears)
      if (lineMat) {
        lineMat.opacity = THREE.MathUtils.lerp(lineMat.opacity, 0.58, step);
        lineMat.color.lerp(new THREE.Color('#ffffff'), step);
      }
      if (pointsMat) {
        pointsMat.size = THREE.MathUtils.lerp(pointsMat.size, 0.013, step);
        pointsMat.opacity = THREE.MathUtils.lerp(pointsMat.opacity, 0.7, step);
        pointsMat.color.lerp(new THREE.Color('#ffffff'), step);
      }
    }
  });

  return (
    <group>
      {/* Interactive raycast mesh */}
      <mesh
        geometry={geometry}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onHoverMesh(side);
          if (!props.activity) gl.domElement.style.cursor = 'pointer';
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onHoverMesh(side);
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onHoverMesh(null);
          gl.domElement.style.cursor = 'grab';
        }}
        onClick={(e) => {
          if (e.delta > 5 || props.enteringSide) return;
          e.stopPropagation();
          if (!props.activity) {
            props.onSelect(side === 0 ? 'L' : 'R');
            return;
          }
          const p = e.object.worldToLocal(e.point.clone());
          const priority: RegionId[] =
            props.activity === 'coding'
              ? ['language', 'prefrontal', 'parietal', 'md']
              : ['motor', 'visual', 'parietal'];
          const hit = priority.find((id) => regionWeight(id, p.x, p.y, p.z));
          if (hit) props.onRegion(hit);
        }}
      >
        <meshBasicMaterial color="#527078" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Superbright neural network lines (raycast disabled so it never blocks mesh) */}
      <lineSegments geometry={painted.lines} raycast={() => null}>
        {/* Barely there. These lines used to carry the whole look at 0.58 and
            that is what made it read as a wireframe diagram. Now they only
            hint at connective structure under the dust. */}
        <lineBasicMaterial ref={lineMatRef} vertexColors transparent opacity={props.region ? 0.07 : 0.022} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>

      {/* The dust cloud — this is the model now, not the wireframe. */}
      <points geometry={painted.nodes} raycast={() => null}>
        <pointsMaterial
          ref={pointsMatRef}
          vertexColors
          map={getDustSprite()}
          alphaTest={0.01}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          size={props.region ? 0.016 : 0.014}
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </points>

      {(props.region || props.enteringSide) && <Sparkles geometry={painted.sparkles} color={color}/> }
      {(props.region || props.enteringSide) && (
        <mesh geometry={painted.highlight} raycast={() => null}>
          <meshBasicMaterial ref={highlightMatRef} color={color} transparent opacity={0} blending={props.enteringSide ? THREE.NormalBlending : THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function Cortex(props: BrainSceneProps) {
  const [geometries, setGeometries] = useState<THREE.BufferGeometry[] | null>(null);
  const [meshHoveredSide, setMeshHoveredSide] = useState<number | null>(null);
  const handlers = useRef(props);
  handlers.current = props;

  useEffect(() => {
    let alive = true;
    loadCortex()
      .then((g) => {
        if (alive) {
          setGeometries(g);
          handlers.current.onReady();
        }
      })
      .catch(() => {
        if (alive) handlers.current.onError();
      });
    return () => {
      alive = false;
    };
  }, []);

  const activeSide = props.activity ? null : props.enteringSide
    ? props.enteringSide === 'L' ? 0 : 1
    : meshHoveredSide ?? (props.hoveredSide === 'L' ? 0 : props.hoveredSide === 'R' ? 1 : null);

  function hover(side: number | null) {
    setMeshHoveredSide(side);
    props.onHoverSide?.(side === null ? null : side === 0 ? 'L' : 'R');
  }

  if (!geometries) return null;

  return (
    <group>
      <group>
        {geometries.map((geometry, i) => (
          <Hemisphere
            key={i}
            geometry={geometry}
            side={i}
            activeSide={activeSide}
            onHoverMesh={hover}
            {...props}
          />
        ))}
        {(props.region === 'memory' || props.region === 'motor') &&
          [-1, 1].map((sign) => (
            <mesh
              key={sign}
              position={props.region === 'memory' ? [sign * 0.48, -0.4, 0.05] : [sign * 0.48, -1.15, 0.9]}
              scale={props.region === 'memory' ? [0.09, 0.1, 0.3] : [0.35, 0.2, 0.28]}
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <sphereGeometry args={[1, 20, 16]} />
              <meshBasicMaterial color="#f2b773" wireframe transparent opacity={0.8} depthTest={false} />
            </mesh>
          ))}
      </group>
    </group>
  );
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const INITIAL_CAMERA = { position: [0, 0, 4.7] as [number, number, number], fov: 38 };

export default function BrainScene(props: BrainSceneProps) {
  const interaction = useRef<InteractionState>({ isDragging: false, lastDragTime: 0 });

  return (
    <SceneBoundary onError={props.onError}>
      <Canvas
        frameloop="always"
        dpr={[1, 1.8]}
        camera={INITIAL_CAMERA}
        gl={{ antialias: true, alpha: true }}
        onPointerLeave={() => {
          props.onHoverSide?.(null);
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.domElement.addEventListener(
            'webglcontextlost',
            () => {
              if (gl.domElement.isConnected) props.onError();
            },
            { once: true }
          );
        }}
        fallback={<span />}
      >
        <Suspense fallback={null}>
          <Cortex {...props} />
        </Suspense>
        <Controls enteringSide={props.enteringSide} region={props.region} reset={props.reset} interaction={interaction} />
      </Canvas>
    </SceneBoundary>
  );
}