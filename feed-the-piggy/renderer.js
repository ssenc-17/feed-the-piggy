function screenShake() {
  gameArea.style.animation = 'none';
  void gameArea.offsetWidth;
  gameArea.style.animation = 'shake 0.3s ease';
  
  setTimeout(() => {
    gameArea.style.animation = '';
  }, 300);
}

function pigBounce() {
  const currentAnimation = pig.style.animation;
  pig.style.animation = currentAnimation + ', pigBounce 0.3s ease';
  
  setTimeout(() => {
    pig.style.animation = '';
  }, 300);
}

function pigFlash() {
  pigImage.style.animation = 'pigFlash 0.2s ease';
  
  setTimeout(() => {
    pigImage.style.animation = '';
  }, 200);
}

function createTrail(x, y, size, color) {
  const trail = document.createElement('div');
  trail.className = 'food-trail';
  trail.style.left = x + 'px';
  trail.style.top = y + 'px';
  trail.style.width = size + 'px';
  trail.style.height = size + 'px';
  trail.style.background = color;
  
  gameArea.appendChild(trail);
  
  setTimeout(() => {
    trail.remove();
  }, 400);
}

const gameState = {
  totalPoints: 0,
  currentFood: 'apple',
  decayLevel: 0,
  gameEnded: false,
  soundsEnabled: true,
  gameStarted: false,
  glitchInterval: null,
  canThrow: true,
  throwCooldown: 300,
  combo: 0,
  maxCombo: 0,
  lastHitTime: 0,
  comboTimeout: 3000
};

const FOOD_CONFIG = {
  apple: {
    image: 'assets/images/apple.png',
    cost: 0,
    points: 1,
    size: 48
  },
  burger: {
    image: 'assets/images/burger.png',
    cost: 25,
    points: 5,
    size: 52
  },
  cake: {
    image: 'assets/images/cake.png',
    cost: 100,
    points: 15,
    size: 64
  },
  slop: {
    image: 'assets/images/slop.png',
    cost: 500,
    points: 50,
    size: 56,
    erratic: true
  }
};

const DECAY_THRESHOLDS = [0, 50, 200, 800, 1500];
const GLITCH_START_THRESHOLD = 800;

const PIG_SPRITES = [
  'assets/images/pig.png',
  'assets/images/pig.png',
  'assets/images/pig2.png',
  'assets/images/pig3.png',
  'assets/images/pig3.png'
];

const GRAVITY = 0.8;
const MIN_FORCE = 15;
const MAX_FORCE = 35;

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const startParticles = document.getElementById('start-particles');
const gameContainer = document.getElementById('game-container');
const gameArea = document.getElementById('game-area');
const gameParticles = document.getElementById('game-particles');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo-display');
const comboCount = document.getElementById('combo-count');
const comboMultiplier = document.getElementById('combo-multiplier');
const streakMessage = document.getElementById('streak-message');
const foodButtons = document.querySelectorAll('.food-btn');
const pig = document.getElementById('pig');
const pigMouth = document.getElementById('pig-mouth');
const glitchContainer = document.getElementById('glitch-container');
const pigImage = pig.querySelector('img');

let audioContext;
let backgroundMusic = null;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBackgroundMusic(decayLevel) {
  if (!gameState.soundsEnabled || !audioContext) return;
  
  if (backgroundMusic) {
    backgroundMusic.stop();
  }
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();
  
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  if (decayLevel === 0) {
    oscillator.frequency.value = 523.25; // C5
    oscillator.type = 'sine';
    gainNode.gain.value = 0.12;
    filter.type = 'lowpass';
    filter.frequency.value = 2500;
  } 
  else if (decayLevel === 1) {
    oscillator.frequency.value = 392; // G4
    oscillator.type = 'sine';
    gainNode.gain.value = 0.10;
    filter.frequency.value = 1800;
  } 
  else if (decayLevel === 2) {
    oscillator.frequency.value = 277.18; // C#4
    oscillator.type = 'triangle';
    gainNode.gain.value = 0.08;
    filter.frequency.value = 1200;
  } 
  else if (decayLevel === 3) {
    oscillator.frequency.value = 110; // A2
    oscillator.type = 'sawtooth';
    gainNode.gain.value = 0.06;
    filter.frequency.value = 400;
  }
  
  oscillator.start();
  backgroundMusic = oscillator;
}

