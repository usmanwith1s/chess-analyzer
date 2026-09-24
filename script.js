console.log("Chess.js:", typeof Chess);

// ======================================================
// MAIN ELEMENTS
// ======================================================

const pgnInput = document.getElementById("pgn-input");
const analyzeButton = document.getElementById("analyze-button");
const result = document.getElementById("result");

// ======================================================
// GLOBAL DATA
// ======================================================

let gameData = null;
let currentPosition = 0;
let autoplayTimer = null;

// ======================================================
// STOCKFISH
// ======================================================

let stockfish = null;
let enginePromise = null;
let activeEngineRequest = null;
let analysisRunId = 0;

const engineCache = new Map();

const ENGINE_DEPTH = 10;

// ======================================================
// HTML SAFETY
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
// STYLES
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
            margin-bottom: 20px;
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
            font-weight: 700;
            word-break: break-word;
        }

        .ca-analyzer {
            display: grid;
            grid-template-columns:
                minmax(280px, 600px)
                minmax(300px, 1fr);

            gap: 28px;
            align-items: start;
        }

        .ca-board-area {
            width: 100%;
        }

        .ca-board {
            width: min(100%, 600px);
            aspect-ratio: 1;
            margin: 0 auto;

            display: grid;
            grid-template-columns: repeat(8, 1fr);

            border-radius: 14px;
            overflow: hidden;

            box-shadow:
                0 18px 45px rgba(0,0,0,0.35);
        }

        .ca-square {
            position: relative;
            aspect-ratio: 1;

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
            font-family:
                "Segoe UI Symbol",
                "Noto Sans Symbols 2",
                "Arial Unicode MS",
                sans-serif;

            font-size: clamp(28px, 6vw, 58px);
            line-height: 1;

            filter:
                drop-shadow(
                    0 3px 2px rgba(0,0,0,0.30)
                );

            z-index: 2;
        }

        .ca-last-from {
            box-shadow:
                inset 0 0 0 5px
                rgba(255,235,59,0.42);
        }

        .ca-last-to {
            box-shadow:
                inset 0 0 0 5px
                rgba(255,235,59,0.75);
        }

        .ca-check {
            box-shadow:
                inset 0 0 0 6px
                rgba(255,70,70,0.85);
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

        .ca-controls {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 18px;
        }

        .ca-control {
            border:
                1px solid rgba(255,255,255,0.10);

            background:
                rgba(255,255,255,0.06);

            color: inherit;

            border-radius: 9px;

            padding: 9px 13px;

            cursor: pointer;

            font-weight: 700;
        }

        .ca-control:hover {
            background:
                rgba(255,255,255,0.11);
        }

        .ca-panel {
            min-width: 0;

            padding: 20px;

            border-radius: 18px;

            border:
                1px solid rgba(255,255,255,0.08);

            background:
                rgba(255,255,255,0.04);
        }

        .ca-panel-title {
            margin: 0 0 14px;
            font-size: 21px;
        }

        .ca-current-move {
            padding: 14px 16px;
            margin-bottom: 14px;

            border-radius: 12px;

            background:
                rgba(255,255,255,0.05);
        }

        .ca-current-move-label {
            font-size: 12px;
            opacity: 0.6;
            margin-bottom: 5px;
        }

        .ca-current-move-value {
            font-size: 21px;
            font-weight: 800;
        }

        .ca-progress-box {
            margin: 16px 0;
        }

        .ca-progress-track {
            width: 100%;
            height: 8px;

            margin-top: 8px;

            border-radius: 999px;

            background:
                rgba(255,255,255,0.08);

            overflow: hidden;
        }

        .ca-progress-fill {
            height: 100%;
            width: 0%;

            border-radius: 999px;

            background:
                linear-gradient(
                    90deg,
                    #44d07a,
                    #80e8ff
                );

            transition: width 0.15s ease;
        }

        .ca-engine-status {
            margin-top: 10px;

            padding: 11px 13px;

            border-radius: 10px;

            background:
                rgba(255,255,255,0.04);

            font-size: 13px;
        }

        .ca-engine-grid {
            display: grid;

            grid-template-columns:
                repeat(2, minmax(0,1fr));

            gap: 10px;

            margin-top: 12px;
        }

        .ca-engine-stat {
            padding: 13px;

            border-radius: 11px;

            background:
                rgba(255,255,255,0.035);
        }

        .ca-engine-stat-label {
            display: block;

            font-size: 11px;

            opacity: 0.55;

            margin-bottom: 4px;
        }

        .ca-engine-stat-value {
            display: block;

            font-size: 17px;

            font-weight: 800;

            word-break: break-word;
        }

        .ca-move-list {
            display: flex;
            flex-wrap: wrap;
            gap: 7px;

            max-height: 290px;

            overflow-y: auto;

            padding-right: 4px;

            margin-bottom: 15px;
        }

        .ca-move-button {
            border:
                1px solid rgba(255,255,255,0.09);

            background:
                rgba(255,255,255,0.035);

            color: inherit;

            border-radius: 8px;

            padding: 7px 9px;

            cursor: pointer;

            font-size: 13px;

            transition: 0.15s ease;

            position: relative;
        }

        .ca-move-button:hover {
            transform: translateY(-1px);

            background:
                rgba(255,255,255,0.08);
        }

        .ca-move-button.ca-active {
            outline:
                2px solid rgba(120,255,140,0.7);

            background:
                rgba(80,220,100,0.13);
        }

        .ca-move-number {
            opacity: 0.55;
            margin-right: 4px;
        }

        .ca-move-button[data-classification="Best"] {
            border-color:
                rgba(150,220,60,0.55);
        }

        .ca-move-button[data-classification="Excellent"] {
            border-color:
                rgba(100,210,80,0.45);
        }

        .ca-move-button[data-classification="Good"] {
            border-color:
                rgba(100,180,120,0.35);
        }

        .ca-move-button[data-classification="Inaccuracy"] {
            border-color:
                rgba(255,205,60,0.60);
        }

        .ca-move-button[data-classification="Mistake"] {
            border-color:
                rgba(255,145,60,0.65);
        }

        .ca-move-button[data-classification="Blunder"] {
            border-color:
                rgba(255,65,65,0.70);
        }

        .ca-evaluation {
            margin-top: 16px;

            border-radius: 14px;

            overflow: hidden;

            border:
                1px solid rgba(255,255,255,0.08);
        }

        .ca-evaluation-header {
            padding: 12px 14px;

            background:
                rgba(255,255,255,0.05);

            font-weight: 800;
        }

        #ca-eval-graph {
            width: 100%;
            height: 180px;
            display: block;
            background: #15181d;
        }

        .ca-accuracy-grid {
            display: grid;

            grid-template-columns:
                repeat(2,minmax(0,1fr));

            gap: 10px;

            margin-top: 15px;
        }

        .ca-accuracy-card {
            padding: 16px;

            border-radius: 14px;

            background:
                rgba(255,255,255,0.045);

            text-align: center;
        }

        .ca-accuracy-player {
            font-size: 13px;
            opacity: 0.65;
        }

        .ca-accuracy-value {
            display: block;

            margin-top: 5px;

            font-size: 30px;

            font-weight: 900;
        }

        .ca-count-grid {
            display: grid;

            grid-template-columns:
                repeat(2,minmax(0,1fr));

            gap: 8px;

            margin-top: 15px;
        }

        .ca-count-row {
            display: flex;

            justify-content: space-between;

            padding: 9px 10px;

            border-radius: 9px;

            background:
                rgba(255,255,255,0.035);

            font-size: 13px;
        }

        .ca-count-left {
            opacity: 0.72;
        }

        .ca-count-right {
            font-weight: 800;
        }

        .ca-best {
            color: #9bdc4e;
        }

        .ca-excellent {
            color: #72d45c;
        }

        .ca-good {
            color: #8bb89b;
        }

        .ca-inaccuracy {
            color: #ffd23c;
        }

        .ca-mistake {
            color: #ff9b44;
        }

        .ca-blunder {
            color: #ff5555;
        }

        .ca-fen-box {
            margin-top: 15px;
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

            border:
                1px solid rgba(255,255,255,0.08);

            background:
                rgba(0,0,0,0.20);

            color: inherit;

            font-size: 12px;

            word-break: break-all;
        }

        .ca-analysis-note {
            margin-top: 12px;

            font-size: 11px;

            opacity: 0.5;

            line-height: 1.5;
        }

        @media (max-width: 850px) {

            .ca-analyzer {
                grid-template-columns: 1fr;
            }

            .ca-game-info {
                grid-template-columns:
                    repeat(2,1fr);
            }

            .ca-board {
                width: 100%;
            }
        }

        @media (max-width: 500px) {

            .ca-game-info {
                grid-template-columns: 1fr;
            }

            .ca-engine-grid,
            .ca-accuracy-grid,
            .ca-count-grid {
                grid-template-columns: 1fr;
            }

            .ca-panel {
                padding: 15px;
            }
        }
    `;

    document.head.appendChild(style);
}

// ======================================================
// ANALYZE PGN
// ======================================================

analyzeButton.addEventListener("click", async () => {

    const pgn = pgnInput.value.trim();

    if (!pgn) {

        result.textContent =
            "Please paste a PGN first.";

        return;
    }

    stopAutoplay();

    // Cancel previous analysis
    analysisRunId++;

    if (activeEngineRequest) {

        try {
            stockfish.postMessage("stop");
        } catch (e) {
            // Ignore
        }

        activeEngineRequest = null;
    }

    engineCache.clear();

    injectAnalyzerStyles();

    // ==================================================
    // HEADERS
    // ==================================================

    const headers = {};

    const headerRegex =
        /^\[(\w+)\s+"([^"]*)"\]$/gm;

    let match;

    while (
        (match = headerRegex.exec(pgn)) !== null
    ) {

        headers[match[1]] =
            match[2];
    }

    // ==================================================
    // MOVES
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
        .filter(move =>
            move &&
            !results.includes(move)
        );

    // ==================================================
    // REBUILD GAME
    // ==================================================

    const chess = new Chess();

    const positions = [];

    positions.push({

        index: 0,
        moveNumber: 0,

        san: "",
        side: "w",

        label: "Starting Position",

        from: null,
        to: null,

        fen: chess.fen(),

        analysis: null,
        classification: null,
        loss: 0,
        accuracy: 100
    });

    const validMoves = [];

    let invalidMove = null;

    // ==================================================
    // PLAY MOVES
    // ==================================================

    for (
        let i = 0;
        i < moves.length;
        i++
    ) {

        const move = moves[i];

        try {

            const playedMove =
                chess.move(
                    move,
                    { sloppy: true }
                );

            if (!playedMove) {

                invalidMove = {

                    move: move,
                    index: i,

                    moveNumber:
                        Math.floor(i / 2) + 1,

                    side:
                        i % 2 === 0
                            ? "White"
                            : "Black"
                };

                break;
            }

            validMoves.push(
                playedMove.san
            );

            const moveIndex =
                i + 1;

            const fullMoveNumber =
                Math.floor(i / 2) + 1;

            const moveLabel =
                playedMove.color === "w"
                    ? `${fullMoveNumber}.`
                    : `${fullMoveNumber}...`;

            positions.push({

                index:
                    moveIndex,

                moveNumber:
                    fullMoveNumber,

                san:
                    playedMove.san,

                side:
                    playedMove.color,

                label:
                    `${moveLabel} ${playedMove.san}`,

                from:
                    playedMove.from,

                to:
                    playedMove.to,

                fen:
                    chess.fen(),

                analysis: null,
                classification: null,
                loss: 0,
                accuracy: 100
            });

        } catch (error) {

            invalidMove = {

                move: move,
                index: i,

                moveNumber:
                    Math.floor(i / 2) + 1,

                side:
                    i % 2 === 0
                        ? "White"
                        : "Black",

                error:
                    error.message
            };

            break;
        }
    }

    // ==================================================
    // INVALID
    // ==================================================

    if (invalidMove) {

        result.innerHTML = `

            <div class="ca-wrapper">

                <div class="ca-engine-status">

                    ❌ PGN error at

                    <strong>
                        ${escapeHtml(
                            invalidMove.side === "White"
                                ? `${invalidMove.moveNumber}.`
                                : `${invalidMove.moveNumber}...`
                        )}
                        ${escapeHtml(
                            invalidMove.move
                        )}
                    </strong>

                    <br><br>

                    Valid moves processed:

                    <strong>
                        ${validMoves.length}
                    </strong>

                </div>

            </div>
        `;

        return;
    }

    // ==================================================
    // SAVE
    // ==================================================

    gameData = {

        headers: headers,

        moves: validMoves,

        positions: positions,

        finalFEN: chess.fen(),

        whiteStats:
            createEmptyStats(),

        blackStats:
            createEmptyStats(),

        whiteAccuracy: 0,

        blackAccuracy: 0,

        analyzed: false
    };

    currentPosition = 0;

    // ==================================================
    // RENDER
    // ==================================================

    renderAnalyzer();

    // ==================================================
    // AUTOMATIC ENGINE ANALYSIS
    // ==================================================

    await runAutomaticAnalysis();
});

// ======================================================
// EMPTY STATS
// ======================================================

function createEmptyStats() {

    return {

        Best: 0,
        Excellent: 0,
        Good: 0,
        Inaccuracy: 0,
        Mistake: 0,
        Blunder: 0,

        totalAccuracy: 0,
        moves: 0
    };
}

// ======================================================
// STOCKFISH INITIALIZATION
// ======================================================

function initStockfish() {

    if (enginePromise) {
        return enginePromise;
    }

    enginePromise =
        new Promise(
            (resolve, reject) => {

                try {

                    stockfish =
                        new Worker(
                            "engine/stockfish-19-lite-single.js"
                        );

                } catch (error) {

                    enginePromise =
                        null;

                    reject(error);

                    return;
                }

                let gotUciOk = false;

                const timeout =
                    setTimeout(
                        () => {

                            enginePromise =
                                null;

                            try {

                                stockfish.terminate();

                            } catch (e) {
                                // Ignore
                            }

                            reject(
                                new Error(
                                    "Stockfish failed to initialize."
                                )
                            );

                        },
                        20000
                    );

                stockfish.onmessage =
                    (event) => {

                        const line =
                            String(
                                event.data
                            ).trim();

                        console.log(
                            "[Stockfish]",
                            line
                        );

                        // --------------------------
                        // UCI READY
                        // --------------------------

                        if (
                            line ===
                            "uciok"
                        ) {

                            gotUciOk =
                                true;

                            stockfish.postMessage(
                                "isready"
                            );

                            return;
                        }

                        // --------------------------
                        // ENGINE READY
                        // --------------------------

                        if (
                            line ===
                            "readyok" &&
                            gotUciOk
                        ) {

                            clearTimeout(
                                timeout
                            );

                            resolve();

                            return;
                        }

                        // --------------------------
                        // SEARCH INFO
                        // --------------------------

                        if (
                            activeEngineRequest &&
                            line.startsWith(
                                "info "
                            )
                        ) {

                            parseEngineInfo(
                                line
                            );

                            return;
                        }

                        // --------------------------
                        // SEARCH END
                        // --------------------------

                        if (
                            activeEngineRequest &&
                            line.startsWith(
                                "bestmove "
                            )
                        ) {

                            const request =
                                activeEngineRequest;

                            activeEngineRequest =
                                null;

                            const parts =
                                line.split(/\s+/);

                            request.resolve({

                                bestMove:
                                    parts[1] || null,

                                evaluation:
                                    request.evaluation,

                                depth:
                                    request.depth,

                                pv:
                                    request.pv
                            });
                        }
                    };

                stockfish.onerror =
                    (error) => {

                        console.error(
                            "Stockfish error:",
                            error
                        );

                        if (
                            activeEngineRequest
                        ) {

                            activeEngineRequest.reject(
                                error
                            );

                            activeEngineRequest =
                                null;
                        }

                        enginePromise =
                            null;

                        reject(error);
                    };

                stockfish.postMessage(
                    "uci"
                );
            }
        );

    return enginePromise;
}

// ======================================================
// PARSE ENGINE INFO
// ======================================================

function parseEngineInfo(line) {

    if (!activeEngineRequest) {
        return;
    }

    // --------------------------
    // DEPTH
    // --------------------------

    const depthMatch =
        line.match(
            /\bdepth\s+(\d+)/
        );

    if (depthMatch) {

        activeEngineRequest.depth =
            Number(
                depthMatch[1]
            );
    }

    // --------------------------
    // SCORE
    // --------------------------

    const scoreMatch =
        line.match(
            /\bscore\s+(cp|mate)\s+(-?\d+)/
        );

    if (scoreMatch) {

        activeEngineRequest.evaluation = {

            type:
                scoreMatch[1],

            value:
                Number(
                    scoreMatch[2]
                )
        };
    }

    // --------------------------
    // PV
    // --------------------------

    const pvMatch =
        line.match(
            /\bpv\s+(.+)$/
        );

    if (pvMatch) {

        activeEngineRequest.pv =
            pvMatch[1].trim();
    }
}

// ======================================================
// SCORE FROM WHITE'S PERSPECTIVE
// ======================================================

function scoreFromWhitePerspective(
    evaluation,
    fen
) {

    if (!evaluation) {
        return null;
    }

    let value =
        Number(
            evaluation.value
        );

    const sideToMove =
        fen.split(" ")[1];

    if (
        evaluation.type ===
        "mate"
    ) {

        const mateMagnitude =
            Math.max(
                1,
                100000 -
                Math.abs(value) * 1000
            );

        value =
            value > 0
                ? mateMagnitude
                : -mateMagnitude;
    }

    if (
        sideToMove === "b"
    ) {

        value = -value;
    }

    return value;
}

// ======================================================
// EVALUATE ONE FEN
// ======================================================

function evaluateFen(
    fen,
    depth = ENGINE_DEPTH
) {

    const key =
        `${fen}|${depth}`;

    if (
        engineCache.has(key)
    ) {

        return Promise.resolve(
            engineCache.get(key)
        );
    }

    return initStockfish()
        .then(
            () => {

                return new Promise(
                    (resolve, reject) => {

                        // Stop previous search
                        if (
                            activeEngineRequest
                        ) {

                            try {

                                stockfish.postMessage(
                                    "stop"
                                );

                            } catch (e) {
                                // Ignore
                            }

                            activeEngineRequest
                                .reject(
                                    new Error(
                                        "Previous search cancelled."
                                    )
                                );

                            activeEngineRequest =
                                null;
                        }

                        activeEngineRequest = {

                            resolve:
                                (engineResult) => {

                                    engineCache.set(
                                        key,
                                        engineResult
                                    );

                                    resolve(
                                        engineResult
                                    );
                                },

                            reject:
                                reject,

                            evaluation:
                                null,

                            depth:
                                0,

                            pv:
                                ""
                        };

                        stockfish.postMessage(
                            `position fen ${fen}`
                        );

                        stockfish.postMessage(
                            `go depth ${depth}`
                        );
                    }
                );
            }
        );
}

// ======================================================
// AUTOMATIC FULL GAME ANALYSIS
// ======================================================

async function runAutomaticAnalysis() {

    if (!gameData) {
        return;
    }

    const runId =
        analysisRunId;

    const total =
        gameData.positions.length;

    const statusElement =
        document.getElementById(
            "ca-engine-status"
        );

    const progressFill =
        document.getElementById(
            "ca-progress-fill"
        );

    try {

        // ------------------------------------------------
        // ENGINE READY
        // ------------------------------------------------

        if (statusElement) {

            statusElement.textContent =
                "⏳ Starting Stockfish...";
        }

        await initStockfish();

        if (
            runId !== analysisRunId
        ) {

            return;
        }

        // ------------------------------------------------
        // ANALYZE EVERY POSITION
        // ------------------------------------------------

        for (
            let i = 0;
            i < total;
            i++
        ) {

            if (
                runId !== analysisRunId
            ) {

                return;
            }

            const position =
                gameData.positions[i];

            if (statusElement) {

                statusElement.textContent =
                    `🧠 Analyzing position ${i + 1} of ${total}...`;
            }

            const engineResult =
                await evaluateFen(
                    position.fen,
                    ENGINE_DEPTH
                );

            if (
                runId !== analysisRunId
            ) {

                return;
            }

            position.analysis = {

                bestMove:
                    engineResult.bestMove,

                evaluation:
                    engineResult.evaluation,

                depth:
                    engineResult.depth,

                pv:
                    engineResult.pv,

                whiteScore:
                    scoreFromWhitePerspective(
                        engineResult.evaluation,
                        position.fen
                    )
            };

            // ------------------------------------------------
            // CLASSIFY THE MOVE THAT LED TO THIS POSITION
            // ------------------------------------------------

            if (i > 0) {

                classifyMove(i);
            }

            // ------------------------------------------------
            // PROGRESS
            // ------------------------------------------------

            const percent =
                ((i + 1) / total) * 100;

            if (progressFill) {

                progressFill.style.width =
                    `${percent}%`;
            }

            // ------------------------------------------------
            // UPDATE UI
            // ------------------------------------------------

            updateAnalysisUI();

            if (
                i === currentPosition
            ) {

                renderPosition();
            }
        }

        // ------------------------------------------------
        // COMPLETE
        // ------------------------------------------------

        gameData.analyzed =
            true;

        calculateFinalStats();

        updateAnalysisUI();

        renderPosition();

        if (statusElement) {

            statusElement.textContent =
                `✅ Analysis complete — ${gameData.moves.length} moves analyzed.`;
        }

    } catch (error) {

        console.error(
            "Automatic analysis failed:",
            error
        );

        if (statusElement) {

            statusElement.textContent =
                "❌ Stockfish analysis failed. Check the browser console.";
        }
    }
}

// ======================================================
// CLASSIFY MOVE
// ======================================================

function classifyMove(index) {

    const position =
        gameData.positions[index];

    const before =
        gameData.positions[index - 1];

    if (
        !before.analysis ||
        !position.analysis
    ) {

        return;
    }

    const beforeScore =
        before.analysis.whiteScore;

    const afterScore =
        position.analysis.whiteScore;

    if (
        beforeScore === null ||
        afterScore === null
    ) {

        return;
    }

    // ------------------------------------------------
    // LOSS FROM PLAYER'S PERSPECTIVE
    // ------------------------------------------------

    let loss;

    if (
        position.side === "w"
    ) {

        loss =
            beforeScore -
            afterScore;

    } else {

        loss =
            afterScore -
            beforeScore;
    }

    // Prevent negative loss
    loss =
        Math.max(
            0,
            loss
        );

    // Convert centipawns to pawns
    const pawnLoss =
        loss / 100;

    position.loss =
        pawnLoss;

    position.accuracy =
        lossToAccuracy(
            pawnLoss
        );

    position.classification =
        classifyLoss(
            pawnLoss
        );
}

// ======================================================
// CLASSIFICATION
// ======================================================

function classifyLoss(loss) {

    if (loss <= 0.05) {
        return "Best";
    }

    if (loss <= 0.15) {
        return "Excellent";
    }

    if (loss <= 0.35) {
        return "Good";
    }

    if (loss <= 0.75) {
        return "Inaccuracy";
    }

    if (loss <= 1.50) {
        return "Mistake";
    }

    return "Blunder";
}

// ======================================================
// MOVE ACCURACY
// ======================================================

function lossToAccuracy(loss) {

    const accuracy =
        100 *
        Math.exp(
            -loss / 2.5
        );

    return Math.max(
        0,
        Math.min(
            100,
            accuracy
        )
    );
}

// ======================================================
// FINAL STATS
// ======================================================

function calculateFinalStats() {

    const white =
        createEmptyStats();

    const black =
        createEmptyStats();

    for (
        let i = 1;
        i < gameData.positions.length;
        i++
    ) {

        const move =
            gameData.positions[i];

        if (
            !move.classification
        ) {

            continue;
        }

        const stats =
            move.side === "w"
                ? white
                : black;

        stats[
            move.classification
        ]++;

        stats.totalAccuracy +=
            move.accuracy;

        stats.moves++;
    }

    gameData.whiteStats =
        white;

    gameData.blackStats =
        black;

    gameData.whiteAccuracy =
        white.moves
            ? white.totalAccuracy /
                white.moves
            : 0;

    gameData.blackAccuracy =
        black.moves
            ? black.totalAccuracy /
                black.moves
            : 0;
}

// ======================================================
// UPDATE ANALYSIS UI
// ======================================================

function updateAnalysisUI() {

    if (!gameData) {
        return;
    }

    const whiteAccuracy =
        document.getElementById(
            "ca-white-accuracy"
        );

    const blackAccuracy =
        document.getElementById(
            "ca-black-accuracy"
        );

    if (whiteAccuracy) {

        whiteAccuracy.textContent =
            gameData.whiteAccuracy
                ? `${gameData.whiteAccuracy.toFixed(1)}%`
                : "—";
    }

    if (blackAccuracy) {

        blackAccuracy.textContent =
            gameData.blackAccuracy
                ? `${gameData.blackAccuracy.toFixed(1)}%`
                : "—";
    }

    updateCountGrid(
        "ca-white-counts",
        gameData.whiteStats
    );

    updateCountGrid(
        "ca-black-counts",
        gameData.blackStats
    );

    drawEvaluationGraph();
}

// ======================================================
// COUNT GRID
// ======================================================

function updateCountGrid(
    elementId,
    stats
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) {
        return;
    }

    const classifications = [
        "Best",
        "Excellent",
        "Good",
        "Inaccuracy",
        "Mistake",
        "Blunder"
    ];

    element.innerHTML = "";

    classifications.forEach(
        classification => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "ca-count-row";

            const left =
                document.createElement(
                    "span"
                );

            left.className =
                "ca-count-left";

            left.textContent =
                classification;

            const right =
                document.createElement(
                    "span"
                );

            right.className =
                "ca-count-right";

            right.textContent =
                stats[classification];

            row.appendChild(left);
            row.appendChild(right);

            element.appendChild(row);
        }
    );
}

// ======================================================
// EVALUATION GRAPH
// ======================================================

function drawEvaluationGraph() {

    const svg =
        document.getElementById(
            "ca-eval-graph"
        );

    if (!svg || !gameData) {
        return;
    }

    const positions =
        gameData.positions;

    const width = 900;
    const height = 180;

    const padding = 12;

    const maxEval = 5;

    svg.setAttribute(
        "viewBox",
        `0 0 ${width} ${height}`
    );

    svg.innerHTML = "";

    // ------------------------------------------------
    // ZERO LINE
    // ------------------------------------------------

    const zeroY =
        height / 2;

    const zeroLine =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

    zeroLine.setAttribute(
        "x1",
        "0"
    );

    zeroLine.setAttribute(
        "x2",
        width
    );

    zeroLine.setAttribute(
        "y1",
        zeroY
    );

    zeroLine.setAttribute(
        "y2",
        zeroY
    );

    zeroLine.setAttribute(
        "stroke",
        "rgba(255,255,255,0.18)"
    );

    svg.appendChild(
        zeroLine
    );

    // ------------------------------------------------
    // POINTS
    // ------------------------------------------------

    const evaluatedPositions =
        positions.filter(
            p =>
                p.analysis &&
                p.analysis.whiteScore !== null
        );

    if (
        evaluatedPositions.length === 0
    ) {

        return;
    }

    const points =
        evaluatedPositions.map(
            (
                position,
                index
            ) => {

                const score =
                    position.analysis.whiteScore;

                const clamped =
                    Math.max(
                        -maxEval,
                        Math.min(
                            maxEval,
                            score / 100
                        )
                    );

                const x =
                    padding +
                    (
                        index /
                        Math.max(
                            1,
                            evaluatedPositions.length - 1
                        )
                    ) *
                    (
                        width -
                        padding * 2
                    );

                const y =
                    zeroY -
                    (
                        clamped /
                        maxEval
                    ) *
                    (
                        height / 2 -
                        padding
                    );

                return {
                    x,
                    y,
                    position
                };
            }
        );

    // ------------------------------------------------
    // AREA
    // ------------------------------------------------

    let pathData =
        `M ${points[0].x} ${zeroY} `;

    points.forEach(
        point => {

            pathData +=
                `L ${point.x} ${point.y} `;
        }
    );

    pathData +=
        `L ${points[points.length - 1].x} ${zeroY} Z`;

    const area =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );

    area.setAttribute(
        "d",
        pathData
    );

    area.setAttribute(
        "fill",
        "rgba(255,255,255,0.08)"
    );

    svg.appendChild(
        area
    );

    // ------------------------------------------------
    // LINE
    // ------------------------------------------------

    let lineData = "";

    points.forEach(
        (
            point,
            index
        ) => {

            lineData +=
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y} `;
        }
    );

    const line =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
        );

    line.setAttribute(
        "d",
        lineData
    );

    line.setAttribute(
        "fill",
        "none"
    );

    line.setAttribute(
        "stroke",
        "#ffffff"
    );

    line.setAttribute(
        "stroke-width",
        "3"
    );

    line.setAttribute(
        "stroke-linejoin",
        "round"
    );

    line.setAttribute(
        "stroke-linecap",
        "round"
    );

    svg.appendChild(
        line
    );

    // ------------------------------------------------
    // MOVE DOTS
    // ------------------------------------------------

    points.forEach(
        point => {

            const classification =
                point.position.classification;

            let dotColor =
                "#7aa7d9";

            if (
                classification === "Best"
            ) {
                dotColor =
                    "#a9d34f";
            }

            if (
                classification === "Excellent"
            ) {
                dotColor =
                    "#6bd15c";
            }

            if (
                classification === "Inaccuracy"
            ) {
                dotColor =
                    "#ffd03c";
            }

            if (
                classification === "Mistake"
            ) {
                dotColor =
                    "#ff9c45";
            }

            if (
                classification === "Blunder"
            ) {
                dotColor =
                    "#ff4e4e";
            }

            const circle =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );

            circle.setAttribute(
                "cx",
                point.x
            );

            circle.setAttribute(
                "cy",
                point.y
            );

            circle.setAttribute(
                "r",
                classification
                    ? "4"
                    : "2"
            );

            circle.setAttribute(
                "fill",
                dotColor
            );

            svg.appendChild(
                circle
            );
        }
    );
}

