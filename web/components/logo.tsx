import Image from "next/image";
import Link from "next/link";
import React from "react";

export const Logo = () => {
  return (
    <Link
      href="/"
      className="w-24 h-24 rounded-full cursor-pointer hover:animate-pulse"
    >
      <Image width={200} height={200} src="/logo.png" alt="SolBall" />
    </Link>
  );
};
