import './style.css'
import { BOARD_WIDTH, BOARD_HEIGHT, createRandomTetromino, type Tetromino, rotateShape, rotateShapeCounterClockwise, createTetrominoByType } from './tetromino.ts'
import { supabase } from './supabaseClient.ts'
import winImg from './assets/win.png';
import loseImg from './assets/lose.png';

/* ----------------------------------- */
/* 定数設定 後ろに！をつけないと？が出てくる
/* ----------------------------------- */
// #app 取得
const app = document.querySelector<HTMLDivElement>('#app')!;
// カンバス取得
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')!;
// カンバスに絵を描くための筆を取得
const context = canvas.getContext('2d')!;
// 1マス当たりのピクセルサイズ（300÷10＝30）
const CELL_SIZE = 30;
// テトロミノの種類ごとの色
const COLORS: Record<string, string> = {
	I: '#00ffff',
	O: '#ffff00',
	T: '#aa00ff',
	S: '#00ff00',
	Z: '#ff0000',
	J: '#0000ff',
	L: '#ff8800',
};
// スコア表示取得
const scoreSpan = document.querySelector<HTMLSpanElement>('#score')!;
// レベル表示取得
const levelSpan = document.querySelector<HTMLSpanElement>('#level')!;
// ゲームオーバー overlay取得
const gameOverOverlay = document.querySelector<HTMLDivElement>('#game-over-overlay')!;
// 最終スコア表示取得
const finalScoreSpan = document.querySelector<HTMLSpanElement>('#final-score')!;
// もう一度遊ぶボタン取得
const restartButton = document.querySelector<HTMLButtonElement>('#restart-button')!;
// 次のブロック表示取得
const nextCanvases = [
	document.querySelector<HTMLCanvasElement>('#next-canvas-1')!,
	document.querySelector<HTMLCanvasElement>('#next-canvas-2')!,
];
// スマホ操作 コントロール取得
const touchControls = document.querySelector<HTMLDivElement>('.touch-controls')!;
// スマホ操作 左移動ボタン取得
const btnLeft = document.querySelector<HTMLButtonElement>('#btn-left')!;
// スマホ操作 右移動ボタン取得
const btnRight = document.querySelector<HTMLButtonElement>('#btn-right')!;
// スマホ操作 クイックドロップボタン取得
const btnDrop = document.querySelector<HTMLButtonElement>('#btn-drop')!;
// スマホ操作 回転ボタン取得
const btnRotate = document.querySelector<HTMLButtonElement>('#btn-rotate')!;
// スマホ操作 逆回転ボタン取得
const btnRotateCcw = document.querySelector<HTMLButtonElement>('#btn-rotate-ccw')!;
// スマホ操作 ソフトドロップボタン取得
const btnDown = document.querySelector<HTMLButtonElement>('#btn-down')!;
// スマホ操作 ホールドボタン取得
const btnHold = document.querySelector<HTMLButtonElement>('#btn-hold')!;
// ホールド機能取得
const holdCanvas = document.querySelector<HTMLCanvasElement>('#hold-canvas')!;
// 自己スコアリスト 取得
const highScoreList = document.querySelector<HTMLOListElement>('#high-score-list')!;
// みんなのハイスコアリスト 取得
const globalHighScoreList = document.querySelector<HTMLOListElement>('#global-high-score-list')!;
// スタート画面 取得
const startScreen = document.querySelector<HTMLDivElement>('#start-screen')!;
// ゲーム画面 取得
const gameScreen = document.querySelector<HTMLDivElement>('#game-screen')!;
// スタートボタン 取得
const startButton = document.querySelector<HTMLButtonElement>('#start-button')!;
// プレイヤー名入力欄 取得
const playerNameInput = document.querySelector<HTMLInputElement>('#player-name-input')!;
// プレイヤー名入力欄 取得
const playerNameSpan = document.querySelector<HTMLSpanElement>('#player-name')!;
// 部屋作成ボタン 取得
const createRoomButton = document.querySelector<HTMLButtonElement>('#create-room-button')!;
// 部屋に入るボタン 取得
const joinRoomButton = document.querySelector<HTMLButtonElement>('#join-room-button')!;
// 部屋コード 取得
const roomCodeInput = document.querySelector<HTMLInputElement>('#room-code-input')!;
// 部屋マッチボタン 取得
const randomMatchButton = document.querySelector<HTMLButtonElement>('#random-match-button')!;
// 待機画面 取得
const waitingScreen = document.querySelector<HTMLDivElement>('#waiting-screen')!;
// 待機画面 部屋番号:入室コード 取得
const waitingRoomInfo = document.querySelector<HTMLSpanElement>('#waiting-room-info')!;
// 待機画面 メッセージ 取得
const waitingMessage = document.querySelector<HTMLParagraphElement>('#waiting-message')!;
// 対戦中 盤面全体 取得
const opponentWrapper = document.querySelector<HTMLDivElement>('#opponent-wrapper')!;
// 対戦中 盤面 取得
const opponentCanvas = document.querySelector<HTMLCanvasElement>('#opponent-canvas')!;
// 対戦中 相手テキスト 取得
const opponentContext = opponentCanvas.getContext('2d')!;
// 対戦中 相手スコア 取得
const opponentScoreSpan = document.querySelector<HTMLSpanElement>('#opponent-score')!;
// 勝敗表示 取得
const versusResultImage = document.querySelector<HTMLImageElement>('#versus-result')!;
// スタート画面へ戻るボタン 取得
const returnStartButton = document.querySelector<HTMLButtonElement>('#return-start-button')!;


