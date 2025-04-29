import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { toEmail, toUsername } from '../utils/authUtils';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();

    // Validate that the passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const auth = getAuth();
    setLoading(true); // Start loading
    try {
      // Firebase sign-up
      const emailWithDomain = toEmail(email);
      await createUserWithEmailAndPassword(auth, emailWithDomain, password);
      setError(''); // Clear error on success
      // Redirect to the main page after a successful sign-up
      navigate('/'); // Adjust this path to where your main page is served
    } catch (err) {
      setError(err.message || 'Failed to create an account.');
    } finally {
      setLoading(false); // Stop loading
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Sign Up</h2>
      <form onSubmit={handleSignUp} style={styles.form}>
        <div style={styles.inputContainer}>
          <label htmlFor="email" style={styles.label}>Username</label>
          <input
            type="text"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.inputContainer}>
          <label htmlFor="password" style={styles.label}>Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.inputContainer}>
          <label htmlFor="confirmPassword" style={styles.label}>Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0000000', // OHIF background color
  },
  title: {
    fontSize: '32px',
    color: '#ffffff',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
  },
  inputContainer: {
    marginBottom: '20px',
  },
  label: {
    color: '#78CAE3',
    marginBottom: '5px',
    display: 'block',
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #3A4194',
    backgroundColor: '#090C27',
    color: '#ffffff',
  },
  button: {
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#78CAE3',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '20px',
  },
};

export default SignUp;
