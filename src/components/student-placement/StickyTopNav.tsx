import { useEffect, useRef } from 'react';
import { GraduationCap, LogOut } from 'lucide-react';

export interface ProfileNavStep {
  id: string;
  label: string;
}

interface StickyTopNavProps {
  steps: ProfileNavStep[];
  activeId: string;
  saving: boolean;
  onNavigate: (id: string) => void;
  onSave: () => void;
  onLogout: () => void;
}

export function StickyTopNav({
  steps,
  activeId,
  saving,
  onNavigate,
  onSave,
  onLogout,
}: StickyTopNavProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const activeButton = navRef.current?.querySelector<HTMLButtonElement>(
      `[data-step-id="${activeId}"]`,
    );
    if (!activeButton) return;

    const nav = navRef.current;
    const buttonCenter = activeButton.offsetLeft + activeButton.offsetWidth / 2;
    nav?.scrollTo({
      left: Math.max(0, buttonCenter - (nav.clientWidth / 2)),
      behavior: 'smooth',
    });
  }, [activeId]);

  return (
    <header className="placement-sticky-nav">
      <a className="placement-nav-brand" href="#profile-overview" aria-label="StudentInsight overview">
        <span><GraduationCap size={19} /></span>
        <b>Student<span>Insight</span></b>
      </a>
      <nav ref={navRef} className="placement-step-nav" aria-label="Student profile steps">
        {steps.map((step, index) => (
          <button
            key={step.id}
            data-step-id={step.id}
            type="button"
            className={activeId === step.id ? 'active' : ''}
            aria-current={activeId === step.id ? 'step' : undefined}
            onClick={() => onNavigate(step.id)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step.label}
          </button>
        ))}
      </nav>
      <div className="placement-nav-actions">
        <button type="button" className="placement-nav-save" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save now'}
        </button>
        <button type="button" className="placement-nav-logout" onClick={onLogout} aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
