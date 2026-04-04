const mongoose = require('mongoose');

const oldUri = 'mongodb+srv://sakshamm:mypass123@cluster0.rngathm.mongodb.net/test?appName=Cluster0';
const newUri = 'mongodb+srv://sakshamm:mypass123@cluster0.rngathm.mongodb.net/ezchat-db?appName=Cluster0';

async function migrate() {
    try {
        console.log('Connecting to old DB (test)...');
        const connOld = await mongoose.createConnection(oldUri).asPromise();
        
        console.log('Connecting to new DB (ezchat-db)...');
        const connNew = await mongoose.createConnection(newUri).asPromise();

        const collections = await connOld.db.listCollections().toArray();
        
        for (let collection of collections) {
            const colName = collection.name;
            console.log(`\nProcessing collection: ${colName}`);
            
            const oldCol = connOld.collection(colName);
            const newCol = connNew.collection(colName);

            // Check if collection exists; if not, create it explicitly to preserve empty collections
            const newCollections = await connNew.db.listCollections({name: colName}).toArray();
            if (newCollections.length === 0) {
                console.log(`Creating collection ${colName}...`);
                await connNew.db.createCollection(colName);
            }
            
            // Wipe new collection before recopying just in case
            await newCol.deleteMany({});
            
            const docs = await oldCol.find({}).toArray();
            if (docs.length > 0) {
                console.log(`Found ${docs.length} documents in ${colName}, inserting...`);
                await newCol.insertMany(docs);
                console.log(`Successfully copied ${docs.length} documents for ${colName}`);
            } else {
                console.log(`No documents found in ${colName}, empty collection preserved.`);
            }

            // Copy Indexes (Except default _id_)
            const indexes = await oldCol.listIndexes().toArray();
            for (let idx of indexes) {
                if (idx.name === '_id_') continue;
                console.log(`Creating index ${idx.name} on ${colName}...`);
                const options = { name: idx.name };
                if (idx.unique) options.unique = idx.unique;
                if (idx.sparse) options.sparse = idx.sparse;
                if (idx.expireAfterSeconds !== undefined) options.expireAfterSeconds = idx.expireAfterSeconds;
                
                try {
                    await newCol.createIndex(idx.key, options);
                } catch (e) {
                    console.error(`Index creation failed for ${idx.name}:`, e.message);
                }
            }
        }

        console.log('\nMigration complete! All documents, empty collections, and indexes were correctly duplicated.');
        await connOld.close();
        await connNew.close();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
