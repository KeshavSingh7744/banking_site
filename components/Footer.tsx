// src/components/Footer.tsx
"use client";

import React from "react";
import Image from "next/image";
import { logoutAccount } from "@/lib/actions/user.actions";
import { useRouter } from "next/navigation";

const Footer = ({ user, type = "desktop" }: FooterProps) => {
  const router = useRouter();

  const handleLogOut = async () => {
    await logoutAccount();
    router.push("/sign-in");
  };

  const firstName = user?.firstName ?? "Guest";
  const email = user?.email ?? "";

  return (
    <footer className="footer">
      <div className={type === "mobile" ? "footer_name-mobile" : "footer_name"}>
        <p className="text-xl font-bold text-gray-700">{firstName[0]}</p>
      </div>

      <div
        className={type === "mobile" ? "footer_email-mobile" : "footer_email"}
      >
        <h1 className="text-14 truncate font-semibold text-gray-700">
          {firstName}
        </h1>
        {email && (
          <p className="text-14 truncate font-normal text-gray-600">
            {email}
          </p>
        )}
      </div>

      <div className="footer_image" onClick={handleLogOut}>
        <Image src="/icons/logout.svg" fill alt="Logout" />
      </div>
    </footer>
  );
};

export default Footer;
