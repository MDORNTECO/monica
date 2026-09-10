const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccount = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: serviceAccount.projectId
});

const db = admin.firestore();
db.settings({ databaseId: serviceAccount.firestoreDatabaseId });

async function main() {
    try {
        const docRef = db.collection('installments').doc('v02qpvfjkekmfkpwdftwh');
        const snap = await docRef.get();
        if (snap.exists) {
            console.log("Installment Data:", JSON.stringify(snap.data(), null, 2));
        } else {
            console.log("Installment not found");
        }
    } catch(e) {
        console.error(e);
    }
}
main();
