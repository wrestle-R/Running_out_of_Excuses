import React, { useState } from "react";

// Simple curtain reveal card with hover effect
export function CardCurtainReveal({ children, className = "", ...props }) {
  const [hovered, setHovered] = useState(false);

  // children: [body, description]
  const [body, description] = React.Children.toArray(children);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
      style={{ minHeight: 140, ...props.style }}
    >
      <div
        style={{
          opacity: hovered ? 0 : 1,
          transition: "opacity 0.3s",
          pointerEvents: hovered ? "none" : "auto",
        }}
      >
        {body}
      </div>
      <div
        style={{
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: hovered ? "auto" : "none",
          position: "absolute",
          inset: 0,
          zIndex: 10,
        }}
      >
        {description}
      </div>
    </div>
  );
}

export function CardCurtainRevealBody({ children, className = "", ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export function CardCurtainRevealDescription({ children, className = "", ...props }) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}