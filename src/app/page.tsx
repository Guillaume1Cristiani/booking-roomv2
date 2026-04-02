import { DesktopIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";

export default function Signin() {
  return (
    <main className="flex justify-center items-center h-screen w-screen">
      <div className="flex flex-col items-center">
        <Link
          href="/api/auth/microsoft?action=login"
          className="h-96 w-96 relative"
        >
          <Image
            priority
            fill
            src={"/microsoft_login.svg"}
            alt="Login via Microsoft"
            style={{ objectFit: "contain" }}
          />
        </Link>
        <Link href="/available?tv=true">
          <DesktopIcon className="w-20 h-20 text-gray-400" />
        </Link>
      </div>
    </main>
  );
}
