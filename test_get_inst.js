import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function main() {
    const docRef = doc(db, 'installments', 'v02qpvfjkekmfkpwdftwh');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        console.log("Installment Data:", JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("Installment not found");
    }
    process.exit(0);
}
main().catch(console.error);