// ======================================================
// MAIN UI
// ======================================================

function renderAnalyzer() {

    const headers =
        gameData.headers;

    result.innerHTML = `

        <div class="ca-wrapper">

            <!-- GAME INFO -->

            <div class="ca-game-info">

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        White
                    </span>

                    <span class="ca-info-value">
                        ${escapeHtml(
                            headers.White ||
                            "Unknown"
                        )}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        Black
                    </span>

                    <span class="ca-info-value">
                        ${escapeHtml(
                            headers.Black ||
                            "Unknown"
                        )}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        Result
                    </span>

                    <span class="ca-info-value">
                        ${escapeHtml(
                            headers.Result ||
                            "Unknown"
                        )}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        White Rating
                    </span>

                    <span class="ca-info-value">
                        ${escapeHtml(
                            headers.WhiteElo ||
                            "Unknown"
                        )}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        Black Rating
                    </span>

                    <span class="ca-info-value">
                        ${escapeHtml(
                            headers.BlackElo ||
                            "Unknown"
                        )}
                    </span>
                </div>

                <div class="ca-info-card">
                    <span class="ca-info-label">
                        Moves
                    </span>

                    <span class="ca-info-value">
                        ${gameData.moves.length}
                    </span>
                </div>

            </div>

            <!-- ANALYZER -->

            <div class="ca-analyzer">

                <!-- LEFT -->

                <div class="ca-board-area">

                    <div
                        id="ca-board"
                        class="ca-board">
                    </div>

                    <div
                        id="ca-board-caption"
                        class="ca-board-caption">
                    </div>

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

                <!-- RIGHT -->

                <div class="ca-panel">

                    <h2 class="ca-panel-title">
                        Game Analysis
                    </h2>

                    <!-- PROGRESS -->

                    <div class="ca-progress-box">

                        <div
                            id="ca-engine-status"
                            class="ca-engine-status">

                            ⏳ Preparing Stockfish...

                        </div>

                        <div
                            class="ca-progress-track">

                            <div
                                id="ca-progress-fill"
                                class="ca-progress-fill">
                            </div>

                        </div>

                    </div>

                    <!-- GRAPH -->

                    <div class="ca-evaluation">

                        <div class="ca-evaluation-header">
                            Evaluation
                        </div>

                        <svg
                            id="ca-eval-graph"
                            viewBox="0 0 900 180"
                            preserveAspectRatio="none">
                        </svg>

                    </div>

                    <!-- ACCURACY -->

                    <div class="ca-accuracy-grid">

                        <div class="ca-accuracy-card">

                            <span
                                class="ca-accuracy-player">

                                ${escapeHtml(
                                    headers.White ||
                                    "White"
                                )}

                            </span>

                            <span
                                id="ca-white-accuracy"
                                class="ca-accuracy-value">

                                —

                            </span>

                        </div>

                        <div class="ca-accuracy-card">

                            <span
                                class="ca-accuracy-player">

                                ${escapeHtml(
                                    headers.Black ||
                                    "Black"
                                )}

                            </span>

                            <span
                                id="ca-black-accuracy"
                                class="ca-accuracy-value">

                                —

                            </span>

                        </div>

                    </div>

                    <!-- CURRENT MOVE -->

                    <div class="ca-current-move"
                         style="margin-top:15px;">

                        <div class="ca-current-move-label">
                            Current Move
                        </div>

                        <div
                            id="ca-current-move"
                            class="ca-current-move-value">

                        </div>

                    </div>

                    <!-- ENGINE -->

                    <div class="ca-engine-grid">

                        <div class="ca-engine-stat">

                            <span
                                class="ca-engine-stat-label">
                                Evaluation
                            </span>

                            <span
                                id="ca-engine-evaluation"
                                class="ca-engine-stat-value">

                                —

                            </span>

                        </div>

                        <div class="ca-engine-stat">

                            <span
                                class="ca-engine-stat-label">
                                Best Move
                            </span>

                            <span
                                id="ca-engine-best"
                                class="ca-engine-stat-value">

                                —

                            </span>

                        </div>

                        <div class="ca-engine-stat">

                            <span
                                class="ca-engine-stat-label">
                                Depth
                            </span>

                            <span
                                id="ca-engine-depth"
                                class="ca-engine-stat-value">

                                —

                            </span>

                        </div>

                        <div class="ca-engine-stat">

                            <span
                                class="ca-engine-stat-label">
                                Move Quality
                            </span>

                            <span
                                id="ca-engine-quality"
                                class="ca-engine-stat-value">

                                —

                            </span>

                        </div>

                    </div>

                    <!-- COUNTS -->

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            White Moves
                        </span>

                        <div
                            id="ca-white-counts"
                            class="ca-count-grid">
                        </div>

                    </div>

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            Black Moves
                        </span>

                        <div
                            id="ca-black-counts"
                            class="ca-count-grid">
                        </div>

                    </div>

                    <!-- MOVES -->

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            Moves
                        </span>

                        <div
                            id="ca-move-list"
                            class="ca-move-list">
                        </div>

                    </div>

                    <!-- FEN -->

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            Current FEN
                        </span>

                        <code
                            id="ca-fen"
                            class="ca-fen">
                        </code>

                    </div>

                    <!-- PV -->

                    <div class="ca-fen-box">

                        <span class="ca-fen-label">
                            Principal Variation
                        </span>

                        <code
                            id="ca-engine-pv"
                            class="ca-fen">
                            —
                        </code>

                    </div>

                    <div class="ca-analysis-note">

                        Estimated accuracy and move
                        classifications are calculated
                        from Stockfish evaluation loss.
                        They are not intended to reproduce
                        Chess.com's proprietary scoring.

                    </div>

                </div>

            </div>

        </div>
    `;

    renderMoveList();

    renderPosition();

    // ==================================================
    // CONTROLS
    // ==================================================

    document
        .getElementById("ca-start")
        .addEventListener(
            "click",
            () => {

                stopAutoplay();

                goToPosition(0);
            }
        );

    document
        .getElementById("ca-prev")
        .addEventListener(
            "click",
            () => {

                stopAutoplay();

                goToPosition(
                    currentPosition - 1
                );
            }
        );

    document
        .getElementById("ca-next")
        .addEventListener(
            "click",
            () => {

                goToPosition(
                    currentPosition + 1
                );
            }
        );

    document
        .getElementById("ca-end")
        .addEventListener(
            "click",
            () => {

                stopAutoplay();

                goToPosition(
                    gameData.positions.length - 1
                );
            }
        );

    document
        .getElementById("ca-play")
        .addEventListener(
            "click",
            toggleAutoplay
        );
}

