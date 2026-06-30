const { GoogleGenAI } = require('@google/generative-ai');

// Note: The package @google/generative-ai has a GoogleGenAI class or GoogleGenerativeAI class.
// In the current SDK, it is GoogleGenerativeAI. Let's use the correct class.
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = genAI;
