const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientId = null;
  clientsSnap.forEach(d => {
    const data = d.data();
    if (data.name && data.name.toLowerCase().includes('nan')) {
      clientId = d.id;
      console.log('Client:', d.id, data.name);
    }
  });

  const salesSnap = await getDocs(collection(db, 'sales'));
  salesSnap.forEach(d => {
    const data = d.data();
    if (data.clientId === clientId) {
        console.log('Sale:', d.id, data);
    }
  });
  
  process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
