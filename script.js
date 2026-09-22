const pgnInput = document.getElementById("pgn-input");
const analyzeButton = document.getElementById("analyze-button");
const result = document.getElementById("result");

analyzeButton.addEventListener("click", () => {

    const pgn = pgnInput.value.trim();

    if (!pgn) {
        result.textContent = "Please paste a PGN first.";
        return;
    }

    console.log("PGN received:");
    console.log(pgn);

    result.textContent = "PGN received successfully.";
});
