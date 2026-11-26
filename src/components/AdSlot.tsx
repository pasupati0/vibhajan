// src/components/AdSlot.tsx
import React, { useRef, useState } from 'react';

interface AdSlotProps {
  variant?: 'leaderboard' | 'rectangle';
  className?: string;
  // New props for video/image injection
  type?: 'placeholder' | 'video' | 'image';
  mediaSrc?: string;
  linkUrl?: string;
}

export function AdSlot({ 
  variant = 'leaderboard', 
  className = '',
  type = 'placeholder',
  mediaSrc,
  linkUrl
}: AdSlotProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Wrapper to handle click-through if a link is provided
  const MediaWrapper = ({ children }: { children: React.ReactNode }) => {
    if (linkUrl) {
      return (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
          {children}
        </a>
      );
    }
    return <>{children}</>;
  };

  return (
    <div className={`partner-network-slot ${variant} ${className}`}>
      <div className="promo-zone-content" style={{ padding: type === 'placeholder' ? 'var(--space-3)' : 0 }}>
        
        {type === 'placeholder' && (
          <div className="direct-sales-contact">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              📢 Advertise to India's smartest financial planners.
            </span>
            <a 
              href="mailto:pasupati@zohomail.in?subject=Advertising%20Inquiry%20for%20Ganaka" 
              className="btn btn-sm btn-ghost"
              style={{ marginTop: 8 }}
            >
              Contact: pasupati@zohomail.in
            </a>
          </div>
        )}

        {type === 'image' && mediaSrc && (
          <MediaWrapper>
            <img 
              src={mediaSrc} 
              alt="Partner Offer" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              loading="lazy"
            />
          </MediaWrapper>
        )}

        {type === 'video' && mediaSrc && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MediaWrapper>
              <video
                ref={videoRef}
                src={mediaSrc}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </MediaWrapper>
            
            {/* Mute / Unmute Control */}
            <button
              onClick={(e) => {
                e.preventDefault(); // Prevents triggering the linkUrl if inside an anchor
                toggleMute();
              }}
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                zIndex: 10,
                backdropFilter: 'blur(4px)'
              }}
              aria-label={isMuted ? "Unmute ad" : "Mute ad"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}