const particlePalette = ['#A5A19C', '#404246', '#6E7B8A', '#878787', '#E1E4D5', '#F6F6EC'];
const bgPalette = ['#A5A19C', '#404246', '#6E7B8A', '#878787', '#E1E4D5', '#F6F6EC'];

let particles = [];
let lastChangeTime = 0;
let particleLayer;
let shapeLayer;
let noiseImg;
let shapeStep = 6;

let gui;
let recordController;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

let currentGeom = 0;
let targetGeom = 0;
let geomMorph = 1;

let currentM = 5, currentN = 4;
let targetM = 5, targetN = 4;

let geomOptions = {
  'Concentric Circles': 0,
  'Dual-Lobed': 1,
  'Diamond Lattice': 2,
  'Hexagonal Fields': 3
};

let settings = {
  mode: 'Geometric',
  geomShape: 0,
  morphSpeed: 0.015,
  aspectRatio: '1:1 (Square)',
  
  numParticles: 8000, 
  m: 5,
  n: 4,
  scale: 1,
  threshold: 0.05,
  taper: 0.8,
  
  particleSpeed: 2,
  particleForce: 0.1,
  particleSize: 1.5,
  particleOpacity: 200,
  particleCol: '#E1E4D5',
  
  layerBlur: 0,
  shapeOpacity: 60,
  shapeBlur: 15,
  
  bgStyle: 'Radial Gradient',
  backgroundCol: '#E1E4D5',
  bgGradientOuter: '#404246',
  bgNoiseIntensity: 0.15,
  bgBlur: 20,
  
  autoTimer: true,
  timerSeconds: 5,
  
  forceChange: function() { randomPatterns(); },
  scatterParticles: function() { Particle.scatterAll(particles); },
  savePNG: function() { saveCanvas('Chladni_Pattern', 'png'); },
  toggleRecord: function() { toggleRecording(); }
};

function setup() {
  let size = min(windowWidth, windowHeight);
  createCanvas(size, size);
  pixelDensity(window.devicePixelRatio || 1);
  
  particleLayer = createGraphics(width, height);
  particleLayer.pixelDensity(pixelDensity()); 
  
  shapeLayer = createGraphics(width, height);
  shapeLayer.pixelDensity(pixelDensity());
  
  generateNoise();
  
  for (let i = 0; i < settings.numParticles; i++) {
    particles.push(new Particle());
  }
  
  setupGUI();
  
  targetM = settings.m;
  targetN = settings.n;
  currentM = settings.m;
  currentN = settings.n;
  
  windowResized(); // Set initial aspect ratio
  randomPatterns();
  lastChangeTime = millis();
}

function setupGUI() {
  gui = new dat.GUI({ width: 320 });
  
  let modeFolder = gui.addFolder('System Mode');
  modeFolder.add(settings, 'mode', ['Chladni', 'Geometric']).name('Pattern Type').onChange(() => {
    geomMorph = 0;
    randomPatterns();
  });
  modeFolder.add(settings, 'geomShape', geomOptions).name('Geometric Shape').onChange(v => {
    targetGeom = parseInt(v);
    geomMorph = 0;
  });
  modeFolder.add(settings, 'morphSpeed', 0.005, 0.1, 0.005).name('Morph Speed');
  modeFolder.open();
  
  let chladniFolder = gui.addFolder('Pattern Parameters');
  chladniFolder.add(settings, 'm', 1, 10, 1).name('M Mode').onChange(v => { targetM = v; geomMorph = 0; });
  chladniFolder.add(settings, 'n', 1, 10, 1).name('N Mode').onChange(v => { targetN = v; geomMorph = 0; });
  chladniFolder.add(settings, 'scale', 0.1, 5, 0.1).name('Scale');
  chladniFolder.add(settings, 'threshold', 0.01, 0.2, 0.01).name('Threshold');
  chladniFolder.add(settings, 'taper', 0, 1, 0.05).name('Taper Focus');
  chladniFolder.add(settings, 'forceChange').name('Reform Patterns');
  chladniFolder.open();

  let particleFolder = gui.addFolder('Particles Settings');
  let pColDict = {};
  for(let col of particlePalette) pColDict[col] = col;
  particleFolder.add(settings, 'particleCol', pColDict).name('Color').listen();
  particleFolder.add(settings, 'numParticles', 100, 30000, 100).name('Count').onFinishChange(updateParticleCount);
  particleFolder.add(settings, 'particleSpeed', 0.5, 10, 0.5).name('Max Speed');
  particleFolder.add(settings, 'particleForce', 0.01, 1, 0.01).name('Max Force');
  particleFolder.add(settings, 'particleSize', 0.5, 10, 0.5).name('Size');
  particleFolder.add(settings, 'particleOpacity', 10, 255, 5).name('Opacity');
  particleFolder.add(settings, 'scatterParticles').name('Scatter / Reorganize');
  particleFolder.open();
  
  let renderFolder = gui.addFolder('Rendering & Background');
  renderFolder.add(settings, 'shapeOpacity', 0, 255, 5).name('Shape Opacity');
  renderFolder.add(settings, 'shapeBlur', 0, 50, 1).name('Shape Blur');
  renderFolder.add(settings, 'layerBlur', 0, 20, 1).name('Particle Blur');
  renderFolder.add(settings, 'aspectRatio', ['1:1 (Square)', '16:9 (Landscape)', '9:16 (Portrait)', '4:3', '3:4']).name('Aspect Ratio').onChange(windowResized);
  
  renderFolder.add(settings, 'bgStyle', ['Solid', 'Radial Gradient']).name('BG Style');
  let bgDict = {};
  for(let col of bgPalette) bgDict[col] = col;
  renderFolder.add(settings, 'backgroundCol', bgDict).name('BG Inner/Solid');
  renderFolder.add(settings, 'bgGradientOuter', bgDict).name('BG Outer');
  renderFolder.add(settings, 'bgNoiseIntensity', 0, 1, 0.05).name('Noise Intensity');
  renderFolder.add(settings, 'bgBlur', 0, 50, 1).name('BG Noise Blur');
  renderFolder.open();
  
  let timerFolder = gui.addFolder('Auto Timer');
  timerFolder.add(settings, 'autoTimer').name('Enable Auto Timer');
  timerFolder.add(settings, 'timerSeconds', 1, 30, 1).name('Interval (sec)');
  
  let exportFolder = gui.addFolder('Export');
  exportFolder.add(settings, 'savePNG').name('Save PNG');
  recordController = exportFolder.add(settings, 'toggleRecord').name('Start Recording');
}