/* ----------------------------------- */
/* 変数
/* ----------------------------------- */
// 盤面データ：20行×10列、最初は全部0＝空 行ごとに独立した新しい配列を作る
let board: number[][] = Array.from({ length: BOARD_HEIGHT }, () =>
	Array(BOARD_WIDTH).fill(0)
);
// 今落ちているテトロミノ
let currentTetromino: Tetromino = createRandomTetromino();
// 次のブロックを配列で管理
let nextQueue: Tetromino[] = [
	createRandomTetromino(),
	createRandomTetromino(),
];
// スコアを管理する変数
let score = 0;
// level変数
let level = 1;
// 削除ライン合計数
let totalLinesCleared = 0;
// ゲーム終了を管理変数
let isGameOver = false;
// 何もホールドしていない状態＝null
let holdTetromino: Tetromino | null = null;
// 今のブロックでホールドを使っていないかどうか
let canHold = true;
// 固定を遅らせるためのタイマーID
let lockDelayTimer: number | undefined;
// プレイヤー名を管理する変数
let playerName = 'プレイヤー'; // デフォ値
// 今参加している部屋番号
let currentRoomCode: string | null = null;
// @ts-ignore:  自分が部屋を作った側(1人目)かどうか
let isPlayer1 = false;
// リアルタイムのやり取りに使う「チャンネル」を管理する変数
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
// 対戦モードかどうか
let isVersusMode = false;


/* ----------------------------------- */
/* 関数
/* ----------------------------------- */
// 指定した1マス分の四角を描く関数
function drawCell(x: number, y: number, color: string) {
	context.fillStyle = color;
	context.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
	context.strokeStyle = '#222222';
	context.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
}

// 盤面全体を描画する関数
function draw() {
	// 背景を黒で塗りつぶす
	context.fillStyle = '#000000';
	context.fillRect(0, 0, canvas.width, canvas.height);

	// 背景に薄いグリッド線を描く
	context.strokeStyle = '#222244';
	for (let row = 0; row <= BOARD_HEIGHT; row++) {
		context.beginPath();
		context.moveTo(0, row * CELL_SIZE);
		context.lineTo(canvas.width, row * CELL_SIZE);
		context.stroke();
	}
	for (let col = 0; col <= BOARD_WIDTH; col++) {
		context.beginPath();
		context.moveTo(col * CELL_SIZE, 0);
		context.lineTo(col * CELL_SIZE, canvas.height);
		context.stroke();
	}

	// 盤面を描画する（すでに固定されたブロック）
	for (let row = 0; row < BOARD_HEIGHT; row++) {
		for (let col = 0; col < BOARD_WIDTH; col++) {
			if (board[row][col] !== 0) {
				drawCell(col, row, '#888888');
			} else if (board[row][col] === 2) {
				drawCell(col, row, '#555555'); // おじゃまブロックは、少し暗い色にする
			}
		}
	}

	// 着地予測市を描画
	drawGhost();

	// 今落ちているテトロミノを描画する
	const shape = currentTetromino.shape;
	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] !== 0) {
				drawCell(
					currentTetromino.x + col,
					currentTetromino.y + row,
					COLORS[currentTetromino.type]
				);
			}
		}
	}
}

/* ----------------------------------- */
/* 対戦相手の盤面を描画する関数
/* ----------------------------------- */
function drawOpponentBoard(opponentBoard: number[][], opponentTetromino: Tetromino) {
	const opponentCellSize = 15; // 自分の盤面(30px)の半分のサイズ

	opponentContext.fillStyle = '#000000';
	opponentContext.fillRect(0, 0, opponentCanvas.width, opponentCanvas.height);

	// 固定されたブロックを描画する
	for (let row = 0; row < BOARD_HEIGHT; row++) {
		for (let col = 0; col < BOARD_WIDTH; col++) {
			if (opponentBoard[row][col] !== 0) {
				opponentContext.fillStyle = '#888888';
				opponentContext.fillRect(
					col * opponentCellSize,
					row * opponentCellSize,
					opponentCellSize,
					opponentCellSize
				);
			}
		}
	}

	// 落下中のテトロミノを描画する
	const shape = opponentTetromino.shape;
	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] !== 0) {
				opponentContext.fillStyle = COLORS[opponentTetromino.type];
				opponentContext.fillRect(
					(opponentTetromino.x + col) * opponentCellSize,
					(opponentTetromino.y + row) * opponentCellSize,
					opponentCellSize,
					opponentCellSize
				);
			}
		}
	}
}

/* ----------------------------------- */
/* 着地予測位置を描画する関数
/* ----------------------------------- */
function drawGhost() {
	// 現在のテトロミノをコピーして落とせるだけ落としたテスト用データを作る
	const ghost: Tetromino = { ...currentTetromino };

	// 着地位置を計算
	while (canMove(ghost, 0, 1)) {
		ghost.y += 1;
	}

	const shape = ghost.shape;
	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] !== 0) {
				const x = ghost.x + col;
				const y = ghost.y + row;

				// 塗りつぶさずに薄い枠線だけ書く
				context.strokeStyle = COLORS[ghost.type];
				context.lineWidth = 2;
				context.strokeRect(
					x * CELL_SIZE + 2,
					y * CELL_SIZE + 2,
					CELL_SIZE - 4,
					CELL_SIZE - 4
				);
			}
		}
	}

	// 他の描画に影響しないよう 線の太さを元に戻す
	context.lineWidth = 1;
}


// 次に来る3つのブロックをそれぞれ固定サイズ・中央寄せで描画する
function drawNextQueue() {
	const previewCellSize = 20;
	const boxSize = 4 * previewCellSize; // どの形でも入る、4マス分のサイズ

	nextQueue.forEach((tetromino, index) => {
		const targetCanvas = nextCanvases[index];
		const targetContext = targetCanvas.getContext('2d')!;

		targetContext.fillStyle = '#000000';
		targetContext.fillRect(0, 0, boxSize, boxSize);

		const shape = tetromino.shape;
		const shapeWidth = shape[0].length * previewCellSize;
		const shapeHeight = shape.length * previewCellSize;

		// 中央に来るように予約分を計算する
		const offsetX = (boxSize - shapeWidth) / 2;
		const offsetY = (boxSize - shapeHeight) / 2;

		for (let row = 0; row < shape.length; row++) {
			for (let col = 0; col < shape[row].length; col++) {
				if (shape[row][col] !== 0) {
					const x = offsetX + col * previewCellSize;
					const y = offsetY + row * previewCellSize;

					targetContext.fillStyle = COLORS[tetromino.type];
					targetContext.fillRect(x, y, previewCellSize, previewCellSize);
					targetContext.strokeStyle = '#111111';
					targetContext.strokeRect(x, y, previewCellSize, previewCellSize);
				}
			}
		}
	});
}


