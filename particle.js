class Particle {
  constructor() {
    this.px = random(width);
    this.py = random(height);
    let angle = random(TWO_PI);
    let speed = random(1, 2);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ax = 0;
    this.ay = 0;
  }
  
  edges() {
    if (this.px > width) this.px = 0;
    else if (this.px < 0) this.px = width;
    
    if (this.py > height) this.py = 0;
    else if (this.py < 0) this.py = height;
  }
  
  seek() {
    let baseSize = Math.max(width, height);
    let nx = ((this.px - width/2) * 2 / baseSize) * settings.scale;
    let ny = ((this.py - height/2) * 2 / baseSize) * settings.scale;
    
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
    
    let tx = this.px;
    let ty = this.py;
    
    let rSqNorm = ((this.px - width/2) * 2 / baseSize)**2 + ((this.py - height/2) * 2 / baseSize)**2;
    let falloff = Math.exp(-rSqNorm * settings.taper * 2);
    
    // By allowing threshold to expand slightly outward, we allow particles to catch outer nodes 
    // more easily, increasing peripheral presence and preventing center-locking.
    let currentThreshold = settings.threshold * (1 + (1 - falloff) * 2); 
    
    let absVal = Math.abs(val);
    
    if (absVal > currentThreshold) {
      // Wandering randomly to find a node. Unbiased distribution.
      let wander = 1 + settings.taper * 5 * rSqNorm;
      tx += random(-3 * wander, 3 * wander);
      ty += random(-3 * wander, 3 * wander);
    } else {
      // Settled on a node. 
      // Add a baseline jitter to prevent permanent clamping and allow flow, creating a soft volumetric feel.
      let blur = settings.taper * 2 * rSqNorm + 0.2;
      tx += random(-blur, blur);
      ty += random(-blur, blur);
    }
    
    let dx = tx - this.px;
    let dy = ty - this.py;
    
    // Safely cap desired velocity. This allows particles to natively slow down 
    // when they lock onto a node instead of violently jittering at max speed.
    let dMag = Math.sqrt(dx*dx + dy*dy);
    if (dMag > settings.particleSpeed) {
      dx = (dx / dMag) * settings.particleSpeed;
      dy = (dy / dMag) * settings.particleSpeed;
    }
    
    let sx = dx - this.vx;
    let sy = dy - this.vy;
    
    let sMag = Math.sqrt(sx*sx + sy*sy);
    if (sMag > settings.particleForce) {
      sx = (sx / sMag) * settings.particleForce;
      sy = (sy / sMag) * settings.particleForce;
    }
    
    this.ax += sx;
    this.ay += sy;
  }
  
  update() {
    this.edges();
    this.seek();
    
    this.vx += this.ax;
    this.vy += this.ay;
    
    let vMag = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
    if (vMag > settings.particleSpeed) {
      this.vx = (this.vx / vMag) * settings.particleSpeed;
      this.vy = (this.vy / vMag) * settings.particleSpeed;
    }
    
    this.px += this.vx;
    this.py += this.vy;
    
    this.ax = 0;
    this.ay = 0;
    
    // Optical Tapering: 
    let baseSize = Math.max(width, height);
    let rSqNorm = ((this.px - width/2) * 2 / baseSize)**2 + ((this.py - height/2) * 2 / baseSize)**2;
    
    let jitter = settings.taper * rSqNorm * 10;
    if (jitter > 0) {
      this.drawX = this.px + random(-jitter, jitter);
      this.drawY = this.py + random(-jitter, jitter);
    } else {
      this.drawX = this.px;
      this.drawY = this.py;
    }
  }

  static scatterAll(particlesArray) {
    for (let i = 0; i < particlesArray.length; i++) {
      let p = particlesArray[i];
      let angle = random(TWO_PI);
      let mag = random(2, 5);
      p.vx = Math.cos(angle) * mag;
      p.vy = Math.sin(angle) * mag;
    }
  }
}