import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const HologramFace: React.FC<{ accentColor?: string }> = ({ accentColor = '#10b981' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any existing canvas
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const width = 300;
    const height = 300;
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    const group = new THREE.Group();
    
    // Eyes Container
    const eyesGroup = new THREE.Group();
    group.add(eyesGroup);

    // Eye Geometry - More "Digital" look
    const eyeGeometry = new THREE.RingGeometry(0.1, 0.15, 32);
    const eyeMaterial = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    // Left Eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.4, 0, 0);
    eyesGroup.add(leftEye);
    
    // Right Eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.4, 0, 0);
    eyesGroup.add(rightEye);

    // Pupils (Inner Glow)
    const pupilGeometry = new THREE.CircleGeometry(0.04, 32);
    const pupilMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.z = 0.01;
    leftEye.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.z = 0.01;
    rightEye.add(rightPupil);

    // Neural Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 200;
    const posArray = new Float32Array(particlesCount * 3);
    const velArray = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i++) {
      posArray[i] = (Math.random() - 0.5) * 5;
      velArray[i] = (Math.random() - 0.5) * 0.005;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      size: 0.015,
      color: new THREE.Color(accentColor),
      transparent: true,
      opacity: 0.4,
    });
    
    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    group.add(particlesMesh);

    scene.add(group);
    camera.position.z = 2.5;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      targetX = x * 0.5;
      targetY = y * 0.5;
    };

    window.addEventListener('mousemove', onMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;

      group.rotation.y = currentX * 0.3;
      group.rotation.x = -currentY * 0.3;

      // Eyes tracking
      const lookFactor = 0.2;
      leftPupil.position.x = currentX * lookFactor;
      leftPupil.position.y = currentY * lookFactor;
      rightPupil.position.x = currentX * lookFactor;
      rightPupil.position.y = currentY * lookFactor;

      // Pulse effect
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.05;
      leftEye.scale.set(pulse, pulse, 1);
      rightEye.scale.set(pulse, pulse, 1);

      // Floating effect
      const floatY = Math.sin(Date.now() * 0.0015) * 0.15;
      eyesGroup.position.y = floatY;

      // Animate individual particles
      const positions = particlesGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particlesCount * 3; i += 3) {
        positions[i] += velArray[i];
        positions[i+1] += velArray[i+1];
        positions[i+2] += velArray[i+2];

        // Wrap around
        if (Math.abs(positions[i]) > 2.5) velArray[i] *= -1;
        if (Math.abs(positions[i+1]) > 2.5) velArray[i+1] *= -1;
        if (Math.abs(positions[i+2]) > 2.5) velArray[i+2] *= -1;
      }
      particlesGeometry.attributes.position.needsUpdate = true;

      particlesMesh.rotation.y += 0.0005;
      particlesMesh.rotation.z += 0.0002;
      particlesMesh.rotation.x += 0.0001;

      // Blinking
      if (Math.random() > 0.99) {
        leftEye.scale.y = 0.1;
        rightEye.scale.y = 0.1;
        setTimeout(() => {
          leftEye.scale.y = pulse;
          rightEye.scale.y = pulse;
        }, 80);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [accentColor]);

  return (
    <div className="relative flex items-center justify-center">
      {/* Background Glow */}
      <div 
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 animate-pulse-float"
        style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }}
      />
      
      <div 
        ref={containerRef} 
        className="w-[300px] h-[300px] flex items-center justify-center relative z-10"
        style={{ filter: `drop-shadow(0 0 30px ${accentColor}44)` }}
      />
    </div>
  );
};
