document.addEventListener('DOMContentLoaded', () => {
  const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

  const canvas = document.getElementById('game-canvas');
  const scoreElement = document.getElementById('score');
  const width = 400;
  const height = 600;
  let score = 0;

  const engine = Engine.create();
  const world = engine.world;

  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false,
      background: '#f0f0f0'
    }
  });

  const runner = Runner.create();
  Runner.run(runner, engine);

  const wallOptions = { isStatic: true, render: { fillStyle: 'black' } };
  World.add(world, [
    Bodies.rectangle(width / 2, height, width, 20, wallOptions), 
    Bodies.rectangle(0, height / 2, 20, height, wallOptions), 
    Bodies.rectangle(width, height / 2, 20, height, wallOptions) 
  ]);

  const gameOverLineY = 70;
  const gameOverLine = Bodies.rectangle(width / 2, gameOverLineY, width, 2, {
      isStatic: true,
      isSensor: true,
      render: { fillStyle: 'red' }
  });
  World.add(world, gameOverLine);

  // ✅ 각 공마다 점수 부여
  const ballProperties = [
    { radius: 10, color: '#FFD700', name: '탁구공', score: 1 },
    { radius: 15, color: '#FFFFFF', name: '골프공', score: 3 },
    { radius: 20, color: '#BFFF00', name: '테니스공', score: 6 },
    { radius: 25, color: '#FF4500', name: '야구공', score: 12 },
    { radius: 30, color: '#4682B4', name: '핸드볼', score: 20 },
    { radius: 35, color: '#DC143C', name: '피구공', score: 30 },
    { radius: 40, color: '#FF69B4', name: '배구공', score: 45 },
    { radius: 45, color: '#0000CD', name: '축구공', score: 65 },
    { radius: 50, color: '#FF8C00', name: '농구공', score: 100 }
  ];

  let currentBall = null;
  let canDrop = true;

  function createNextBall() {
      const rand = Math.random();
      let index;
      if (rand < 0.4) {
        index = 0;
      } else if (rand < 0.7) {
        index = 1;
      } else if (rand < 0.9) {
        index = 2;
      } else {
        index = 3;
      }
      const properties = ballProperties[index];
      const ball = Bodies.circle(width / 2, 30, properties.radius, {
          isStatic: true,
          restitution: 0.2,
          friction: 0.1,
          render: { fillStyle: properties.color },
          label: `ball_${index}`
      });
      currentBall = ball;
      World.add(world, ball);
  }

  document.addEventListener('mousemove', (event) => {
      if (currentBall && canDrop) {
          const rect = canvas.getBoundingClientRect();
          let x = event.clientX - rect.left;

          const radius = currentBall.circleRadius;
          const wallThickness = 10;
          x = Math.max(radius + wallThickness, Math.min(width - radius - wallThickness, x));

          Body.setPosition(currentBall, { x: x, y: currentBall.position.y });
      }
  });

  canvas.addEventListener('click', () => {
      if (currentBall && canDrop) {
          const droppedBall = currentBall;
          Body.setStatic(droppedBall, false);
          canDrop = false;
          currentBall = null;

          const checkInterval = setInterval(() => {
              if (droppedBall.position.y - droppedBall.circleRadius > gameOverLineY) {
                  canDrop = true;
                  createNextBall();
                  clearInterval(checkInterval);
              }
          }, 100);
      }
  });

  // ✅ 충돌 안정화 적용
  Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      pairs.forEach(pair => {
          const { bodyA, bodyB } = pair;

          if (bodyA.label.startsWith('ball_') && bodyB.label.startsWith('ball_') && bodyA.label === bodyB.label) {
              const index = parseInt(bodyA.label.split('_')[1]);

              if (index < ballProperties.length - 1) {
                  const newIndex = index + 1;
                  const properties = ballProperties[newIndex];
                  const newBall = Bodies.circle(
                      (bodyA.position.x + bodyB.position.x) / 2,
                      (bodyA.position.y + bodyB.position.y) / 2,
                      properties.radius, {
                          restitution: 0.2,
                          friction: 0.1,
                          render: { fillStyle: properties.color },
                          label: `ball_${newIndex}`
                      }
                  );

                  // 충돌 처리 안정화를 위해 setTimeout 사용
                  setTimeout(() => {
                    World.remove(world, [bodyA, bodyB]);
                    World.add(world, newBall);
                  }, 0);

                  // ✅ 점수는 공마다 정의된 값 사용
                  score += properties.score;
                  scoreElement.innerText = score;
              }
          }
      });
  });

  Events.on(engine, 'afterUpdate', () => {
      const bodies = World.allBodies(world);
      for (const body of bodies) {
          if (body.label.startsWith('ball_') && !body.isStatic && body.position.y - body.circleRadius < gameOverLineY) {
              console.log('Game Over');
              Runner.stop(runner);
              alert(`게임 오버! 최종 점수: ${score}`);
              break;
          }
      }
  });

  Render.run(render);

  const ballListContainer = document.getElementById('ball-list-container');
  ballProperties.forEach(prop => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'ball-item';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'ball-name';
    nameDiv.innerText = prop.name;

    const ballDiv = document.createElement('div');
    ballDiv.className = 'ball-display';
    ballDiv.style.width = `${prop.radius * 2}px`;
    ballDiv.style.height = `${prop.radius * 2}px`;
    ballDiv.style.backgroundColor = prop.color;

    itemDiv.appendChild(nameDiv);
    itemDiv.appendChild(ballDiv);
    ballListContainer.appendChild(itemDiv);
  });

  createNextBall();
});