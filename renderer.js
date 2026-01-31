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
  apple: { image: 'assets/images/apple.png', cost: 0, points: 1, size: 48 },
  burger: { image: 'assets/images/burger.png', cost: 25, points: 5, size: 52 },
  cake: { image: 'assets/images/cake.png', cost: 100, points: 15, size: 64 },
  slop: { image: 'assets/images/slop.png', cost: 500, points: 50, size: 56, erratic: true }
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
const foodButtons = document.querySelectorAll('.food-btn');
const pig = document.getElementById('pig');
const pigMouth = document.getElementById('pig-mouth');
const glitchContainer = document.getElementById('glitch-container');
const pigImage = pig.querySelector('img');

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

  const baseFreq = 440 - decayLevel * 80;
  const duration = 0.15 - decayLevel * 0.02;

  oscillator.frequency.value = baseFreq;
  oscillator.type = decayLevel >= 3 ? 'sawtooth' : 'sine';

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + duration
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

function selectFood(foodType) {
  if (gameState.gameEnded) return;

  const config = FOOD_CONFIG[foodType];
  if (!config || gameState.totalPoints < config.cost) return;

  gameState.currentFood = foodType;

  foodButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.food === foodType);
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

  if (newDecay === gameState.decayLevel) return;

  gameState.decayLevel = newDecay;
  gameContainer.className = `decay-${newDecay}`;

  if (pigImage) pigImage.src = PIG_SPRITES[newDecay];

  if (newDecay >= 3 && !gameState.glitchInterval) startGlitchEffect();
  if (newDecay >= 4) endGame();
}

function updateFoodAvailability() {
  foodButtons.forEach(btn => {
    const cost = parseInt(btn.dataset.cost);
    const foodInfo = btn.querySelector('.food-info');
    const foodType = btn.dataset.food;

    if (gameState.totalPoints >= cost) {
      btn.classList.remove('locked');
      foodInfo.textContent = `+${FOOD_CONFIG[foodType].points}pts`;
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

  glitch.style.left = Math.random() * 400 + 100 + 'px';
  glitch.style.top = Math.random() * 600 + 200 + 'px';
  glitch.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg)`;

  if (Math.random() > 0.5) {
    glitch.style.color = '#8b1e5a';
    glitch.style.textShadow =
      '2px 2px 0 #DC5CA6, 0 0 20px rgba(139, 30, 90, 0.8)';
  }

  glitchContainer.appendChild(glitch);
  setTimeout(() => glitch.remove(), 3000);
}

function startGlitchEffect() {
  gameState.glitchInterval = setInterval(createGlitchText, 800);
  createGlitchText();
}

function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';

  particle.style.left = Math.random() * 600 + 'px';
  particle.style.top = 900 + Math.random() * 50 + 'px';
  particle.style.setProperty('--drift', (Math.random() - 0.5) * 100 + 'px');
  particle.style.animationDelay = Math.random() * 8 + 's';
  particle.style.animationDuration = 8 + Math.random() * 4 + 's';

  container.appendChild(particle);
  setTimeout(() => particle.remove(), 12000);
}

function initParticles(container, count) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      createParticle(container);
      setInterval(
        () => createParticle(container),
        8000 + Math.random() * 4000
      );
    }, i * 200);
  }
}

function getPigMouthBounds() {
  const r = pigMouth.getBoundingClientRect();
  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    centerX: (r.left + r.right) / 2,
    centerY: (r.top + r.bottom) / 2
  };
}

function checkMouthCollision(x, y) {
  const m = getPigMouthBounds();
  const p = 10;
  return x >= m.left - p && x <= m.right + p && y >= m.top - p && y <= m.bottom + p;
}

function calculateForce(clickY) {
  const r = gameArea.getBoundingClientRect();
  const d = r.height - (clickY - r.top);
  const n = Math.max(0, Math.min(1, d / r.height));
  return MIN_FORCE + n * (MAX_FORCE - MIN_FORCE);
}

function throwFood(clickX, clickY) {
  if (gameState.gameEnded || !gameState.canThrow) return;

  const config = FOOD_CONFIG[gameState.currentFood];
  if (!config) return;

  gameState.canThrow = false;
  setTimeout(() => (gameState.canThrow = true), gameState.throwCooldown);

  const food = document.createElement('div');
  food.className = 'food-projectile';

  const img = document.createElement('img');
  img.src = config.image;
  img.style.width = img.style.height = config.size + 'px';
  food.appendChild(img);

  const r = gameArea.getBoundingClientRect();
  let x = r.width / 2;
  let y = r.height - 50;
  let vx = 0;
  let vy = -calculateForce(clickY);
  let scored = false;
  let frame = 0;

  food.style.left = x + 'px';
  food.style.top = y + 'px';
  food.style.width = food.style.height = config.size + 'px';
  gameArea.appendChild(food);

  function animate() {
    frame++;
    vy += GRAVITY;

    if (config.erratic && frame % 5 === 0 && Math.random() > 0.7) {
      vx += (Math.random() - 0.5) * 2;
      vy += (Math.random() - 0.5);
    }

    x += vx;
    y += vy;

    food.style.left = x + 'px';
    food.style.top = y + 'px';
    food.style.transform = `rotate(${frame * 10}deg)`;

    const ax = x + r.left + config.size / 2;
    const ay = y + r.top + config.size / 2;

    if (!scored && checkMouthCollision(ax, ay)) {
      scored = true;
      addPoints(config.points);
      playEatSound(gameState.decayLevel);
      food.style.transition = 'all 0.2s ease';
      food.style.opacity = '0';
      food.style.transform = 'scale(0.5)';
      setTimeout(() => food.remove(), 200);
      return;
    }

    if (y > r.height + 50 || x < -50 || x > r.width + 50 || y < -50) {
      food.remove();
      return;
    }

    requestAnimationFrame(animate);
  }

  animate();
}

foodButtons.forEach(btn =>
  btn.addEventListener('click', e => {
    e.stopPropagation();
    selectFood(btn.dataset.food);
  })
);

document.addEventListener('keydown', e => {
  if (e.key === '1') selectFood('apple');
  if (e.key === '2') selectFood('burger');
  if (e.key === '3') selectFood('cake');
  if (e.key === '4') selectFood('slop');

  if (e.key === ' ' && gameState.gameStarted && !gameState.gameEnded) {
    e.preventDefault();
    const p = getPigMouthBounds();
    throwFood(p.centerX, p.centerY);
  }
});

gameArea.addEventListener('click', e => {
  if (!gameState.gameEnded) throwFood(e.clientX, e.clientY);
});

function startGame() {
  gameState.gameStarted = true;
  startScreen.classList.add('hidden');
  gameContainer.classList.remove('hidden');
  initParticles(gameParticles, 30);
}

function init() {
  updateFoodAvailability();
  initParticles(startParticles, 30);
  startButton.addEventListener('click', () => {
    startGame();
    initAudio();
  });
}

init();