/* ----------------------------------- */
/* ホールド中のブロックを描画する関数
/* ----------------------------------- */
function drawHold() {
	const previewCellSize = 20;
	const boxSize = 4 * previewCellSize;
	const holdContext = holdCanvas.getContext('2d')!;

	holdCanvas.width = boxSize;
	holdCanvas.height = boxSize;

	holdContext.fillStyle = '#000000';
	holdContext.fillRect(0, 0, boxSize, boxSize);

	// 何も預けていなければ黒背景で終わる
	if (holdTetromino === null) return;

	const shape = holdTetromino.shape;
	const shapeWidth = shape[0].length * previewCellSize;
	const shapeHeight = shape.length * previewCellSize;
	const offsetX = (boxSize - shapeWidth) / 2;
	const offsetY = (boxSize - shapeHeight) / 2;

	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] !== 0) {
				const x = offsetX + col * previewCellSize;
				const y = offsetY + row * previewCellSize;

				holdContext.fillStyle = COLORS[holdTetromino.type];
				holdContext.fillRect(x, y, previewCellSize, previewCellSize);
				holdContext.strokeStyle = '#111111';
				holdContext.strokeRect(x, y, previewCellSize, previewCellSize);
			}
		}
	}
}


/* ----------------------------------- */
/* テトロミノを下に落とす
/* ----------------------------------- */
// テトロミノを1マス下に落とす関数
function dropTetromino() {
	if (canMove(currentTetromino, 0, 1)) {
		// 下に1マス動かせるか確認し、動けるならyを増やす
		currentTetromino.y += 1;

		// 下に動けた場合：固定待ちのタイマーが動いていたらタイマーをキャンセル　
		// →落下が続く
		if (lockDelayTimer !== undefined) {
			clearTimeout(lockDelayTimer);
			lockDelayTimer = undefined;
		}
	} else {
		// 動けない場合；固定タイマーが動いていなければ新しく仕掛ける
		if (lockDelayTimer === undefined) {
			lockDelayTimer = window.setTimeout(() => {
				// 何かにぶつかるなら、その場で固定
				fixTetromino();
				lockDelayTimer = undefined;
				draw();
			}, 500);
		}
	}
	draw();
}

// もしまだ下に動けるなら：進行中の固定タイマーをキャンセルする関数
function resetLockDelayIfNeeded() {
	if (canMove(currentTetromino, 0, 1) && lockDelayTimer !== undefined) {
		clearTimeout(lockDelayTimer);
		lockDelayTimer = undefined;
	}
}

let isSoftDropping = false; // 下キーが押されている間かどうか
const SOFT_DROP_SPEED = 50; // ソフトドロップ中の落下間隔（ミリ秒）


// 次の自動落下を予約する関数
function scheduleNextDrop() {
	// ゲームオーバー：それ以上落下処理をしない
	if (isGameOver) return;

	const normalSpeed = Math.max(600 - (level - 1) * 50, 100); // レベルが上がると50msずつ早くなる　催促100ms
	const speed = isSoftDropping ? SOFT_DROP_SPEED : normalSpeed; // ソフトドロップなら50ミリ秒、そうでないなら600ミリ秒
	setTimeout(() => {
		dropTetromino();
		scheduleNextDrop(); // 実行後、また次の落下を自分自身で予約する
	}, speed);
}


/* ----------------------------------- */
/* 衝突判定
/* ----------------------------------- */
// 指定した位置にテトロミノを置けるかどうかを判定する関数
function canMove(tetromino: Tetromino, offsetX: number, offsetY: number): boolean {
	const shape = tetromino.shape;

	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] === 0) continue; // ブロックがないマスは無視

			const newX = tetromino.x + col + offsetX;
			const newY = tetromino.y + row + offsetY;

			// 盤面の左右・下からはみ出していないか
			// 動かした後の位置が、盤面より左、右端より右、下はしより下になってないか確認
			if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
				return false;
			}

			// すでに固定されているブロックとぶつかっていないか
			// ※newYがマイナスの間＝まだ盤面より上にいる間はチェックしない
			if (newY >= 0 && board[newY][newX] !== 0) {
				return false;
			}
		}
	}
	return true;
}

// テトロミノを盤面に固定する関数 boardに書き込むよ
function fixTetromino() {
	if (isGameOver) return; // すでにゲームオーバーなら何もしない
	const shape = currentTetromino.shape;

	for (let row = 0; row < shape.length; row++) {
		for (let col = 0; col < shape[row].length; col++) {
			if (shape[row][col] !== 0) { // 実際にブロックがあるマスだけ書き込む
				const boardY = currentTetromino.y + row;
				const boardX = currentTetromino.x + col;
				if (boardY >= 0) {
					board[boardY][boardX] = 1;
				}
			}
		}
	}

	// 固定した直後に、そろった行がないか確認する
	clearLines();

	// 新しいテトロミノを出現される
	const upcomingTetromino = nextQueue[0]; // キューの先頭を次に使うブロックにする

	// 新しいテトロミノがその場に置けない場合：ゲームオーバーにする
	if (!canMove(upcomingTetromino, 0, 0)) {
		isGameOver = true;
		// 最終スコアを表示
		finalScoreSpan.textContent = score.toString();
		// 今回のスコアを保存する
		saveHighScore(score);
		// ハイスコア一覧を表示する
		renderHighScores();
		// サーバーにも送信する
		submitScoreToServer(score);
		// みんなのハイスコアを表示する
		renderGlobalHighScores();

		// 対戦中なら、自分の負けを表示し、相手に通知する
		if (isVersusMode) {
			versusResultImage.src = loseImg;
			versusResultImage.alt = '敗北';
			versusResultImage.classList.remove('hidden');
			sendGameOver();
		}

		// 操作ボタンを隠す
		touchControls.classList.add('hidden');

		// overlayを表示
		gameOverOverlay.classList.remove('hidden');
		return; // ここで処理終了→currentTetrominoを更新しない
	}
	currentTetromino = upcomingTetromino;
	canHold = true; // 新しいブロック→ホールドを使えるようにする

	// キューの先頭を取り除き末尾に新しいブロックを1つ補充する
	nextQueue.shift();
	nextQueue.push(createRandomTetromino());

	drawNextQueue();
}


