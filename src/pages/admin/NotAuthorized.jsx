import React from 'react';

export default function NotAuthorized() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Not authorized</h2>
      <p>You do not have permission to access this page. Please sign in with an admin account.</p>
    </div>
  );
}
