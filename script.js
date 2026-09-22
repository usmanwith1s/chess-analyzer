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
    // Extract moves
    // -------------------------

    const moveText = pgn
        .replace(/^\[.*\]$/gm, "")
        .trim();

    const moves = moveText
        .replace(/\d+\.(\.\.)?/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ");

    // Remove result from moves
    const results = ["1-0", "0-1", "1/2-1/2", "*"];

    const cleanMoves = moves.filter(move => !results.includes(move));

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
    `;

    console.log("Headers:", headers);
    console.log("Moves:", cleanMoves);
});
