console.log("Chess.js test:", typeof Chess);
const pgnInput = document.getElementById("pgn-input");
const analyzeButton = document.getElementById("analyze-button");
const result = document.getElementById("result");

analyzeButton.addEventListener("click", () => {

    const pgn = pgnInput.value.trim();

    if (!pgn) {
        result.textContent = "Please paste a PGN first.";
        return;
    }

    // -------------------------
    // Extract PGN headers
    // -------------------------

    const headers = {};

    const headerRegex = /^\[(\w+)\s+"([^"]*)"\]$/gm;

    let match;

    while ((match = headerRegex.exec(pgn)) !== null) {
        headers[match[1]] = match[2];
    }

    // -------------------------
    // Extract move section
    // -------------------------

    const moveText = pgn
        .replace(/^\[.*\]$/gm, "")
        .replace(/\{[^}]*\}/g, "")
        .replace(/\([^)]*\)/g, "")
        .replace(/\$\d+/g, "")
        .replace(/\d+\.(\.\.)?/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const results = ["1-0", "0-1", "1/2-1/2", "*"];

    const moves = moveText
        .split(" ")
        .filter(move => move && !results.includes(move));

    // -------------------------
    // Replay moves using chess.js
    // -------------------------

    const chess = new Chess();

    const validMoves = [];
    let invalidMove = null;

    for (let i = 0; i < moves.length; i++) {

        const move = moves[i];

        try {

            const playedMove = chess.move(move, {
                sloppy: true
            });

            if (!playedMove) {
                invalidMove = {
                    move: move,
                    moveNumber: i + 1
                };

                break;
            }

            validMoves.push(playedMove.san);

        } catch (error) {

            invalidMove = {
                move: move,
                moveNumber: i + 1,
                error: error.message
            };

            break;
        }
    }

    // -------------------------
    // Display result
    // -------------------------

    if (invalidMove) {

        result.innerHTML = `
            <h2>PGN Error</h2>

            <p>
                <strong>Problem at move:</strong>
                ${invalidMove.move}
            </p>

            <p>
                <strong>Move number:</strong>
                ${invalidMove.moveNumber}
            </p>

            <p>
                <strong>Valid moves processed:</strong>
                ${validMoves.length}
            </p>
        `;

        console.log("Invalid move:", invalidMove);
        console.log("Valid moves:", validMoves);

        return;
    }

    result.innerHTML = `
        <h2>Game Information</h2>

        <p><strong>White:</strong> ${headers.White || "Unknown"}</p>
        <p><strong>Black:</strong> ${headers.Black || "Unknown"}</p>

        <p><strong>White Rating:</strong> ${headers.WhiteElo || "Unknown"}</p>
        <p><strong>Black Rating:</strong> ${headers.BlackElo || "Unknown"}</p>

        <p><strong>Result:</strong> ${headers.Result || "Unknown"}</p>

        <p><strong>Total Moves:</strong> ${validMoves.length}</p>

        <h3>Moves</h3>

        <p>${validMoves.join(" ")}</p>

        <h3>PGN Status</h3>

        <p>✅ Every move was successfully understood by chess.js.</p>
    `;

    console.log("Headers:", headers);
    console.log("Moves:", validMoves);
    console.log("Final FEN:", chess.fen());
});