function toggleRecording() {
  if (!isRecording) {
    recordedChunks = [];
    let stream = document.querySelector('canvas').captureStream(60); // 60 FPS
    
    let options = { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: 25000000 }; // 25 Mbps HQ
    if (!MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
      options.mimeType = 'video/webm';
    }
    
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.error('Exception while creating MediaRecorder:', e);
      return;
    }
    
    mediaRecorder.ondataavailable = function(e) {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = function() {
      let blob = new Blob(recordedChunks, { type: 'video/webm' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = 'chladni_animation.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    };
    
    mediaRecorder.start();
    isRecording = true;
    recordController.name('Stop Recording');
  } else {
    mediaRecorder.stop();
    isRecording = false;
    recordController.name('Start Recording');
  }
}

function updateParticleCount() {
  if (settings.numParticles > particles.length) {
    let diff = settings.numParticles - particles.length;
    for (let i = 0; i < diff; i++) {
      particles.push(new Particle());
    }
  } else if (settings.numParticles < particles.length) {
    particles.splice(settings.numParticles);
  }
}

function drawShapeLayer() {
  shapeLayer.clear();
  shapeLayer.noStroke();
  
  let pCol = color(settings.particleCol);
  let baseSize = Math.max(width, height);
  
  for (let y = 0; y < height; y += shapeStep) {
    for (let x = 0; x < width; x += shapeStep) {
      let nx = ((x - width/2) * 2 / baseSize) * settings.scale;
      let ny = ((y - height/2) * 2 / baseSize) * settings.scale;
      
      let val;
      if (settings.mode === 'Chladni') {
        let v1 = chladniField(nx, ny, currentM, currentN);
        let v2 = chladniField(nx, ny, targetM, targetN);
        val = v1 + (v2 - v1) * geomMorph;
      } else {
        let v1 = evalGeom(nx, ny, currentGeom);
        let v2 = evalGeom(nx, ny, targetGeom);
        val = v1 + (v2 - v1) * geomMorph;
      }
      
      let absVal = Math.abs(val);
      if (absVal < settings.threshold * 3) {
        let nodeIntensity = map(absVal, 0, settings.threshold * 3, 1, 0);
        
        let rSqNorm = ((x - width/2) * 2 / baseSize)**2 + ((y - height/2) * 2 / baseSize)**2;
        
        // Intensity falloff taper matching the physics engine
        let falloff = Math.exp(-rSqNorm * settings.taper * 2);
        
        let finalAlpha = nodeIntensity * falloff * settings.shapeOpacity;
        if (finalAlpha > 1) {
          pCol.setAlpha(finalAlpha);
          shapeLayer.fill(pCol);
          shapeLayer.rect(x, y, shapeStep, shapeStep);
        }
      }
    }
  }
}

function draw() {
  if (geomMorph < 1) {
    geomMorph += settings.morphSpeed;
    if (geomMorph > 1) {
      geomMorph = 1;
      currentM = targetM;
      currentN = targetN;
      currentGeom = targetGeom;
    }
  }

  // 1. Draw solid or radial gradient base
  if (settings.bgStyle === 'Radial Gradient') {
    let cx = width / 2;
    let cy = height / 2;
    let maxR = dist(0, 0, cx, cy);
    let gradient = drawingContext.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    gradient.addColorStop(0, settings.backgroundCol);
    gradient.addColorStop(1, settings.bgGradientOuter);
    drawingContext.fillStyle = gradient;
    drawingContext.fillRect(0, 0, width, height);
  } else {
    background(color(settings.backgroundCol));
  }
  
  // 2. Draw underlying Gaussian blurred geometric shape layer
  if (settings.shapeOpacity > 0) {
    drawShapeLayer();
    if (settings.shapeBlur > 0) {
      drawingContext.filter = `blur(${settings.shapeBlur}px)`;
    }
    image(shapeLayer, 0, 0, width, height);
    drawingContext.filter = 'none';
  }
  
  // 3. Draw static noise overlay to seamlessly blend fields together
  if (settings.bgNoiseIntensity > 0 && noiseImg) {
    if (settings.bgBlur > 0) {
      drawingContext.filter = `blur(${settings.bgBlur}px)`;
    }
    push();
    tint(255, settings.bgNoiseIntensity * 255);
    image(noiseImg, 0, 0, width, height);
    pop();
    drawingContext.filter = 'none';
  }

  if (settings.autoTimer) {
    if (millis() - lastChangeTime > settings.timerSeconds * 1000) {
      randomPatterns();
      lastChangeTime = millis();
    }
  }
  
  let pColor = color(settings.particleCol);
  pColor.setAlpha(settings.particleOpacity);
  
  // 4. Draw physically accurate particles over the shape fields
  if (settings.layerBlur > 0) {
    particleLayer.clear();
    particleLayer.stroke(pColor);
    particleLayer.strokeWeight(settings.particleSize);
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particleLayer.point(particles[i].drawX, particles[i].drawY);
    }
    
    drawingContext.filter = `blur(${settings.layerBlur}px)`;
    image(particleLayer, 0, 0, width, height);
    drawingContext.filter = 'none';
  } else {
    stroke(pColor);
    strokeWeight(settings.particleSize);
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      point(particles[i].drawX, particles[i].drawY);
    }
  }
}

function chladniField(nx, ny, m, n) {
  return Math.cos(n * Math.PI * nx) * Math.cos(m * Math.PI * ny) - 
         Math.cos(m * Math.PI * nx) * Math.cos(n * Math.PI * ny);
}

function evalGeom(nx, ny, type) {
  let k = 10;
  if (type === 0) {
    let r = Math.sqrt(nx*nx + ny*ny);
    return Math.cos(k * r);
  } else if (type === 1) {
    let d1 = Math.sqrt((nx-0.5)*(nx-0.5) + ny*ny);
    let d2 = Math.sqrt((nx+0.5)*(nx+0.5) + ny*ny);
    return Math.cos(k * d1) + Math.cos(k * d2);
  } else if (type === 2) {
    return Math.cos(k * (nx+ny)) * Math.cos(k * (nx-ny));
  } else if (type === 3) {
    return Math.cos(k * nx) + Math.cos(k * 0.5 * nx + k * 0.866 * ny) + Math.cos(k * 0.5 * nx - k * 0.866 * ny);
  }
  return 0;
}

function randomPatterns() {
  if (settings.mode === 'Chladni') {
    targetM = floor(random(2, 6));
    targetN = floor(random(2, 6));
    while (targetM === targetN) {
      targetM = floor(random(2, 6));
    }
    settings.m = targetM;
    settings.n = targetN;
    if (gui && gui.__folders['Pattern Parameters']) {
      gui.__folders['Pattern Parameters'].__controllers.forEach(c => {
        if (c.property === 'm' || c.property === 'n') c.updateDisplay();
      });
    }
  } else {
    let nextGeom = floor(random(0, 4));
    while (nextGeom === currentGeom) {
      nextGeom = floor(random(0, 4));
    }
    targetGeom = nextGeom;
    settings.geomShape = targetGeom;
    if (gui && gui.__folders['System Mode']) {
      gui.__folders['System Mode'].__controllers.forEach(c => {
        if (c.property === 'geomShape') c.updateDisplay();
      });
    }
  }
  
  geomMorph = 0; // Trigger the morph
  lastChangeTime = millis();
}

function windowResized() {
  let aspectOptions = {
    '1:1 (Square)': 1,
    '16:9 (Landscape)': 16/9,
    '9:16 (Portrait)': 9/16,
    '4:3': 4/3,
    '3:4': 3/4
  };
  let targetRatio = aspectOptions[settings.aspectRatio] || 1;
  let w = windowWidth;
  let h = windowHeight;
  let currentRatio = w / h;
  
  let newW, newH;
  if (currentRatio > targetRatio) {
    newH = h * 0.95;
    newW = newH * targetRatio;
  } else {
    newW = w * 0.95;
    newH = newW / targetRatio;
  }
  
  resizeCanvas(newW, newH);
  if (particleLayer) {
    particleLayer.resizeCanvas(newW, newH);
    particleLayer.pixelDensity(pixelDensity());
  }
  if (shapeLayer) {
    shapeLayer.resizeCanvas(newW, newH);
    shapeLayer.pixelDensity(pixelDensity());
  }
  generateNoise();
}

function generateNoise() {
  noiseImg = createImage(width, height);
  noiseImg.loadPixels();
  for (let i = 0; i < noiseImg.pixels.length; i += 4) {
    let val = random(255);
    noiseImg.pixels[i] = val;
    noiseImg.pixels[i + 1] = val;
    noiseImg.pixels[i + 2] = val;
    noiseImg.pixels[i + 3] = 255;
  }
  noiseImg.updatePixels();
}
