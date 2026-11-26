import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import NavigationBar from './taker/components/NavigationBar.js';
import HomePage from './taker/pages/HomePage.js';
import SignInPage from './pages/SignInPage.js';

function App() {
  if (window.location.pathname === '/signin') {
    return <SignInPage />;
  }

  return (
    <div className="min-h-screen">
      <NavigationBar />
      <HomePage />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