/* ----------------------------------- */
/* ホールド操作を行う関数
/* ----------------------------------- */
function holdCurrentTetromino() {
	// すでにこのブロックでホールドを使っていたら何もしない
	if (!canHold) return;

	// 今のブロックの種類を覚える
	const heldType = currentTetromino.type;

	if (holdTetromino === null) {
		// 何も預けていない場合：ブロックをそのまま預けて次へ
		holdTetromino = createTetrominoByType(heldType);
		currentTetromino = nextQueue[0];
		nextQueue.shift();
		nextQueue.push(createRandomTetromino());
		drawNextQueue();
	} else {
		// すでに預けている場合：今のブロックと預けていたブロックを入れ替える
		const swappedType = holdTetromino.type;
		holdTetromino = createTetrominoByType(heldType);
		currentTetromino = createTetrominoByType(swappedType);
	}

	// このブロックではホールドを使えなくする
	canHold = false;
	drawHold();
	draw();
}

/* ----------------------------------- */
/* 行を消す判定
/* ----------------------------------- */
// 揃った行を探して消す関数
function clearLines() {
	// 消える予定の行番号を集める
	const fullRowIndexes: number[] = [];
	board.forEach((row, index) => {
		if (row.every((cell) => cell !== 0)) {
			fullRowIndexes.push(index);
		}
	});

	// 消える業がなければ何もしない
	if (fullRowIndexes.length === 0) return;

	// 光らせるエフェクトを一瞬表示してから削除処理を行う
	flashRows(fullRowIndexes, () => {
		// 行が埋まっているかを基準にする。埋まってない業だけ残す　
		// (row) => row～：配列中に条件に合う要素が1つでもあればtrueを返す
		const remainingRows = board.filter((row) => row.some((cell) => cell === 0));
		// 消えた行数
		const clearedCount = BOARD_HEIGHT - remainingRows.length;

		// 消えた行数分、盤面の一番上に新しい空の行を追加する
		for (let i = 0; i < clearedCount; i++) {
			// 消えた行数分、空の行を先頭に追加
			remainingRows.unshift(Array(BOARD_WIDTH).fill(0));
		}

		board = remainingRows;

		// 消した行数に応じてスコアを加算する
		if (clearedCount > 0) {
			const scoreTable: Record<number, number> = {
				1: 100,
				2: 300,
				3: 500,
				4: 800,
			};
			score += scoreTable[clearedCount] || 0; // clearedCountが0の時、5以上のような想定外の値だった場合に備えて、対応する点数が見つからなければ0点にする
			scoreSpan.textContent = score.toString();

			// 累計ライン数を更新し レベルアップを判定する
			totalLinesCleared += clearedCount; // 今回消した行数を累計に足す
			const newLevel = Math.floor(totalLinesCleared / 10) + 1; // 累計10行と都にレベルが1上がる（範囲：0～9行＝1レベル）

			// レベルが変わったときだけ画面表示を更新
			if (newLevel !== level) {
				level = newLevel;
				levelSpan.textContent = level.toString();
			}

			// 対戦中、2行以上消したらおじゃまブロックを送る
			if (isVersusMode && clearedCount >= 2) {
				// 何行分のお邪魔ブロックを送るか定義
				const attackTable: Record<number, number> = {
					2: 1,
					3: 2,
					4: 4,
				};
				const attackLines = attackTable[clearedCount] || 0;
				sendAttack(attackLines);
			}
		}
		draw();
	});
}


// おじゃまブロックを受け取り、盤面の一番下に追加する関数
function receiveAttack(lines: number) {
	for (let i = 0; i < lines; i++) {
		// 1箇所だけ穴が空いた、おじゃまブロックの行を作る
		const holePosition = Math.floor(Math.random() * BOARD_WIDTH);
		// 2 = おじゃまブロック専用の印
		const garbageRow = Array(BOARD_WIDTH).fill(2);
		// その位置だけ穴を空ける
		garbageRow[holePosition] = 0;

		// 盤面の一番上の行を取り除き(押し出し)、一番下に新しい行を追加する
		board.shift();
		board.push(garbageRow);
	}

	draw();
}

// 指定した行を白く光らせてから、コールバック関数を実行
function flashRows(rowIndexes: number[], callback: () => void) {
	let flashCount = 0;
	const maxFlashes = 3; // 光る回数

	const flashInterval = setInterval(() => {
		if (flashCount % 2 === 0) {
			// 偶数の時：白く塗る
			for (const rowIndex of rowIndexes) {
				context.fillStyle = '#ffffff';
				context.fillRect(0, rowIndex * CELL_SIZE, canvas.width, CELL_SIZE);
			}
		} else {
			// 奇数の時：元の描画に戻す（盤面再描画）
			draw();
		}

		flashCount++;

		if (flashCount >= maxFlashes * 2) {
			clearInterval(flashInterval);
			callback(); //光らせ終わったら本来の削除処理を実行
		}
	}, 80);
}

