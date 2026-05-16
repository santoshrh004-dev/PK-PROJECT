// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\Login.jsx
import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);


  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const api = import.meta.env.VITE_API_URL;
      const res = await axios.post(`${api}/api/auth/login`, { email, password });
      login(res.data);


      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="sp-auth-wrap">
      <div className="sp-auth-card">
        <h2>Login</h2>
        <form className="sp-auth-form" onSubmit={onSubmit}>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          {error ? <div className="sp-auth-error">{error}</div> : null}

          <button className="sp-btn sp-btn-primary" type="submit">Login</button>
        </form>
        <p className="sp-auth-foot">
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

