document.addEventListener('DOMContentLoaded', () => {
  // Matter.js 모듈 별칭 설정
  const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

  // 게임 설정
  const canvas = document.getElementById('game-canvas');
  const scoreElement = document.getElementById('score');
  const width = 400;
  const height = 600;
  let score = 0;

  // 엔진 생성
  const engine = Engine.create();
  const world = engine.world;

  // 렌더러 생성
  const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: width,
      height: height,
      wireframes: false, // 공을 색상으로 채우기
      background: '#f0f0f0'
    }
  });

  // 러너 생성 및 실행
  const runner = Runner.create();
  Runner.run(runner, engine);

  // 벽과 바닥 생성 (병 모양)
  const wallOptions = { isStatic: true, render: { fillStyle: 'black' } };
  World.add(world, [
    Bodies.rectangle(width / 2, height, width, 20, wallOptions), // 바닥
    Bodies.rectangle(0, height / 2, 20, height, wallOptions), // 왼쪽 벽
    Bodies.rectangle(width, height / 2, 20, height, wallOptions) // 오른쪽 벽
  ]);

  // 게임 오버 라인
  const gameOverLineY = 70;
  const gameOverLine = Bodies.rectangle(width / 2, gameOverLineY, width, 2, {
      isStatic: true,
      isSensor: true, // 물리적 충돌은 없지만 감지는 가능
      render: { fillStyle: 'red' }
  });
  World.add(world, gameOverLine);

  // 공 종류 정의 (탁구공부터 농구공까지)
  const ballProperties = [
    { radius: 10, color: '#FFD700', name: '탁구공' },   // Gold
    { radius: 15, color: '#FFFFFF', name: '골프공' },   // White
    { radius: 20, color: '#BFFF00', name: '테니스공' }, // Lime
    { radius: 25, color: '#FF4500', name: '야구공' },   // OrangeRed
    { radius: 30, color: '#4682B4', name: '핸드볼' },   // SteelBlue
    { radius: 35, color: '#DC143C', name: '피구공' },   // Crimson
    { radius: 40, color: '#FF69B4', name: '배구공' },   // HotPink
    { radius: 45, color: '#0000CD', name: '축구공' },   // MediumBlue
    { radius: 50, color: '#FF8C00', name: '농구공' }    // DarkOrange
  ];

  let currentBall = null;
  let canDrop = true;

  // 다음 떨어뜨릴 공 생성
  function createNextBall() {
      const rand = Math.random();
      let index;
      if (rand < 0.4) {
        index = 0; // 40% 확률
      } else if (rand < 0.7) {
        index = 1; // 30% 확률
      } else if (rand < 0.9) {
        index = 2; // 20% 확률
      } else {
        index = 3; // 10% 확률
      }
      const properties = ballProperties[index];
      const ball = Bodies.circle(width / 2, 30, properties.radius, {
          isStatic: true, // 처음에는 움직이지 않음
          restitution: 0.2, // 탄성 감소
          friction: 0.1, // 마찰력 증가
          render: { fillStyle: properties.color },
          label: `ball_${index}`
      });
      currentBall = ball;
      World.add(world, ball);
  }

  // 마우스 컨트롤
  document.addEventListener('mousemove', (event) => {
      if (currentBall && canDrop) {
          const rect = canvas.getBoundingClientRect();
          let x = event.clientX - rect.left;

          // 공의 반지름을 고려하여 x좌표 제한
          const radius = currentBall.circleRadius;
          const wallThickness = 10; // 벽 두께
          x = Math.max(radius + wallThickness, Math.min(width - radius - wallThickness, x));

          Body.setPosition(currentBall, { x: x, y: currentBall.position.y });
      }
  });

  canvas.addEventListener('click', () => {
      if (currentBall && canDrop) {
          const droppedBall = currentBall;
          Body.setStatic(droppedBall, false); // 공을 떨어뜨림
          canDrop = false;
          currentBall = null;

          // 떨어진 공이 빨간 선을 지났는지 체크
          const checkInterval = setInterval(() => {
              if (droppedBall.position.y - droppedBall.circleRadius > gameOverLineY) {
                  canDrop = true;
                  createNextBall();
                  clearInterval(checkInterval);
              }
          }, 100);
      }
  });

  // 충돌 이벤트 처리
  Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      pairs.forEach(pair => {
          const { bodyA, bodyB } = pair;

          if (bodyA.label.startsWith('ball_') && bodyB.label.startsWith('ball_') && bodyA.label === bodyB.label) {
              const index = parseInt(bodyA.label.split('_')[1]);

              // 마지막 등급의 공은 합쳐지지 않음
              if (index < ballProperties.length - 1) {
                  World.remove(world, [bodyA, bodyB]);

                  const newIndex = index + 1;
                  const properties = ballProperties[newIndex];
                  const newBall = Bodies.circle(
                      (bodyA.position.x + bodyB.position.x) / 2,
                      (bodyA.position.y + bodyB.position.y) / 2,
                      properties.radius, {
                          restitution: 0.2, // 탄성 감소
          friction: 0.1, // 마찰력 증가
                          render: { fillStyle: properties.color },
                          label: `ball_${newIndex}`
                      }
                  );
                  World.add(world, newBall);

                  // 점수 업데이트
                  const points = Math.pow(2, index + 1);
                  score += points;
                  scoreElement.innerText = score;
              }
          }
      });
  });

  // 게임 오버 체크
  Events.on(engine, 'afterUpdate', () => {
      const bodies = World.allBodies(world);
      for (const body of bodies) {
          if (body.label.startsWith('ball_') && !body.isStatic && body.position.y - body.circleRadius < gameOverLineY) {
              console.log('Game Over');
              Runner.stop(runner);
              alert(`게임 오버! 최종 점수: ${score}`);
              // 게임 재시작 로직 (예: 페이지 새로고침)
              // location.reload(); 
              break;
          }
      }
  });

  // 렌더링 시작
  Render.run(render);

  // 공 목록 표시
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

  // 첫 공 생성
  createNextBall();
});