// テトロミノを回転させる関数（壁などにぶつかる場合：回転しない）
function tryRotate(direction: 'clockwise' | 'counterclockwise' = 'clockwise') {
	// 数の型を「'clockwise'か'counterclockwise'のどちらか」に限定しつつ、= 'clockwise'で「指定がなければ時計回りをデフォルトにする」
	const rotatedShape = direction === 'clockwise'
		? rotateShape(currentTetromino.shape)
		: rotateShapeCounterClockwise(currentTetromino.shape);

	// 回転後の形を仮に持った、テスト用のテトロミノを作る
	// currentTetrominoの構文をコピーしつつ、shapeだけ新しい回転後の形に差し替える別のオブジェクト
	const testTetromino: Tetromino = {
		...currentTetromino,
		shape: rotatedShape,
	};

	// 回転後の形のまま、今の位置（offsetX=0、offsetY=0）におけるか確認する
	if (canMove(testTetromino, 0, 0)) {
		currentTetromino.shape = rotatedShape;
		resetLockDelayIfNeeded(); // 横移動等に成功したら固定タイマーをリセット
		draw();
	}
}


/* ----------------------------------- */
/* ブロック動かし
/* ----------------------------------- */
// キーボード操作
document.addEventListener('keydown', (event) => {
	// ゲームオーバー中は操作を受け付けない
	if (isGameOver) return;

	if (event.key == 'ArrowLeft' || event.key == 'a' || event.key == 'A') {
		if (canMove(currentTetromino, -1, 0)) {
			// 左に行ったらx = -1にする
			currentTetromino.x -= 1;
			resetLockDelayIfNeeded(); // 横移動等に成功したら固定タイマーをリセット
			draw();
		}
		btnLeft.classList.add('pressed');
	} else if (event.key === 'ArrowRight' || event.key == 'd' || event.key == 'D') {
		if (canMove(currentTetromino, 1, 0)) {
			// 右に行ったら+1する
			currentTetromino.x += 1;
			resetLockDelayIfNeeded(); // 横移動等に成功したら固定タイマーをリセット
			draw();
		}
		btnRight.classList.add('pressed');
	} else if (event.key === 'ArrowDown' || event.key == 's' || event.key == 'S') {
		isSoftDropping = true;
		btnDown.classList.add('pressed');
	} else if (event.key === 'ArrowUp' || event.key == 'x' || event.key == 'X') {
		tryRotate();
		btnRotate.classList.add('pressed');
	} else if (event.key === 'z' || event.key === 'Z') {
		tryRotate('counterclockwise');
		btnRotateCcw.classList.add('pressed');
	} else if (event.key === ' ') {
		event.preventDefault(); // ページのスクロールを防ぐ
		// スペースキーでハードドロップ
		while (canMove(currentTetromino, 0, 1)) {
			currentTetromino.y += 1;
		}
		// 固定タイマーが動いていたら、念のためキャンセルする
		if (lockDelayTimer !== undefined) {
			clearTimeout(lockDelayTimer);
			lockDelayTimer = undefined;
		}
		fixTetromino();
		draw();
		btnDrop.classList.add('pressed');
	} else if (event.key === 'c' || event.key === 'C') {
		holdCurrentTetromino();
		btnHold.classList.add('pressed');
	}
});

// キーを離したときの処理　キーが離れたらソフトドロップは終わる
document.addEventListener('keyup', (event) => {
	if (event.key == 'ArrowDown' || event.key == 's' || event.key == 'S') {
		isSoftDropping = false;
	}

	// どのキーが離されても 対応するボタンの見た目を元に戻す
	if (event.key === 'ArrowLeft') btnLeft.classList.remove('pressed');
	if (event.key === 'ArrowRight') btnRight.classList.remove('pressed');
	if (event.key === ' ') btnDrop.classList.remove('pressed');
	if (event.key === 'ArrowDown') btnDown.classList.remove('pressed');
	if (event.key === 'ArrowUp') btnRotate.classList.remove('pressed');
	if (event.key === 'z' || event.key === 'Z') btnRotateCcw.classList.remove('pressed');
	if (event.key === 'c' || event.key === 'C') btnHold.classList.remove('pressed');
});


/* ----------------------------------- */
/* リスタートボタン処理
/* ----------------------------------- */
restartButton.addEventListener('click', () => {
	// 盤面・テトロミノ・プレビュー・スコア・レベル・累計ライン数・ゲームオーバー：初期化
	board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
	currentTetromino = createRandomTetromino();
	nextQueue = [
		createRandomTetromino(),
		createRandomTetromino(),
	];
	holdTetromino = null; // ホールドをリセット
	canHold = true; // ホールドを再び使えるように

	// 固定タイマーが動いていたら止めておく
	if (lockDelayTimer !== undefined) {
		clearTimeout(lockDelayTimer);
		lockDelayTimer = undefined;
	}

	score = 0;
	level = 1;
	totalLinesCleared = 0;
	isGameOver = false;

	scoreSpan.textContent = '0';
	levelSpan.textContent = '1';
	// 操作ボタンを隠す
	touchControls.classList.remove('hidden');
	gameOverOverlay.classList.add('hidden');

	draw();
	drawNextQueue(); // プレビュー描画
	drawHold(); // ホールド欄も空の状態で再描画
	scheduleNextDrop(); // 止まっていた自動落下を再開
});

// スタート画面に戻るボタンの処理
returnStartButton.addEventListener('click', () => {
	// 対戦中なら、Realtimeの接続を切る
	if (realtimeChannel !== null) {
		supabase.removeChannel(realtimeChannel); // 対戦ちゅだったら通信チャンネルを明示的に切断
		realtimeChannel = null;
	}

	isVersusMode = false;
	currentRoomCode = null;
	opponentWrapper.classList.add('hidden');
	versusResultImage.classList.add('hidden');

	// ゲームの状態を初期化する(リスタート処理と同じ内容)
	board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
	currentTetromino = createRandomTetromino();
	nextQueue = [
		createRandomTetromino(),
		createRandomTetromino(),
	];
	holdTetromino = null;
	canHold = true;

	if (lockDelayTimer !== undefined) {
		clearTimeout(lockDelayTimer);
		lockDelayTimer = undefined;
	}

	score = 0;
	level = 1;
	totalLinesCleared = 0;
	isGameOver = true; // 自動落下ループを止めるため、一旦trueにしておく

	scoreSpan.textContent = '0';
	levelSpan.textContent = '1';
	// 操作ボタンを隠す
	touchControls.classList.add('hidden');
	gameOverOverlay.classList.add('hidden');

	gameScreen.classList.add('hidden');
	startScreen.classList.remove('hidden');

	app.classList.remove('match-width'); // 対戦用 maxwidth変更クラス消す
});

