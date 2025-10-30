import Image from "next/image";
import Link from "next/link";
import React from "react";

export const Logo = ({
  username,
  width,
  height,
}: {
  username?: string;
  width?: number;
  height?: number;
}) => {
  return (
    <Link
      href="/"
      className="relative w-24 h-24 flex items-center justify-center cursor-pointer hover:animate-pulse"
    >
      {/* Logo */}
      <div className={`"w-24 h-24 rounded-full overflow-hidden"`}>
        <Image
          width={width ?? 200}
          height={height ?? 200}
          src="/logo.png"
          alt="SolBall"
        />
      </div>

      {/* Curved Text */}
      <svg
        viewBox="0 0 200 100"
        className="absolute w-[140px] h-[70px] bottom-[35px] pointer-events-none"
      >
        <defs>
          <path
            id="text-arc"
            d="M 10 90 A 90 90 0 0 1 185 100"
            fill="transparent"
          />
        </defs>

        <text
          fontSize="13"
          fill="white"
          letterSpacing="3"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <textPath href="#text-arc" startOffset="50%" className="text-lg">
            {username ? username.toUpperCase() : "SOLBALL"}
          </textPath>
        </text>
      </svg>
    </Link>
  );
};