// ======================================================
// MOVE LIST
// ======================================================

function renderMoveList() {

    const moveList =
        document.getElementById(
            "ca-move-list"
        );

    if (!moveList) {
        return;
    }

    moveList.innerHTML = "";

    // Start
    const startButton =
        document.createElement(
            "button"
        );

    startButton.className =
        "ca-move-button";

    startButton.textContent =
        "Start";

    startButton.addEventListener(
        "click",
        () => {

            stopAutoplay();

            goToPosition(0);
        }
    );

    moveList.appendChild(
        startButton
    );

    // Moves
    gameData.positions.forEach(
        (
            position,
            index
        ) => {

            if (index === 0) {
                return;
            }

            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "ca-move-button";

            if (
                position.classification
            ) {

                button.dataset.classification =
                    position.classification;
            }

            const moveLabel =
                position.side === "w"
                    ? `${position.moveNumber}.`
                    : `${position.moveNumber}...`;

            button.innerHTML = `

                <span
                    class="ca-move-number">

                    ${moveLabel}

                </span>

                ${escapeHtml(
                    position.san
                )}
            `;

            button.addEventListener(
                "click",
                () => {

                    stopAutoplay();

                    goToPosition(
                        index
                    );
                }
            );

            moveList.appendChild(
                button
            );
        }
    );
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

    if (
        index >=
        gameData.positions.length
    ) {

        index =
            gameData.positions.length - 1;
    }

    currentPosition =
        index;

    renderPosition();
}

