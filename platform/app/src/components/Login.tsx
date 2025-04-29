import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase'; // Ensure this points to your Firebase configuration
import BackItem from 'platform/ui/src/components/AllInOneMenu/BackItem';
import { toEmail, toUsername } from '../utils/authUtils';


const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(toUsername(user.email));
      } else {
        setUserEmail(null);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const emailWithDomain = toEmail(email);
      await signInWithEmailAndPassword(auth, emailWithDomain, password);
      navigate('/search'); // Redirect to the main page after login
    } catch (error) {
      setError(`Failed to log in. Please check your credentials.`);
    }
  };

  const handleDemoLogin = async () => {
    try {
      // Automatically log in the demo user
      await signInWithEmailAndPassword(auth, 'demo@demo.com', 'demo_demo');
      // After successful login, redirect to the desired URL
      window.location.href = 'https://genai-radiology.web.app/generative-ai?StudyInstanceUIDs=1.3';
    } catch (error) {
      setError('Failed to log in as demo user.');
      console.error('Failed to log in as demo user:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // Log the user out of Firebase Authentication
      navigate('/login'); // Redirect to the login page
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (loading) {
    return <div style={styles.container}><p style={{ color: 'white' }}>Checking login status...</p></div>;
  }

  if (userEmail) {
    // Already logged in
    return (
      <div style={styles.container}>
        <button style={styles.homeButton} onClick={() => navigate('/search')}>Go Home</button>
        <div style={{ marginTop: '200px', ...styles.container}}>
          <h2 style={styles.title}>Welcome back!</h2>
          <img
            style={styles.cornerIcon}
            src="../../assets/profile-icon.png"
            alt="stack icon"
            onClick={() => navigate('/login')}
          ></img>
          <p style={{ color: '#ffffff' }}>Username: <strong>{userEmail}</strong></p>
          <button style={styles.logoutButton} onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <img
        style={styles.mainIcon}
        src="../../assets/logo.png"
        alt="stack icon"
        onClick={() => navigate('/')}
      ></img>
      <div style={styles.backgroundBox}>
        <h2 style={styles.title}>Login</h2>
        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputContainer}>
            <label htmlFor="email" style={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.inputContainer}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>
            Log In
          </button>
        </form>

        <button onClick={handleDemoLogin} style={styles.demoButton}>
          Try Demo Mode
        </button>

        <p style={styles.label}>
          Don't have an account?{' '}
          <button style={{ ...styles.button, backgroundColor: 'transparent', color: '#008aff', textDecoration: 'underline' }} onClick={() => navigate('/signup')}>
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};

const styles = {
  backgroundBox: {
    backgroundColor: '#090C27',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cornerIcon: {
    width: '40px',
    height: '40px',
    marginTop: '10px',
    marginRight: '10px',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    backgroundColor: '#000000',
  },
  mainIcon: {
    width: '120px',
    height: 'auto',
    marginBottom: '100px',
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
    color: 'white',
  },
  button: {
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#78CAE3',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
  },
  homeButton: {
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: 'none',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    marginRight: '80%',
    marginTop: '20px',
  },
  logoutButton: {
    padding: '10px',
    backgroundColor: '#152A66',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    margin: '20px 0',
  },
  demoButton: {
    padding: '15px',
    borderRadius: '8px',
    backgroundColor: '#152A66',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    marginTop: '20px',
  },
  error: {
    color: 'red',
    marginBottom: '20px',
  },
};

export default Login;
