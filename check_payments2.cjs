const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const p1 = await getDoc(doc(db, 'payments', 'l2f9r8izf1lcmbhg71ina'));
  console.log('P1:', p1.data());
  process.exit(0);
}
run().catch(console.error);
