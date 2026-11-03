import React, { FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const LoginPage: React.FC = () => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      await login(email.trim(), password);
    } catch (loginError) {
      setFormError(loginError instanceof Error ? loginError.message : 'Sign in failed. Please try again.');
    }
  };

  const message = formError || error;

  return (
    <main className="login-page">
      <section className="login-showcase" aria-label="AuditMind 360 overview">
        <div className="login-showcase-content">
          <a className="login-brand" href="/" aria-label="AuditMind 360 home">
            <span className="login-brand-mark"><ShieldCheck size={21} strokeWidth={2.2} /></span>
            <span>AuditMind <strong>360</strong></span>
          </a>

          <div className="login-showcase-copy">
            <p className="login-eyebrow"><span /> CONTINUOUS AUDIT INTELLIGENCE</p>
            <h1>See the whole picture.<br /><span>Act with confidence.</span></h1>
            <p className="login-lede">
              A connected workspace for financial review, investigations, evidence, and internal controls.
            </p>
          </div>

          <div className="login-insight-card" aria-label="Audit workflow">
            <div className="login-insight-heading">
              <span className="login-insight-icon"><ShieldCheck size={17} /></span>
              <div><strong>Audit workspace</strong><span>One view. Connected evidence.</span></div>
              <span className="login-live"><i /> LIVE</span>
            </div>
            <div className="login-workflow">
              <div><span className="login-workflow-dot blue"><LockKeyhole size={13} /></span><span>Review activity</span><b>01</b></div>
              <div><span className="login-workflow-dot green"><ShieldCheck size={13} /></span><span>Verify evidence</span><b>02</b></div>
              <div><span className="login-workflow-dot amber"><ArrowRight size={13} /></span><span>Track follow-through</span><b>03</b></div>
            </div>
          </div>

          <p className="login-showcase-footer">A clearer view of risk, from first signal to resolution.</p>
        </div>
      </section>

      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-form-wrap">
          <div className="login-mobile-brand">
            <span className="login-brand-mark"><ShieldCheck size={19} /></span>
            <span>AuditMind <strong>360</strong></span>
          </div>
          <div className="login-form-heading">
            <span className="login-form-kicker">SECURE WORKSPACE</span>
            <h2 id="login-heading">Welcome back</h2>
            <p>Sign in with the account configured for your organization.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Work email</label>
            <div className="login-input-wrap">
              <Mail size={17} aria-hidden="true" />
              <input
                autoComplete="username"
                autoCapitalize="none"
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="name@organization.com"
                maxLength={320}
                required
              />
            </div>

            <div className="login-password-label">
              <label htmlFor="login-password">Password</label>
            </div>
            <div className="login-input-wrap">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                autoComplete="current-password"
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
                maxLength={1024}
                required
              />
              <button
                className="login-password-toggle"
                type="button"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {message && (
              <p className="login-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{message}</span>
              </p>
            )}

            <button className="login-submit" type="submit" disabled={isLoading}>
              <span>{isLoading ? 'Verifying account…' : 'Sign in securely'}</span>
              {!isLoading && <ArrowRight size={17} />}
            </button>
          </form>

          <div className="login-security-note">
            <LockKeyhole size={14} />
            <span>Your credentials are verified by the secure application server.</span>
          </div>
          <p className="login-help">Need access? Contact your system administrator.</p>
        </div>
      </section>
    </main>
  );
};
