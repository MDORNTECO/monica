const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const ref = doc(db, 'installments', 'v02qpvfjkekmfkpwdftwh');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    console.log(JSON.stringify(snap.data(), null, 2));
  } else {
    console.log("Not found");
  }
}
run().catch(console.error);
