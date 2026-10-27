import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from 'framer-motion';

/** A photographic print with subtle physical depth; the image stays as a fallback. */
export default function PhotoSurface({ src, srcSet, sizes, alt, paused = false }: { src: string; srcSet?: string; sizes?: string; alt: string; paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const preferReduced = useReducedMotion();
  const reduced = preferReduced || paused;
  useEffect(() => {
    const element = host.current!;
    // Touch devices use the original photo, keeping the carousel light and responsive.
    if (matchMedia('(max-width: 700px), (pointer: coarse)').matches) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 20);
    camera.position.z = 4;
    const geometry = new THREE.PlaneGeometry(1.8, 2.5, 24, 32);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    let disposed = false, frame = 0, visible = true;
    const pointer = new THREE.Vector2();
    const texture = new THREE.TextureLoader().load(src, image => {
      if (disposed) { image.dispose(); return; }
      image.colorSpace = THREE.SRGBColorSpace;
      // Cover the portrait plane without stretching the source photograph.
      const imageAspect = image.image.width / image.image.height;
      const planeAspect = 1.8 / 2.5;
      image.repeat.set(Math.min(planeAspect / imageAspect, 1), Math.min(imageAspect / planeAspect, 1));
      image.offset.set((1 - image.repeat.x) / 2, (1 - image.repeat.y) / 2);
      material.map = image; material.needsUpdate = true; setReady(true);
    }, undefined, () => setReady(false));
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.position.z = Math.max(2.5, 1.8 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(17.5))) * 1.08;
      camera.updateProjectionMatrix(); renderer.setSize(width, height);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); visibility.observe(element);
    const move = (event: PointerEvent) => { const box = element.getBoundingClientRect(); pointer.set((event.clientX - box.left) / box.width - .5, (event.clientY - box.top) / box.height - .5); };
    const leave = () => pointer.set(0, 0);
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', leave);
    const positions = geometry.getAttribute('position');
    const clock = new THREE.Clock();
    const render = () => {
      frame = requestAnimationFrame(render);
      const dt = Math.min(clock.getDelta(), .04);
      if (!visible || document.hidden) return;
      const time = clock.elapsedTime;
      mesh.rotation.y = THREE.MathUtils.damp(mesh.rotation.y, reduced ? 0 : pointer.x * .16, 5, dt);
      mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, reduced ? 0 : -pointer.y * .1, 5, dt);
      if (!reduced) {
        for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getX(i) * 2 + time * .5) * .025);
        positions.needsUpdate = true;
      }
      renderer.render(scene, camera);
    };
    render();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); visibility.disconnect(); element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', leave); texture.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [src, reduced]);
  return <div className={`photo-surface ${ready ? 'is-ready' : ''}`} ref={host}><img src={src} srcSet={srcSet} sizes={sizes} alt={alt} draggable={false}/></div>;
}
