const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  // Get all clients to find Naná
  const clientsSnap = await getDocs(collection(db, 'clients'));
  let clientId = null;
  clientsSnap.forEach(doc => {
    const data = doc.data();
    if (data.name && data.name.toLowerCase().includes('nan')) {
      console.log('Found client:', doc.id, data.name);
      clientId = doc.id;
    }
  });

  if (!clientId) {
    console.log('Client Naná not found');
    return;
  }

  // Get all sales for this client
  const salesSnap = await getDocs(collection(db, 'sales'));
  let targetSale = null;
  salesSnap.forEach(doc => {
    const data = doc.data();
    if (data.clientId === clientId && data.brand === 'Tupperware' && data.totalValue === 594.6) {
      console.log('Found exact sale:', doc.id, data);
      targetSale = { id: doc.id, ...data };
    }
  });

  if (!targetSale) {
    console.log('Looking for fuzzy matches...');
    salesSnap.forEach(doc => {
      const data = doc.data();
      if (data.clientId === clientId && data.brand === 'Tupperware') {
        console.log('Found potential sale:', doc.id, data);
        targetSale = { id: doc.id, ...data };
      }
    });
  }

  if (!targetSale) return;

  // Get installments for this sale
  const instSnap = await getDocs(collection(db, 'installments'));
  const installments = [];
  instSnap.forEach(doc => {
    const data = doc.data();
    if (data.saleId === targetSale.id) {
      installments.push({ id: doc.id, ...data });
    }
  });

  console.log('Installments:', JSON.stringify(installments.sort((a,b) => a.number - b.number), null, 2));
}

run().catch(console.error);
