import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function saveGameToFirebase(uid: string, gameData: any) {
  await setDoc(doc(db, "users", uid), gameData, { merge: true });
}

export async function loadGameFromFirebase(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));

  if (!snap.exists()) return null;

  const data = snap.data();

  console.log("🔥 Firebase 불러오기", data);

  return data;
}