import React from 'react';

// Stile semplice per centrare il testo
const adminPageStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  fontSize: '3rem',
  fontWeight: 'bold',
  color: '#ececec',
  backgroundColor: '#1a1a1a',
};

export default function AdminPage() {
  return (
    <div style={adminPageStyle}>
      ADMIN PAGE
    </div>
  );
}