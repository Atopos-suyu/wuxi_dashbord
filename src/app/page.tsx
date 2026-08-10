import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/mode";

export default function HomePage() {
  if (isDemoMode()) {
    redirect("/login");
  }
  redirect("/users");
}
