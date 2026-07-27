import React from "react";

const LIGHT_LOGO = "/arevei-logo.png";
const DARK_LOGO = "/arevei-logo-mark.png";

export default function BrandLogo({ className = "h-7", onDark = false, alt = "Arevei" }) {
  const imageClass = `${className} w-auto max-w-full shrink-0 object-contain object-left`;

  if (onDark) {
    return <img src={DARK_LOGO} alt={alt} className={imageClass} />;
  }

  return (
    <>
      <img src={LIGHT_LOGO} alt={alt} className={`${imageClass} dark:hidden`} />
      <img src={DARK_LOGO} alt={alt} className={`${imageClass} hidden dark:block`} />
    </>
  );
}
