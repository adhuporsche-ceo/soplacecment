import { useEffect, useState } from 'react';

export function useScrollSpy(sectionIds: string[], topOffset = 112): string {
  const [activeSectionId, setActiveSectionId] = useState(sectionIds[0] || '');

  useEffect(() => {
    if (!sectionIds.length) return;

    const updateActiveSection = () => {
      // A fixed reading line keeps long sections from winning just because they overlap the viewport.
      const marker = topOffset + Math.min(100, window.innerHeight * 0.25);
      const sections = sectionIds.flatMap(id => {
        const element = document.getElementById(id);
        return element ? [{ id, rect: element.getBoundingClientRect() }] : [];
      });
      const current = sections.find(({ rect }) => rect.top <= marker && rect.bottom > marker);
      const nearest = sections.reduce<(typeof sections)[number] | undefined>((best, section) => {
        if (!best) return section;
        const distance = Math.abs(section.rect.top - marker);
        return distance < Math.abs(best.rect.top - marker) ? section : best;
      }, undefined);
      const active = current || nearest;
      if (active) setActiveSectionId(active.id);
    };

    const observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: `-${topOffset}px 0px -50% 0px`,
      threshold: 0,
    });

    sectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    updateActiveSection();

    return () => observer.disconnect();
  }, [sectionIds, topOffset]);

  return activeSectionId;
}
