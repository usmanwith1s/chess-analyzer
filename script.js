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
    // Load PGN using chess.js
    // -------------------------

    const chess = new Chess();
    
const loaded = chess.load_pgn(pgn, {
    sloppy: true
});

if (!loaded) {
        result.innerHTML = `
            <h2>Invalid PGN</h2>
            <p>The PGN could not be loaded by the chess engine.</p>
        `;

        console.log("Invalid PGN");
        return;
    }

    // -------------------------
    // Get actual moves
    // -------------------------

    const cleanMoves = chess.history();

    // -------------------------
    // Display analysis
    // -------------------------

    result.innerHTML = `
        <h2>Game Information</h2>

        <p><strong>White:</strong> ${headers.White || "Unknown"}</p>
        <p><strong>Black:</strong> ${headers.Black || "Unknown"}</p>

        <p><strong>White Rating:</strong> ${headers.WhiteElo || "Unknown"}</p>
        <p><strong>Black Rating:</strong> ${headers.BlackElo || "Unknown"}</p>

        <p><strong>Result:</strong> ${headers.Result || "Unknown"}</p>

        <p><strong>Total Moves:</strong> ${cleanMoves.length}</p>

        <h3>Moves</h3>

        <p>${cleanMoves.join(" ")}</p>

        <h3>PGN Status</h3>

        <p>✅ PGN successfully loaded by chess.js</p>
    `;

    console.log("Headers:", headers);
    console.log("Moves:", cleanMoves);
    console.log("Current FEN:", chess.fen());
});