/* ----------------------------------- */
/* スワイプ操作(盤面へのタッチ)
/* ----------------------------------- */
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

const SWIPE_MOVE_THRESHOLD = 30; // これ以上横に動いたら「左右移動」とみなす距離(px)
const SWIPE_DROP_THRESHOLD = 60; // これ以上下に動いたら「ハードドロップ」とみなす距離(px)
const SWIPE_DROP_MAX_TIME = 300; // ハードドロップとみなす、フリックの最大時間(ミリ秒)

canvas.addEventListener('touchstart', (event) => {
	if (isGameOver) return;
	const touch = event.touches[0];
	touchStartX = touch.clientX;
	touchStartY = touch.clientY;
	touchStartTime = Date.now();
});

canvas.addEventListener('touchend', (event) => {
	if (isGameOver) return;
	const touch = event.changedTouches[0];
	const deltaX = touch.clientX - touchStartX;
	const deltaY = touch.clientY - touchStartY;
	const elapsedTime = Date.now() - touchStartTime;

	// 下方向への素早い動きなら、ハードドロップと判定する
	if (deltaY > SWIPE_DROP_THRESHOLD && elapsedTime < SWIPE_DROP_MAX_TIME && Math.abs(deltaX) < Math.abs(deltaY)) {
		while (canMove(currentTetromino, 0, 1)) {
			currentTetromino.y += 1;
		}
		if (lockDelayTimer !== undefined) {
			clearTimeout(lockDelayTimer);
			lockDelayTimer = undefined;
		}
		fixTetromino();
		draw();
		return;
	}

	// 横方向への動きなら、左右移動と判定する
	if (Math.abs(deltaX) > SWIPE_MOVE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
		if (deltaX > 0) {
			if (canMove(currentTetromino, 1, 0)) {
				currentTetromino.x += 1;
				resetLockDelayIfNeeded();
				draw();
			}
		} else {
			if (canMove(currentTetromino, -1, 0)) {
				currentTetromino.x -= 1;
				resetLockDelayIfNeeded();
				draw();
			}
		}
	}
});


/* ----------------------------------- */
/* スマホ操作ボタン処理
/* ----------------------------------- */
// 左ボタン
btnLeft.addEventListener('click', () => {
	if (isGameOver) return;
	if (canMove(currentTetromino, -1, 0)) {
		currentTetromino.x -= 1;
		resetLockDelayIfNeeded();
		draw();
	}
});
// 右ボタン
btnRight.addEventListener('click', () => {
	if (isGameOver) return;
	if (canMove(currentTetromino, 1, 0)) {
		currentTetromino.x += 1;
		resetLockDelayIfNeeded();
		draw();
	}
});
// ハードドロップボタン
btnDrop.addEventListener('click', () => {
	if (isGameOver) return;
	while (canMove(currentTetromino, 0, 1)) {
		currentTetromino.y += 1;
	}
	if (lockDelayTimer !== undefined) {
		clearTimeout(lockDelayTimer);
		lockDelayTimer = undefined;
	}
	fixTetromino();
	draw();
});
// 回転ボタン
btnRotate.addEventListener('click', () => {
	if (isGameOver) return; // ゲームオーバーの場合は処理しない
	tryRotate();
});
btnRotateCcw.addEventListener('click', () => {
	if (isGameOver) return;
	tryRotate('counterclockwise');
});
// ソフトドロップボタン
btnDown.addEventListener('touchstart', (event) => {
	// 押している間だけ有効にする。
	event.preventDefault();
	isSoftDropping = true;
});
btnDown.addEventListener('touchend', () => {
	isSoftDropping = false; // 離したらソフトドロップをやめる
});
btnDown.addEventListener('mousedown', () => {
	// PCのマウス操作でもできるように
	isSoftDropping = true;
});
btnDown.addEventListener('mouseup', () => {
	isSoftDropping = false; // 離したらソフトドロップをやめる
});
// ホールドボタン
btnHold.addEventListener('click', () => {
	if (isGameOver) return;
	holdCurrentTetromino();
});


/* ---------------------------------------- */
/* ローカルストレージとのやり取り（ハイスコア）
/* ---------------------------------------- */
// ローカルストレージに保存するときの名前（キー）
const HIGH_SCORE_KEY = 'tetris-high-scores';

// ローカルストレージから保存されているハイスコア一覧を読み込む関数
function loadHighScores(): number[] {
	const saved = localStorage.getItem(HIGH_SCORE_KEY); //保存しているデータ読み込み
	// まだ何も保存されていない場合：空の配列を返す
	if (saved === null) return [];
	return JSON.parse(saved); // 保存している文字列→配列に戻す命令
}

// 新しいスコアを追加し上位5件だけをローカルストレージに保存しなおす関数
function saveHighScore(newScore: number) {
	const scores = loadHighScores();
	scores.push(newScore);
	scores.sort((a, b) => b - a); // 大きい順に並び変える　(a, b) => b - aという書き方は、数値配列を降順に並べ替えるときの書き方
	const top3 = scores.slice(0, 3); // 上位5件だけ残す
	localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(top3)); // JSON.stringify：配列を文字列に変換して保存
}

// ハイスコア一覧を画面に表示する関数
function renderHighScores() {
	const scores = loadHighScores();
	highScoreList.innerHTML = '';

	for (const score of scores) {
		const item = document.createElement('li');
		item.textContent = score.toString();
		highScoreList.appendChild(item);
	}
}

/* ------------------------------------ */
/* Supabaseにスコアを送信する関数
/* ------------------------------------ */
// async function：時間のかかるネットワーク通信処理を行う印示
async function submitScoreToServer(newScore: number) {
	// supabase.from('scores')：scoresテーブルを対象指定
	const { error } = await supabase
		.from('scores')
		.insert({ score: newScore, player_name: playerName });
	if (error) {
		console.error('スコアの送信に失敗しました：', score);
	}
}

