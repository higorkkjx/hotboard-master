/* eslint-disable no-unsafe-optional-chaining */
const { WhatsAppInstance, db, client } = require('../class/instance');
const logger = require('pino')();
const config = require('../../config/config');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const fs = require('fs').promises;

class Session {
    async restoreSessions() {
        let restoredSessions = [];
        console.log("Restaurando sessoes");

        try {
            const database = client.db('conexao');
            const sessions = database.collection('sessions');

            const sessionsSnapshot = await sessions.find().toArray();

            if (sessionsSnapshot.length > 0) {
                console.log(`Found ${sessionsSnapshot.length} sessions`);
            } else {
                console.log("No sessions found");
            }

            const sessionPromises = sessionsSnapshot.map(async (sessionData) => {
                const { key, webhook, webhookUrl } = sessionData;
                console.log(sessionData);

                const instance = new WhatsAppInstance(key, webhook, webhookUrl);
                await instance.init();

                WhatsAppInstances[key] = instance;
                restoredSessions.push(key);
                await sleep(150); // Consider removing or adjusting this
            });

            await Promise.all(sessionPromises);
            console.log("sucesso");

        } catch (e) {
            logger.error('Error restoring sessions');
            logger.error(e);
        }

        return restoredSessions;
    }
}

exports.Session = Session;
