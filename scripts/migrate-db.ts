import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const urlOld = process.env.DATABASE_URL?.replace('/unieval?', '/test?');
const urlNew = process.env.DATABASE_URL;

async function migrate() {
    if (!urlOld || !urlNew) {
        console.error('Missing database URL');
        return;
    }

    const client = new MongoClient(urlOld);
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const oldDb = client.db('test');
        const newDb = client.db('unieval');

        // 1. Copy users from test to unieval
        const users = await oldDb.collection('users').find({}).toArray();
        if (users.length > 0) {
            // Drop users collection in new db if exists to avoid duplicate key errors
            await newDb.collection('users').drop().catch(() => {});
            await newDb.collection('users').insertMany(users);
            console.log(`Successfully migrated ${users.length} users to 'unieval' database.`);
        } else {
            console.log('No users found in test database.');
        }

        // 2. Drop all other collections in 'unieval'
        const collections = await newDb.listCollections().toArray();
        for (const col of collections) {
            if (col.name !== 'users') {
                await newDb.collection(col.name).drop();
                console.log(`Dropped collection: ${col.name} from 'unieval'`);
            }
        }
        
        // 3. (Optional) We won't drop the old 'test' db just to be safe, but it's no longer used.

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await client.close();
    }
}

migrate();
