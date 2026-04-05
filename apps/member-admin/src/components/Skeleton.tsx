'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

const shimmer = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const baseStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 'var(--radius-sm)',
};

export function Skeleton({ width = '100%', height = 16, borderRadius, style }: SkeletonProps) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmer }} />
      <div style={{ ...baseStyle, width, height, borderRadius: borderRadius ?? baseStyle.borderRadius, ...style }} />
    </>
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style dangerouslySetInnerHTML={{ __html: shimmer }} />
      <Skeleton height={20} width="60%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === rows - 1 ? '40%' : '100%'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <style dangerouslySetInnerHTML={{ __html: shimmer }} />
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '12px 24px', borderBottom: '1px solid var(--border-color)' }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} height={12} width="70%" />)}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={14} width={c === 0 ? '80%' : c === cols - 1 ? '50%' : '65%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, minWidth = 280 }: { count?: number; minWidth?: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmer }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`, gap: 'var(--space-lg)' }}>
        {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} rows={3} />)}
      </div>
    </>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shimmer }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 'var(--space-lg)' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-panel" style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={36} width={36} borderRadius="50%" />
            <Skeleton height={28} width="50%" />
            <Skeleton height={14} width="70%" />
          </div>
        ))}
      </div>
    </>
  );
}

export default Skeleton;
