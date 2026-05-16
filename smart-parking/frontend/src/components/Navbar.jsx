import React, { useContext, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Notifications from './Notifications';



export default function Navbar() {
  const navigate = useNavigate();
  const { token, user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);

  const isAdmin = useMemo(() => {
    const role = user?.role || user?.isAdmin || user?.admin;
    return role === 'admin' || role === true || role === 'true';
  }, [user]);

  const onLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="sp-navbar">
      <div className="sp-navbar-inner">
        <Link to="/" className="sp-navbar-logo" onClick={() => setOpen(false)}>
          <span>🅿️</span> <span>SmartPark</span>
        </Link>

        <button
          className="sp-navbar-hamburger"
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>

        <nav className={open ? 'sp-navbar-links sp-navbar-links-open' : 'sp-navbar-links'}>
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>
          <NavLink to="/entry" onClick={() => setOpen(false)}>Entry Gate</NavLink>
          <NavLink to="/exit" onClick={() => setOpen(false)}>Exit Gate</NavLink>
          <NavLink to="/slots" onClick={() => setOpen(false)}>Slot Display</NavLink>

          {isAdmin && (
            <>
              <NavLink to="/admin" onClick={() => setOpen(false)}>Admin</NavLink>
              <NavLink to="/analytics" onClick={() => setOpen(false)}>Analytics</NavLink>
            </>
          )}

          <div className="sp-navbar-divider" />

          <div className="sp-navbar-notifications">
            <Notifications />
          </div>


          {token ? (
            <button type="button" className="sp-navbar-logout" onClick={onLogout}>
              Logout
            </button>
          ) : (
            <Link to="/login" className="sp-navbar-logout" onClick={() => setOpen(false)}>
              Login
            </Link>
          )}
        </nav>
      </div>

      <style>{`
        .sp-navbar{position:sticky;top:0;z-index:50;background:#1a1a2e;color:#eaf0ff;border-bottom:1px solid rgba(255,255,255,.08)}
        .sp-navbar-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:16px}
        .sp-navbar-logo{color:#eaf0ff;text-decoration:none;font-weight:900;display:flex;align-items:center;gap:10px;font-size:20px}
        .sp-navbar-hamburger{display:none;background:transparent;border:1px solid rgba(255,255,255,.18);color:#eaf0ff;border-radius:10px;padding:8px 10px;font-weight:800;cursor:pointer}
        .sp-navbar-links{display:flex;align-items:center;gap:14px}
        .sp-navbar-links a{color:rgba(234,240,255,.88);text-decoration:none;font-weight:800;font-size:14px;padding:8px 10px;border-radius:12px;transition:background .15s ease}
        .sp-navbar-links a:hover{background:rgba(255,255,255,.06)}
        .sp-navbar-links a.active{background:rgba(79,124,255,.22);color:#fff}
        .sp-navbar-divider{width:1px;height:24px;background:rgba(255,255,255,.10);margin:0 4px}
        .sp-navbar-notifications{cursor:pointer;padding:8px 10px;border-radius:12px;display:flex;align-items:center;gap:8px;color:rgba(234,240,255,.9);font-weight:800}
        .sp-navbar-logout{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#fff;text-decoration:none;border-radius:12px;padding:8px 12px;font-weight:900;cursor:pointer}
        @media(max-width:860px){
          .sp-navbar-hamburger{display:block}
          .sp-navbar-links{display:none;flex-direction:column;align-items:flex-start;gap:8px;position:absolute;right:12px;left:12px;top:60px;background:#1a1a2e;border:1px solid rgba(255,255,255,.10);padding:12px;border-radius:16px}
          .sp-navbar-links-open{display:flex}
          .sp-navbar-divider{display:none}
        }
      `}</style>
    </header>
  );
}