function playEatSound(decayLevel, isCombo = false) {
  if (!gameState.soundsEnabled) return;
  
  initAudio();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  let baseFreq = 440 - (decayLevel * 80);
  if (isCombo) {
    baseFreq += 100;
  }
  
  const duration = 0.15 - (decayLevel * 0.02);
  
  oscillator.frequency.value = baseFreq;
  oscillator.type = decayLevel >= 3 ? 'sawtooth' : 'sine';
  
  const volume = isCombo ? 0.35 : 0.3;
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function playOinkSound() {
  if (!gameState.soundsEnabled || !audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(250, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

function playThrowSound() {
  if (!gameState.soundsEnabled || !audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.08);
  
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.08);
}

function playComboSound(comboCount) {
  if (!gameState.soundsEnabled || !audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const freq = 500 + (comboCount * 50);
  oscillator.frequency.value = Math.min(freq, 1200);
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

function playMissSound() {
  if (!gameState.soundsEnabled || !audioContext) return;
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

function selectFood(foodType) {
  if (gameState.gameEnded) return;
  
  const config = FOOD_CONFIG[foodType];
  if (!config) return;
  
  if (gameState.totalPoints < config.cost) return;
  
  gameState.currentFood = foodType;
  
  foodButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.food === foodType) {
      btn.classList.add('active');
    }
  });
}

function addPoints(points) {
  let multiplier = 1;
  if (gameState.combo >= 10) multiplier = 3;
  else if (gameState.combo >= 5) multiplier = 2;
  else if (gameState.combo >= 3) multiplier = 1.5;
  
  const finalPoints = Math.floor(points * multiplier);
  gameState.totalPoints += finalPoints;
  
  scoreDisplay.textContent = gameState.totalPoints;
  scoreDisplay.classList.remove('score-pop');
  void scoreDisplay.offsetWidth;
  scoreDisplay.classList.add('score-pop');
  
  updateDecayLevel();
  
  updateFoodAvailability();
}

function increaseCombo() {
  gameState.combo++;
  gameState.lastHitTime = Date.now();
  
  if (gameState.combo > gameState.maxCombo) {
    gameState.maxCombo = gameState.combo;
  }
  
  comboDisplay.classList.remove('hidden');
  comboCount.textContent = gameState.combo;
  
  let multiplier = '×1';
  if (gameState.combo >= 10) multiplier = '×3';
  else if (gameState.combo >= 5) multiplier = '×2';
  else if (gameState.combo >= 3) multiplier = '×1.5';
  comboMultiplier.textContent = multiplier;
  
  comboDisplay.classList.remove('combo-pop');
  void comboDisplay.offsetWidth;
  comboDisplay.classList.add('combo-pop');
  
  if (gameState.combo === 3) {
    playComboSound(gameState.combo);
    showStreakMessage('GETTING HUNGRY!');
  } else if (gameState.combo === 5) {
    playComboSound(gameState.combo);
    showStreakMessage('FEEDING FRENZY!');
  } else if (gameState.combo === 10) {
    playComboSound(gameState.combo);
    showStreakMessage('INSATIABLE!!!');
  } else if (gameState.combo === 15) {
    playComboSound(gameState.combo);
    showStreakMessage('UNSTOPPABLE!!');
  }
}

function showStreakMessage(message) {
  streakMessage.textContent = message;
  streakMessage.classList.remove('hidden');
  
  streakMessage.style.animation = 'none';
  void streakMessage.offsetWidth;
  streakMessage.style.animation = '';
  
  setTimeout(() => {
    streakMessage.classList.add('hidden');
  }, 2000);
}

function breakCombo() {
  if (gameState.combo > 0) {
    playMissSound();
  }
  
  gameState.combo = 0;
  gameState.lastHitTime = 0;
  comboDisplay.classList.add('hidden');
}

function checkComboTimeout() {
  if (gameState.combo > 0 && gameState.lastHitTime > 0) {
    const timeSinceHit = Date.now() - gameState.lastHitTime;
    if (timeSinceHit > gameState.comboTimeout) {
      breakCombo();
    }
  }
}

setInterval(checkComboTimeout, 100);

function updateDecayLevel() {
  let newDecay = 0;
  for (let i = DECAY_THRESHOLDS.length - 1; i >= 0; i--) {
    if (gameState.totalPoints >= DECAY_THRESHOLDS[i]) {
      newDecay = i;
      break;
    }
  }
  
  if (newDecay !== gameState.decayLevel) {
    gameState.decayLevel = newDecay;
    
    gameContainer.className = `decay-${newDecay}`;
    
    if (pigImage) {
      pigImage.src = PIG_SPRITES[newDecay];
      playOinkSound();
    }
    
    if (newDecay < 4) {
      playBackgroundMusic(newDecay);
    }
    
    if (newDecay >= 3 && !gameState.glitchInterval) {
      startGlitchEffect();
    }
    
    if (newDecay >= 4) {
      endGame();
    }
  }
}

function updateFoodAvailability() {
  foodButtons.forEach(btn => {
    const cost = parseInt(btn.dataset.cost);
    const foodInfo = btn.querySelector('.food-info');
    const foodType = btn.dataset.food;
    
    if (gameState.totalPoints >= cost) {
      btn.classList.remove('locked');
      
      const config = FOOD_CONFIG[foodType];
      foodInfo.textContent = `+${config.points}pts`;
    } else {
      foodInfo.textContent = cost + 'pts';
    }
  });
}

function endGame() {
  gameState.gameEnded = true;
  gameArea.style.pointerEvents = 'none';
  
  if (gameState.glitchInterval) {
    clearInterval(gameState.glitchInterval);
    gameState.glitchInterval = null;
  }
  glitchContainer.innerHTML = '';
}

function createGlitchText() {
  const glitch = document.createElement('div');
  glitch.className = 'glitch-text';
  glitch.textContent = 'FEED ME';
  
  const randomX = Math.random() * 400 + 100;
  const randomY = Math.random() * 600 + 200; 
  
  glitch.style.left = randomX + 'px';
  glitch.style.top = randomY + 'px';
  
  const randomRotate = (Math.random() - 0.5) * 20;
  glitch.style.transform = `rotate(${randomRotate}deg)`;
  
  if (Math.random() > 0.5) {
    glitch.style.color = '#8b1e5a';
    glitch.style.textShadow = '2px 2px 0 #DC5CA6, 0 0 20px rgba(139, 30, 90, 0.8)';
  }
  
  glitchContainer.appendChild(glitch);
  
  setTimeout(() => {
    glitch.remove();
  }, 3000);
}

function startGlitchEffect() {
  gameState.glitchInterval = setInterval(() => {
    createGlitchText();
  }, 800);
  
  createGlitchText();
}

function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  
  const x = Math.random() * 600;
  const startY = 900 + Math.random() * 50;
  
  particle.style.left = x + 'px';
  particle.style.top = startY + 'px';
  
  const drift = (Math.random() - 0.5) * 100;
  particle.style.setProperty('--drift', drift + 'px');
  
  const delay = Math.random() * 8;
  const duration = 8 + Math.random() * 4;
  particle.style.animationDelay = delay + 's';
  particle.style.animationDuration = duration + 's';
  
  container.appendChild(particle);
  
  setTimeout(() => {
    particle.remove();
  }, (delay + duration) * 1000);
}

function initParticles(container, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      createParticle(container);
      setInterval(() => createParticle(container), 8000 + Math.random() * 4000);
    }, i * 200);
  }
}