// ======================================================
// RENDER POSITION
// ======================================================

function renderPosition() {

    if (!gameData) {
        return;
    }

    const position =
        gameData.positions[
            currentPosition
        ];

    const boardElement =
        document.getElementById(
            "ca-board"
        );

    const currentMoveElement =
        document.getElementById(
            "ca-current-move"
        );

    const fenElement =
        document.getElementById(
            "ca-fen"
        );

    const captionElement =
        document.getElementById(
            "ca-board-caption"
        );

    if (!boardElement) {
        return;
    }

    // ==================================================
    // ENGINE PANEL
    // ==================================================

    const evaluationElement =
        document.getElementById(
            "ca-engine-evaluation"
        );

    const bestElement =
        document.getElementById(
            "ca-engine-best"
        );

    const depthElement =
        document.getElementById(
            "ca-engine-depth"
        );

    const qualityElement =
        document.getElementById(
            "ca-engine-quality"
        );

    const pvElement =
        document.getElementById(
            "ca-engine-pv"
        );

    if (
        position.analysis
    ) {

        if (evaluationElement) {

            evaluationElement.textContent =
                formatEngineScore(
                    position.analysis.evaluation,
                    position.fen
                );
        }

        if (bestElement) {

            bestElement.textContent =
                convertBestMoveToSan(
                    position.fen,
                    position.analysis.bestMove
                );
        }

        if (depthElement) {

            depthElement.textContent =
                position.analysis.depth ||
                "—";
        }

        if (pvElement) {

            pvElement.textContent =
                convertPvToSan(
                    position.fen,
                    position.analysis.pv
                );
        }

        if (qualityElement) {

            if (
                position.classification
            ) {

                qualityElement.textContent =
                    `${position.classification} (${position.loss.toFixed(2)})`;

            } else {

                qualityElement.textContent =
                    currentPosition === 0
                        ? "Starting Position"
                        : "Calculating...";
            }
        }

    } else {

        if (evaluationElement) {
            evaluationElement.textContent =
                "Analyzing...";
        }

        if (bestElement) {
            bestElement.textContent =
                "Analyzing...";
        }

        if (depthElement) {
            depthElement.textContent =
                "—";
        }

        if (pvElement) {
            pvElement.textContent =
                "—";
        }

        if (qualityElement) {

            qualityElement.textContent =
                currentPosition === 0
                    ? "Starting Position"
                    : "Waiting...";
        }
    }

    // ==================================================
    // CHESS.JS
    // ==================================================

    const chess =
        new Chess();

    const loaded =
        chess.load(
            position.fen
        );

    if (!loaded) {

        console.error(
            "Could not load FEN:",
            position.fen
        );

        return;
    }

    const board =
        chess.board();

    boardElement.innerHTML =
        "";

    // ==================================================
    // KING CHECK
    // ==================================================

    let checkedKingSquare =
        null;

    if (
        chess.in_check()
    ) {

        const sideInCheck =
            chess.turn();

        for (
            let row = 0;
            row < 8;
            row++
        ) {

            for (
                let col = 0;
                col < 8;
                col++
            ) {

                const piece =
                    board[row][col];

                if (
                    piece &&
                    piece.type === "k" &&
                    piece.color ===
                        sideInCheck
                ) {

                    checkedKingSquare =
                        String.fromCharCode(
                            97 + col
                        ) +
                        (8 - row);
                }
            }
        }
    }

    // ==================================================
    // BOARD SQUARES
    // ==================================================

    for (
        let row = 0;
        row < 8;
        row++
    ) {

        for (
            let col = 0;
            col < 8;
            col++
        ) {

            const piece =
                board[row][col];

            const squareName =
                String.fromCharCode(
                    97 + col
                ) +
                (8 - row);

            const square =
                document.createElement(
                    "div"
                );

            square.classList.add(
                "ca-square"
            );

            if (
                (row + col) % 2 === 0
            ) {

                square.classList.add(
                    "ca-light"
                );

            } else {

                square.classList.add(
                    "ca-dark"
                );
            }

            // FROM
            if (
                position.from &&
                squareName ===
                    position.from
            ) {

                square.classList.add(
                    "ca-last-from"
                );
            }

            // TO
            if (
                position.to &&
                squareName ===
                    position.to
            ) {

                square.classList.add(
                    "ca-last-to"
                );
            }

            // CHECK
            if (
                squareName ===
                    checkedKingSquare
            ) {

                square.classList.add(
                    "ca-check"
                );
            }

            // FILE
            if (
                row === 7
            ) {

                const file =
                    document.createElement(
                        "span"
                    );

                file.className =
                    "ca-coordinate ca-file";

                file.textContent =
                    String.fromCharCode(
                        97 + col
                    );

                square.appendChild(
                    file
                );
            }

            // RANK
            if (
                col === 0
            ) {

                const rank =
                    document.createElement(
                        "span"
                    );

                rank.className =
                    "ca-coordinate ca-rank";

                rank.textContent =
                    8 - row;

                square.appendChild(
                    rank
                );
            }

            // PIECE
            if (piece) {

                const pieceElement =
                    document.createElement(
                        "span"
                    );

                pieceElement.className =
                    "ca-piece";

                pieceElement.textContent =
                    getUnicodePiece(
                        piece.color,
                        piece.type
                    );

                square.appendChild(
                    pieceElement
                );
            }

            boardElement.appendChild(
                square
            );
        }
    }

    // ==================================================
    // MOVE TEXT
    // ==================================================

    if (
        currentPosition === 0
    ) {

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

    fenElement.textContent =
        position.fen;

    // ==================================================
    // ACTIVE MOVE
    // ==================================================

    const moveButtons =
        document.querySelectorAll(
            ".ca-move-button"
        );

    moveButtons.forEach(
        (
            button,
            index
        ) => {

            button.classList.remove(
                "ca-active"
            );

            if (
                index ===
                currentPosition
            ) {

                button.classList.add(
                    "ca-active"
                );
            }
        }
    );

    // ==================================================
    // AUTO SCROLL
    // ==================================================

    const activeButton =
        document.querySelector(
            ".ca-move-button.ca-active"
        );

    if (activeButton) {

        activeButton.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "nearest"
        });
    }
}