// Supabaseから、上位5件のハイスコアを読み込む関数
// 返り値：{score, player_name}配列
async function fetchGlobalHighScores(): Promise<{ score: number; player_name: string }[]> {
	const { data, error } = await supabase
		.from('scores')
		.select('score, player_name')
		.order('score', { ascending: false }) // スコアが高い順に並べる
		.limit(3); // 上位5件だけ取得する

	if (error) {
		console.error('ハイスコアの取得に失敗しました:', error);
		return [];
	}

	return data;
}

// サーバーから取得したハイスコアを画面に表示する関数
async function renderGlobalHighScores() {
	const scores = await fetchGlobalHighScores();
	globalHighScoreList.innerHTML = '';

	for (const entry of scores) {
		const item = document.createElement('li');
		item.textContent = `${entry.player_name}: ${entry.score}`; // fetchGlobalHighScoresが返してくれる1件ずつのデータから名前とスコアを取り出す
		globalHighScoreList.appendChild(item);
	}
}


/* ------------------------------------ */
/* スタートボタン処理
/* ------------------------------------ */
// ゲームを開始する共通処理
function startGameScreen() {
	isGameOver = false;
	startScreen.classList.add('hidden');   // スタート画面を隠す
	gameScreen.classList.remove('hidden'); // ゲーム画面を表示

	// ゲームを開始する
	draw();
	drawNextQueue();
	scheduleNextDrop();
}
startButton.addEventListener('click', () => {
	// プレイヤー名バリューに入れる
	const inputValue = playerNameInput.value.trim(); // 前後の余計な空白を取り除く
	// もし空欄ならプレイヤーを、そうでなければ入力された名前を使う
	playerName = inputValue === '' ? 'プレイヤー' : inputValue;
	// ゲーム画面に名前を表示する
	playerNameSpan.textContent = playerName;

	startGameScreen();
});


/* ----------------------------------- */
/* 対戦部屋(ルーム)の管理
/* ----------------------------------- */
// ランダムな6文字の部屋番号を生成する関数
function generateRoomCode(): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars[Math.floor(Math.random() * chars.length)];
	}
	return code;
}

// 新しい部屋を作成する関数
async function createRoom() {
	const inputValue = playerNameInput.value.trim();
	playerName = inputValue === '' ? 'プレイヤー' : inputValue;

	const roomCode = generateRoomCode();

	const { error } = await supabase
		.from('rooms')
		.insert({
			room_code: roomCode,
			player1_name: playerName,
			status: 'waiting',
		});

	if (error) {
		console.error('部屋の作成に失敗しました:', error);
		alert('部屋の作成に失敗しました。もう一度お試しください。');
		return;
	}

	currentRoomCode = roomCode;
	isPlayer1 = true;

	// すぐ開始せず、待機画面を表示する
	showWaitingScreen(roomCode);
	// 相手の入室を監視し始める
	waitForOpponent(roomCode);
}
// 部屋創るボタンクリック処理
createRoomButton.addEventListener('click', () => {
	createRoom();
});

