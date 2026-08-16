import axios from 'axios';
import logger from '../logger.js';

export interface WhatsAppBroadcastParams {
    campaignName: string;
    destination: string;
    userName: string;
    templateParams?: string[];
}

export const sendWhatsAppBroadcast = async (params: WhatsAppBroadcastParams) => {
    const apiKey = process.env.AISENSY_API_KEY;
    
    if (!apiKey) {
        logger.warn('AISENSY_API_KEY is not defined. Skipping WhatsApp message.');
        return false;
    }

    try {
        const payload = {
            apiKey: apiKey,
            campaignName: params.campaignName,
            destination: params.destination,
            userName: params.userName,
            templateParams: params.templateParams || [],
        };

        const response = await axios.post('https://backend.aisensy.com/campaign/t1/api/v2', payload);
        
        logger.info(`WhatsApp broadcast sent to ${params.destination}. Response:`, response.data);
        return true;
    } catch (error: any) {
        // We catch the error so it never breaks the main app loop
        logger.error(`Failed to send WhatsApp broadcast to ${params.destination}:`, error?.response?.data || error.message);
        return false;
    }
};
