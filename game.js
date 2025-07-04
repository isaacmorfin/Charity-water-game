// --- Language support ---
const translations = {
    en: {
        title: "Water Drop Collector",
        mission: "Help collect clean water and avoid pollutants! Every drop counts for communities in need.",
        instructions: "How to Play: Move the bucket with ← → arrows, A/D keys, or your mouse. Catch 💧, avoid 🟤. You have 30 seconds!",
        controls: "Controls: ← → or A/D or Mouse",
        score: "Score: ",
        timer: "Time: ",
        good: "Great! +1 💧",
        bad: "Oops! Pollutant! -2 😬",
        miss: "Missed! -1",
        start: "Start Game",
        restart: "Play Again",
        final: "Final Score: ",
        prev: "Previous Score: ",
        Dificulty: "Difficulty: ",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
    }

};
const userLang = navigator.language.startsWith('ar') ? 'ar' : 'en';
const t = translations[userLang];

// --- DOM Elements ---
document.getElementById('title').textContent = t.title;
document.getElementById('mission').textContent = t.mission;
document.getElementById('start-btn').textContent = t.start;
document.getElementById('restart-btn').textContent = t.restart;

// --- Device Detection ---
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// --- Instructions ---
let instructionsDiv = document.createElement('div');
instructionsDiv.id = "instructions";
instructionsDiv.style.marginBottom = "10px";
instructionsDiv.style.fontSize = "1em";
instructionsDiv.style.color = "#1976d2";
if (isMobile()) {
    instructionsDiv.innerHTML = `<strong>${
        userLang === 'ar'
            ? "كيفية اللعب: المس الشاشة أو اسحب لتحريك الدلو. اجمع 💧 وتجنب 🟤. لديك 30 ثانية!"
            : "How to Play: Tap or drag on the screen to move the bucket. Catch 💧, avoid 🟤. You have 30 seconds!"
    }</strong><br><span style="font-size:0.95em;color:#555">${
        userLang === 'ar'
            ? "التحكم: اللمس أو السحب فقط (المفاتيح والفأرة غير مدعومة على الجوال)"
            : "Controls: Touch or drag only (keys/mouse not for mobile)"
    }</span>`;
} else {
    instructionsDiv.innerHTML = `<strong>${t.instructions}</strong><br><span style="font-size:0.95em;color:#555">${t.controls}</span>`;
}
document.getElementById('game-container').insertBefore(instructionsDiv, document.getElementById('score-timer-row'));

// --- Game Variables ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let drops = [];
let score = 0;
let prevScore = localStorage.getItem('waterGamePrevScore') || 0;
let gameOver = false;
let feedbackTimeout;
let timer = 30;
let timerInterval;
let gameStarted = false;

// Milestones for extra feedback
const milestones = [
    { score: 5, message: "Nice start! 5 drops collected!" },
    { score: 10, message: "Halfway there! 10 points!" },
    { score: 15, message: "Great job! 15 points!" },
    { score: 20, message: "Amazing! 20 points!" }
];
let nextMilestoneIdx = 0;