// ======================================================
// SCORE FORMATTING
// ======================================================

function formatEngineScore(
    evaluation,
    fen
) {

    if (!evaluation) {
        return "Calculating...";
    }

    let value =
        Number(
            evaluation.value
        );

    if (
        fen.split(" ")[1] === "b"
    ) {

        value = -value;
    }

    if (
        evaluation.type ===
        "mate"
    ) {

        const side =
            value > 0
                ? "White"
                : "Black";

        return `Mate ${side} in ${Math.abs(value)}`;
    }

    const pawns =
        value / 100;

    return pawns >= 0
        ? `+${pawns.toFixed(2)}`
        : pawns.toFixed(2);
}

// ======================================================
// UCI → SAN
// ======================================================

function convertBestMoveToSan(
    fen,
    uciMove
) {

    if (
        !uciMove ||
        uciMove === "(none)"
    ) {

        return "—";
    }

    try {

        const chess =
            new Chess();

        if (
            !chess.load(fen)
        ) {

            return uciMove;
        }

        const from =
            uciMove.substring(
                0,
                2
            );

        const to =
            uciMove.substring(
                2,
                4
            );

        const promotion =
            uciMove.length >= 5
                ? uciMove[4]
                : undefined;

        const move =
            chess.move({

                from:
                    from,

                to:
                    to,

                promotion:
                    promotion
            });

        return move
            ? move.san
            : uciMove;

    } catch (error) {

        return uciMove;
    }
}

