const firebaseConfig = require('./firebase-applet-config.json');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, updateDoc } = require('firebase/firestore');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const targetSaleId = 'f30l6tndenu2ua8zprptsf';
  const targetSaleSnap = await getDoc(doc(db, 'sales', targetSaleId));
  if (!targetSaleSnap.exists()) {
      console.log('Sale not found');
      process.exit(1);
  }
  const targetSale = { id: targetSaleSnap.id, ...targetSaleSnap.data() };
  console.log('Target Sale:', targetSale);

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

  const inst1 = installments[0]; // First installment
  const inst2 = installments[1]; // Second installment
  console.log('Installment 1:', inst1);
  console.log('Installment 2:', inst2);
  
  // Calculate new amounts for inst 2
  const amountToKeep = 32.58;
  const newInst2Remaining = Number((inst2.amount - amountToKeep).toFixed(2));
  
  await updateDoc(doc(db, 'installments', inst2.id), {
      paidAmount: amountToKeep,
      remainingAmount: newInst2Remaining,
      status: 'pago_parcial',
      updatedAt: Date.now()
  });
  console.log('Installment 2 updated.');

  // Now calculate total paid for the sale
  let totalSalePaid = 0;
  // Inst 1 should be fully paid
  if (inst1.status === 'pago') {
      totalSalePaid += inst1.amount;
  } else {
      totalSalePaid += inst1.paidAmount || 0;
  }
  totalSalePaid += amountToKeep; // For inst 2
  totalSalePaid = Number(totalSalePaid.toFixed(2));
  
  const newSaleRemaining = Number((targetSale.totalValue - totalSalePaid).toFixed(2));
  
  await updateDoc(doc(db, 'sales', targetSale.id), {
      paidValue: totalSalePaid,
      remainingValue: newSaleRemaining,
      status: newSaleRemaining <= 0 ? 'pago' : 'pago_parcial',
      updatedAt: Date.now()
  });
  console.log('Sale updated. New paid:', totalSalePaid, 'New remaining:', newSaleRemaining);
  
  // Update payments if any
  const paySnap = await getDocs(collection(db, 'payments'));
  let paymentFound = false;
  paySnap.forEach(d => {
      const data = d.data();
      if (data.installmentId === inst2.id) {
          console.log('Updating payment', d.id, 'to 32.58');
          updateDoc(doc(db, 'payments', d.id), { amount: 32.58 });
          paymentFound = true;
      }
  });
  if (!paymentFound) {
      console.log('No payment record found for this installment.');
  }
  
  console.log('Done.');
  process.exit(0);
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});
