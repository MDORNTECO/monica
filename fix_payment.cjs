const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  await updateDoc(doc(db, 'payments', 'l2f9r8izf1lcmbhg71ina'), { amount: 32.58 });
  console.log('Payment updated to 32.58');
  process.exit(0);
}
run().catch(console.error);
