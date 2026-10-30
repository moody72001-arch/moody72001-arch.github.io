// ============================================
// firebase-config.js
// إعدادات Firebase + الأدوات المساعدة
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc, 
  deleteDoc,
  onSnapshot, 
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ============================================
// إعدادات Firebase
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyD4PqVEdU1NI7_5eZGntteEyRbZ519KYbg",
  authDomain: "my-team-4d879.firebaseapp.com",
  projectId: "my-team-4d879",
  storageBucket: "my-team-4d879.firebasestorage.app",
  messagingSenderId: "837918664225",
  appId: "1:837918664225:web:28a56f2a7065228faae560"
};

export const TEAM_ID = "my-team";
export const ONESIGNAL_APP_ID = "a05829ee-dd76-44d5-929a-793ea08664c7";

// ⚠️ مهم: بعد ما تفعّل Cloud Function، خلي القيمة دي فاضية
// دلوقتي مؤقتاً حط مفتاح REST هنا عشان تختبر
// بس متخليش المستودع Public لو حطيت المفتاح
export const ONESIGNAL_REST_KEY = ""; // ← حط المفتاح هنا مؤقتاً

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const teamDocRef = doc(db, "teams", TEAM_ID);

// ✅ تفعيل offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence: متصفح آخر مفتوح');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence: غير مدعوم');
  }
});

// ============================================
// ✅ دالة Toast (بدل alert)
// ============================================
export function toast(msg, type = 'info', duration = 3000) {
  const colors = {
    success: 'toast-success',
    error: 'toast-error',
    info: 'toast-info',
    warning: 'toast-warning'
  };
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = `toast ${colors[type] || colors.info}`;
  el.textContent = msg;
  container.appendChild(el);
  
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ============================================
// ✅ Debounce (لتقليل عدد مرات الحفظ)
// ============================================
export function debounce(fn, delay = 800) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ============================================
// ✅ Throttle (للتحديثات المتكررة)
// ============================================
export function throttle(fn, limit = 200) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// ============================================
// ✅ توليد ID
// ============================================
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ============================================
// ✅ تنسيق الأرقام
// ============================================
export function fmt(n) {
  return Number(n || 0).toLocaleString('ar-EG');
}

// ============================================
// ✅ تنسيق رقم التليفون إلى إيميل
// ============================================
export function formatPhone(phone) {
  return phone.includes('@') ? phone : phone + "@futsal.com";
}

// ============================================
// ✅ التحقق من رقم التليفون المصري
// ============================================
export function validateEgyptianPhone(phone) {
  // يقبل: 01xxxxxxxxx (11 رقم يبدأ بـ 010/011/012/015)
  const cleaned = phone.replace(/\D/g, '');
  return /^01[0125][0-9]{8}$/.test(cleaned);
}

// ============================================
// ✅ ضغط الصورة وتحويلها لـ Base64
// ============================================
export function compressImage(file, maxSize = 400, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ============================================
// ✅ رفع صورة على Firebase Storage
// ============================================
export async function uploadImageToStorage(file, folder, filename) {
  const path = `${folder}/${filename}_${Date.now()}.jpg`;
  const fileRef = storageRef(storage, path);
  
  // ضغط الصورة أول
  const base64 = await compressImage(file, 400, 0.8);
  
  // تحويل base64 لـ blob
  const response = await fetch(base64);
  const blob = await response.blob();
  
  // رفع
  await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' });
  const url = await getDownloadURL(fileRef);
  
  return url;
}

// ============================================
// ✅ حذف صورة من Storage
// ============================================
export async function deleteImageFromStorage(url) {
  if (!url || !url.includes('firebase')) return;
  try {
    const fileRef = storageRef(storage, url);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn('فشل حذف الصورة:', e);
  }
}

// ============================================
// ✅ إرسال إشعار OneSignal
// ============================================
export async function sendPushNotification(title, message) {
  if (!ONESIGNAL_REST_KEY) {
    throw new Error('مفتاح OneSignal REST مش متضبط. حطه في firebase-config.js');
  }
  
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Key ${ONESIGNAL_REST_KEY}`
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'push',
      included_segments: ['Subscribed Users'],
      headings: { en: title, ar: title },
      contents: { en: message, ar: message }
    })
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.errors?.[0] || 'فشل إرسال الإشعار');
  }
  return data;
}

// ============================================
// ✅ تصدير دوال Firebase للاستخدام في app.js
// ============================================
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
};
