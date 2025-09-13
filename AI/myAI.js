// Example custom AI logic
function simpleAI(input) {
    const responses = {
        "hi": "Hello! How are you?",
        "bye": "Goodbye! See you later.",
        "how are you": "I'm an AI, I am always good!"
    };
    return responses[input.toLowerCase()] || "I don't understand, can you try again?";
}

module.exports = { simpleAI };
