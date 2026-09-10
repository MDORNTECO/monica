const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientIds = [];
  clientsSnap.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes('nan')) {
      clientIds.push(d.id);
    }
  });

  const salesSnap = await getDocs(collection(db, 'sales'));
  salesSnap.forEach(d => {
    const data = d.data();
    if (clientIds.includes(data.clientId)) {
        console.log('Sale:', d.id, data);
    }
  });
  
  process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
