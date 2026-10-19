import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCV0jwpck9GjVhpUbv6UX_ydzurOfUlX0o",
  authDomain: "epltriatlon-a0170.firebaseapp.com",
  projectId: "epltriatlon-a0170",
  storageBucket: "epltriatlon-a0170.firebasestorage.app",
  messagingSenderId: "512515548327",
  appId: "1:512515548327:web:36d0a3127586b2ff5ba782",
  measurementId: "G-QJK0H7H7WB"
};

// Initialize Firebase (singleton safe)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

const COLLECTION_NAME = "atletas";

/**
 * Fetch all athletes from Firestore collection
 */
export async function fetchAtletasFromCloud() {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);
    const list = [];
    snapshot.forEach(docSnap => {
      list.push({ ...docSnap.data(), id: docSnap.data().id || docSnap.id });
    });
    return list;
  } catch (error) {
    console.log("Firebase read error:", error);
    return null;
  }
}

/**
 * Save / update single athlete in Firestore
 */
export async function saveSingleAtletaToCloud(atleta) {
  try {
    if (!atleta || !atleta.id) return;
    const docRef = doc(db, COLLECTION_NAME, String(atleta.id));
    await setDoc(docRef, JSON.parse(JSON.stringify(atleta)), { merge: true });
  } catch (error) {
    console.log("Firebase write single error:", error);
  }
}

/**
 * Save complete list of athletes to Firestore in batch
 */
export async function saveAtletasToCloud(atletasList) {
  try {
    if (!Array.isArray(atletasList)) return;
    const batch = writeBatch(db);
    atletasList.forEach(atleta => {
      if (atleta && atleta.id) {
        const docRef = doc(db, COLLECTION_NAME, String(atleta.id));
        batch.set(docRef, JSON.parse(JSON.stringify(atleta)), { merge: true });
      }
    });
    await batch.commit();
  } catch (error) {
    console.log("Firebase batch write error:", error);
  }
}

/**
 * Delete athlete document from Firestore
 */
export async function deleteAtletaFromCloud(athleteId) {
  try {
    const { deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, COLLECTION_NAME, String(athleteId));
    await deleteDoc(docRef);
  } catch (error) {
    console.log("Firebase delete error:", error);
  }
}

/**
 * Realtime subscription to athletes collection
 */
export function subscribeToAtletasCloud(onUpdate, onError) {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    return onSnapshot(colRef, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ ...docSnap.data(), id: docSnap.data().id || docSnap.id });
      });
      if (onUpdate) onUpdate(list);
    }, (err) => {
      console.log("Firebase snapshot error:", err);
      if (onError) onError(err);
    });
  } catch (error) {
    console.log("Firebase subscribe error:", error);
    return () => {};
  }
}

/**
 * Realtime subscription to system configuration (danger zone lock, etc.)
 */
export function subscribeToSystemConfig(onUpdate) {
  try {
    const configRef = doc(db, "configuracion", "sistema");
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        if (onUpdate) onUpdate(docSnap.data());
      } else {
        if (onUpdate) onUpdate({ dangerZoneEnabled: false });
      }
    }, (err) => {
      console.log("Config snapshot error:", err);
      if (onUpdate) onUpdate({ dangerZoneEnabled: false });
    });
  } catch (error) {
    console.log("Config subscribe error:", error);
    return () => {};
  }
}

/**
 * Intelligently and non-destructively merges local and cloud athlete lists,
 * ensuring no athlete, training record, abono or competition is ever lost.
 */
export function mergeAtletasLists(localList = [], cloudList = []) {
  if (!Array.isArray(localList)) localList = [];
  if (!Array.isArray(cloudList)) cloudList = [];

  const map = new Map();

  // 1. Index all local athletes
  for (const a of localList) {
    if (a && a.id) {
      map.set(String(a.id), { ...a });
    }
  }

  // 2. Merge cloud athletes without deleting local data
  for (const c of cloudList) {
    if (!c || !c.id) continue;
    const idKey = String(c.id);
    const existing = map.get(idKey);

    if (!existing) {
      map.set(idKey, c);
    } else {
      // Both exist: perform union of logs, payments and competitions
      const existingLatestLog = (existing.historial || [])[0]?.id || 0;
      const cloudLatestLog = (c.historial || [])[0]?.id || 0;

      // Deduplicate history by ID
      const allHistoryMap = new Map();
      [...(c.historial || []), ...(existing.historial || [])].forEach(h => {
        if (h && h.id) allHistoryMap.set(String(h.id), h);
      });
      const mergedHistorial = Array.from(allHistoryMap.values()).sort((a, b) => (b.id || 0) - (a.id || 0));

      // Deduplicate abonos by ID
      const allAbonosMap = new Map();
      [...(c.abonos || []), ...(existing.abonos || [])].forEach(ab => {
        if (ab && ab.id) allAbonosMap.set(String(ab.id), ab);
      });
      const mergedAbonos = Array.from(allAbonosMap.values());

      // Deduplicate competencias
      const compMap = new Map();
      [...(c.competencias || []), ...(existing.competencias || [])].forEach(comp => {
        const key = comp.nombre || comp.id || JSON.stringify(comp);
        compMap.set(key, comp);
      });
      const mergedCompetencias = Array.from(compMap.values());

      const base = existingLatestLog >= cloudLatestLog ? existing : c;
      const secondary = existingLatestLog >= cloudLatestLog ? c : existing;

      map.set(idKey, {
        ...secondary,
        ...base,
        historial: mergedHistorial,
        abonos: mergedAbonos,
        competencias: mergedCompetencias,
        ecosWeeks: { ...(c.ecosWeeks || {}), ...(existing.ecosWeeks || {}) },
        planHistory: [...(base.planHistory || secondary.planHistory || [])],
        plan: base.plan || secondary.plan || null
      });
    }
  }

  return Array.from(map.values());
}