// --- Responsive Canvas ---
function resizeCanvas() {
    if (window.innerWidth < 700) {
        canvas.width = 320;
        canvas.height = 400;
    } else {
        canvas.width = 600;
        canvas.height = 500;
    }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --- Bucket Properties ---
const BUCKET_WIDTH = () => canvas.width / 5;
const BUCKET_HEIGHT = 32;
let bucketX = canvas.width / 2 - BUCKET_WIDTH() / 2;
const BUCKET_Y = () => canvas.height - BUCKET_HEIGHT - 8;
const BUCKET_SPEED = () => canvas.width / 32;

// --- Drop Properties ---
// SLOWER: Increase SPAWN_INTERVAL and decrease DROP_SPEED
const DROP_RADIUS = () => canvas.width / 22;
const POLLUTANT_RADIUS = () => canvas.width / 22;
const DROP_SPEED = () => canvas.height / 150; // was /200, now faster
const POLLUTANT_SPEED = () => canvas.height / 130; // was /170, now faster
const SPAWN_INTERVAL = 1300; // ms, was 1800, now 0.5s faster

// --- Draw Functions ---
function drawDrop(x, y) {
    ctx.font = `${Math.floor(DROP_RADIUS()*2)}px Arial`;
    ctx.fillText("💧", x - DROP_RADIUS(), y + DROP_RADIUS());
}
function drawPollutant(x, y) {
    ctx.font = `${Math.floor(POLLUTANT_RADIUS()*2)}px Arial`;
    ctx.fillText("🟤", x - POLLUTANT_RADIUS(), y + POLLUTANT_RADIUS());
}
function drawBucket() {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(bucketX + BUCKET_WIDTH()/2, BUCKET_Y() + BUCKET_HEIGHT/2, BUCKET_WIDTH()/2, BUCKET_HEIGHT/2, 0, 0, Math.PI*2);
    ctx.fillStyle = "#ffeb3b";
    ctx.fill();
    ctx.strokeStyle = "#fbc02d";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.font = `${Math.floor(BUCKET_HEIGHT*0.8)}px Arial`;
    ctx.fillStyle = "#1976d2";
    ctx.fillText("🪣", bucketX + BUCKET_WIDTH()/2 - BUCKET_HEIGHT/2, BUCKET_Y() + BUCKET_HEIGHT/1.2);
    ctx.restore();
}

// --- Drop Spawner ---
let spawnIntervalId;
function spawnDrop() {
    const isPollutant = Math.random() < 0.22; // 22% chance
    drops.push({
        x: Math.random() * (canvas.width - 2 * DROP_RADIUS()) + DROP_RADIUS(),
        y: -DROP_RADIUS(),
        isPollutant: isPollutant
    });
}

// --- Game Loop ---
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bucket
    drawBucket();

    // Move and draw drops
    for (let i = drops.length - 1; i >= 0; i--) {
        let d = drops[i];
        d.y += d.isPollutant ? POLLUTANT_SPEED() : DROP_SPEED();
        if (d.isPollutant) {
            drawPollutant(d.x, d.y);
        } else {
            drawDrop(d.x, d.y);
        }

        // Check for collision with bucket
        if (
            d.y + DROP_RADIUS() >= BUCKET_Y() &&
            d.x > bucketX &&
            d.x < bucketX + BUCKET_WIDTH()
        ) {
            if (d.isPollutant) {
                score = Math.max(0, score - 2);
                showFeedback(t.bad);
                playSound('snd-miss');
            } else {
                score += 1;
                showFeedback(t.good);
                playSound('snd-collect');
                // Check milestone
                if (
                    nextMilestoneIdx < milestones.length &&
                    score >= milestones[nextMilestoneIdx].score
                ) {
                    showFeedback(milestones[nextMilestoneIdx].message);
                    playSound('snd-milestone');
                    nextMilestoneIdx++;
                }
            }
            drops.splice(i, 1);
            continue;
        }

        // Remove drops that hit the ground
        if (d.y > canvas.height + DROP_RADIUS()) {
            if (!d.isPollutant) {
                score = Math.max(0, score - 1); // Penalty for missing water
                showFeedback(t.miss);
                playSound('snd-miss');
            }
            drops.splice(i, 1);
        }
    }

    // Draw score and timer
    document.getElementById('score').textContent = t.score + score;
    document.getElementById('timer').textContent = t.timer + timer + "s";

    if (!gameOver) requestAnimationFrame(update);
}

// --- Handle Keyboard Controls ---
window.addEventListener('keydown', function(e) {
    if (!gameStarted) return;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        bucketX = Math.max(0, bucketX - BUCKET_SPEED());
    } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        bucketX = Math.min(canvas.width - BUCKET_WIDTH(), bucketX + BUCKET_SPEED());
    }
});

// --- Mouse Controls ---
canvas.addEventListener('mousemove', function(e) {
    if (!gameStarted) return;
    const rect = canvas.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    // Center bucket on mouse
    bucketX = Math.max(0, Math.min(canvas.width - BUCKET_WIDTH(), mx - BUCKET_WIDTH()/2));
});

// --- Touch Controls (tap to move bucket) ---
canvas.addEventListener('touchstart', function(e) {
    if (!gameStarted) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    // Move bucket center to touch x
    bucketX = Math.max(0, Math.min(canvas.width - BUCKET_WIDTH(), x - BUCKET_WIDTH()/2));
    touchStartX = touch.clientX;
});
canvas.addEventListener('touchmove', function(e) {
    if (!gameStarted) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    bucketX = Math.max(0, Math.min(canvas.width - BUCKET_WIDTH(), x - BUCKET_WIDTH()/2));
    touchStartX = touch.clientX;
});
canvas.addEventListener('touchend', function() {
    touchStartX = null;
});

