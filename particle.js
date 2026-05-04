class Particle {
  constructor() {
    this.position = createVector(random(width), random(height));
    this.velocity = p5.Vector.random2D();
    this.acceleration = createVector();
  }
  
  edges() {
    if (this.position.x > width) {
      this.position.x = 0;
    } else if (this.position.x < 0) {
      this.position.x = width;
    }
    
    if (this.position.y > height) {
      this.position.y = 0;
    } else if (this.position.y < 0) {
      this.position.y = height;
    }
  }
  
  seek() {
    // Map position to a normalized space and apply scale
    let x = map(this.position.x, 0, width, -1, 1) * settings.scale;
    let y = map(this.position.y, 0, height, -1, 1) * settings.scale;
    let val = chladni(x, y); 
    
    let target = this.position.copy();

    if (abs(val) > settings.threshold) {
      target.x += random(-3, 3);
      target.y += random(-3, 3);
    } 
    
    let desired = p5.Vector.sub(target, this.position);
    desired.setMag(settings.particleSpeed);
    let steering = p5.Vector.sub(desired, this.velocity);
    steering.limit(settings.particleForce);
    
    return steering;
  }
  
  update() {
    this.edges();
    
    this.acceleration.add(this.seek());
    this.velocity.add(this.acceleration);
    this.velocity.limit(settings.particleSpeed);
    this.position.add(this.velocity);
    this.acceleration.mult(0);
  }

  // Iterates through all particles to randomise their velocity, causing them to move and reorganize
  static scatterAll(particlesArray) {
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].velocity = p5.Vector.random2D().mult(random(2, 5));
    }
  }
}