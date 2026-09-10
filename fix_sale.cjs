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
    }
  });

  if (!clientId) {
      console.log('Client not found');
      process.exit(1);
  }

  const salesSnap = await getDocs(collection(db, 'sales'));
  let targetSale = null;
  salesSnap.forEach(d => {
    const data = d.data();
    if (data.clientId === clientId && data.brand === 'Tupperware' && Math.abs(data.totalValue - 594.6) < 1) {
        targetSale = { id: d.id, ...data };
    }
  });

  if (!targetSale) {
      console.log('Sale not found');
      process.exit(1);
  }

  const instSnap = await getDocs(collection(db, 'installments'));
  const installments = [];
  instSnap.forEach(d => {
    const data = d.data();
    if (data.saleId === targetSale.id) {
      installments.push({ id: d.id, ...data });
    }
  });
  installments.sort((a,b) => a.number - b.number);
  
  if (installments.length < 2) {
      console.log('Not enough installments');
      process.exit(1);
  }

  const inst2 = installments[1]; // Second installment
  console.log('Target Installment 2:', inst2);
  
  // Calculate new amounts
  const amountToKeep = 32.58;
  const newInstRemaining = inst2.amount - amountToKeep;
  
  await updateDoc(doc(db, 'installments', inst2.id), {
      paidAmount: amountToKeep,
      remainingAmount: newInstRemaining,
      status: 'pago_parcial',
      updatedAt: Date.now()
  });
  console.log('Installment 2 updated.');

  // Now calculate total paid for the sale
  let totalSalePaid = 0;
  // Inst 1 should be fully paid
  if (installments[0].status === 'pago') {
      totalSalePaid += installments[0].amount;
  } else {
      totalSalePaid += installments[0].paidAmount || 0;
  }
  totalSalePaid += amountToKeep; // For inst 2
  
  for(let i=2; i<installments.length; i++){
      totalSalePaid += installments[i].paidAmount || 0;
  }

  const newSaleRemaining = targetSale.totalValue - totalSalePaid;
  
  await updateDoc(doc(db, 'sales', targetSale.id), {
      paidValue: totalSalePaid,
      remainingValue: newSaleRemaining,
      status: newSaleRemaining <= 0 ? 'pago' : 'pago_parcial',
      updatedAt: Date.now()
  });
  console.log('Sale updated.');
  
  // Update payments if any
  const paySnap = await getDocs(collection(db, 'payments'));
  paySnap.forEach(d => {
      const data = d.data();
      if (data.installmentId === inst2.id) {
          console.log('Updating payment', d.id, 'to 32.58');
          updateDoc(doc(db, 'payments', d.id), { amount: 32.58 });
      }
  });
  
  console.log('Done.');
  process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
