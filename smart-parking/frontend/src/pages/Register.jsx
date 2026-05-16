// C:\Users\User\Desktop\PK\smart-parking\frontend\src\pages\Register.jsx
import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import './auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);





  const [name, setName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    try {
      const api = import.meta.env.VITE_API_URL;
      const res = await axios.post(`${api}/api/auth/register`, { name, email, password });
      login(res.data);


      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Register failed');
    }
  };

  return (
    <div className="sp-auth-wrap">
      <div className="sp-auth-card">
        <h2>Register</h2>
        <form className="sp-auth-form" onSubmit={onSubmit}>
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />

          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

          {error ? <div className="sp-auth-error">{error}</div> : null}

          <button className="sp-btn sp-btn-primary" type="submit">Create account</button>
        </form>
        <p className="sp-auth-foot">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

