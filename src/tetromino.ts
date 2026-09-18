// 盤面のサイズ
export const BOARD_WIDTH = 10; // 横
export const BOARD_HEIGHT = 20; // 縦

// テトロミノの種類を表す型
export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// 1つのテトロミノが持つデータの型
export interface Tetromino {
	type: TetrominoType;
	shape: number[][]; // 形を表す2次元配列（0＝空、1＝ブロックあり）
	x: number;         // 盤面上での左上の位置（横）
	y: number;         // 盤面上での左上の位置（縦）
}

// 7種類のテトロミノ形を定義する 1→表示されるところ
// それぞれ4×4の枠の中に形を収める
const SHAPES: Record<TetrominoType, number[][]> = {
	I: [
		[0, 0, 0, 0],
		[1, 1, 1, 1],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	],
	O: [
		[1, 1],
		[1, 1],
	],
	T: [
		[0, 1, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	S: [
		[0, 1, 1],
		[1, 1, 0],
		[0, 0, 0],
	],
	Z: [
		[1, 1, 0],
		[0, 1, 1],
		[0, 0, 0],
	],
	J: [
		[1, 0, 0],
		[1, 1, 1],
		[0, 0, 0],
	],
	L: [
		[0, 0, 1],
		[1, 1, 1],
		[0, 0, 0],
	],
};

// ランダムなテトロミノを一つ生成する
export function createRandomTetromino(): Tetromino {
	const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
	const randomType = types[Math.floor(Math.random() * types.length)]; // シャッフル

	return {
		type: randomType,
		shape: SHAPES[randomType],
		x: Math.floor(BOARD_WIDTH / 2) - 2, // 盤面の横中央から出現
		y: 0, // 一番上から出現
	};
}

// テトロミノの形を90度回転させた 新しい形を返す関数
export function rotateShape(shape: number[][]): number[][] {
	const size = shape.length;
	const rotated: number[][] = Array.from({ length: size }, () =>
		Array(size).fill(0)
	);

	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			// 元の配列[row][col]にあった値を、新しい配列の[col][size - 1 - row]に移し替える　
			// 感覚的に、元の一番上の行が開店後一番右の行になるイメージ。size - 1 - rowで上下反転しつつ列に変換する動きになる
			rotated[col][size - 1 - row] = shape[row][col];
		}
	}
	return rotated;
}


// テトロミノの形を半時計周りに90度回転させる
export function rotateShapeCounterClockwise(shape: number[][]): number[][] {
	const size = shape.length;
	const rotated: number[][] = Array.from({ length: size }, () =>
		Array(size).fill(0)
	);

	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			// 時計回りとは違い、colとrowの位置を変えることで逆回転する
			rotated[size - 1 - col][row] = shape[row][col];
		}
	}

	return rotated;
}


// 指定した種類のテトロミノを出現位置に生成する関数
export function createTetrominoByType(type: TetrominoType): Tetromino {
	return {
		type,
		shape: SHAPES[type],
		x: Math.floor(BOARD_WIDTH / 2) - 2,
		y: 0,
	};
}
