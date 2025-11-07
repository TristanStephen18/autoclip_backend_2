const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const JWT_EXPIRES_IN = "7d";
// const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });


export {
    JWT_SECRET,
    JWT_EXPIRES_IN
}
