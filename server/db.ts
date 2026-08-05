import mongoose from 'mongoose';
import { Subject } from './models/index.js';
import logger from './logger.js';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/unieval';
const DB_POOL_SIZE = parseInt(process.env.DB_POOL_SIZE || '10', 10);
const DB_SOCKET_TIMEOUT = parseInt(process.env.DB_SOCKET_TIMEOUT || '45000', 10);
const DB_CONNECT_TIMEOUT = parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(DATABASE_URL, {
      maxPoolSize: DB_POOL_SIZE,
      minPoolSize: Math.floor(DB_POOL_SIZE / 2),
      socketTimeoutMS: DB_SOCKET_TIMEOUT,
      connectTimeoutMS: DB_CONNECT_TIMEOUT,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib'],
      family: 4, // Force IPv4 because VPS Node.js sometimes tries IPv6 which Atlas Free Tier rejects
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Connection pool size: ${DB_POOL_SIZE}`);
    
    // Seed subjects if empty
    const count = await Subject.countDocuments();
    if (count === 0) {
      const subjects = [
        // First Year (Common)
        { id: 'fe1', name: 'Engineering Mathematics I', code: 'FE101', branch: 'General', year: 1 },
        { id: 'fe2', name: 'Engineering Physics', code: 'FE102', branch: 'General', year: 1 },
        { id: 'fe3', name: 'Engineering Chemistry', code: 'FE103', branch: 'General', year: 1 },
        { id: 'fe4', name: 'Basic Electrical Engg', code: 'FE104', branch: 'General', year: 1 },

        // Computer Science
        { id: 's1', name: 'Data Structures', code: 'CS201', branch: 'Computer Science Engineering (CSE)', year: 2 },
        { id: 's5', name: 'Intro to Programming', code: 'CS101', branch: 'Computer Science Engineering (CSE)', year: 1 },
        { id: 'cs301', name: 'Database Management', code: 'CS301', branch: 'Computer Science Engineering (CSE)', year: 3 },
        { id: 'cs401', name: 'Distributed Systems', code: 'CS401', branch: 'Computer Science Engineering (CSE)', year: 4 },

        // AI & ML
        { id: 'ai1', name: 'Neural Networks', code: 'AI301', branch: 'Artificial Intelligence & Machine Learning (AI-ML)', year: 3 },

        // Mechanical
        { id: 's2', name: 'Thermodynamics', code: 'ME201', branch: 'Mechanical Engineering', year: 2 },
        
        // Electrical
        { id: 's3', name: 'Circuit Theory', code: 'EE201', branch: 'Electrical & Electronics Engineering (EEE)', year: 2 },
        
        // Civil
        { id: 's4', name: 'Structural Analysis', code: 'CE301', branch: 'Civil Engineering', year: 3 },
      ];
      await Subject.insertMany(subjects);
      logger.info('Subjects seeded');
    }

    // Monitor connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export async function getDBStatus(): Promise<{
  connected: boolean;
  host: string;
  readyState: string;
}> {
  const readyStates: { [key: number]: string } = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    connected: mongoose.connection.readyState === 1,
    host: mongoose.connection.host || 'unknown',
    readyState: readyStates[mongoose.connection.readyState] || 'unknown'
  };
}

export default connectDB;
