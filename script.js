console.log("Chess.js test:", typeof Chess);

const pgnInput = document.getElementById("pgn-input");
const analyzeButton = document.getElementById("analyze-button");
const result = document.getElementById("result");

// ======================================================
// GLOBAL GAME DATA
// ======================================================

let gameData = null;
let currentPosition = 0;
let autoplayTimer = null;

// ======================================================
// STOCKFISH ENGINE
// ======================================================

let stockfish = null;
let enginePromise = null;
let activeEngineRequest = null;

// ======================================================
// BASIC HTML SAFETY
// ======================================================

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ======================================================
// INJECT ANALYZER STYLES
// ======================================================

function injectAnalyzerStyles() {

    if (document.getElementById("chess-analyzer-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "chess-analyzer-styles";

    style.textContent = `
        .ca-wrapper {
            margin-top: 30px;
            width: 100%;
        }

        .ca-game-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .ca-info-card {
            padding: 16px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 14px;
            background: rgba(255,255,255,0.04);
        }

        .ca-info-label {
            display: block;
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 5px;
        }

        .ca-info-value {
            font-size: 16px;
            font-weight: 600;
            word-break: break-word;
        }

        .ca-analyzer {
            display: grid;
            grid-template-columns: minmax(280px, 600px) minmax(280px, 1fr);
            gap: 28px;
            align-items: start;
        }

        .ca-board-area {
            width: 100%;
        }

        .ca-board {
            width: min(100%, 600px);
            aspect-ratio: 1 / 1;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 18px 45px rgba(0,0,0,0.35);
        }

        .ca-square {
            position: relative;
            aspect-ratio: 1 / 1;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
        }

        .ca-light {
            background: #d9f4d0;
        }

        .ca-dark {
            background: #3f7d48;
        }

        .ca-piece {
            font-family: "Segoe UI Symbol",
                         "Noto Sans Symbols 2",
                         "Arial Unicode MS",
                         sans-serif;
            font-size: clamp(28px, 6vw, 58px);
            line-height: 1;
            filter: drop-shadow(0 3px 2px rgba(0,0,0,0.30));
            z-index: 2;
        }

        .ca-last-from {
            box-shadow: inset 0 0 0 5px rgba(255, 235, 59, 0.42);
        }

        .ca-last-to {
            box-shadow: inset 0 0 0 5px rgba(255, 235, 59, 0.7);
        }

        .ca-check {
            box-shadow: inset 0 0 0 6px rgba(255, 70, 70, 0.8);
        }

        .ca-coordinate {
            position: absolute;
            font-size: 10px;
            font-weight: 700;
            opacity: 0.6;
            z-index: 3;
        }

        .ca-file {
            bottom: 4px;
            left: 5px;
        }

        .ca-rank {
            top: 4px;
            right: 5px;
        }

        .ca-board-caption {
            margin-top: 12px;
            text-align: center;
            opacity: 0.75;
            font-size: 14px;
        }

        .ca-panel {
            min-width: 0;
            padding: 20px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
        }

        .ca-panel-title {
            margin: 0 0 16px;
            font-size: 20px;
        }

        .ca-current-move {
            padding: 14px 16px;
            margin-bottom: 16px;
            border-radius: 12px;
            background: rgba(255,255,255,0.05);
        }

        .ca-current-move-label {
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 5px;
        }

        .ca-current-move-value {
            font-size: 21px;
            font-weight: 700;
        }

        .ca-move-list {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;
            max-height: 310px;
            overflow-y: auto;
            padding-right: 4px;
        }

        .ca-move-button {
            border: 1px solid rgba(255,255,255,0.09);
            background: rgba(255,255,255,0.035);
            color: inherit;
            border-radius: 8px;
            padding: 7px 9px;
            cursor: pointer;
            font-size: 13px;
            transition: 0.15s ease;
        }

        .ca-move-button:hover {
            transform: translateY(-1px);
            background: rgba(255,255,255,0.08);
        }

        .ca-move-button.ca-active {
            outline: 2px solid rgba(120, 255, 140, 0.7);
            background: rgba(80, 220, 100, 0.13);
        }

        .ca-move-number {
            opacity: 0.55;
            margin-right: 4px;
        }

        .ca-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 18px;
        }

        .ca-control {
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.06);
            color: inherit;
            border-radius: 9px;
            padding: 9px 13px;
            cursor: pointer;
            font-weight: 600;
        }

        .ca-control:hover {
            background: rgba(255,255,255,0.11);
        }

        .ca-fen-box {
            margin-top: 18px;
        }

        .ca-fen-label {
            display: block;
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 7px;
        }

        .ca-fen {
            display: block;
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            border-radius: 9px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(0,0,0,0.2);
            color: inherit;
            font-size: 12px;
            word-break: break-all;
        }

        .ca-status {
            margin-top: 18px;
            padding: 12px 14px;
            border-radius: 10px;
            background: rgba(80, 220, 100, 0.08);
            border: 1px solid rgba(80, 220, 100, 0.15);
            font-size: 14px;
        }

        @media (max-width: 850px) {

            .ca-analyzer {
                grid-template-columns: 1fr;
            }

            .ca-game-info {
                grid-template-columns: repeat(2, 1fr);
            }

            .ca-board {
                width: 100%;
            }
        }

        @media (max-width: 500px) {

            .ca-game-info {
                grid-template-columns: 1fr;
            }

            .ca-panel {
                padding: 15px;
            }

            .ca-control {
                flex: 1;
                min-width: 70px;
            }
        }
    `;

    document.head.appendChild(style);
}

// ======================================================
// ANALYZE BUTTON
// ======================================================

analyzeButton.addEventListener("click", () => {

    const pgn = pgnInput.value.trim();

    if (!pgn) {
        result.textContent = "Please paste a PGN first.";
        return;
    }

    stopAutoplay();

    injectAnalyzerStyles();

    // ==================================================
    // EXTRACT HEADERS
    // ==================================================

    const headers = {};

    const headerRegex = /^\[(\w+)\s+"([^"]*)"\]$/gm;

    let match;

    while ((match = headerRegex.exec(pgn)) !== null) {
        headers[match[1]] = match[2];
    }

    // ==================================================
    // EXTRACT MOVES
    // ==================================================

    const moveText = pgn
        .replace(/^\[.*\]$/gm, "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\$\d+/g, "")
        .replace(/\d+\.(\.\.)?/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const results = [
        "1-0",
        "0-1",
        "1/2-1/2",
        "*"
    ];

    const moves = moveText
        .split(" ")
        .filter(move => {
            return move &&
                   !results.includes(move);
        });

    // ==================================================
    // CREATE CHESS GAME
    // ==================================================

    const chess = new Chess();

    // ==================================================
    // STORE EVERY POSITION
    // ==================================================

    const positions = [];

    // Starting position
    positions.push({
        index: 0,
        moveNumber: 0,
        san: "",
        side: "w",
        label: "Starting Position",
        from: null,
        to: null,
        fen: chess.fen()
    });

    const validMoves = [];
    let invalidMove = null;

    // ==================================================
    // PLAY EVERY MOVE
    // ==================================================

    for (let i = 0; i < moves.length; i++) {

        const move = moves[i];

        try {

            const playedMove = chess.move(move, {
                sloppy: true
            });

            if (!playedMove) {

                invalidMove = {
                    move: move,
                    index: i,
                    moveNumber: Math.floor(i / 2) + 1,
                    side: i % 2 === 0 ? "White" : "Black"
                };

                break;
            }

            validMoves.push(playedMove.san);

            const moveIndex = i + 1;
            const fullMoveNumber = Math.floor(i / 2) + 1;

            const moveLabel =
                playedMove.color === "w"
                    ? `${fullMoveNumber}.`
                    : `${fullMoveNumber}...`;

            positions.push({
                index: moveIndex,
                moveNumber: fullMoveNumber,
                san: playedMove.san,
                side: playedMove.color,
                label: `${moveLabel} ${playedMove.san}`,
                from: playedMove.from,
                to: playedMove.to,
                fen: chess.fen()
            });

        } catch (error) {

            invalidMove = {
                move: move,
                index: i,
                moveNumber: Math.floor(i / 2) + 1,
                side: i % 2 === 0 ? "White" : "Black",
                error: error.message
            };

            break;
        }
    }

    // ==================================================
    // INVALID PGN
    // ==================================================

    if (invalidMove) {

        const moveLabel =
            invalidMove.side === "White"
                ? `${invalidMove.moveNumber}.`
                : `${invalidMove.moveNumber}...`;

        result.innerHTML = `
            <div class="ca-wrapper">

                <div class="ca-status">
                    ❌ PGN error at
                    <strong>${escapeHtml(moveLabel)} ${escapeHtml(invalidMove.move)}</strong>
                    (${escapeHtml(invalidMove.side)}).
                    <br>
                    Valid moves processed:
                    <strong>${validMoves.length}</strong>
                </div>

            </div>
        `;

        console.error("Invalid move:", invalidMove);
        console.log("Valid moves:", validMoves);

        return;
    }

    // ==================================================
    // SAVE GLOBAL GAME
    // ==================================================

    gameData = {
        headers: headers,
        moves: validMoves,
        positions: positions,
        finalFEN: chess.fen()
    };

    currentPosition = 0;

    // ==================================================
    // RENDER COMPLETE ANALYZER
    // ==================================================

    renderAnalyzer();
});

// ======================================================
// RENDER ANALYZER
// ======================================================

function renderAnalyzer() {

    if (!gameData) {
        return;
    }

    const headers = gameData.headers;

    result.innerHTML = `
        <div class="ca-wrapper">

            <!-- ========================= -->
            <!-- GAME INFORMATION -->
            <!-- ========================= -->

            <div class="ca-game-info">

                <div class="ca-info-card">
                    <span class="ca-info-label">White</span>
                    <span class="ca-info-value">
                        ${escapeHtml(headers.White || "Unknown")}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">Black</span>
                    <span class="ca-info-value">
                        ${escapeHtml(headers.Black || "Unknown")}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">Result</span>
                    <span class="ca-info-value">
                        ${escapeHtml(headers.Result || "Unknown")}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">White Rating</span>
                    <span class="ca-info-value">
                        ${escapeHtml(headers.WhiteElo || "Unknown")}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">Black Rating</span>
                    <span class="ca-info-value">
                        ${escapeHtml(headers.BlackElo || "Unknown")}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">Half-moves</span>
                    <span class="ca-info-value">
                        ${gameData.moves.length}
                    </span>
                </div>

            </div>

            <!-- ========================= -->
            <!-- ANALYZER -->
            <!-- ========================= -->

            <div class="ca-analyzer">

                <!-- BOARD -->

                <div class="ca-board-area">

                    <div id="ca-board" class="ca-board"></div>

                    <div
                        id="ca-board-caption"
                        class="ca-board-caption">
                    </div>

                    <!-- CONTROLS -->

                    <div class="ca-controls">

                        <button
                            id="ca-start"
                            class="ca-control">
                            ⏮ Start
                        </button>

                        <button
                            id="ca-prev"
                            class="ca-control">
                            ◀ Previous
                        </button>

                        <button
                            id="ca-play"
                            class="ca-control">
                            ▶ Play
                        </button>

                        <button
                            id="ca-next"
                            class="ca-control">
                            Next ▶
                        </button>

                        <button
                            id="ca-end"
                            class="ca-control">
                            End ⏭
                        </button>

                    </div>

                </div>

                <!-- RIGHT PANEL -->

                <div class="ca-panel">

                    <h2 class="ca-panel-title">
                        Game Replay
                    </h2>

                    <div class="ca-current-move">

                        <div class="ca-current-move-label">
                            Current Position
                        </div>

                        <div
                            id="ca-current-move"
                            class="ca-current-move-value">
                        </div>

                    </div>

                    <div
                        id="ca-move-list"
                        class="ca-move-list">
                    </div>

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            Current FEN
                        </span>

                        <code
                            id="ca-fen"
                            class="ca-fen">
                        </code>

                    </div>

                    <div
                        id="ca-status"
                        class="ca-status">
                    </div>

                </div>

            </div>

        </div>
    `;

    renderMoveList();
    renderPosition();

    document.getElementById("ca-start")
        .addEventListener("click", () => {
            stopAutoplay();
            goToPosition(0);
        });

    document.getElementById("ca-prev")
        .addEventListener("click", () => {
            stopAutoplay();
            goToPosition(currentPosition - 1);
        });

    document.getElementById("ca-next")
        .addEventListener("click", () => {
            goToPosition(currentPosition + 1);
        });

    document.getElementById("ca-end")
        .addEventListener("click", () => {
            stopAutoplay();
            goToPosition(gameData.positions.length - 1);
        });

    document.getElementById("ca-play")
        .addEventListener("click", toggleAutoplay);
}
// ======================================================
// START STOCKFISH
// ======================================================

function initStockfish() {

    if (enginePromise) {
        return enginePromise;
    }

    enginePromise = new Promise((resolve, reject) => {

        try {

            stockfish = new Worker(
                "engine/stockfish-19-lite-single.js"
            );

        } catch (error) {

            enginePromise = null;
            reject(error);
            return;
        }

        let ready = false;

        const timeout = setTimeout(() => {

            if (!ready) {

                enginePromise = null;

                reject(
                    new Error(
                        "Stockfish failed to become ready."
                    )
                );
            }

        }, 15000);

        stockfish.onmessage = (event) => {

            const line = String(event.data);

            console.log("[Stockfish]", line);

            // Engine finished initialization
            if (line === "uciok") {

                stockfish.postMessage("isready");

                return;
            }

            // Engine is ready
            if (line === "readyok") {

                ready = true;

                clearTimeout(timeout);

                resolve();

                return;
            }

            // Engine information while searching
            if (
                activeEngineRequest &&
                line.startsWith("info ")
            ) {

                parseEngineInfo(line);

                return;
            }

            // Final result
            if (
                activeEngineRequest &&
                line.startsWith("bestmove")
            ) {

                const parts = line.split(/\s+/);

                const bestMove = parts[1] || null;

                const request = activeEngineRequest;

                activeEngineRequest = null;

                request.resolve({
                    bestMove: bestMove,
                    evaluation: request.evaluation,
                    depth: request.depth,
                    pv: request.pv
                });
            }
        };

        stockfish.onerror = (error) => {

            console.error(
                "Stockfish worker error:",
                error
            );

            enginePromise = null;

            if (activeEngineRequest) {

                activeEngineRequest.reject(error);

                activeEngineRequest = null;
            }

            reject(error);
        };

        // Start UCI
        stockfish.postMessage("uci");
    });

    return enginePromise;
}

// ======================================================
// PARSE ENGINE INFO
// ======================================================

function parseEngineInfo(line) {

    if (!activeEngineRequest) {
        return;
    }

    const depthMatch =
        line.match(/\bdepth\s+(\d+)/);

    if (depthMatch) {
        activeEngineRequest.depth =
            Number(depthMatch[1]);
    }

    const scoreMatch =
        line.match(
            /\bscore\s+(cp|mate)\s+(-?\d+)/
        );

    if (scoreMatch) {

        activeEngineRequest.evaluation = {
            type: scoreMatch[1],
            value: Number(scoreMatch[2])
        };
    }

    const pvMatch =
        line.match(/\bpv\s+(.+)$/);

    if (pvMatch) {

        activeEngineRequest.pv =
            pvMatch[1].trim();
    }
}

// ======================================================
// EVALUATE ONE POSITION
// ======================================================

function evaluatePosition(fen, depth = 14) {

    return initStockfish().then(() => {

        return new Promise((resolve, reject) => {

            // Stop previous search
            if (activeEngineRequest) {

                stockfish.postMessage("stop");

                activeEngineRequest.reject(
                    new Error(
                        "Previous engine search cancelled."
                    )
                );

                activeEngineRequest = null;
            }

            activeEngineRequest = {
                resolve: resolve,
                reject: reject,
                evaluation: null,
                depth: 0,
                pv: ""
            };

            stockfish.postMessage(
                `position fen ${fen}`
            );

            stockfish.postMessage(
                `go depth ${depth}`
            );
        });
    });
}

// ======================================================
// FORMAT ENGINE SCORE
// ======================================================

function formatEngineScore(evaluation, fen) {

    if (!evaluation) {
        return "Calculating...";
    }

    const sideToMove =
        fen.split(" ")[1];

    let value =
        evaluation.value;

    // UCI reports score from side-to-move perspective.
    // Convert it to White's perspective.
    if (sideToMove === "b") {
        value = -value;
    }

    if (evaluation.type === "mate") {

        return `#${value}`;
    }

    const pawns =
        value / 100;

    if (pawns > 0) {
        return `+${pawns.toFixed(2)}`;
    }

    return pawns.toFixed(2);
}

// ======================================================
// ANALYZE CURRENT POSITION
// ======================================================

async function analyzeCurrentPosition() {

    if (!gameData) {
        return;
    }

    const position =
        gameData.positions[currentPosition];

    const button =
        document.getElementById("ca-engine-button");

    const status =
        document.getElementById("ca-engine-status");

    const evaluation =
        document.getElementById("ca-engine-evaluation");

    const bestMove =
        document.getElementById("ca-engine-best");

    const depth =
        document.getElementById("ca-engine-depth");

    const pv =
        document.getElementById("ca-engine-pv");

    if (!button || !status) {
        return;
    }

    button.disabled = true;
    button.textContent = "🧠 Thinking...";

    status.textContent =
        "Stockfish is analyzing this position.";

    evaluation.textContent =
        "Calculating...";

    bestMove.textContent =
        "Calculating...";

    depth.textContent =
        "—";

    pv.textContent =
        "—";

    try {

        const result =
            await evaluatePosition(
                position.fen,
                14
            );

        evaluation.textContent =
            formatEngineScore(
                result.evaluation,
                position.fen
            );

        bestMove.textContent =
            result.bestMove || "—";

        depth.textContent =
            result.depth || "—";

        pv.textContent =
            result.pv || "—";

        status.textContent =
            "✅ Position analyzed successfully.";

    } catch (error) {

        console.error(
            "Engine analysis failed:",
            error
        );

        status.textContent =
            "❌ Stockfish could not analyze this position.";

        evaluation.textContent =
            "Error";

    } finally {

        button.disabled = false;
        button.textContent =
            "🧠 Analyze Position";
    }
}
// ======================================================
// MOVE LIST
// ======================================================

function renderMoveList() {

    const moveList = document.getElementById("ca-move-list");

    if (!moveList) {
        return;
    }

    moveList.innerHTML = "";

    // Starting position
    const startButton = document.createElement("button");

    startButton.className = "ca-move-button";

    startButton.textContent = "Start";

    startButton.addEventListener("click", () => {
        stopAutoplay();
        goToPosition(0);
    });

    moveList.appendChild(startButton);

    // Actual moves
    gameData.positions.forEach((position, index) => {

        if (index === 0) {
            return;
        }

        const button = document.createElement("button");

        button.className = "ca-move-button";

        const moveLabel =
            position.side === "w"
                ? `${position.moveNumber}.`
                : `${position.moveNumber}...`;

        button.innerHTML = `
            <span class="ca-move-number">
                ${moveLabel}
            </span>
            ${escapeHtml(position.san)}
        `;

        button.addEventListener("click", () => {
            stopAutoplay();
            goToPosition(index);
        });

        moveList.appendChild(button);
    });
}

// ======================================================
// GO TO POSITION
// ======================================================

function goToPosition(index) {

    if (!gameData) {
        return;
    }

    if (index < 0) {
        index = 0;
    }

    if (index >= gameData.positions.length) {
        index = gameData.positions.length - 1;
    }

    currentPosition = index;

    renderPosition();
}

// ======================================================
// RENDER CURRENT POSITION
// ======================================================

function renderPosition() {

    if (!gameData) {
        return;
    }

    const position = gameData.positions[currentPosition];

    const boardElement = document.getElementById("ca-board");
    const currentMoveElement = document.getElementById("ca-current-move");
    const fenElement = document.getElementById("ca-fen");
    const statusElement = document.getElementById("ca-status");
    const captionElement = document.getElementById("ca-board-caption");

    if (!boardElement) {
        return;
    }

    // ==================================================
    // LOAD POSITION INTO CHESS.JS
    // ==================================================

    const chess = new Chess();

    const loaded = chess.load(position.fen);

    if (!loaded) {
        console.error("Could not load FEN:", position.fen);
        return;
    }

    // ==================================================
    // GET BOARD
    // ==================================================

    const board = chess.board();

    boardElement.innerHTML = "";

    // ==================================================
    // FIND KING IN CHECK
    // ==================================================

    let checkedKingSquare = null;

    if (chess.in_check()) {

        const sideInCheck = chess.turn();

        for (let row = 0; row < 8; row++) {

            for (let col = 0; col < 8; col++) {

                const piece = board[row][col];

                if (
                    piece &&
                    piece.type === "k" &&
                    piece.color === sideInCheck
                ) {

                    checkedKingSquare =
                        String.fromCharCode(97 + col) +
                        (8 - row);

                }
            }
        }
    }

    // ==================================================
    // CREATE 64 SQUARES
    // ==================================================

    for (let row = 0; row < 8; row++) {

        for (let col = 0; col < 8; col++) {

            const piece = board[row][col];

            const squareName =
                String.fromCharCode(97 + col) +
                (8 - row);

            const square = document.createElement("div");

            square.classList.add("ca-square");

            // Board colors
            if ((row + col) % 2 === 0) {
                square.classList.add("ca-light");
            } else {
                square.classList.add("ca-dark");
            }

            // Highlight last move
            if (
                position.from &&
                squareName === position.from
            ) {
                square.classList.add("ca-last-from");
            }

            if (
                position.to &&
                squareName === position.to
            ) {
                square.classList.add("ca-last-to");
            }

            // Highlight king in check
            if (squareName === checkedKingSquare) {
                square.classList.add("ca-check");
            }

            // File coordinate
            if (row === 7) {

                const fileLabel =
                    document.createElement("span");

                fileLabel.className =
                    "ca-coordinate ca-file";

                fileLabel.textContent =
                    String.fromCharCode(97 + col);

                square.appendChild(fileLabel);
            }

            // Rank coordinate
            if (col === 0) {

                const rankLabel =
                    document.createElement("span");

                rankLabel.className =
                    "ca-coordinate ca-rank";

                rankLabel.textContent =
                    8 - row;

                square.appendChild(rankLabel);
            }

            // Piece
            if (piece) {

                const pieceElement =
                    document.createElement("span");

                pieceElement.className = "ca-piece";

                pieceElement.textContent =
                    getUnicodePiece(
                        piece.color,
                        piece.type
                    );

                square.appendChild(pieceElement);
            }

            boardElement.appendChild(square);
        }
    }

    // ==================================================
    // CURRENT MOVE
    // ==================================================

    if (currentPosition === 0) {

        currentMoveElement.textContent =
            "Starting Position";

    } else {

        currentMoveElement.textContent =
            position.label;
    }

    // ==================================================
    // CAPTION
    // ==================================================

    const turnName =
        chess.turn() === "w"
            ? "White"
            : "Black";

    captionElement.textContent =
        currentPosition === 0
            ? "Initial chess position"
            : `${position.label} • ${turnName} to move`;

    // ==================================================
    // FEN
    // ==================================================

    fenElement.textContent = position.fen;

    // ==================================================
    // STATUS
    // ==================================================

    let status = `${currentPosition} / ${gameData.moves.length} half-moves`;

    if (chess.in_checkmate()) {
        status += " • Checkmate";
    } else if (chess.in_stalemate()) {
        status += " • Stalemate";
    } else if (chess.in_draw()) {
        status += " • Draw";
    } else if (chess.in_check()) {
        status += ` • ${turnName} is in check`;
    } else {
        status += ` • ${turnName} to move`;
    }

    statusElement.textContent = status;

    // ==================================================
    // UPDATE ACTIVE MOVE
    // ==================================================

    const moveButtons =
        document.querySelectorAll(".ca-move-button");

    moveButtons.forEach((button, index) => {

        button.classList.remove("ca-active");

        if (index === currentPosition) {
            button.classList.add("ca-active");
        }
    });

    // ==================================================
    // AUTO SCROLL ACTIVE MOVE
    // ==================================================

    const activeButton =
        document.querySelector(".ca-move-button.ca-active");

    if (activeButton) {

        activeButton.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest"
        });
    }

    // ==================================================
    // CONSOLE DATA
    // ==================================================

    console.log(
        `Position ${currentPosition}:`,
        position.fen
    );
}

// ======================================================
// UNICODE CHESS PIECES
// ======================================================

function getUnicodePiece(color, type) {

    const whitePieces = {
        p: "♙",
        n: "♘",
        b: "♗",
        r: "♖",
        q: "♕",
        k: "♔"
    };

    const blackPieces = {
        p: "♟",
        n: "♞",
        b: "♝",
        r: "♜",
        q: "♛",
        k: "♚"
    };

    if (color === "w") {
        return whitePieces[type];
    }

    return blackPieces[type];
}

// ======================================================
// AUTOPLAY
// ======================================================

function toggleAutoplay() {

    const playButton =
        document.getElementById("ca-play");

    if (!playButton) {
        return;
    }

    if (autoplayTimer) {

        stopAutoplay();

        return;
    }

    playButton.textContent = "⏸ Pause";

    autoplayTimer = setInterval(() => {

        if (
            currentPosition >=
            gameData.positions.length - 1
        ) {

            stopAutoplay();

            return;
        }

        currentPosition++;

        renderPosition();

    }, 700);
}

// ======================================================
// STOP AUTOPLAY
// ======================================================

function stopAutoplay() {

    if (autoplayTimer) {

        clearInterval(autoplayTimer);

        autoplayTimer = null;
    }

    const playButton =
        document.getElementById("ca-play");

    if (playButton) {
        playButton.textContent = "▶ Play";
    }
}

// ======================================================
// KEYBOARD CONTROLS
// ======================================================

document.addEventListener("keydown", (event) => {

    if (!gameData) {
        return;
    }

    // Don't hijack keyboard when typing in PGN box
    if (
        document.activeElement === pgnInput ||
        document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "INPUT"
    ) {
        return;
    }

    if (event.key === "ArrowLeft") {

        stopAutoplay();
        goToPosition(currentPosition - 1);

    } else if (event.key === "ArrowRight") {

        goToPosition(currentPosition + 1);

    } else if (event.key === "Home") {

        stopAutoplay();
        goToPosition(0);

    } else if (event.key === "End") {

        stopAutoplay();
        goToPosition(
            gameData.positions.length - 1
        );
    }
});