// ======================================================
// PV → SAN
// ======================================================

function convertPvToSan(
    fen,
    pv
) {

    if (!pv) {
        return "—";
    }

    try {

        const chess =
            new Chess();

        if (
            !chess.load(fen)
        ) {

            return pv;
        }

        const uciMoves =
            pv.split(/\s+/);

        const sanMoves = [];

        for (
            let i = 0;
            i < uciMoves.length;
            i++
        ) {

            const uci =
                uciMoves[i];

            if (
                uci.length < 4
            ) {

                break;
            }

            const from =
                uci.substring(
                    0,
                    2
                );

            const to =
                uci.substring(
                    2,
                    4
                );

            const promotion =
                uci.length >= 5
                    ? uci[4]
                    : undefined;

            const move =
                chess.move({

                    from,
                    to,

                    promotion
                });

            if (!move) {
                break;
            }

            sanMoves.push(
                move.san
            );
        }

        return sanMoves.length
            ? sanMoves.join(" ")
            : pv;

    } catch (error) {

        return pv;
    }
}

// ======================================================
// UNICODE PIECES
// ======================================================

function getUnicodePiece(
    color,
    type
) {

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

    return color === "w"
        ? whitePieces[type]
        : blackPieces[type];
}

// ======================================================
// AUTOPLAY
// ======================================================

