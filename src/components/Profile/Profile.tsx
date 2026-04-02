"use client";

import { useCalendarStore } from "@/app/calendar/providers/calendar-store-provider";
import { useRouter } from "next/navigation";

const Profile = () => {
  const storeUser = useCalendarStore((state) => state.user);
  const router = useRouter();

  const slugRoles = {
    VIEWER: "Étudiant",
    EDITOR: "Accompagnateur",
    ADMIN: "Admin",
  };

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", {
      method: "GET",
      credentials: "include",
    });
    router.push("/");
  };

  return (
    <div className=" px-2">
      <div className=" text-xl text-wrap text-zinc-900">
        {storeUser.givenName} {storeUser.surname}
      </div>
      <div className="text-zinc-900">{slugRoles[storeUser.role]}</div>
      <button
        className=" text-zinc-900 cursor-pointer hover:bg-slate-300 "
        onClick={handleSignOut}
      >
        Se déconnecter
      </button>
    </div>
  );
};

export default Profile;
