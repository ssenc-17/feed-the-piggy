const gameState = {
  totalPoints: 0,
  currentFood: 'apple',
  decayLevel: 0,
  gameEnded: false,
  soundsEnabled: true,
  gameStarted: false,
  glitchInterval: null,
  canThrow: true,
  throwCooldown: 300
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
    cost: 50,
    points: 5,
    size: 52
  },
  cake: {
    image: 'assets/images/cake.png',
    cost: 200,
    points: 15,
    size: 64
  },
  slop: {
    image: 'assets/images/slop.png',
    cost: 1000,
    points: 50,
    size: 56,
    erratic: true
  }
};

const DECAY_THRESHOLDS = [0, 100, 500, 1500, 3000];
const GLITCH_START_THRESHOLD = 1500;

const GRAVITY = 0.8;
const MIN_FORCE = 15;
const MAX_FORCE = 35;

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameContainer = document.getElementById('game-container');
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score');
const foodButtons = document.querySelectorAll('.food-btn');
const pig = document.getElementById('pig');
const pigMouth = document.getElementById('pig-mouth');
const glitchContainer = document.getElementById('glitch-container');

let audioContext;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playEatSound(decayLevel) {
  if (!gameState.soundsEnabled) return;
  
  initAudio();
  
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  const baseFreq = 440 - (decayLevel * 80);
  const duration = 0.15 - (decayLevel * 0.02);
  
  oscillator.frequency.value = baseFreq;
  oscillator.type = decayLevel >= 3 ? 'sawtooth' : 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
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
  gameState.totalPoints += points;
  scoreDisplay.textContent = gameState.totalPoints;
  
  updateDecayLevel();
  updateFoodAvailability();
}

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
    
    if (gameState.totalPoints >= cost) {
      btn.classList.remove('locked');
      
      if (btn.dataset.food === 'apple') {
        foodInfo.textContent = '+1pt';
      } else if (btn.dataset.food === 'burger') {
        foodInfo.textContent = '+5pts';
      } else if (btn.dataset.food === 'cake') {
        foodInfo.textContent = '+15pts';
      } else if (btn.dataset.food === 'slop') {
        foodInfo.textContent = '+50pts';
      }
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
    glitch.style.color = '#7c1d8e';
    glitch.style.textShadow = '2px 2px 0 #d946ef, 0 0 20px rgba(124, 29, 142, 0.8)';
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

function getPigMouthBounds() {
  const mouthRect = pigMouth.getBoundingClientRect();
  
  return {
    left: mouthRect.left,
    right: mouthRect.right,
    top: mouthRect.top,
    bottom: mouthRect.bottom,
    centerX: (mouthRect.left + mouthRect.right) / 2,
    centerY: (mouthRect.top + mouthRect.bottom) / 2
  };
}

function checkMouthCollision(x, y) {
  const mouth = getPigMouthBounds();
  const padding = 10;
  
  return x >= (mouth.left - padding) &&
         x <= (mouth.right + padding) &&
         y >= (mouth.top - padding) &&
         y <= (mouth.bottom + padding);
}

function calculateForce(clickY) {
  const gameAreaRect = gameArea.getBoundingClientRect();
  const relativeY = clickY - gameAreaRect.top;
  const distanceFromBottom = gameAreaRect.height - relativeY;
  const normalizedDistance = Math.max(0, Math.min(1, distanceFromBottom / gameAreaRect.height));
  
  return MIN_FORCE + (normalizedDistance * (MAX_FORCE - MIN_FORCE));
}

function throwFood(clickX, clickY) {
  if (gameState.gameEnded) return;
  if (!gameState.canThrow) return;
  
  const config = FOOD_CONFIG[gameState.currentFood];
  if (!config) return;
  
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
  let frameCount = 0;
  
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
    food.style.transform = `rotate(${frameCount * 10}deg)`;
    
    const absoluteX = posX + gameAreaRect.left + (config.size / 2);
    const absoluteY = posY + gameAreaRect.top + (config.size / 2);
    
    if (!hasScored && checkMouthCollision(absoluteX, absoluteY)) {
      hasScored = true;
      addPoints(config.points);
      playEatSound(gameState.decayLevel);
      
      food.style.transition = 'all 0.2s ease';
      food.style.opacity = '0';
      food.style.transform = 'scale(0.5)';
      
      setTimeout(() => food.remove(), 200);
      return;
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
  if (e.key === '1') selectFood('apple');
  if (e.key === '2') selectFood('burger');
  if (e.key === '3') selectFood('cake');
  if (e.key === '4') selectFood('slop');
});

gameArea.addEventListener('click', (e) => {
  if (gameState.gameEnded) return;
  throwFood(e.clientX, e.clientY);
});

function startGame() {
  gameState.gameStarted = true;
  startScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
}

function init() {
  updateFoodAvailability();
  
  startButton.addEventListener('click', () => {
    startGame();
    initAudio();
  });
}

init();
