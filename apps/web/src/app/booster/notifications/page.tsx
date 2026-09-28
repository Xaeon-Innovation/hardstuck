import { redirect } from "next/navigation";

/** @deprecated Use /notifications */
export default function BoosterNotificationsRedirect() {
  redirect("/notifications");
}