// --- Feedback Message ---
function showFeedback(msg) {
    clearTimeout(feedbackTimeout);
    const feedback = document.getElementById('feedback');
    feedback.textContent = msg;
    feedbackTimeout = setTimeout(() => feedback.textContent = '', 900);
}

// --- Timer ---
function startTimer() {
    timer = 30;
    document.getElementById('timer').textContent = t.timer + timer + "s";
    timerInterval = setInterval(() => {
        timer--;
        document.getElementById('timer').textContent = t.timer + timer + "s";
        if (timer <= 0) {
            clearInterval(timerInterval);
            endGame();
        }
    }, 1000);
}

// --- Game Over & Restart ---
function endGame() {
    gameOver = true;
    gameStarted = false;
    clearInterval(spawnIntervalId);
    document.getElementById('final-score').style.display = 'block';
    document.getElementById('final-score').textContent = t.final + score;
    document.getElementById('restart-btn').style.display = 'inline-block';
    localStorage.setItem('waterGamePrevScore', score);
    prevScore = score;
    document.getElementById('prev-score').textContent = t.prev + prevScore;
    launchConfetti();
    playSound('snd-win');
}
function startGame() {
    drops = [];
    score = 0;
    gameOver = false;
    gameStarted = true;
    bucketX = canvas.width / 2 - BUCKET_WIDTH() / 2;
    document.getElementById('score').textContent = t.score + score;
    document.getElementById('feedback').textContent = '';
    document.getElementById('final-score').style.display = 'none';
    document.getElementById('restart-btn').style.display = 'none';
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('prev-score').textContent = t.prev + prevScore;
    nextMilestoneIdx = 0; // <-- Reset milestone tracker
    startTimer();
    spawnIntervalId = setInterval(() => {
        if (!gameOver) spawnDrop();
    }, SPAWN_INTERVAL);
    update();
}
function showStartScreen() {
    document.getElementById('start-btn').style.display = 'inline-block';
    document.getElementById('restart-btn').style.display = 'none';
    document.getElementById('final-score').style.display = 'none';
    document.getElementById('prev-score').textContent = t.prev + prevScore;
}
document.getElementById('start-btn').onclick = function() {
    playSound('snd-button');
    startGame();
};
document.getElementById('restart-btn').onclick = function() {
    playSound('snd-button');
    startGame();
};

// --- Confetti Effect ---
function launchConfetti() {
    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confetti-canvas';
    confettiCanvas.style.position = 'absolute';
    confettiCanvas.style.left = canvas.offsetLeft + 'px';
    confettiCanvas.style.top = canvas.offsetTop + 'px';
    confettiCanvas.width = canvas.width;
    confettiCanvas.height = canvas.height;
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = 10;
    document.getElementById('game-container').appendChild(confettiCanvas);

    const ctx2 = confettiCanvas.getContext('2d');
    const confettiCount = 80;
    const confetti = [];
    const colors = ['#00bcd4', '#ffeb3b', '#1976d2', '#fff176', '#b3e5fc', '#fbc02d'];

    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            x: Math.random() * confettiCanvas.width,
            y: Math.random() * -confettiCanvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * confettiCanvas.height,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }

    let angle = 0;
    let confettiAnimation;

    function drawConfetti() {
        ctx2.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        angle += 0.01;
        for (let i = 0; i < confettiCount; i++) {
            let c = confetti[i];
            c.tiltAngle += c.tiltAngleIncremental;
            c.y += (Math.cos(angle + c.d) + 1 + c.r / 2) * 0.9;
            c.x += Math.sin(angle);
            c.tilt = Math.sin(c.tiltAngle - (i % 3)) * 15;

            ctx2.beginPath();
            ctx2.lineWidth = c.r;
            ctx2.strokeStyle = c.color;
            ctx2.moveTo(c.x + c.tilt + c.r / 3, c.y);
            ctx2.lineTo(c.x + c.tilt, c.y + c.tilt + c.r / 5);
            ctx2.stroke();
        }
        confettiAnimation = requestAnimationFrame(drawConfetti);
    }

    drawConfetti();

    // Remove confetti after 3 seconds
    setTimeout(() => {
        cancelAnimationFrame(confettiAnimation);
        confettiCanvas.remove();
    }, 3000);
}

// --- Sound Effects ---
function playSound(id) {
    const snd = document.getElementById(id);
    if (snd) {
        snd.currentTime = 0;
        snd.play();
    }
}

// --- On Load ---
showStartScreen();