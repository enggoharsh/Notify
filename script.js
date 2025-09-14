console.log("Script loaded!");

// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// 🔹 Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCubcGlzRRbyF-0ycjwIL5ndygyHv2XUqU",
  authDomain: "statusggm.firebaseapp.com",
  projectId: "statusggm",
  storageBucket: "statusggm.firebasestorage.app",
  messagingSenderId: "413765224085",
  appId: "1:413765224085:web:4966715a2648b31e1dfd9c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Map usernames to Firebase Auth emails
const emailMap = {
  "Anupam": "23bec014@smvdu.ac.in",
  "Om": "23bec038@smvdu.ac.in",
  "Harsh": "23bec027@smvdu.ac.in"
};

// Friends data with photo paths
const friends = {
  "anupam": { name: "Anupam", photo: "images/anupam.jpg" },
  "harsh": { name: "Harsh", photo: "images/harsh.jpg" },
  "om": { name: "Om", photo: "images/om.jpg" }
};

const container = document.getElementById("friends-container");
const loginContainer = document.getElementById("login-container");
const appContainer = document.getElementById("app");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const updateBtn = document.getElementById("update-btn");

// Track current user's friendId
let currentFriendId = null;

// ---------------- PASSWORD TOGGLE ----------------
document.getElementById("toggle-password")?.addEventListener("click", () => {
  const passwordField = document.getElementById("password");
  const type = passwordField.type === "password" ? "text" : "password";
  passwordField.type = type;
  document.getElementById("toggle-password").textContent =
    type === "password" ? "👁️" : "🙈";
});

// ---------------- LOGIN FUNCTION ----------------
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    loginError.textContent = "Please enter email and password.";
    loginError.style.display = "block";
    return;
  }

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    loginContainer.style.display = "none";
    appContainer.style.display = "block";
    loginError.style.display = "none";

    // Identify logged-in user’s friendId
    currentFriendId = Object.keys(friends).find(
      key => emailMap[friends[key].name] === userCred.user.email
    );

    buildFriendCards(userCred.user.email);
  } catch (error) {
    loginError.textContent = "Invalid email or password.";
    loginError.style.display = "block";
  }
});

// ---------------- LOGOUT FUNCTION ----------------
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    appContainer.style.display = "none";
    loginContainer.style.display = "block";
    container.innerHTML = "";
    currentFriendId = null;
  } catch (error) {
    console.error("Logout error:", error.message);
  }
});

// ---------------- BUILD FRIEND CARDS ----------------
function buildFriendCards(currentEmail) {
  container.innerHTML = "";

  Object.keys(friends).forEach(friendId => {
    const f = friends[friendId];
    const card = document.createElement("div");
    card.classList.add("friend-card");

    const isCurrentUser = emailMap[f.name] === currentEmail;

    card.innerHTML = `
      <img src="${f.photo}" alt="${f.name}" class="friend-photo">
      <h3>${f.name}${isCurrentUser ? " (You)" : ""}</h3>
      <ul id="logs-${friendId}"> <li>No status yet</li> </ul>
    `;

    container.appendChild(card);
    loadLogs(friendId, isCurrentUser);
  });
}

// ---------------- TIME HELPER ----------------
function formatTo12Hour(timeStr) {
  if (!timeStr) return "?";
  let [hours, minutes] = timeStr.split(":").map(Number);

  const date = new Date();
  date.setHours(hours, minutes);

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

// ---------------- TOAST FUNCTION ----------------
function showToast(message, duration = 2000) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => (toast.style.display = "none"), duration);
}

// ---------------- UPDATE STATUS ----------------
updateBtn.addEventListener("click", async () => {
  if (!currentFriendId) return alert("Not logged in!");

  const status = document.getElementById("activity").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const timestamp = Date.now();

  if (!start || !end) return alert("Please select start and end times!");

  const formattedStart = formatTo12Hour(start);
  const formattedEnd = formatTo12Hour(end);

  try {
    await addDoc(collection(db, "statuses", currentFriendId, "logs"), {
      status: `${status} (from ${formattedStart} to ${formattedEnd})`,
      date: new Date().toLocaleString(),
      timestamp: timestamp
    });
    showToast("✅ Status updated!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
});

// ---------------- LOAD LOGS ----------------
function loadLogs(friendId, isCurrentUser) {
  const logsContainer = document.getElementById(`logs-${friendId}`);
  const q = query(
    collection(db, "statuses", friendId, "logs"),
    orderBy("timestamp", "desc")
  );

  onSnapshot(q, snapshot => {
    logsContainer.innerHTML = "";
    const now = Date.now();
    let first = true;

    if (snapshot.empty) {
      logsContainer.innerHTML = "<li>No status yet</li>";
      return;
    }

    snapshot.forEach(docSnap => {
      const log = docSnap.data();
      const docRef = docSnap.ref;

      // Auto delete logs older than 24h
      if (now - log.timestamp > 86400000) {
        deleteDoc(docRef).catch(err => console.error("Auto-delete error:", err));
        return;
      }

      const li = document.createElement("li");
      li.textContent = `${log.status} - ${log.date}`;

      if (isCurrentUser) {
        // Allow deleting your own logs
        const delBtn = document.createElement("button");
        delBtn.textContent = "❌";
        delBtn.classList.add("delete-btn");
        delBtn.addEventListener("click", async () => {
          if (confirm("Delete this status?")) {
            await deleteDoc(docRef);
            showToast("🗑️ Status deleted!");
          }
        });
        li.appendChild(delBtn);
        logsContainer.appendChild(li);
      } else {
        // For others, only show latest status
        if (first) {
          logsContainer.appendChild(li);
          first = false;
        }
      }
    });
  });
}  