function toggleAutoplay() {

    const playButton =
        document.getElementById(
            "ca-play"
        );

    if (
        autoplayTimer
    ) {

        stopAutoplay();

        return;
    }

    playButton.textContent =
        "⏸ Pause";

    autoplayTimer =
        setInterval(
            () => {

                if (
                    currentPosition >=
                    gameData.positions.length - 1
                ) {

                    stopAutoplay();

                    return;
                }

                currentPosition++;

                renderPosition();

            },
            700
        );
}

// ======================================================
// STOP AUTOPLAY
// ======================================================

function stopAutoplay() {

    if (
        autoplayTimer
    ) {

        clearInterval(
            autoplayTimer
        );

        autoplayTimer =
            null;
    }

    const playButton =
        document.getElementById(
            "ca-play"
        );

    if (playButton) {

        playButton.textContent =
            "▶ Play";
    }
}

// ======================================================
// KEYBOARD
// ======================================================

document.addEventListener(
    "keydown",
    event => {

        if (!gameData) {
            return;
        }

        if (
            document.activeElement ===
                pgnInput ||
            document.activeElement.tagName ===
                "TEXTAREA" ||
            document.activeElement.tagName ===
                "INPUT"
        ) {

            return;
        }

        if (
            event.key ===
            "ArrowLeft"
        ) {

            stopAutoplay();

            goToPosition(
                currentPosition - 1
            );

        } else if (
            event.key ===
            "ArrowRight"
        ) {

            goToPosition(
                currentPosition + 1
            );

        } else if (
            event.key ===
            "Home"
        ) {

            stopAutoplay();

            goToPosition(0);

        } else if (
            event.key ===
            "End"
        ) {

            stopAutoplay();

            goToPosition(
                gameData.positions.length - 1
            );
        }
    }
);
