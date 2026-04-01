import React from "react";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
  isOnline?: boolean;
  imageUrl?: string;
}

const WaAvatar = React.memo(function WaAvatar({ initials, color, size = 49, isOnline, imageUrl }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = imageUrl && !imgError;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {showImage ? (
        <img
          src={imageUrl}
          alt={initials}
          loading="lazy"
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-semibold select-none"
          style={{ width: size, height: size, backgroundColor: color, color: "#fff", fontSize: size * 0.36 }}
        >
          {initials}
        </div>
      )}
      {isOnline && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{ width: size * 0.26, height: size * 0.26, backgroundColor: "var(--wa-green)", borderColor: "var(--wa-bg-panel)" }}
        />
      )}
    </div>
  );
});

export default WaAvatar;
