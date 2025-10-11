import { useEffect, useRef } from "react";

interface VideoThumbnailProps {
  src: string;
  className?: string;
  testId?: string;
}

export function VideoThumbnail({ src, className = "", testId }: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {
              // Auto-play failed
            });
          } else {
            videoRef.current?.pause();
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        muted
        loop
        playsInline
        data-testid={testId}
      />
    </div>
  );
}