function getPigMouthBounds() {
  const rect = pigImage.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const mouthOffsetY = rect.height * 0.15;
  const mouthRadius = rect.width * 0.18;

  return {
    centerX,
    centerY: centerY + mouthOffsetY,
    radius: mouthRadius
  };
}

function checkMouthCollision(x, y) {
  const mouth = getPigMouthBounds();

  const dx = x - mouth.centerX;
  const dy = y - mouth.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= mouth.radius;
}


function calculateForce(clickY) {
  const gameAreaRect = gameArea.getBoundingClientRect();
  const gameAreaTop = gameAreaRect.top;
  const gameAreaHeight = gameAreaRect.height;
  
  const relativeY = clickY - gameAreaTop;
  
  const distanceFromBottom = gameAreaHeight - relativeY;
  const normalizedDistance = Math.max(0, Math.min(1, distanceFromBottom / gameAreaHeight));
  
  const force = MIN_FORCE + (normalizedDistance * (MAX_FORCE - MIN_FORCE));
  
  return force;
}

function throwFood(clickX, clickY) {
  if (gameState.gameEnded) return;
  if (!gameState.canThrow) return;
  
  const config = FOOD_CONFIG[gameState.currentFood];
  if (!config) return;
  
  playThrowSound();
  
  gameState.canThrow = false;
  setTimeout(() => {
    gameState.canThrow = true;
  }, gameState.throwCooldown);
  
  const food = document.createElement('div');
  food.className = 'food-projectile';
  
  const img = document.createElement('img');
  img.src = config.image;
  img.style.width = config.size + 'px';
  img.style.height = config.size + 'px';
  food.appendChild(img);
  
  const gameAreaRect = gameArea.getBoundingClientRect();
  const startX = gameAreaRect.width / 2;
  const startY = gameAreaRect.height - 50;
  
  food.style.left = startX + 'px';
  food.style.top = startY + 'px';
  food.style.width = config.size + 'px';
  food.style.height = config.size + 'px';
  
  gameArea.appendChild(food);
  
  const force = calculateForce(clickY);
  
  let velocityX = 0;
  let velocityY = -force;
  
  let posX = startX;
  let posY = startY;
  
  let hasScored = false;
  let hasMissed = false;
  let frameCount = 0;
  let lastTrailTime = 0;
  
  const trailColors = {
    apple: 'rgba(220, 92, 166, 0.6)',
    burger: 'rgba(220, 92, 166, 0.7)',
    cake: 'rgba(220, 92, 166, 0.8)',
    slop: 'rgba(255, 215, 0, 0.8)'
  };
  const trailColor = trailColors[gameState.currentFood] || 'rgba(220, 92, 166, 0.6)';
  
  function animate() {
    frameCount++;
    
    velocityY += GRAVITY;
    
    if (config.erratic && frameCount % 5 === 0 && Math.random() > 0.7) {
      velocityX += (Math.random() - 0.5) * 2;
      velocityY += (Math.random() - 0.5) * 1;
    }
    
    posX += velocityX;
    posY += velocityY;
    
    food.style.left = posX + 'px';
    food.style.top = posY + 'px';
    
    const rotation = frameCount * 10;
    food.style.transform = `rotate(${rotation}deg)`;
    
    if (frameCount - lastTrailTime > 2) {
      createTrail(posX, posY, config.size * 0.7, trailColor);
      lastTrailTime = frameCount;
    }
    
    const absoluteX = posX + gameAreaRect.left + (config.size / 2);
    const absoluteY = posY + gameAreaRect.top + (config.size / 2);
    
    if (!hasScored && !hasMissed && checkMouthCollision(absoluteX, absoluteY)) {
      hasScored = true;
      
      increaseCombo();
      
      addPoints(config.points);
      
      playEatSound(gameState.decayLevel, gameState.combo >= 3);
      
      screenShake();
      pigBounce();
      pigFlash();
      
      food.style.transition = 'all 0.2s ease';
      food.style.opacity = '0';
      food.style.transform = 'scale(0.5)';
      
      setTimeout(() => food.remove(), 200);
      return;
    }
    
    if (!hasScored && !hasMissed && velocityY > 0 && posY > 150) {
      hasMissed = true;
      breakCombo();
    }
    
    if (posY > gameAreaRect.height + 50 || 
        posX > gameAreaRect.width + 50 || 
        posX < -50 ||
        posY < -50) {
      food.remove();
      return;
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

foodButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectFood(btn.dataset.food);
  });
});

document.addEventListener('keydown', (e) => {
  const key = e.key;
  if (key === '1') selectFood('apple');
  if (key === '2') selectFood('burger');
  if (key === '3') selectFood('cake');
  if (key === '4') selectFood('slop');
  
  if (key === ' ' && gameState.gameStarted && !gameState.gameEnded) {
    e.preventDefault();
    const pigBounds = getPigMouthBounds();
    throwFood(pigBounds.centerX, pigBounds.centerY);
  }
});

gameArea.addEventListener('click', (e) => {
  if (gameState.gameEnded) return;
  throwFood(e.clientX, e.clientY);
});

function startGame() {
  gameState.gameStarted = true;
  
  startScreen.classList.add('hidden');
  
  gameContainer.classList.remove('hidden');
  
  initParticles(gameParticles, 30);
  
  playBackgroundMusic(0);
  
  console.log('Feed the Pig started!');
  console.log('Click or press SPACE to throw');
  console.log('Click closer to pig = more force');
  console.log('Click further from pig = less force');
}

function init() {
  updateFoodAvailability();
  
  initParticles(startParticles, 30);
  
  startButton.addEventListener('click', () => {
    startGame();
    initAudio();
  });
  
  console.log('Game ready - click START PLAYING to begin');
}

init();