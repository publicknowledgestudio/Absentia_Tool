const particlePalette = ['#A5A19C', '#404246', '#6E7B8A', '#878787', '#E1E4D5', '#F6F6EC'];
const bgPalette = ['#A5A19C', '#404246', '#6E7B8A', '#878787', '#E1E4D5', '#F6F6EC'];

let particles = [];
let lastChangeTime = 0;
let particleLayer;

let gui;
let recordController;
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

let settings = {
  numParticles: 5000,
  m: 5,
  n: 4,
  scale: 1,
  threshold: 0.05,
  minMN: 1,
  maxMN: 6,
  
  particleSpeed: 2,
  particleForce: 0.1,
  particleSize: 1.5,
  particleOpacity: 200,
  particleCol: '#E1E4D5',
  
  layerBlur: 0,
  backgroundCol: '#404246',
  
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
  particleLayer.pixelDensity(pixelDensity()); // Fix blurriness on high DPI displays
  
  // Initialize particles
  for (let i = 0; i < settings.numParticles; i++) {
    particles.push(new Particle());
  }
  
  setupGUI();
  randomPatterns();
  lastChangeTime = millis();
}

function setupGUI() {
  gui = new dat.GUI({ width: 320 });
  
  let chladniFolder = gui.addFolder('Chladni Patterns');
  chladniFolder.add(settings, 'm', 1, 10, 1).name('M Mode').listen();
  chladniFolder.add(settings, 'n', 1, 10, 1).name('N Mode').listen();
  chladniFolder.add(settings, 'scale', 0.1, 5, 0.1).name('Scale');
  chladniFolder.add(settings, 'threshold', 0.01, 0.2, 0.01).name('Threshold');
  chladniFolder.add(settings, 'forceChange').name('Reform Patterns');
  chladniFolder.open();

  let particleFolder = gui.addFolder('Particles Settings');
  let pColDict = {};
  for(let col of particlePalette) pColDict[col] = col;
  particleFolder.add(settings, 'particleCol', pColDict).name('Color').listen();
  particleFolder.add(settings, 'numParticles', 100, 15000, 100).name('Count').onFinishChange(updateParticleCount);
  particleFolder.add(settings, 'particleSpeed', 0.5, 10, 0.5).name('Max Speed');
  particleFolder.add(settings, 'particleForce', 0.01, 1, 0.01).name('Max Force');
  particleFolder.add(settings, 'particleSize', 0.5, 10, 0.5).name('Size');
  particleFolder.add(settings, 'particleOpacity', 10, 255, 5).name('Opacity');
  particleFolder.add(settings, 'scatterParticles').name('Scatter / Reorganize');
  particleFolder.open();
  
  let renderFolder = gui.addFolder('Rendering & Background');
  renderFolder.add(settings, 'layerBlur', 0, 20, 1).name('Layer Blur');
  
  let bgDict = {};
  for(let col of bgPalette) bgDict[col] = col;
  renderFolder.add(settings, 'backgroundCol', bgDict).name('Background');
  renderFolder.open();
  
  let timerFolder = gui.addFolder('Auto Timer');
  timerFolder.add(settings, 'autoTimer').name('Enable Auto Timer');
  timerFolder.add(settings, 'timerSeconds', 1, 30, 1).name('Interval (sec)');
  
  let exportFolder = gui.addFolder('Export');
  exportFolder.add(settings, 'savePNG').name('Save PNG');
  recordController = exportFolder.add(settings, 'toggleRecord').name('Start Recording');
  exportFolder.open();
}

function toggleRecording() {
  if (!isRecording) {
    recordedChunks = [];
    let stream = document.querySelector('canvas').captureStream(30);
    let options = { mimeType: 'video/webm' };
    
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

function draw() {
  background(color(settings.backgroundCol));
  
  if (settings.autoTimer) {
    if (millis() - lastChangeTime > settings.timerSeconds * 1000) {
      randomPatterns();
      lastChangeTime = millis();
    }
  }
  
  let pColor = color(settings.particleCol);
  pColor.setAlpha(settings.particleOpacity);
  
  if (settings.layerBlur > 0) {
    particleLayer.clear();
    particleLayer.stroke(pColor);
    particleLayer.strokeWeight(settings.particleSize);
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particleLayer.point(particles[i].position.x, particles[i].position.y);
    }
    
    drawingContext.filter = `blur(${settings.layerBlur}px)`;
    image(particleLayer, 0, 0, width, height);
    drawingContext.filter = 'none';
  } else {
    // Draw natively to the main canvas for absolute maximum sharpness
    stroke(pColor);
    strokeWeight(settings.particleSize);
    
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      point(particles[i].position.x, particles[i].position.y);
    }
  }
}

function chladni(x, y) {
  let L = 1;
  // Apply scale directly in the Chladni computation
  return cos(settings.n * PI * x / L) * cos(settings.m * PI * y / L) - 
         cos(settings.m * PI * x / L) * cos(settings.n * PI * y / L);
}

function randomPatterns() {
  // Both n and m must be random integers between 2 and 5
  settings.m = floor(random(2, 6));
  settings.n = floor(random(2, 6));
  
  // Ensure n !== m at all times
  while (settings.m === settings.n) {
    settings.m = floor(random(2, 6));
  }
  
  // Update the GUI to reflect the new values
  if (gui && gui.__folders['Chladni Patterns']) {
    gui.__folders['Chladni Patterns'].__controllers.forEach(c => {
      if (c.property === 'm' || c.property === 'n') {
        c.updateDisplay();
      }
    });
  }
  
  lastChangeTime = millis();
}

function windowResized() {
  let size = min(windowWidth, windowHeight);
  resizeCanvas(size, size);
  particleLayer.resizeCanvas(size, size);
  particleLayer.pixelDensity(pixelDensity());
}
