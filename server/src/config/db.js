import dns from 'node:dns';
import mongoose from 'mongoose';
import env from './env.js';

// Resolve querySrv ECONNREFUSED on local ISP / Wi-Fi routers by using reliable public DNS resolvers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported in environment
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    // If SRV lookup failed (e.g. querySrv ECONNREFUSED), attempt direct replica set fallback
    if (error.message?.includes('querySrv') || error.message?.includes('ECONNREFUSED')) {
      console.warn('⚠️  SRV DNS query failed on local resolver. Attempting direct replica set fallback...');
      try {
        const directUri =
          'mongodb://shubhamgayke9860_db_user:ygTYivowZvZ6TfNg@ac-3mqahf8-shard-00-00.prsl8hm.mongodb.net:27017,ac-3mqahf8-shard-00-01.prsl8hm.mongodb.net:27017,ac-3mqahf8-shard-00-02.prsl8hm.mongodb.net:27017/mentore_lms?ssl=true&replicaSet=atlas-34rpir-shard-0&authSource=admin&retryWrites=true&w=majority';
        const conn = await mongoose.connect(directUri);
        console.log(`✅ MongoDB connected (direct replica set fallback): ${conn.connection.host}`);
        return conn;
      } catch (fallbackError) {
        console.error(`❌ MongoDB fallback connection failed: ${fallbackError.message}`);
        process.exit(1);
      }
    }
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