// 部屋番号を指定して、既存の部屋に入る関数
async function joinRoom() {
	const inputValue = playerNameInput.value.trim();
	playerName = inputValue === '' ? 'プレイヤー' : inputValue;

	const roomCode = roomCodeInput.value.trim().toUpperCase();

	if (roomCode === '') {
		alert('部屋番号を入力してください。');
		return;
	}

	// まず、指定された部屋番号が存在するか確認する
	const { data, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('room_code', roomCode)
		.single(); // 結果が1件だけのはず→なければerror

	if (error || data === null) {
		alert('その部屋番号は見つかりませんでした。');
		return;
	}

	if (data.status !== 'waiting') {
		// 見つかった部屋が対戦中や終了済みなら入室を拒否
		alert('この部屋はすでに対戦中か、満室です。');
		return;
	}

	// 部屋に、自分の名前を登録し、状態を「対戦中」に更新する
	const { error: updateError } = await supabase
		.from('rooms')
		.update({ player2_name: playerName, status: 'playing' }) // room_codeが一致する行の、指定した列を書き換えてくださいという更新命令→playingに部屋状態が変わる
		.eq('room_code', roomCode); // room_code列が指定した値と一致する業だけに絞り込む

	if (updateError) {
		console.error('入室に失敗しました:', updateError);
		alert('入室に失敗しました。もう一度お試しください。');
		return;
	}

	currentRoomCode = roomCode;
	isPlayer1 = false;

	// 入室ができたらブラウザ標準のポップアップでメッセージを表示
	alert(`部屋 ${roomCode} に入室しました！`);

	// 対戦部屋のリアルタイムチャンネルに接続する関数
	connectToRoom(roomCode);
	playerNameSpan.textContent = playerName;
	startGameScreen(); // ゲーム画面に切り替えて開始する
	app.classList.add('match-width'); // 対戦用 maxwidth変更クラス
}
// 入室ボタンのクリック処理
joinRoomButton.addEventListener('click', () => {
	joinRoom();
});

/* ------------------------------------------------ */
/* ランダム対戦ボタンの処理
/* ------------------------------------------------ */
async function startRandomMatch() {
	const inputValue = playerNameInput.value.trim();
	playerName = inputValue === '' ? 'プレイヤー' : inputValue;

	// まず、すでに誰かが待機している部屋がないか探す
	const { data, error } = await supabase
		.from('rooms')
		.select('*')
		.eq('status', 'waiting') // ステータスがwaitingの行だけに絞る
		.limit(1) // 該当する部屋が複数あっても最初の1行だけ
		.maybeSingle(); // 結果が0件でもエラーせずにnullを返す

	if (error) {
		console.error('マッチング中にエラーが発生しました:', error);
		alert('マッチングに失敗しました。もう一度お試しください。');
		return;
	}

	if (data !== null) {
		// 待機中の部屋が見つかった場合: そこに入室する
		const roomCode = data.room_code;

		const { error: updateError } = await supabase
			.from('rooms')
			.update({ player2_name: playerName, status: 'playing' })
			.eq('room_code', roomCode);

		if (updateError) {
			console.error('入室に失敗しました:', updateError);
			alert('マッチングに失敗しました。もう一度お試しください。');
			return;
		}

		currentRoomCode = roomCode;
		isPlayer1 = false;

		connectToRoom(roomCode);
		playerNameSpan.textContent = playerName;
		startGameScreen();
		app.classList.add('match-width');
	} else {
		// 待機中の部屋が見つからなかった場合: 自分で新しく部屋を作って待つ
		const roomCode = generateRoomCode();

		const { error: insertError } = await supabase
			.from('rooms')
			.insert({
				room_code: roomCode,
				player1_name: playerName,
				status: 'waiting',
			});

		if (insertError) {
			console.error('部屋の作成に失敗しました:', insertError);
			alert('マッチングに失敗しました。もう一度お試しください。');
			return;
		}

		currentRoomCode = roomCode;
		isPlayer1 = true;

		showWaitingScreen(null);
		waitForOpponent(roomCode);
	}
}

randomMatchButton.addEventListener('click', () => {
	startRandomMatch();
});

/* ------------------------------------------------ */
/* 対戦部屋に接続してリアルタイムやり取りを開始する関数
/* ------------------------------------------------ */
// 対戦部屋のRealtimeチャンネルに接続する関数
function connectToRoom(roomCode: string) {
	// 対戦モードを開始する
	isVersusMode = true;
	// 相手の盤面表示エリアを見せる
	opponentWrapper.classList.remove('hidden');

	// 部屋番号ごとに専用の通信チャンネルを作る
	// 同じ部屋番号の2人は同じチャンネル名でつながる→お互いのメッセージだけやり取りできる
	realtimeChannel = supabase.channel(`room-${roomCode}`);

	// 相手からのデータ(盤面など)を受信したときの処理
	realtimeChannel.on('broadcast', { event: 'opponent-update' }, (payload) => {
		// opponent-updateという名前のメッセージが送られてきたらこの処理を実行
		const opponentData = payload.payload;
		drawOpponentBoard(opponentData.board, opponentData.currentTetromino);
		opponentScoreSpan.textContent = opponentData.score.toString();
	});

	// 相手がゲームオーバーになったことを受信したときの処理
	realtimeChannel.on('broadcast', { event: 'opponent-game-over' }, () => {
		// 自分がまだゲームオーバーになっていなければ、勝利とする
		if (!isGameOver) {
			isGameOver = true;
			finalScoreSpan.textContent = score.toString();
			saveHighScore(score);
			renderHighScores();
			submitScoreToServer(score);
			renderGlobalHighScores();

			versusResultImage.src = winImg;
			versusResultImage.alt = '勝利';
			versusResultImage.classList.remove('hidden', 'lose');

			// 操作ボタンを隠す
			touchControls.classList.add('hidden');
			gameOverOverlay.classList.remove('hidden');
		}
	});

	// おじゃまブロックを受信したときの処理
	realtimeChannel.on('broadcast', { event: 'attack' }, (payload) => {
		const attackLines = payload.payload.lines;
		receiveAttack(attackLines);
	});

	// 実際にチャンネルへの接続を開始する命令
	realtimeChannel.subscribe();

	// 定期的に自分の状態を送信
	setInterval(() => {
		if (currentRoomCode !== null) {
			broadcastMyState();
		}
	}, 200); // 0.2秒ごとに送信する
}

// 自分の状態を、対戦相手に送信する関数
function broadcastMyState() {
	if (realtimeChannel === null) return;

	realtimeChannel.send({
		type: 'broadcast',
		event: 'opponent-update',
		payload: {
			board: board,
			currentTetromino: currentTetromino,
			score: score,
		},
	});
}

// 対戦相手に、おじゃまブロックを送る関数
function sendAttack(lines: number) {
	if (realtimeChannel === null) return;

	realtimeChannel.send({
		type: 'broadcast',
		event: 'attack',
		payload: { lines: lines },
	});
}

// 対戦相手に、自分がゲームオーバーになったことを伝える関数
function sendGameOver() {
	if (realtimeChannel === null) return;

	realtimeChannel.send({
		type: 'broadcast',
		event: 'opponent-game-over',
		payload: {},
	});
}

/* ------------------------------------------------ */
/* 待機画面に関する関数
/* ------------------------------------------------ */
// 待機画面を表示する関数
function showWaitingScreen(roomCode: string | null) {
	startScreen.classList.add('hidden');
	waitingScreen.classList.remove('hidden');

	if (roomCode !== null) {
		// 部屋番号を表示したい場合
		waitingRoomInfo.textContent = `部屋番号: ${roomCode}`;
		waitingMessage.textContent = '対戦相手を待っています...';
	} else {
		// 部屋番号を表示したくない場合(ランダムマッチング時)
		waitingRoomInfo.textContent = '';
		waitingMessage.textContent = '対戦相手を探しています...';
	}
}

// 相手の入室(rooms テーブルの status 変化)を監視する関数
function waitForOpponent(roomCode: string) {
	const watchChannel = supabase
		.channel(`waiting-${roomCode}`) // 監視専用のチャンネル
		.on(
			// データベースのテーブルの変化そのものを検知する
			'postgres_changes',
			{
				// 絞り込み条件
				event: 'UPDATE', // 更新があったとき
				schema: 'public',
				table: 'rooms',  // roomsテーブルの
				filter: `room_code=eq.${roomCode}`, // 自分の部屋の番号の行だけ
			},
			(payload) => {
				if (payload.new.status === 'playing') {
					// 相手が入室してきたので、待機画面を閉じてゲームを開始する
					waitingScreen.classList.add('hidden');
					connectToRoom(roomCode);
					startGameScreen();
					app.classList.add('match-width'); // 対戦用 maxwidth変更クラス
					supabase.removeChannel(watchChannel); // 監視をもう不要なので終了する
				}
			}
		)
		.subscribe();
}
