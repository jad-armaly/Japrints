// ---------------- Firebase Setup ----------------
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getFirestore, collection, addDoc, doc, getDocs, query, where, updateDoc, serverTimestamp
} from "firebase/firestore";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDPxXppSkqEoH7F4fEHSzRwjCIrAttTndo",
  authDomain: "japrints-6f754.firebaseapp.com",
  projectId: "japrints-6f754",
  storageBucket: "japrints-6f754.appspot.com",
  messagingSenderId: "292756405814",
  appId: "1:292756405814:web:bbe3b9a662249222732297",
  measurementId: "G-EVB38TDJ28"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ---------------- DOM Elements ----------------
const emailInput = document.getElementById('emailInput');
const signupBtn = document.getElementById('signupBtn');
const status = document.getElementById('status');
const afterSignup = document.getElementById('afterSignup');
const refLinkBox = document.getElementById('refLinkBox');
const refInfo = document.getElementById('refInfo');
const whatsappShare = document.getElementById('whatsappShare');
const refParamInput = document.getElementById('refParam');

// ---------------- Referral Detection ----------------
function getRefParam() {
  const p = new URLSearchParams(window.location.search);
  return p.get('ref');
}
const incomingRef = getRefParam();
if (incomingRef) {
  refParamInput.value = incomingRef;
  status.innerText = "Referral code detected in URL. If you sign up, this will be credited to the referrer.";
}

// ---------------- Utilities ----------------
function genReferralCode(email) {
  const local = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toLowerCase().slice(0,12);
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${local}${rand}`;
}

function showAfterSignup(code, email, discountEligible=false, referralsCount=0) {
  afterSignup.style.display = "block";
  const origin = window.location.origin + window.location.pathname;
  const link = `${origin}?ref=${encodeURIComponent(code)}`;
  
  refLinkBox.innerHTML = `<a href="${link}" target="_blank" rel="noopener">${link}</a>`;
  refInfo.innerText = `Your code: ${code} • Referred: ${referralsCount} people • Discount eligible: ${discountEligible ? 'YES (10%)' : 'NO'}`;
  whatsappShare.href = `https://wa.me/?text=${encodeURIComponent("Check out JAprints! Get 10% with my link: " + link)}`;

  // Copy to clipboard (only attach once)
  if (!refLinkBox.dataset.listenerAttached) {
    refLinkBox.addEventListener('click', () => {
      navigator.clipboard?.writeText(link).then(() => {
        alert("Referral link copied to clipboard!");
      });
    });
    refLinkBox.dataset.listenerAttached = "true";
  }
}

// ---------------- Signup Flow ----------------
signupBtn.addEventListener('click', async () => {
  const email = (emailInput.value || "").trim().toLowerCase();
  const referredBy = (refParamInput.value || "").trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    status.innerText = "Please enter a valid email address.";
    return;
  }
  status.innerText = "Submitting...";

  try {
    const usersColl = collection(db, "users");

    // Check if user exists
    const q = query(usersColl, where("email", "==", email));
    const existing = await getDocs(q);

    if (!existing.empty) {
      const docSnap = existing.docs[0];
      const data = docSnap.data();
      showAfterSignup(data.referralCode, data.email, data.discountEligible, data.referralsCount || 0);
      status.innerText = "You're already registered. Below is your referral link.";
      return;
    }

    // Create new user
    const referralCode = genReferralCode(email);
    const newUser = {
      email,
      referralCode,
      referredBy: referredBy || null,
      createdAt: serverTimestamp(),
      referralsCount: 0,
      discountEligible: false
    };
    await addDoc(usersColl, newUser);

    // Handle referral
    if (referredBy && referredBy !== referralCode) { // prevent self-referral
      const q2 = query(usersColl, where("referralCode", "==", referredBy));
      const snap = await getDocs(q2);
      if (!snap.empty) {
        const refDoc = snap.docs[0];
        const refData = refDoc.data();
        const refDocRef = doc(db, "users", refDoc.id);
        const newCount = (refData.referralsCount || 0) + 1;
        await updateDoc(refDocRef, {
          referralsCount: newCount,
          discountEligible: true
        });
      }
    }

    showAfterSignup(referralCode, email, false, 0);
    status.innerText = "Thank you! You are signed up. Your referral link is below.";
    emailInput.value = "";

  } catch (err) {
    console.error(err);
    status.innerText = "Error signing up. Open console for details.";
  }
});
