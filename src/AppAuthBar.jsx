// frontend/src/AppAuthBar.jsx
import React, { useEffect, useState } from "react";
import { auth, onAuthStateChanged } from "./firebase";

export default function AppAuthBar() {
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  async function handleSignOut() {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Sign-out failed:", err);
      alert(err.message || "Sign-out failed");
    }
  }

  if (user) {
    return (
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="avatar"
            style={{ width: 28, height: 28, borderRadius: "50%" }}
          />
        )}
        <span style={{ fontSize: 13 }}>
          {user.displayName || user.email || "Signed in"}
        </span>
        <button 
          onClick={handleSignOut}
          style={{ 
            background: '#dc2626', 
            color: '#fff', 
            border: 'none', 
            padding: '5px 10px', 
            borderRadius: 6, 
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
  
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return null;
}
