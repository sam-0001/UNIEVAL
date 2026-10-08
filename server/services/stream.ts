import { StreamClient } from '@stream-io/node-sdk';

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if (!apiKey || !apiSecret) {
  console.warn("STREAM_API_KEY or STREAM_API_SECRET is missing. Stream features will not work.");
}

export const streamClient = new StreamClient(apiKey || '', apiSecret || '');

export const createStreamToken = (userId: string, exp?: number) => {
    if (!apiKey || !apiSecret) throw new Error("Stream credentials missing");
    
    // Default expiration is 1 hour if not provided
    const expiration = exp || Math.round(new Date().getTime() / 1000) + 60 * 60;
    const issued = Math.floor(Date.now() / 1000) - 60;
    
    const token = streamClient.createToken(userId, expiration, issued);
    return token;
};
