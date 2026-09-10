const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, deleteDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const p1 = await getDoc(doc(db, 'payments', 'l2f9r8izf1lcmbhg71ina'));
  const p2 = await getDoc(doc(db, 'payments', 'lsnscl2u19gzr8spnliva'));
  console.log('P1:', p1.data());
  console.log('P2:', p2.data());
  
  // If both exist, delete one of them to keep it clean.
  if (p1.exists() && p2.exists()) {
      await deleteDoc(doc(db, 'payments', 'lsnscl2u19gzr8spnliva'));
      console.log('Deleted P2');
  }
  
  process.exit(0);
}
run().catch(console.error);
